'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'superadmin' | 'system_administrator';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log('ProtectedRoute - loading:', loading, 'user:', user, 'pathname:', pathname);

  useEffect(() => {
    console.log('ProtectedRoute useEffect - loading:', loading, 'user:', user, 'requiredRole:', requiredRole);
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to login
        console.log('No user, redirecting to login');
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (requiredRole) {
        // Check role authorization
        // System administrators have same access as superadmins
        const hasElevatedAccess = user.role === 'superadmin' || user.role === 'system_administrator';
        const isAuthorized = 
          user.role === requiredRole || 
          (requiredRole === 'superadmin' && hasElevatedAccess);
        
        console.log('Authorization check:', {
          userRole: user.role,
          requiredRole,
          hasElevatedAccess,
          isAuthorized
        });
        
        if (!isAuthorized) {
          // Not authorized for this role, redirect to dashboard
          console.log(`User role ${user.role} not authorized for ${requiredRole}, redirecting to dashboard`);
          router.push('/dashboard');
        } else {
          console.log('User authenticated and authorized');
        }
      } else {
        console.log('User authenticated and authorized (no role requirement)');
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
  // System administrators have same access as superadmins
  const hasElevatedAccess = user.role === 'superadmin' || user.role === 'system_administrator';
  
  console.log('Final authorization check:', {
    userRole: user.role,
    requiredRole,
    hasElevatedAccess,
    willRender: !requiredRole || user.role === requiredRole || (requiredRole === 'superadmin' && hasElevatedAccess)
  });
  
  if (requiredRole) {
    const isAuthorized = 
      user.role === requiredRole || 
      (requiredRole === 'superadmin' && hasElevatedAccess);
    
    if (!isAuthorized) {
      console.log('Access denied, returning null');
      return null;
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}
