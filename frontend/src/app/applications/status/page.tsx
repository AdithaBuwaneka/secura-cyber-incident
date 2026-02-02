'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Plus } from 'lucide-react';
import ApplicationStatus from '@/components/applications/ApplicationStatus';
import ProtectedRoute from '@/components/ProtectedRoute';
import { checkCanApply } from '@/store/applications/applicationSlice';
import { RootState, AppDispatch } from '@/store';
import Link from 'next/link';

export default function ApplicationStatusPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { canApply } = useSelector((state: RootState) => state.applications);
  const { userProfile } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkCanApply());
  }, [dispatch]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#1A1D23] p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>

            {/* Apply Button */}
            {canApply && userProfile?.role === 'employee' && (
              <Link
                href="/applications/apply"
                className="flex items-center px-4 py-2 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Apply to Security Team
              </Link>
            )}
          </div>

          {/* Application Status */}
          <ApplicationStatus />
        </div>
      </div>
    </ProtectedRoute>
  );
}