import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/subscribers
 * List all subscribers (activated applications) with optional filtering
 * Query params: agent_id, plan_id, start_date, end_date
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { agent_id, plan_id, start_date, end_date } = req.query;

    let query = supabase
      .from('applications')
      .select(`
        *,
        agents:agent_id (id, name, referral_code),
        plans:plan_id (id, name, category, speed, price)
      `)
      .eq('status', 'Activated')
      .order('activated_at', { ascending: false });

    // Filter by agent
    if (agent_id && typeof agent_id === 'string') {
      query = query.eq('agent_id', agent_id);
    }

    // Filter by plan
    if (plan_id && typeof plan_id === 'string') {
      query = query.eq('plan_id', plan_id);
    }

    // Filter by date range (activated_at)
    if (start_date && typeof start_date === 'string') {
      query = query.gte('activated_at', start_date);
    }
    if (end_date && typeof end_date === 'string') {
      query = query.lte('activated_at', end_date);
    }

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching subscribers:', error);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }

    res.json(subscribers || []);
  } catch (error) {
    console.error('Error in GET /api/subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/subscribers/public/:agentId
 * Get subscribers for a specific agent (PUBLIC - no auth required)
 * Used by agent portal
 */
router.get('/public/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const { data: subscribers, error } = await supabase
      .from('applications')
      .select(`
        id,
        first_name,
        last_name,
        contact_number,
        address,
        activated_at,
        plans:plan_id (name, speed, price)
      `)
      .eq('agent_id', agentId)
      .eq('status', 'Activated')
      .order('activated_at', { ascending: false });

    if (error) {
      console.error('Error fetching public subscribers:', error);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }

    res.json(subscribers || []);
  } catch (error) {
    console.error('Error in GET /api/subscribers/public/:agentId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/subscribers/:id
 * Get a single subscriber by ID with full details
 */
router.get('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: subscriber, error } = await supabase
      .from('applications')
      .select(`
        *,
        agents:agent_id (id, name, referral_code, contact_number, email),
        plans:plan_id (id, name, category, speed, price, inclusions)
      `)
      .eq('id', id)
      .eq('status', 'Activated')
      .single();

    if (error || !subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json(subscriber);
  } catch (error) {
    console.error('Error in GET /api/subscribers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/subscribers/:id
 * Permanently delete a subscriber (superadmin only)
 * WARNING: This action cannot be undone
 */
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Only superadmins can delete subscribers
    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can delete subscribers' });
    }

    // Check if subscriber exists
    const { data: subscriber, error: fetchError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('id', id)
      .eq('status', 'Activated')
      .single();

    if (fetchError || !subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    // Delete the subscriber (application record)
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting subscriber:', deleteError);
      return res.status(500).json({ error: 'Failed to delete subscriber' });
    }

    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/subscribers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
