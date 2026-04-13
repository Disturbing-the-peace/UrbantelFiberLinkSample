import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/plans
 * Get all active plans, optionally filtered by category
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (category && (category === 'Residential' || category === 'Business')) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/plans/:id
 * Get a specific plan by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

export default router;
