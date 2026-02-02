'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RootState } from '@/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('employee' | 'security_team' | 'admin')[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [],
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, userProfile, loading, isInitialized } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    // Only check auth after Firebase has initialized
    if (isInitialized && !loading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }
      
      if (allowedRoles.length > 0 && userProfile && !allowedRoles.includes(userProfile.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, userProfile, loading, isInitialized, allowedRoles, router, redirectTo]);

  // Show loading while Firebase is initializing or auth state is being determined
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4FF] mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (allowedRoles.length > 0 && userProfile && !allowedRoles.includes(userProfile.role))) {
    return null;
  }

  return <>{children}</>;
}