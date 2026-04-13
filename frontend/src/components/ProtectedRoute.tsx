'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'superadmin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log('ProtectedRoute - loading:', loading, 'user:', user, 'pathname:', pathname);

  useEffect(() => {
    console.log('ProtectedRoute useEffect - loading:', loading, 'user:', user);
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to login
        console.log('No user, redirecting to login');
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (requiredRole && user.role !== requiredRole) {
        // Not authorized for this role
        if (requiredRole === 'superadmin' && user.role === 'admin') {
          // Admin trying to access superadmin route, redirect to dashboard
          console.log('Admin accessing superadmin route, redirecting to dashboard');
          router.push('/dashboard');
        }
      } else {
        console.log('User authenticated and authorized');
      }
    }
  }, [user, loading, router, pathname, requiredRole]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // Check role authorization
  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  // User is authenticated and authorized
  return <>{children}</>;
}
