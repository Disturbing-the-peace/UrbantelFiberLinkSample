'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, User } from '@/lib/auth';
import { getSupabaseClient, clearCurrentSession } from '@/lib/supabase';
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
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        // If it's a refresh token error, it means we're logged out - this is expected
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          console.log('AuthContext: No valid session found (expected after logout)');
        }
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
          // If refresh fails with invalid token, user is logged out
          if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
            console.log('AuthContext: Invalid refresh token, clearing user state');
            setUser(null);
          }
        } else if (data.session) {
          console.log('AuthContext: Token refreshed proactively');
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error: any) {
        console.error('AuthContext: Error during proactive refresh:', error);
        // If refresh fails, assume logged out
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          setUser(null);
        }
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
      
      // Get the Supabase client
      console.log('AuthContext: Getting Supabase client...');
      const supabase = getSupabaseClient();
      
      // Sign out with global scope FIRST (this clears Supabase's internal storage)
      console.log('AuthContext: Calling supabase.auth.signOut()...');
      const signOutPromise = supabase.auth.signOut({ scope: 'global' });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout')), 5000)
      );
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise])
        .catch((err) => {
          console.error('SignOut timed out or failed:', err);
          return { error: err };
        }) as any;
        
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('AuthContext: SignOut successful');
      }
      
      // Clear user state
      console.log('AuthContext: Clearing user state...');
      setUser(null);
      
      // Clear in-memory session
      console.log('AuthContext: Clearing in-memory session...');
      clearCurrentSession();
      
      // Clear any cached data
      console.log('AuthContext: Clearing cached session...');
      clearCachedSession();
      
      // Clear all browser storage thoroughly
      if (typeof window !== 'undefined') {
        console.log('AuthContext: Clearing browser storage...');
        // Get all localStorage keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            keysToRemove.push(key);
          }
        }
        
        // Remove all keys
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        console.log('AuthContext: All storage cleared');
      }
      
      console.log('AuthContext: Redirecting to login...');
      
      // Force complete page reload to clear all state
      window.location.replace('/login?logout=success');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear everything and redirect
      console.log('AuthContext: Error occurred, forcing cleanup and redirect...');
      setUser(null);
      clearCurrentSession();
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
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
