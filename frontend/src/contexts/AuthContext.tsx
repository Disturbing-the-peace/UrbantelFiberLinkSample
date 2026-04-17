'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut as authSignOut, User } from '@/lib/auth';
import { getSupabaseClient, resetSupabaseClient, clearCurrentSession } from '@/lib/supabase';
import { clearCachedSession } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      console.log('AuthContext: Refreshing user...');
      const currentUser = await getCurrentUser();
      console.log('AuthContext: Refreshed user result:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Check initial session
    const initAuth = async () => {
      console.log('AuthContext: Initializing auth...');
      try {
        const currentUser = await getCurrentUser();
        console.log('AuthContext: Current user:', currentUser);
        setUser(currentUser);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('AuthContext: Loading complete');
      }
    };

    initAuth();

    const supabase = getSupabaseClient();
    
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, 'Session:', !!session);
      if (event === 'SIGNED_IN' && session) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else if (event === 'SIGNED_OUT' || !session) {
        console.log('AuthContext: User signed out, clearing state');
        setUser(null);
        // Don't redirect here as signOut function handles it
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('AuthContext: Token refreshed successfully');
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    });

    // Proactive token refresh - refresh every 50 minutes (before 60-minute expiration)
    const refreshInterval = setInterval(async () => {
      console.log('AuthContext: Proactively refreshing token...');
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('AuthContext: Token refresh failed:', error);
        } else if (data.session) {
          console.log('AuthContext: Token refreshed proactively');
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('AuthContext: Error during proactive refresh:', error);
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [router]);

  const signOut = async () => {
    try {
      console.log('AuthContext: Signing out...');
      
      // Clear user state immediately
      setUser(null);
      
      // Clear in-memory session
      clearCurrentSession();
      
      // Reset Supabase client to clear any cached sessions
      const supabase = resetSupabaseClient();
      
      // Sign out with global scope
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Clear any cached data
      clearCachedSession();
      
      // Clear all browser storage
      if (typeof window !== 'undefined') {
        // Clear all localStorage items
        localStorage.clear();
        sessionStorage.clear();
        
        // Also clear specific Supabase keys
        localStorage.removeItem('sb-auth-token');
        localStorage.removeItem('supabase.auth.token');
        
        // Clear any cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      console.log('AuthContext: All data cleared, redirecting...');
      
      // Force complete page reload to clear all state
      window.location.replace('/login?logout=success');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear everything and redirect
      setUser(null);
      clearCurrentSession();
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.removeItem('sb-auth-token');
        localStorage.removeItem('supabase.auth.token');
      }
      window.location.replace('/login?logout=success');
    }
  };

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
