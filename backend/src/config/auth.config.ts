/**
 * Authentication Configuration
 * Centralized configuration for Supabase Auth settings
 */

export const authConfig = {
  // JWT Settings
  jwt: {
    expirySeconds: 3600, // 1 hour
    refreshExpirySeconds: 604800, // 7 days
  },

  // Password Requirements
  password: {
    minLength: 8,
    requireUppercase: false,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  // 2FA Settings
  mfa: {
    enabled: true,
    issuerName: 'UrbanConnect ISP',
    totpPeriod: 30, // seconds
    totpDigits: 6,
    // Roles that require 2FA
    requiredRoles: ['admin', 'superadmin'],
  },

  // Session Settings
  session: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 60,
  },

  // Email Settings
  email: {
    confirmationRequired: false, // Disabled for internal staff
    changeConfirmationRequired: true,
    passwordRecoveryEnabled: true,
  },

  // Security Settings
  security: {
    publicSignupsEnabled: false, // Only superadmins can create accounts
    emailDomainWhitelist: [], // Empty = allow all domains
    ipWhitelist: [], // Empty = allow all IPs
  },
};

/**
 * Check if a role requires 2FA
 */
export const roleRequires2FA = (role: string): boolean => {
  return authConfig.mfa.requiredRoles.includes(role);
};

/**
 * Validate password meets requirements
 */
export const validatePassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < authConfig.password.minLength) {
    errors.push(
      `Password must be at least ${authConfig.password.minLength} characters`
    );
  }

  if (authConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (authConfig.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (authConfig.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    authConfig.password.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
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
  };

  const message = error?.message || error?.error_description || error;
  return errorMessages[message] || 'An authentication error occurred';
};

export default authConfig;
