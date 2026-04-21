import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a fresh client instance
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token',
    },
    global: {
      headers: {
        'x-client-info': 'urbanconnect-frontend',
      },
      fetch: (url, options = {}) => {
        // Add timeout to all Supabase requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
    // Add realtime configuration to prevent connection issues
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// Main client instance
let supabaseInstance: SupabaseClient | null = null;

// Get or create the Supabase client
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// REMOVED: resetSupabaseClient() - we don't need to reset the client
// Supabase's signOut() handles cleanup internally, and resetting creates
// the risk of split-state bugs with multiple client instances

// Export the default instance for backward compatibility
export const supabase = getSupabaseClient();

// Store the current session in memory
let currentSession: { access_token: string; expires_at?: number } | null = null;

// Set up auth state listener to keep session in sync
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
    if (event === 'SIGNED_OUT' || !session) {
      currentSession = null;
      console.log('Session cleared from memory');
    } else if (session) {
      currentSession = {
        access_token: session.access_token,
        expires_at: session.expires_at,
      };
      const expiresDate = session.expires_at ? new Date(session.expires_at * 1000) : null;
      console.log('Session stored in memory, expires at:', expiresDate?.toISOString() || 'unknown');
      
      // Log time until expiration
      if (session.expires_at) {
        const timeUntilExpiry = session.expires_at * 1000 - Date.now();
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
        console.log(`Token will expire in ${minutesUntilExpiry} minutes`);
      }
    }
  });

  // Initialize session on load
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentSession = {
        access_token: session.access_token,
        expires_at: session.expires_at,
      };
      const expiresDate = session.expires_at ? new Date(session.expires_at * 1000) : null;
      console.log('Initial session loaded, expires at:', expiresDate?.toISOString() || 'unknown');
      
      // Log time until expiration
      if (session.expires_at) {
        const timeUntilExpiry = session.expires_at * 1000 - Date.now();
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
        console.log(`Token will expire in ${minutesUntilExpiry} minutes`);
      }
    }
  });
}

/**
 * Get the current session from memory (synchronous)
 */
export function getCurrentSession() {
  return currentSession;
}

/**
 * Clear the current session from memory
 */
export function clearCurrentSession() {
  console.log('[Supabase] Clearing session from memory');
  currentSession = null;
}
