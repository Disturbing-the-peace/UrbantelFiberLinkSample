'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut as authSignOut, User } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

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
      const currentUser = await getCurrentUser();
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
      console.log('AuthContext: Auth state changed:', event);
      if (event === 'SIGNED_IN' && session) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/login');
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
      
      // Sign out from Supabase
      const { error } = await authSignOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      
      console.log('AuthContext: Sign out successful, redirecting...');
      
      // Force redirect immediately
      router.push('/login?logout=success');
      
      // Force page reload to clear all state
      setTimeout(() => {
        window.location.href = '/login?logout=success';
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear state and redirect even if there's an error
      setUser(null);
      router.push('/login?logout=success');
      setTimeout(() => {
        window.location.href = '/login?logout=success';
      }, 100);
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
