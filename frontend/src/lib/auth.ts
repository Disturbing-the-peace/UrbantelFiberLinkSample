/**
 * Frontend Authentication Utilities
 * Helper functions for Supabase Auth integration
 */

import { getSupabaseClient } from './supabase';
import { clearCachedSession } from './api';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  fullName: string;
  isActive: boolean;
  requires2FA: boolean;
  profile_picture_url?: string;
  full_name?: string;
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
    console.log('getCurrentUser: Checking auth session...');
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('getCurrentUser: Auth user:', user);

    if (!user) {
      console.log('getCurrentUser: No auth user found');
      return null;
    }

    console.log('getCurrentUser: Fetching user details for ID:', user.id);
    const userDetails = await getUserDetails(user.id);
    console.log('getCurrentUser: User details:', userDetails);
    return userDetails;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get user details from database
 */
export const getUserDetails = async (userId: string): Promise<User | null> => {
  try {
    console.log('getUserDetails: Fetching for user ID:', userId);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_auth_status')
      .select('id, email, role, full_name, is_active, requires_2fa, profile_picture_url, created_at')
      .eq('id', userId)
      .single();

    console.log('getUserDetails: Query result - data:', data, 'error:', error);

    if (error || !data) {
      console.error('Error fetching user details:', error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      fullName: data.full_name,
      full_name: data.full_name,
      isActive: data.is_active,
      requires2FA: data.requires_2fa,
      profile_picture_url: data.profile_picture_url,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
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
    'Invalid refresh token': 'Your session has expired. Please login again.',
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
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
};
