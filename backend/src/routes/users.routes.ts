import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkSuperadmin } from '../middleware/auth';
import { User } from '../types';

const router = Router();

/**
 * POST /api/users
 * Create a new admin user account (superadmin only)
 */
router.post('/', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { email, full_name, role, password } = req.body;

    // Validate required fields
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!role || !['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin or superadmin)' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Create user record in users table
    const { data: user, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        full_name: full_name.trim(),
        role: role,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating user record:', dbError);
      // Rollback: delete auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user record' });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users
 * List all users (superadmin only)
 */
router.get('/', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { is_active, role } = req.query;

    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by active status if provided
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    // Filter by role if provided
    if (role && ['admin', 'superadmin'].includes(role as string)) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json(users || []);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get a single user by ID (superadmin only)
 */
router.get('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in GET /api/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (superadmin only)
 */
router.put('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, email } = req.body;

    // Check if user exists
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent superadmin from deactivating themselves
    if (req.user?.id === id && is_active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Build update object
    const updates: Partial<User> = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (role !== undefined && ['admin', 'superadmin'].includes(role)) {
      updates.role = role;
    }
    if (is_active !== undefined) updates.is_active = is_active;

    // Validate at least one field to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update email in Supabase Auth if provided
    if (email && email !== existing.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        id as string,
        { email: email.trim() }
      );

      if (authError) {
        console.error('Error updating auth email:', authError);
        return res.status(400).json({ error: authError.message });
      }
      updates.email = email.trim();
    }

    // Update user record
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in PUT /api/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate a user (superadmin only)
 * Sets is_active to false instead of deleting the record
 */
router.delete('/:id', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent superadmin from deactivating themselves
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Check if user exists
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!existing.is_active) {
      return res.status(400).json({ error: 'User is already inactive' });
    }

    // Soft delete by setting is_active to false
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating user:', error);
      return res.status(500).json({ error: 'Failed to deactivate user' });
    }

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Error in DELETE /api/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id/permanent
 * Permanently delete a user (superadmin only)
 * Removes user from both Auth and database
 */
router.delete('/:id/permanent', verifyToken, checkSuperadmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Ensure id is a string
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent superadmin from deleting themselves
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete from database first
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting user from database:', dbError);
      return res.status(500).json({ error: 'Failed to delete user from database' });
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id as string);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      // User is already deleted from database, log but don't fail
      console.warn('User deleted from database but auth deletion failed:', authError.message);
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      action: 'USER_DELETE',
      entity_type: 'user',
      entity_id: id,
      performed_by: req.user!.id,
      metadata: {
        deleted_user: {
          email: existing.email,
          full_name: existing.full_name,
        },
      },
    });

    res.json({ 
      message: 'User permanently deleted successfully',
      deleted_user: {
        id: existing.id,
        email: existing.email,
        full_name: existing.full_name,
      }
    });
  } catch (error) {
    console.error('Error in DELETE /api/users/:id/permanent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
