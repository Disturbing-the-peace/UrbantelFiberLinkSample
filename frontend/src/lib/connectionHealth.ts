/**
 * Connection Health Monitor
 * Provides utilities to detect and monitor Supabase connection health
 */

import { getSupabaseClient } from './supabase';

let lastSuccessfulRequest = Date.now();

/**
 * Mark a successful request
 */
export function markRequestSuccess() {
  lastSuccessfulRequest = Date.now();
}

/**
 * Check if connection might be stale
 */
export function isConnectionStale(): boolean {
  const timeSinceLastSuccess = Date.now() - lastSuccessfulRequest;
  // Consider stale if no successful request in 5 minutes
  return timeSinceLastSuccess > 5 * 60 * 1000;
}

/**
 * Check if connection appears stale (for logging/monitoring)
 */
export function resetIfStale(): boolean {
  if (isConnectionStale()) {
    console.log('[ConnectionHealth] Connection appears stale - consider refreshing the page');
    return true;
  }
  return false;
}

/**
 * Get connection health stats
 */
export function getConnectionStats() {
  return {
    lastSuccessfulRequest: new Date(lastSuccessfulRequest),
    timeSinceLastSuccess: Date.now() - lastSuccessfulRequest,
    isStale: isConnectionStale(),
  };
}

/**
 * Test the connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 5000)
      ),
    ]);
    
    if (error) {
      console.error('[ConnectionHealth] Connection test failed:', error);
      return false;
    }
    
    markRequestSuccess();
    return true;
  } catch (error) {
    console.error('[ConnectionHealth] Connection test error:', error);
    return false;
  }
}
