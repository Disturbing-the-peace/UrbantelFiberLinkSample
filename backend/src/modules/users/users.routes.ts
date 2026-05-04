import { Router, Request, Response } from 'express';
import { logger } from '../../shared/utils/logger';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkElevatedAccess } from '../../shared/middleware/auth';
import { User } from '../../types';

const router = Router();

/**
 * POST /api/users
 * Create a new admin user account (superadmin and system_administrator only)
 */
router.post('/', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
  try {
    const { email, full_name, role, password, primary_branch_id, branch_ids } = req.body;

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
    if (!primary_branch_id) {
      return res.status(400).json({ error: 'Primary branch is required' });
    }
    if (!branch_ids || !Array.isArray(branch_ids) || branch_ids.length === 0) {
      return res.status(400).json({ error: 'At least one branch must be assigned' });
    }
    if (!branch_ids.includes(primary_branch_id)) {
      return res.status(400).json({ error: 'Primary branch must be included in assigned branches' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      logger.error('Error creating auth user:', authError);
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
        primary_branch_id: primary_branch_id,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Error creating user record:', dbError);
      // Rollback: delete auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user record' });
    }

    // Insert branch assignments
    const branchAssignments = branch_ids.map((branchId: string) => ({
      user_id: authData.user.id,
      branch_id: branchId,
    }));

    const { error: branchError } = await supabase
      .from('user_branches')
      .insert(branchAssignments);

    if (branchError) {
      logger.error('Error creating branch assignments:', branchError);
      // Rollback: delete user and auth user
      await supabase.from('users').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create branch assignments' });
    }

    res.status(201).json(user);
  } catch (error) {
    logger.error('Error in POST /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users
 * List all users (superadmin and system_administrator only)
 */
router.get('/', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
  try {
    const { is_active, role, branch_id } = req.query;

    let query = supabase
      .from('user_auth_status')
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

    // Filter by branch if provided (checks if user has access to that branch)
    if (branch_id && typeof branch_id === 'string') {
      query = query.contains('branches', [{ id: branch_id }]);
    }

    const { data: users, error } = await query;

    if (error) {
      logger.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json(users || []);
  } catch (error) {
    logger.error('Error in GET /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get a single user by ID (superadmin and system_administrator only)
 */
router.get('/:id', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
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
    logger.error('Error in GET /api/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (superadmin and system_administrator only)
 */
router.put('/:id', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, email, primary_branch_id, branch_ids } = req.body;

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

    // Validate branch_ids if provided
    if (branch_ids !== undefined) {
      if (!Array.isArray(branch_ids) || branch_ids.length === 0) {
        return res.status(400).json({ error: 'At least one branch must be assigned' });
      }
      if (primary_branch_id && !branch_ids.includes(primary_branch_id)) {
        return res.status(400).json({ error: 'Primary branch must be included in assigned branches' });
      }
    }

    // Build update object
    const updates: Partial<User> = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (role !== undefined && ['admin', 'superadmin'].includes(role)) {
      updates.role = role;
    }
    if (is_active !== undefined) updates.is_active = is_active;
    if (primary_branch_id !== undefined) updates.primary_branch_id = primary_branch_id;

    // Validate at least one field to update
    if (Object.keys(updates).length === 0 && !email && !branch_ids) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update email in Supabase Auth if provided
    if (email && email !== existing.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        id as string,
        { email: email.trim() }
      );

      if (authError) {
        logger.error('Error updating auth email:', authError);
        return res.status(400).json({ error: authError.message });
      }
      updates.email = email.trim();
    }

    // Update user record if there are updates
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id);

      if (error) {
        logger.error('Error updating user:', error);
        return res.status(500).json({ error: 'Failed to update user' });
      }
    }

    // Update branch assignments if provided
    if (branch_ids !== undefined) {
      // Delete existing branch assignments
      const { error: deleteError } = await supabase
        .from('user_branches')
        .delete()
        .eq('user_id', id);

      if (deleteError) {
        logger.error('Error deleting branch assignments:', deleteError);
        return res.status(500).json({ error: 'Failed to update branch assignments' });
      }

      // Insert new branch assignments
      const branchAssignments = branch_ids.map((branchId: string) => ({
        user_id: id,
        branch_id: branchId,
      }));

      const { error: insertError } = await supabase
        .from('user_branches')
        .insert(branchAssignments);

      if (insertError) {
        logger.error('Error inserting branch assignments:', insertError);
        return res.status(500).json({ error: 'Failed to update branch assignments' });
      }
    }

    // Fetch updated user with branches
    const { data: user, error: fetchUpdatedError } = await supabase
      .from('user_auth_status')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchUpdatedError) {
      logger.error('Error fetching updated user:', fetchUpdatedError);
      return res.status(500).json({ error: 'Failed to fetch updated user' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error in PUT /api/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate a user (superadmin only)
 * Sets is_active to false instead of deleting the record
 */
router.delete('/:id', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
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
      logger.error('Error deactivating user:', error);
      return res.status(500).json({ error: 'Failed to deactivate user' });
    }

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    logger.error('Error in DELETE /api/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset a user's password to default (superadmin only)
 * Sets password to '123123123'
 */
router.post('/:id/reset-password', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Ensure id is a string
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
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

    // Reset password to default
    const defaultPassword = '123123123';
    const { error: resetError } = await supabase.auth.admin.updateUserById(
      id,
      { password: defaultPassword }
    );

    if (resetError) {
      logger.error('Error resetting password:', resetError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      action: 'PASSWORD_RESET',
      entity_type: 'user',
      entity_id: id,
      performed_by: req.user!.id,
      metadata: {
        reset_user: {
          email: existing.email,
          full_name: existing.full_name,
        },
      },
    });

    res.json({ 
      message: 'Password reset successfully',
      default_password: defaultPassword,
      user: {
        id: existing.id,
        email: existing.email,
        full_name: existing.full_name,
      }
    });
  } catch (error) {
    logger.error('Error in POST /api/users/:id/reset-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id/permanent
 * Permanently delete a user (superadmin only)
 * Removes user from both Auth and database
 */
router.delete('/:id/permanent', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
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
      logger.error('Error deleting user from database:', dbError);
      return res.status(500).json({ error: 'Failed to delete user from database' });
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id as string);

    if (authError) {
      logger.error('Error deleting user from auth:', authError);
      // User is already deleted from database, log but don't fail
      logger.warn('User deleted from database but auth deletion failed:', authError.message);
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
    logger.error('Error in DELETE /api/users/:id/permanent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
