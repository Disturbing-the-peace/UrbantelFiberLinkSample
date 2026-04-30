/**
 * Frontend Authentication Utilities
 * Helper functions for Supabase Auth integration
 */

import { getSupabaseClient } from './supabase';
import { clearCachedSession } from './api';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'system_administrator';
  fullName: string;
  isActive: boolean;
  requires2FA: boolean;
  branch_id?: string;
  branch_name?: string;
  primary_branch_id?: string;
  primary_branch_name?: string;
  branches?: Array<{ id: string; name: string }>;
  profile_picture_url?: string;
  full_name?: string;
  is_first_login?: boolean;
  onboarding_completed?: boolean;
  password_changed_at?: string;
  last_login_at?: string;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User | null; error: AuthError | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      return { user: null, error: { message: 'Login failed' } };
    }

    // Fetch user details from database
    const userData = await getUserDetails(data.user.id);
    return { user: userData, error: null };
  } catch (error: any) {
    return { user: null, error: { message: error.message } };
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    clearCachedSession(); // Clear the cached token
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: { message: error.message, code: error.code } };
    }
    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const supabase = getSupabaseClient();
    
    // Get session with timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 10000)
    );
    
    const result = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]).catch((err) => {
      console.error('[getCurrentUser] Session fetch failed:', err);
      return { data: { session: null }, error: err };
    }) as any;
    
    const { data: { session }, error: sessionError } = result;
    
    if (sessionError) {
      console.error('[getCurrentUser] Session error:', sessionError);
      return null;
    }
    
    if (!session) {
      console.log('[getCurrentUser] No session found');
      return null;
    }
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[getCurrentUser] User error:', userError);
      return null;
    }
    
    if (!user) {
      console.log('[getCurrentUser] No user found');
      return null;
    }

    console.log('[getCurrentUser] Fetching user details for:', user.id);
    
    // Get user details from database with timeout
    const detailsPromise = getUserDetails(user.id);
    const detailsTimeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('User details timeout')), 5000)
    );
    
    const userDetails = await Promise.race([
      detailsPromise,
      detailsTimeoutPromise
    ]).catch((err) => {
      console.error('[getCurrentUser] User details fetch failed:', err);
      return null;
    });
    
    if (!userDetails) {
      console.error('[getCurrentUser] Failed to get user details');
      return null;
    }
    
    console.log('[getCurrentUser] Successfully fetched user:', userDetails.email);
    return userDetails;
  } catch (error) {
    console.error('[getCurrentUser] Unexpected error:', error);
    return null;
  }
};

/**
 * Get user details from database
 */
export const getUserDetails = async (userId: string): Promise<User | null> => {
  try {
    console.log('[getUserDetails] Fetching for user ID:', userId);
    const supabase = getSupabaseClient();
    
    // Try to fetch from user_auth_status view (new schema)
    const { data, error } = await supabase
      .from('user_auth_status')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getUserDetails] Database error:', error);
      return null;
    }
    
    if (!data) {
      console.error('[getUserDetails] No data returned');
      return null;
    }

    console.log('[getUserDetails] Successfully fetched user data');
    
    // Parse branches if it's a JSON string
    let branchesArray = data.branches;
    if (typeof branchesArray === 'string') {
      try {
        branchesArray = JSON.parse(branchesArray);
      } catch (e) {
        console.error('[getUserDetails] Failed to parse branches JSON:', e);
        branchesArray = [];
      }
    }
    
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      fullName: data.full_name,
      full_name: data.full_name,
      isActive: data.is_active,
      requires2FA: data.requires_2fa || false,
      branch_id: data.primary_branch_id, // For backward compatibility
      branch_name: data.primary_branch_name,
      primary_branch_id: data.primary_branch_id,
      primary_branch_name: data.primary_branch_name,
      branches: Array.isArray(branchesArray) ? branchesArray : [],
      profile_picture_url: data.profile_picture_url,
      is_first_login: data.is_first_login ?? false,
      onboarding_completed: data.onboarding_completed ?? true,
      password_changed_at: data.password_changed_at,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('[getUserDetails] Unexpected error:', error);
    return null;
  }
};

/**
 * Enroll in 2FA (TOTP)
 */
export const enroll2FA = async (): Promise<{
  qrCode: string | null;
  secret: string | null;
  factorId: string | null;
  error: AuthError | null;
}> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error) {
      return {
        qrCode: null,
        secret: null,
        factorId: null,
        error: { message: error.message },
      };
    }

    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
      error: null,
    };
  } catch (error: any) {
    return {
      qrCode: null,
      secret: null,
      factorId: null,
      error: { message: error.message },
    };
  }
};

/**
 * Verify 2FA code
 */
export const verify2FA = async (
  factorId: string,
  code: string
): Promise<{ success: boolean; error: AuthError | null }> => {
  try {
    const supabase = getSupabaseClient();
    // First, create a challenge
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challengeData) {
      return {
        success: false,
        error: { message: challengeError?.message || 'Failed to create challenge' },
      };
    }

    // Then verify the code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
};

/**
 * List user's MFA factors
 */
export const listMFAFactors = async (): Promise<{
  factors: any[];
  error: AuthError | null;
}> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      return { factors: [], error: { message: error.message } };
    }

    return { factors: data.totp || [], error: null };
  } catch (error: any) {
    return { factors: [], error: { message: error.message } };
  }
};

/**
 * Unenroll from 2FA
 */
export const unenroll2FA = async (
  factorId: string
): Promise<{ success: boolean; error: AuthError | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  email: string
): Promise<{ success: boolean; error: AuthError | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
};

/**
 * Update password
 */
export const updatePassword = async (
  newPassword: string
): Promise<{ success: boolean; error: AuthError | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
};

/**
 * Get authentication error message
 */
export const getAuthErrorMessage = (error: any): string => {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please confirm your email address',
    'User not found': 'User account not found',
    'Invalid token': 'Your session has expired. Please login again.',
    'Token expired': 'Your session has expired. Please login again.',
    'User already registered': 'An account with this email already exists',
    'Password is too weak': 'Password does not meet security requirements',
    'Invalid TOTP code': 'Invalid verification code. Please try again.',
  };

  const message = error?.message || error?.error_description || error;
  return errorMessages[message] || 'An authentication error occurred';
};

/**
 * Check if user session is valid
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    return false;
  }
};

/**
 * Refresh session
 */
export const refreshSession = async (): Promise<{
  success: boolean;
  error: AuthError | null;
}> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
};
