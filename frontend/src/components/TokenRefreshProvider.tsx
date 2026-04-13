'use client';

import { useEffect } from 'react';
import { startTokenRefreshService, stopTokenRefreshService } from '@/lib/tokenRefresh';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Token Refresh Provider
 * Starts the background token refresh service when mounted
 * Stops it when unmounted
 */
export default function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only start if user is logged in
    const checkAndStart = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[TokenRefreshProvider] User logged in, starting token refresh service');
        startTokenRefreshService();
      } else {
        console.log('[TokenRefreshProvider] No active session, not starting service');
      }
    };

    checkAndStart();

    const supabase = getSupabaseClient();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('[TokenRefreshProvider] User signed in, starting token refresh service');
        startTokenRefreshService();
      } else if (event === 'SIGNED_OUT') {
        console.log('[TokenRefreshProvider] User signed out, stopping token refresh service');
        stopTokenRefreshService();
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('[TokenRefreshProvider] Component unmounting, stopping service');
      stopTokenRefreshService();
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
