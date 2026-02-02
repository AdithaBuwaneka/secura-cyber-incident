'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, CheckCircle, XCircle, FileText, Calendar, User } from 'lucide-react';
import { fetchMyApplications } from '@/store/applications/applicationSlice';
import { RootState, AppDispatch } from '@/store';


export default function ApplicationStatus() {
  const dispatch = useDispatch<AppDispatch>();
  const { applications, loading, error } = useSelector((state: RootState) => state.applications);
  const { isInitialized, idToken } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isInitialized && idToken) {
      dispatch(fetchMyApplications());
    }
  }, [dispatch, isInitialized, idToken]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'approved':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'rejected':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
          <span className="ml-3 text-gray-400">Loading your applications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.toLowerCase().includes('invalid authentication token');
    return (
      <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Applications</h3>
          <p className="text-gray-400">{error}</p>
          {isAuthError && (
            <a
              href="/auth/login"
              className="inline-block mt-4 px-4 py-2 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors"
            >
              Go to Login
            </a>
          )}
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Applications Found</h3>
          <p className="text-gray-400">You haven&apos;t submitted any security team applications yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center mb-6">
        <FileText className="h-8 w-8 text-[#00D4FF] mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-white">Application Status</h2>
          <p className="text-gray-400">Track your security team applications</p>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {applications.map((application) => (
          <div key={application.id} className="bg-[#1A1D23] p-6 rounded-lg border border-gray-600">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {getStatusIcon(application.status)}
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center text-gray-400 text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                Submitted: {formatDate(application.created_at)}
              </div>
            </div>

            {/* Application Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reason */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Reason for Joining</h4>
                <p className="text-gray-300 text-sm">{application.reason}</p>
              </div>

              {/* Experience */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Experience</h4>
                <p className="text-gray-300 text-sm">{application.experience}</p>
              </div>

              {/* Certifications */}
              {application.certifications && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Certifications</h4>
                  <p className="text-gray-300 text-sm">{application.certifications}</p>
                </div>
              )}

              {/* Documents */}
              {application.proof_documents && application.proof_documents.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Uploaded Documents</h4>
                  <div className="space-y-1">
                    {application.proof_documents.map((doc, index) => {
                      if (typeof doc === 'object' && doc !== null) {
                        const file = doc as {
                          file_url: string;
                          original_filename?: string;
                          file_name?: string;
                          file_size?: number;
                        };
                        return (
                          <div key={index} className="flex items-center text-gray-300 text-sm">
                            <FileText className="h-3 w-3 text-gray-400 mr-2" />
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-[#00D4FF]"
                            >
                              {file.original_filename || file.file_name}
                            </a>
                            <span className="ml-2 text-xs text-gray-500">
                              {file.file_size ? `(${(file.file_size / 1024 / 1024).toFixed(2)} MB)` : ''}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={index} className="flex items-center text-gray-300 text-sm">
                            <FileText className="h-3 w-3 text-gray-400 mr-2" />
                            {String(doc)}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            {application.admin_notes && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex items-center mb-2">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <h4 className="text-sm font-medium text-white">Admin Notes</h4>
                  {application.reviewed_at && (
                    <span className="ml-auto text-xs text-gray-400">
                      Reviewed: {formatDate(application.reviewed_at)}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm bg-[#2A2D35] p-3 rounded-lg">
                  {application.admin_notes}
                </p>
              </div>
            )}

            {/* Status-specific Messages */}
            {application.status === 'pending' && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Your application is under review. You&apos;ll be notified once an admin makes a decision.
                </p>
              </div>
            )}

            {application.status === 'approved' && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">
                  Congratulations! Your application has been approved. You now have security team access.
                </p>
              </div>
            )}

            {application.status === 'rejected' && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">
                  Your application was not approved at this time. You may apply again in the future.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}