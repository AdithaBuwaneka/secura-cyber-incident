'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ProtectedRoute from '@/components/ProtectedRoute';
import EmployeeDashboard from '@/components/dashboards/EmployeeDashboard';
import SecurityTeamDashboard from '@/components/dashboards/SecurityTeamDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default function DashboardPage() {
  const { userProfile, loading, isInitialized } = useSelector((state: RootState) => state.auth);

  const renderDashboard = () => {
    // Show loading state if auth is not initialized or still loading, or if userProfile is not yet loaded
    if (!isInitialized || loading || !userProfile) {
      return (
        <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4FF] mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-gray-500 mt-2">
                Debug: isInitialized={String(isInitialized)}, loading={String(loading)}, userProfile={userProfile ? 'exists' : 'null'}
              </p>
            )}
          </div>
        </div>
      );
    }

    switch (userProfile.role) {
      case 'employee':
        return <EmployeeDashboard />;
      case 'security_team':
        return <SecurityTeamDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <ProtectedRoute>
      {renderDashboard()}
    </ProtectedRoute>
  );
}