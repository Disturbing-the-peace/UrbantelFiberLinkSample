import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { supabase } from '../../shared/config/supabase';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'superadmin' | 'system_administrator';
        primary_branch_id: string;
        branch_ids: string[]; // All branches user has access to
      };
    }
  }
}

/**
 * Middleware to verify JWT token and authenticate user
 * Attaches user info to req.user if valid
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.error('Token verification failed:', error?.message || 'No user');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    logger.log('Token verified for user:', user.id, user.email);

    // Fetch user role, active status, and branch from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, is_active, primary_branch_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      logger.error('Database query error for user:', user.id, userError);
    }

    if (userError || !userData) {
      logger.error('User not found in database:', user.id, user.email);
      return res.status(403).json({ 
        error: 'User not found in system',
        details: `User ${user.email} (${user.id}) exists in auth but not in users table`
      });
    }

    if (!userData.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Get primary branch ID
    const primaryBranchId = userData.primary_branch_id;

    // Fetch all branches user has access to
    const { data: userBranches, error: branchError } = await supabase
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', user.id);

    if (branchError) {
      logger.error('Error fetching user branches:', branchError);
    }

    // Build branch IDs array
    let branchIds: string[] = [];
    if (userBranches && userBranches.length > 0) {
      branchIds = userBranches.map(ub => ub.branch_id);
    } else if (primaryBranchId) {
      // Fallback: use primary branch as the only accessible branch
      branchIds = [primaryBranchId];
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email!,
      role: userData.role,
      primary_branch_id: primaryBranchId,
      branch_ids: branchIds,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has admin or superadmin role
 * Must be used after verifyToken middleware
 */
export const checkAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!['admin', 'superadmin', 'system_administrator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to check if user has superadmin or system_administrator role
 * Must be used after verifyToken middleware
 */
export const checkSuperadmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!['superadmin', 'system_administrator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Superadmin or system administrator access required' });
  }

  next();
};

/**
 * Middleware to check if user has system_administrator role
 * Must be used after verifyToken middleware
 */
export const checkSystemAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'system_administrator') {
    return res.status(403).json({ error: 'System administrator access required' });
  }

  next();
};

/**
 * Middleware to check if user has elevated privileges (superadmin or system_administrator)
 * Must be used after verifyToken middleware
 */
export const checkElevatedAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!['superadmin', 'system_administrator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Elevated access required' });
  }

  next();
};

/**
 * Middleware to check if user has enrolled in 2FA (if required)
 * Must be used after verifyToken middleware
 */
export const check2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user role requires 2FA using database function
    const { data: requires2FA, error } = await supabase.rpc('requires_2fa', {
      user_id: req.user.id,
    });

    if (error) {
      logger.error('Error checking 2FA requirement:', error);
      return res.status(500).json({ error: 'Failed to check 2FA requirement' });
    }

    // If 2FA is required, verify enrollment
    if (requires2FA) {
      // Get user's MFA factors
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || '';

      // Create a temporary client with the user's token
      const userSupabase = supabase;
      const { data: factors, error: mfaError } =
        await userSupabase.auth.mfa.listFactors();

      if (mfaError) {
        logger.error('Error checking MFA factors:', mfaError);
        return res.status(500).json({ error: 'Failed to verify 2FA status' });
      }

      // Check if user has at least one verified factor
      const hasVerifiedFactor = factors?.totp?.some(
        (factor) => factor.status === 'verified'
      );

      if (!hasVerifiedFactor) {
        return res.status(403).json({
          error: '2FA enrollment required',
          requires2FA: true,
          message:
            'Your role requires two-factor authentication. Please enroll in 2FA to continue.',
        });
      }
    }

    next();
  } catch (error) {
    logger.error('2FA check error:', error);
    return res.status(500).json({ error: '2FA verification failed' });
  }
};

/**
 * Middleware to log authentication events
 * Optional middleware for audit logging
 */
export const logAuthEvent = (eventType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await supabase.rpc('log_auth_event', {
          p_user_id: req.user.id,
          p_event_type: eventType,
          p_metadata: {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method,
          },
        });
      }
      next();
    } catch (error) {
      logger.error('Error logging auth event:', error);
      // Don't block request if logging fails
      next();
    }
  };
};
