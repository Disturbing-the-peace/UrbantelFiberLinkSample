import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkSuperadmin, checkAdmin } from '../middleware/auth';
import { Agent } from '../types';

const router = Router();

/**
 * Generate a unique referral code
 * Format: AGT-XXXXXX (6 random alphanumeric characters)
 */
const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AGT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * POST /api/agents
 * Create a new agent (admin and superadmin)
 */
router.post('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { name, contact_number, email, role, team_leader_id, branch_id } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Agent name is required' });
    }

    // Use provided branch_id or default to user's branch_id
    const agentBranchId = branch_id || req.user!.branch_id;

    if (!agentBranchId) {
      return res.status(400).json({ error: 'Branch is required' });
    }

    // Validate branch access for admins
    if (req.user!.role === 'admin' && req.user!.branch_id !== agentBranchId) {
      return res.status(403).json({ error: 'You can only create agents in your assigned branch' });
    }

    // Validate that team leaders don't have a team leader
    if (role === 'Team Leader' && team_leader_id) {
      return res.status(400).json({ error: 'Team Leaders cannot be assigned to another team leader' });
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure referral code is unique
    while (!isUnique && attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (!existing) {
        isUnique = true;
      } else {
        referralCode = generateReferralCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique referral code' });
    }

    // Create agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name: name.trim(),
        referral_code: referralCode,
        contact_number: contact_number?.trim() || null,
        email: email?.trim() || null,
        role: role?.trim() || null,
        team_leader_id: team_leader_id || null,
        branch_id: agentBranchId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return res.status(500).json({ error: 'Failed to create agent' });
    }

    res.status(201).json(agent);
  } catch (error) {
    console.error('Error in POST /api/agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agents
 * List all agents (admin and superadmin)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { is_active, branch_id } = req.query;

    let query = supabase
      .from('agents')
      .select('*, branches:branch_id (id, name)')
      .order('created_at', { ascending: false });

    // Branch filtering: admins see only their branch, superadmins can filter or see all
    if (req.user!.role === 'admin') {
      query = query.eq('branch_id', req.user!.branch_id);
    } else if (branch_id && typeof branch_id === 'string') {
      // Superadmin filtering by specific branch
      query = query.eq('branch_id', branch_id);
    }

    // Filter by active status if provided
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    res.json(agents || []);
  } catch (error) {
    console.error('Error in GET /api/agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/by-referral/:referralCode
 * Get agent by referral code (PUBLIC - no auth required)
 */
router.get('/by-referral/:referralCode', async (req: Request, res: Response) => {
  try {
    const { referralCode } = req.params;

    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id, 
        name, 
        referral_code, 
        contact_number, 
        email,
        role,
        team_leader:team_leader_id (
          id,
          name,
          referral_code
        )
      `)
      .eq('referral_code', referralCode)
      .eq('is_active', true)
      .single();

    if (error || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error in GET /api/agents/by-referral/:referralCode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/team-members/:teamLeaderId
 * Get all agents under a specific team leader (PUBLIC - no auth required)
 */
router.get('/team-members/:teamLeaderId', async (req: Request, res: Response) => {
  try {
    const { teamLeaderId } = req.params;

    // Verify the team leader exists and is active
    const { data: teamLeader, error: teamLeaderError } = await supabase
      .from('agents')
      .select('id, role')
      .eq('id', teamLeaderId)
      .eq('is_active', true)
      .single();

    if (teamLeaderError || !teamLeader) {
      return res.status(404).json({ error: 'Team leader not found' });
    }

    // Fetch all agents under this team leader
    const { data: teamMembers, error } = await supabase
      .from('agents')
      .select('id, name, referral_code, contact_number, email, role')
      .eq('team_leader_id', teamLeaderId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching team members:', error);
      return res.status(500).json({ error: 'Failed to fetch team members' });
    }

    res.json(teamMembers || []);
  } catch (error) {
    console.error('Error in GET /api/agents/team-members/:teamLeaderId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/:id
 * Get a single agent by ID (admin and superadmin)
 */
router.get('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error in GET /api/agents/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/agents/:id
 * Update an agent (admin and superadmin)
 */
router.put('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact_number, email, role, team_leader_id, is_active, branch_id } = req.body;

    // Check if agent exists
    const { data: existing, error: fetchError } = await supabase
      .from('agents')
      .select('id, branch_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Validate branch access for admins
    if (req.user!.role === 'admin' && req.user!.branch_id !== existing.branch_id) {
      return res.status(403).json({ error: 'You can only update agents in your assigned branch' });
    }

    // Validate that team leaders don't have a team leader
    if (role === 'Team Leader' && team_leader_id) {
      return res.status(400).json({ error: 'Team Leaders cannot be assigned to another team leader' });
    }

    // Build update object
    const updates: Partial<Agent> = {};
    if (name !== undefined) updates.name = name.trim();
    if (contact_number !== undefined) updates.contact_number = contact_number?.trim() || null;
    if (email !== undefined) updates.email = email?.trim() || null;
    if (role !== undefined) {
      updates.role = role?.trim() || null;
      // Clear team_leader_id if role is Team Leader
      if (role === 'Team Leader') {
        updates.team_leader_id = undefined;
      }
    }
    if (team_leader_id !== undefined && role !== 'Team Leader') {
      updates.team_leader_id = team_leader_id || undefined;
    }
    if (is_active !== undefined) updates.is_active = is_active;
    
    // Only superadmins can change branch
    if (branch_id !== undefined && req.user!.role === 'superadmin') {
      updates.branch_id = branch_id;
    }

    // Validate at least one field to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update agent
    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return res.status(500).json({ error: 'Failed to update agent' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error in PUT /api/agents/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/agents/:id
 * Soft delete an agent (admin and superadmin)
 * Sets is_active to false instead of deleting the record
 */
router.delete('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if agent exists
    const { data: existing, error: fetchError } = await supabase
      .from('agents')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (!existing.is_active) {
      return res.status(400).json({ error: 'Agent is already inactive' });
    }

    // Soft delete by setting is_active to false
    const { data: agent, error } = await supabase
      .from('agents')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting agent:', error);
      return res.status(500).json({ error: 'Failed to delete agent' });
    }

    res.json({ message: 'Agent deactivated successfully', agent });
  } catch (error) {
    console.error('Error in DELETE /api/agents/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/agents/:id/permanent
 * Permanently delete an agent (admin and superadmin)
 * WARNING: This action cannot be undone
 */
router.delete('/:id/permanent', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if agent exists
    const { data: existing, error: fetchError } = await supabase
      .from('agents')
      .select('id, name, referral_code')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if agent has any applications
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select('id')
      .eq('agent_id', id)
      .limit(1);

    if (appsError) {
      console.error('Error checking applications:', appsError);
      return res.status(500).json({ error: 'Failed to check agent applications' });
    }

    if (applications && applications.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete agent with existing applications',
        message: 'This agent has applications in the system. Please deactivate instead of deleting.'
      });
    }

    // Permanently delete the agent
    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error permanently deleting agent:', deleteError);
      return res.status(500).json({ error: 'Failed to permanently delete agent' });
    }

    res.json({ 
      message: 'Agent permanently deleted successfully',
      deleted: {
        id: existing.id,
        name: existing.name,
        referral_code: existing.referral_code
      }
    });
  } catch (error) {
    console.error('Error in DELETE /api/agents/:id/permanent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
