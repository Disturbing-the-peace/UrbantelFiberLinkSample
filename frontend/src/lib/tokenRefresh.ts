/**
 * Background Token Refresh Service
 * Automatically refreshes JWT tokens before they expire
 */

import { getSupabaseClient } from './supabase';

let refreshInterval: NodeJS.Timeout | null = null;
let isRefreshing = false;

/**
 * Start the background token refresh service
 * Checks token expiration every minute and refreshes if needed
 */
export function startTokenRefreshService() {
  if (typeof window === 'undefined') {
    return; // Only run in browser
  }

  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  console.log('[TokenRefresh] Service started');

  // Check immediately on start
  checkAndRefreshToken();

  // Then check every minute
  refreshInterval = setInterval(() => {
    checkAndRefreshToken();
  }, 60 * 1000); // Check every 60 seconds
}

/**
 * Stop the background token refresh service
 */
export function stopTokenRefreshService() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[TokenRefresh] Service stopped');
  }
}

/**
 * Check if token needs refresh and refresh if necessary
 */
async function checkAndRefreshToken() {
  if (isRefreshing) {
    console.log('[TokenRefresh] Already refreshing, skipping...');
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[TokenRefresh] Error getting session:', error);
      return;
    }

    if (!session) {
      console.log('[TokenRefresh] No active session');
      return;
    }

    // Check if token is about to expire (within 10 minutes)
    const expiresAt = session.expires_at;
    if (!expiresAt) {
      console.warn('[TokenRefresh] No expiration time found');
      return;
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const timeUntilExpiry = expiresAt - now;
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);

    // Log status every 5 minutes
    if (minutesUntilExpiry % 5 === 0) {
      console.log(`[TokenRefresh] Token expires in ${minutesUntilExpiry} minutes`);
    }

    // Refresh if token expires in less than 10 minutes
    if (timeUntilExpiry < 10 * 60) {
      console.log(`[TokenRefresh] Token expiring soon (${minutesUntilExpiry} minutes), refreshing...`);
      await refreshToken();
    }
  } catch (error) {
    console.error('[TokenRefresh] Error checking token:', error);
  }
}

/**
 * Manually refresh the token
 */
export async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    console.log('[TokenRefresh] Already refreshing, waiting...');
    // Wait for current refresh to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  isRefreshing = true;

  try {
    console.log('[TokenRefresh] Refreshing token...');
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('[TokenRefresh] Failed to refresh token:', error);
      
      // If refresh fails, user might need to log in again
      if (error.message.includes('refresh_token_not_found') || 
          error.message.includes('invalid_grant')) {
        console.error('[TokenRefresh] Session expired, user needs to log in again');
        // Optionally redirect to login
        // window.location.href = '/login';
      }
      
      return false;
    }

    if (!data.session) {
      console.error('[TokenRefresh] No session returned after refresh');
      return false;
    }

    const expiresAt = data.session.expires_at;
    const expiresDate = expiresAt ? new Date(expiresAt * 1000) : null;
    console.log('[TokenRefresh] Token refreshed successfully, new expiry:', expiresDate?.toISOString() || 'unknown');
    
    if (expiresAt) {
      const timeUntilExpiry = expiresAt * 1000 - Date.now();
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
      console.log(`[TokenRefresh] New token will expire in ${minutesUntilExpiry} minutes`);
    }

    return true;
  } catch (error) {
    console.error('[TokenRefresh] Exception during token refresh:', error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Force an immediate token refresh
 */
export async function forceRefreshToken(): Promise<boolean> {
  console.log('[TokenRefresh] Force refresh requested');
  return await refreshToken();
}
