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
 * Create a new agent (superadmin only)
 */
router.post('/', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { name, contact_number, email, messenger_link, role } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Agent name is required' });
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
        messenger_link: messenger_link?.trim() || null,
        role: role?.trim() || null,
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
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    let query = supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

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
      .select('id, name, referral_code, contact_number, email')
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
 * Update an agent (superadmin only)
 */
router.put('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact_number, email, messenger_link, role, is_active } = req.body;

    // Check if agent exists
    const { data: existing, error: fetchError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Build update object
    const updates: Partial<Agent> = {};
    if (name !== undefined) updates.name = name.trim();
    if (contact_number !== undefined) updates.contact_number = contact_number?.trim() || null;
    if (email !== undefined) updates.email = email?.trim() || null;
    if (messenger_link !== undefined) updates.messenger_link = messenger_link?.trim() || null;
    if (role !== undefined) updates.role = role?.trim() || null;
    if (is_active !== undefined) updates.is_active = is_active;

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
 * Soft delete an agent (superadmin only)
 * Sets is_active to false instead of deleting the record
 */
router.delete('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
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

export default router;
