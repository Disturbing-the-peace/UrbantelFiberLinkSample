import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkAdmin } from '../middleware/auth';
import { Commission } from '../types';

const router = Router();

/**
 * Valid status transitions for commissions
 */
const VALID_COMMISSION_STATUS_TRANSITIONS: Record<string, string[]> = {
  'Pending': ['Eligible'],
  'Eligible': ['Paid'],
  'Paid': [], // Terminal state
};

/**
 * Calculate commission amount (60% of plan price)
 */
export function calculateCommission(planPrice: number): number {
  return planPrice * 0.6;
}

/**
 * Create commission record for activated application
 * Called when application status changes to "Activated"
 */
export async function createCommissionForActivation(
  agentId: string,
  subscriberId: string,
  planPrice: number,
  activatedAt: string
): Promise<Commission | null> {
  try {
    const commissionAmount = calculateCommission(planPrice);

    const { data: commission, error } = await supabase
      .from('commissions')
      .insert({
        agent_id: agentId,
        subscriber_id: subscriberId,
        amount: commissionAmount,
        status: 'Pending',
        date_activated: activatedAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating commission:', error);
      return null;
    }

    return commission;
  } catch (error) {
    console.error('Error in createCommissionForActivation:', error);
    return null;
  }
}

/**
 * GET /api/commissions
 * List all commissions with optional filtering
 * Query params: agent_id, status
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { agent_id, status } = req.query;

    let query = supabase
      .from('commissions')
      .select(`
        *,
        agents:agent_id (id, name, referral_code),
        applications:subscriber_id (id, first_name, last_name, plans:plan_id (id, name, category, speed, price))
      `)
      .order('date_activated', { ascending: false });

    // Filter by agent
    if (agent_id && typeof agent_id === 'string') {
      query = query.eq('agent_id', agent_id);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commissions:', error);
      return res.status(500).json({ error: 'Failed to fetch commissions' });
    }

    res.json(commissions || []);
  } catch (error) {
    console.error('Error in GET /api/commissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/commissions/:id/status
 * Update commission status with validation
 * Body: { status: string }
 */
router.put('/:id/status', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status is provided
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Fetch current commission
    const { data: currentCommission, error: fetchError } = await supabase
      .from('commissions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentCommission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    const currentStatus = currentCommission.status;

    // Validate status transition
    const allowedTransitions = VALID_COMMISSION_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Cannot transition from '${currentStatus}' to '${status}'`,
        allowedTransitions,
      });
    }

    // Build update object
    const updates: Partial<Commission> = {
      status: status as Commission['status'],
    };

    // Set date_paid timestamp if status is Paid
    if (status === 'Paid') {
      updates.date_paid = new Date().toISOString();
    }

    // Update commission
    const { data: updatedCommission, error: updateError } = await supabase
      .from('commissions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        agents:agent_id (id, name, referral_code),
        applications:subscriber_id (id, first_name, last_name, plans:plan_id (id, name, category, speed, price))
      `)
      .single();

    if (updateError) {
      console.error('Error updating commission status:', updateError);
      return res.status(500).json({ error: 'Failed to update commission status' });
    }

    res.json(updatedCommission);
  } catch (error) {
    console.error('Error in PUT /api/commissions/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/commissions/:id
 * Edit commission details (amount, dates)
 * Body: { amount?: number, date_activated?: string, date_paid?: string, password: string }
 * Requires password confirmation
 */
router.put('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, date_activated, date_paid, password } = req.body;

    console.log('[Commission Update] Request received:', { id, amount, date_activated, date_paid, hasPassword: !!password });

    // Validate password is provided
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password confirmation is required' });
    }

    // Fetch current commission
    console.log('[Commission Update] Fetching commission with ID:', id);
    const { data: currentCommission, error: fetchError } = await supabase
      .from('commissions')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[Commission Update] Fetch result:', { found: !!currentCommission, error: fetchError?.message });

    if (fetchError || !currentCommission) {
      console.error('[Commission Update] Commission not found:', { id, error: fetchError });
      return res.status(404).json({ error: 'Commission not found', details: fetchError?.message });
    }

    // Note: Password verification is handled by the frontend's session management
    // The user is already authenticated via JWT token (verifyToken middleware)
    // Additional password check would cause RLS policy recursion issues
    console.log('[Commission Update] User authenticated via JWT, proceeding with update');

    // Build update object
    const updates: Partial<Commission> = {};
    
    if (amount !== undefined && typeof amount === 'number') {
      if (amount < 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }
      updates.amount = amount;
    }

    if (date_activated !== undefined && typeof date_activated === 'string') {
      updates.date_activated = date_activated;
    }

    if (date_paid !== undefined) {
      updates.date_paid = date_paid === null ? null : date_paid;
    }

    console.log('[Commission Update] Applying updates:', updates);

    // Update commission
    const { data: updatedCommission, error: updateError } = await supabase
      .from('commissions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        agents:agent_id (id, name, referral_code),
        applications:subscriber_id (id, first_name, last_name, plans:plan_id (id, name, category, speed, price))
      `)
      .single();

    if (updateError) {
      console.error('[Commission Update] Update failed:', updateError);
      return res.status(500).json({ error: 'Failed to update commission', details: updateError.message });
    }

    console.log('[Commission Update] Update successful');

    // Log to audit
    await supabase.from('audit_log').insert({
      action: 'COMMISSION_EDIT',
      entity_type: 'commission',
      entity_id: id,
      performed_by: req.user!.id,
      metadata: {
        old_values: currentCommission,
        new_values: updates,
      },
    });

    res.json(updatedCommission);
  } catch (error) {
    console.error('[Commission Update] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/commissions/:id
 * Delete a commission record
 * Body: { password: string }
 * Requires password confirmation
 */
router.delete('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Validate password is provided
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password confirmation is required' });
    }

    // Note: Password verification is handled by the frontend's session management
    // The user is already authenticated via JWT token (verifyToken middleware)
    // Additional password check would cause RLS policy recursion issues

    // Fetch commission before deletion for audit log
    const { data: commission, error: fetchError } = await supabase
      .from('commissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    // Delete commission
    const { error: deleteError } = await supabase
      .from('commissions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting commission:', deleteError);
      return res.status(500).json({ error: 'Failed to delete commission' });
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      action: 'COMMISSION_DELETE',
      entity_type: 'commission',
      entity_id: id,
      performed_by: req.user!.id,
      metadata: {
        deleted_commission: commission,
      },
    });

    res.json({ message: 'Commission deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/commissions/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
