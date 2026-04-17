import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Placeholder routes - to be implemented in subsequent tasks
router.post('/login', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Auth login endpoint - not yet implemented' });
});

router.post('/logout', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Auth logout endpoint - not yet implemented' });
});

router.get('/me', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Auth me endpoint - not yet implemented' });
});

// Complete first login - change password and optionally upload profile picture
router.post('/complete-first-login', verifyToken, async (req: Request, res: Response) => {
  try {
    const { new_password, profile_picture_url } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Update password in Supabase Auth
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (passwordError) {
      console.error('Error updating password:', passwordError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Update user record in database
    const updateData: any = {
      is_first_login: false,
      password_changed_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    };

    if (profile_picture_url) {
      updateData.profile_picture_url = profile_picture_url;
    }

    const { data: user, error: dbError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (dbError) {
      console.error('Error updating user:', dbError);
      return res.status(500).json({ error: 'Failed to update user record' });
    }

    res.json({ 
      message: 'First login completed successfully',
      user 
    });
  } catch (error) {
    console.error('Error completing first login:', error);
    res.status(500).json({ error: 'Failed to complete first login' });
  }
});

// Mark onboarding as completed
router.post('/complete-onboarding', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error completing onboarding:', error);
      return res.status(500).json({ error: 'Failed to complete onboarding' });
    }

    res.json({ 
      message: 'Onboarding completed successfully',
      user 
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Reset onboarding (for help/replay)
router.post('/reset-onboarding', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ onboarding_completed: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error resetting onboarding:', error);
      return res.status(500).json({ error: 'Failed to reset onboarding' });
    }

    res.json({ 
      message: 'Onboarding reset successfully',
      user 
    });
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json({ error: 'Failed to reset onboarding' });
  }
});

// Update last login time
router.post('/update-last-login', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating last login:', error);
      return res.status(500).json({ error: 'Failed to update last login' });
    }

    res.json({ message: 'Last login updated successfully' });
  } catch (error) {
    console.error('Error updating last login:', error);
    res.status(500).json({ error: 'Failed to update last login' });
  }
});

export default router;
