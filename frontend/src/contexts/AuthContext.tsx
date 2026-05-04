'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { getCurrentUser, User } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2 hours inactivity timeout
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut({ scope: 'global' });
      
      setUser(null);
      
      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Redirect to login
      window.location.replace('/login?logout=success');
    } catch (error) {
      logger.error('Error signing out:', error);
      // Force cleanup even on error
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      window.location.replace('/login?logout=success');
    }
  }, []);

  useEffect(() => {
    // Initialize auth
    const initAuth = async () => {
      logger.log('[AuthContext] Initializing auth...');
      try {
        const currentUser = await getCurrentUser();
        logger.log('[AuthContext] Initial user:', currentUser);
        setUser(currentUser);
      } catch (error) {
        logger.error('[AuthContext] Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
        logger.log('[AuthContext] Loading complete');
      }
    };

    initAuth();

    const supabase = getSupabaseClient();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('[AuthContext] Auth state change:', event, 'Has session:', !!session);
      
      if (event === 'SIGNED_IN' && session) {
        // Only fetch user if we don't already have one
        // This prevents unnecessary refetching
        if (!userRef.current) {
          logger.log('[AuthContext] User signed in, fetching user details');
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            logger.error('[AuthContext] Failed to fetch user after SIGNED_IN');
          }
        } else {
          logger.log('[AuthContext] User already exists, skipping fetch');
        }
      } else if (event === 'SIGNED_OUT') {
        logger.log('[AuthContext] User explicitly signed out');
        setUser(null);
      } else if (event === 'USER_UPDATED' && session) {
        logger.log('[AuthContext] User updated, refetching');
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } else {
        logger.log('[AuthContext] Other auth event, ignoring:', event);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Inactivity timeout - auto logout after 2 hours of inactivity
  useEffect(() => {
    if (!user) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      // Clear existing timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      // Set new timer for 2 hours
      inactivityTimer = setTimeout(() => {
        logger.log('Session expired due to inactivity');
        signOut();
      }, INACTIVITY_TIMEOUT);
    };

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [user, signOut]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
