import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkAdmin } from '../middleware/auth';
import { Application } from '../types';
import { notificationService } from '../services/notification.service';
import { createCommissionForActivation } from './commissions.routes';

const router = Router();

/**
 * Valid status transitions for applications
 * Defines the allowed workflow: Submitted → Under Review → Approved → Scheduled for Installation → Activated / Denied / Voided
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'Submitted': ['Under Review', 'Denied', 'Voided'],
  'Under Review': ['Approved', 'Denied', 'Voided'],
  'Approved': ['Scheduled for Installation', 'Denied', 'Voided'],
  'Scheduled for Installation': ['Activated', 'Voided'],
  'Activated': [], // Terminal state
  'Denied': [], // Terminal state
  'Voided': [], // Terminal state
};

/**
 * Statuses that require a reason
 */
const STATUSES_REQUIRING_REASON = ['Denied', 'Voided'];

/**
 * GET /api/applications
 * List all applications with optional filtering
 * Query params: status, agent_id, start_date, end_date, branch_id
 * Superadmins see all branches, admins see only their branch
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { status, agent_id, start_date, end_date, branch_id } = req.query;

    let query = supabase
      .from('applications')
      .select(`
        *,
        agents:agent_id (id, name, referral_code),
        plans:plan_id (id, name, category, speed, price),
        branches:branch_id (id, name)
      `)
      .order('created_at', { ascending: false });

    // Branch filtering: admins see only their branch, superadmins can filter or see all
    if (req.user!.role === 'admin') {
      query = query.eq('branch_id', req.user!.branch_id);
    } else if (branch_id && typeof branch_id === 'string') {
      // Superadmin filtering by specific branch
      query = query.eq('branch_id', branch_id);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    // Filter by agent
    if (agent_id && typeof agent_id === 'string') {
      query = query.eq('agent_id', agent_id);
    }

    // Filter by date range
    if (start_date && typeof start_date === 'string') {
      query = query.gte('created_at', start_date);
    }
    if (end_date && typeof end_date === 'string') {
      query = query.lte('created_at', end_date);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }

    res.json(applications || []);
  } catch (error) {
    console.error('Error in GET /api/applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/applications/public/:agentId
 * Get applications for a specific agent (PUBLIC - no auth required)
 * Used by agent portal
 */
router.get('/public/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        first_name,
        last_name,
        contact_number,
        address,
        status,
        status_reason,
        created_at,
        plans:plan_id (name, speed, price)
      `)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public applications:', error);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }

    res.json(applications || []);
  } catch (error) {
    console.error('Error in GET /api/applications/public/:agentId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/applications/:id
 * Get a single application by ID with full details
 */
router.get('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        agents:agent_id (id, name, referral_code, contact_number, email),
        plans:plan_id (id, name, category, speed, price, inclusions)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching application:', error);
      return res.status(500).json({ error: 'Failed to fetch application', details: error.message });
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error in GET /api/applications/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/applications/:id/status
 * Update application status with validation
 * Body: { status: string, status_reason?: string }
 */
router.put('/:id/status', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, status_reason } = req.body;

    // Validate status is provided
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Fetch current application
    const { data: currentApp, error: fetchError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentApp) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const currentStatus = currentApp.status;

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Cannot transition from '${currentStatus}' to '${status}'`,
        allowedTransitions,
      });
    }

    // Validate status_reason for Denied and Voided
    if (STATUSES_REQUIRING_REASON.includes(status)) {
      if (!status_reason || !status_reason.trim()) {
        return res.status(400).json({
          error: 'Status reason is required',
          message: `A reason must be provided when setting status to '${status}'`,
        });
      }
    }

    // Build update object
    const updates: Partial<Application> = {
      status: status as Application['status'],
    };

    // Add status_reason if provided
    if (status_reason) {
      updates.status_reason = status_reason.trim();
    }

    // Set activated_at timestamp if status is Activated
    if (status === 'Activated') {
      updates.activated_at = new Date().toISOString();
    }

    // Update application
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        agents:agent_id (id, name, referral_code, contact_number, email),
        plans:plan_id (id, name, category, speed, price, inclusions)
      `)
      .single();

    if (updateError) {
      console.error('Error updating application status:', updateError);
      return res.status(500).json({ error: 'Failed to update application status' });
    }

    // Create commission record if status is Activated
    if (status === 'Activated' && updatedApp.plans?.price) {
      try {
        const commission = await createCommissionForActivation(
          updatedApp.agent_id,
          updatedApp.id,
          updatedApp.plans.price,
          updatedApp.activated_at || new Date().toISOString(),
          updatedApp.branch_id
        );

        if (!commission) {
          console.error('Failed to create commission for activated application');
          // Don't fail the request, just log the error
        }
      } catch (error) {
        console.error('Error creating commission:', error);
        // Don't fail the request, just log the error
      }
    }

    // Send notifications for terminal statuses (Activated, Denied, Voided)
    const notifiableStatuses = ['Activated', 'Denied', 'Voided'];
    if (notifiableStatuses.includes(status)) {
      try {
        const customerName = `${updatedApp.first_name} ${updatedApp.last_name}`;
        const planName = updatedApp.plans?.name || 'Unknown Plan';
        
        // Prepare customer recipient info
        const customer = {
          name: customerName,
          phone: updatedApp.contact_number,
          email: updatedApp.email,
        };

        // Prepare agent recipient info
        const agent = {
          name: updatedApp.agents?.name || 'Unknown Agent',
          phone: updatedApp.agents?.contact_number,
          email: updatedApp.agents?.email,
        };

        // Send notifications (non-blocking)
        notificationService.sendStatusChangeNotification(
          status,
          customerName,
          planName,
          status_reason,
          customer,
          agent
        ).catch(error => {
          // Log error but don't fail the request
          console.error('Error sending notifications:', error);
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error preparing notifications:', error);
      }
    }

    res.json(updatedApp);
  } catch (error) {
    console.error('Error in PUT /api/applications/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/applications/:id
 * Permanently delete an application (superadmin only)
 * WARNING: This action cannot be undone
 */
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Only superadmins can delete applications
    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can delete applications' });
    }

    // Check if application exists
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Delete the application
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting application:', deleteError);
      return res.status(500).json({ error: 'Failed to delete application' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/applications/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
