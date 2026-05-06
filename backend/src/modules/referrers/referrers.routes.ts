import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { verifyToken } from '../../shared/middleware/auth';

const router = Router();

/**
 * Generate a random referral code
 */
const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REF-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Check if user is system admin (superadmin or system_administrator)
 */
const checkSystemAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !['superadmin', 'system_administrator'].includes(user.role)) {
    return res.status(403).json({ error: 'Access denied. System administrators only.' });
  }
  next();
};

/**
 * GET /api/referrers
 * List all referrers (system admins only)
 */
router.get('/', verifyToken, checkSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data: referrers, error } = await supabase
      .from('referrers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrers:', error);
      return res.status(500).json({ error: 'Failed to fetch referrers' });
    }

    res.json(referrers || []);
  } catch (error) {
    console.error('Error in GET /api/referrers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/referrers/:id
 * Get a single referrer by ID (system admins only)
 */
router.get('/:id', verifyToken, checkSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: referrer, error } = await supabase
      .from('referrers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referrer:', error);
      return res.status(500).json({ error: 'Failed to fetch referrer' });
    }

    if (!referrer) {
      return res.status(404).json({ error: 'Referrer not found' });
    }

    res.json(referrer);
  } catch (error) {
    console.error('Error in GET /api/referrers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/referrers/by-code/:referralCode
 * Get referrer by referral code (public - for validation)
 */
router.get('/by-code/:referralCode', async (req: Request, res: Response) => {
  try {
    const { referralCode } = req.params;

    const { data: referrer, error } = await supabase
      .from('referrers')
      .select('id, name, referral_code, is_active')
      .eq('referral_code', referralCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referrer by code:', error);
      return res.status(500).json({ error: 'Failed to fetch referrer' });
    }

    if (!referrer) {
      return res.status(404).json({ error: 'Referrer not found' });
    }

    res.json(referrer);
  } catch (error) {
    console.error('Error in GET /api/referrers/by-code/:referralCode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/referrers
 * Create a new referrer (system admins only)
 */
router.post('/', verifyToken, checkSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { name, contact_number, email } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name']
      });
    }

    // Generate unique referral code
    let referral_code = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('referrers')
        .select('id')
        .eq('referral_code', referral_code)
        .maybeSingle();

      if (!existing) break;
      
      referral_code = generateReferralCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique referral code' });
    }

    // Create referrer
    const { data: referrer, error } = await supabase
      .from('referrers')
      .insert({
        name,
        referral_code,
        contact_number,
        email,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating referrer:', error);
      return res.status(500).json({ error: 'Failed to create referrer' });
    }

    res.status(201).json(referrer);
  } catch (error) {
    console.error('Error in POST /api/referrers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/referrers/:id
 * Update a referrer (system admins only)
 */
router.put('/:id', verifyToken, checkSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, referral_code, contact_number, email, is_active } = req.body;

    // Check if referrer exists
    const { data: existing } = await supabase
      .from('referrers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Referrer not found' });
    }

    // If updating referral code, check if it's already taken
    if (referral_code) {
      const { data: codeExists } = await supabase
        .from('referrers')
        .select('id')
        .eq('referral_code', referral_code)
        .neq('id', id)
        .maybeSingle();

      if (codeExists) {
        return res.status(400).json({ error: 'Referral code already exists' });
      }
    }

    // Update referrer
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (referral_code !== undefined) updates.referral_code = referral_code;
    if (contact_number !== undefined) updates.contact_number = contact_number;
    if (email !== undefined) updates.email = email;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: referrer, error } = await supabase
      .from('referrers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating referrer:', error);
      return res.status(500).json({ error: 'Failed to update referrer' });
    }

    res.json(referrer);
  } catch (error) {
    console.error('Error in PUT /api/referrers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/referrers/:id
 * Delete a referrer (system admins only)
 */
router.delete('/:id', verifyToken, checkSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if referrer exists
    const { data: referrer } = await supabase
      .from('referrers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!referrer) {
      return res.status(404).json({ error: 'Referrer not found' });
    }

    // Check if referrer has any agent applications
    const { data: applications } = await supabase
      .from('agent_applications')
      .select('id')
      .eq('referred_by_referrer_id', id)
      .limit(1);

    if (applications && applications.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete referrer with existing agent applications',
        suggestion: 'Deactivate the referrer instead'
      });
    }

    // Delete referrer
    const { error } = await supabase
      .from('referrers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting referrer:', error);
      return res.status(500).json({ error: 'Failed to delete referrer' });
    }

    res.json({ message: 'Referrer deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/referrers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
