import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkAdmin, checkSuperadmin } from '../middleware/auth';
import { Branch } from '../types';

const router = Router();

/**
 * GET /api/branches
 * List all branches (authenticated users)
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    let query = supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    // Filter by active status if provided
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: branches, error } = await query;

    if (error) {
      console.error('Error fetching branches:', error);
      return res.status(500).json({ error: 'Failed to fetch branches' });
    }

    res.json(branches || []);
  } catch (error) {
    console.error('Error in GET /api/branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/branches/:id
 * Get a single branch by ID (authenticated users)
 */
router.get('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: branch, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json(branch);
  } catch (error) {
    console.error('Error in GET /api/branches/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/branches
 * Create a new branch (superadmin only)
 */
router.post('/', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    // Check if branch name already exists
    const { data: existing } = await supabase
      .from('branches')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Branch name already exists' });
    }

    // Create branch
    const { data: branch, error } = await supabase
      .from('branches')
      .insert({
        name: name.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating branch:', error);
      return res.status(500).json({ error: 'Failed to create branch' });
    }

    res.status(201).json(branch);
  } catch (error) {
    console.error('Error in POST /api/branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/branches/:id
 * Update a branch (superadmin only)
 */
router.put('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    // Check if branch exists
    const { data: existing, error: fetchError } = await supabase
      .from('branches')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Build update object
    const updates: Partial<Branch> = {};
    if (name !== undefined) updates.name = name.trim();
    if (is_active !== undefined) updates.is_active = is_active;

    // Validate at least one field to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update branch
    const { data: branch, error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating branch:', error);
      return res.status(500).json({ error: 'Failed to update branch' });
    }

    res.json(branch);
  } catch (error) {
    console.error('Error in PUT /api/branches/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/branches/:id
 * Soft delete a branch (superadmin only)
 * Sets is_active to false instead of deleting the record
 */
router.delete('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if branch exists
    const { data: existing, error: fetchError } = await supabase
      .from('branches')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    if (!existing.is_active) {
      return res.status(400).json({ error: 'Branch is already inactive' });
    }

    // Check if branch has any active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('branch_id', id)
      .eq('is_active', true)
      .limit(1);

    if (usersError) {
      console.error('Error checking branch users:', usersError);
      return res.status(500).json({ error: 'Failed to check branch users' });
    }

    if (users && users.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot deactivate branch with active users',
        message: 'Please reassign or deactivate all users in this branch first.'
      });
    }

    // Soft delete by setting is_active to false
    const { data: branch, error } = await supabase
      .from('branches')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating branch:', error);
      return res.status(500).json({ error: 'Failed to deactivate branch' });
    }

    res.json({ message: 'Branch deactivated successfully', branch });
  } catch (error) {
    console.error('Error in DELETE /api/branches/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
