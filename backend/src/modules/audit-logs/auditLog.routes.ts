import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkElevatedAccess } from '../../shared/middleware/auth';

const router = Router();

/**
 * GET /api/audit-logs
 * Get audit logs (superadmin and system_administrator only)
 * Query params:
 * - action: filter by action type (e.g., 'DATA_PURGE')
 * - entity_type: filter by entity type (e.g., 'application')
 * - limit: number of records to return (default: 100)
 * - offset: pagination offset (default: 0)
 */
router.get('/', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
  try {
    const { action, entity_type, limit = '100', offset = '0' } = req.query;

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('performed_at', { ascending: false });

    // Apply filters
    if (action) {
      query = query.eq('action', action as string);
    }
    if (entity_type) {
      query = query.eq('entity_type', entity_type as string);
    }

    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      data,
      pagination: {
        total: count || 0,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit-logs/:id
 * Get a specific audit log entry (superadmin and system_administrator only)
 */
router.get('/:id', verifyToken, checkElevatedAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
