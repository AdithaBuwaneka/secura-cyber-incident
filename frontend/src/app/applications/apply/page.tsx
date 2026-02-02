'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import SecurityApplicationForm from '@/components/forms/SecurityApplicationForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import { checkCanApply } from '@/store/applications/applicationSlice';
import { RootState, AppDispatch } from '@/store';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ApplyPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { canApply } = useSelector((state: RootState) => state.applications);
  const { userProfile } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkCanApply());
  }, [dispatch]);

  // Redirect if user cannot apply
  useEffect(() => {
    if (canApply === false && userProfile) {
      if (userProfile.role === 'security_team') {
        toast.error('You are already a member of the security team');
        router.push('/dashboard');
      } else if (userProfile.role === 'admin') {
        toast.error('Admins cannot apply to the security team');
        router.push('/dashboard');
      }
    }
  }, [canApply, userProfile, router]);

  const handleSuccess = () => {
    // Success message is already shown in the form component
    router.push('/applications/status');
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (!canApply && userProfile?.role === 'employee') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#1A1D23] p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Cannot Apply</h2>
              <p className="text-gray-400 mb-6">
                You already have a pending application or are not eligible to apply at this time.
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/applications/status"
                  className="px-6 py-3 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors"
                >
                  View Application Status
                </Link>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#1A1D23] p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Link
              href="/dashboard"
              className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Application Form */}
          <SecurityApplicationForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}