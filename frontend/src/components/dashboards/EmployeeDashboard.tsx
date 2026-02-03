'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Plus, 
  FileText, 
  MessageCircle,
  LogOut,
  Bell,
  UserCheck,
  X,
  MapPin,
  User,
  Paperclip,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/auth/authSlice';
import { checkCanApply } from '@/store/applications/applicationSlice';
import IncidentReportForm from '@/components/forms/IncidentReportForm';
import SecurityMessaging from '@/components/messaging/SecurityMessaging';
import IncidentChatButton from '@/components/messaging/IncidentChatButton';
import { useMessaging } from '@/components/messaging/MessagingProvider';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Attachment {
  file_id?: string;
  filename?: string;
  original_filename?: string;
  file_size?: number;
  file_type?: string;
  file_url?: string;
  thumbnail_url?: string;
}

interface Incident {
  id: string;
  title?: string;
  description?: string;
  status: string;
  severity: string;
  incident_type?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  location?: string | {
    address?: string;
    building?: string;
    floor?: string;
    room?: string;
  };
  attachments?: Attachment[];
  assigned_to?: string;
  assigned_to_name?: string;
}

export default function EmployeeDashboard() {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const { canApply } = useSelector((state: RootState) => state.applications);
  const dispatch = useDispatch<AppDispatch>();
  const { unreadCount, isConnected } = useMessaging();
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showMyIncidents, setShowMyIncidents] = useState(false);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch user's incidents
  const fetchMyIncidents = async () => {
    if (idToken) {
      try {
        const response = await fetch(`${API_URL}/api/incidents/?limit=10`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (response.ok) {
          const incidents = await response.json();
          console.log('Employee Dashboard - Fetched incidents:', incidents);
          setMyIncidents(incidents);
        } else {
          console.error('Failed to fetch incidents:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      }
    }
  };

  useEffect(() => {
    dispatch(checkCanApply());
    fetchMyIncidents();

    // Listen for WebSocket updates instead of polling
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'incident_update' || data.type === 'new_message') {
          // Refresh incidents when there's an update
          fetchMyIncidents();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    const ws = (window as unknown as { securaWebSocket?: WebSocket }).securaWebSocket;
    if (ws) {
      ws.addEventListener('message', handleWebSocketMessage);
    }

    return () => {
      if (ws) {
        ws.removeEventListener('message', handleWebSocketMessage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, idToken, API_URL]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };
  
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return { color: 'bg-green-400', text: 'resolved' };
      case 'investigating':
      case 'in_progress':
        return { color: 'bg-orange-400', text: 'being investigated' };
      case 'new':
      case 'pending':
        return { color: 'bg-blue-400', text: 'submitted' };
      default:
        return { color: 'bg-gray-400', text: 'updated' };
    }
  };
  
  // Calculate stats
  const openIncidents = myIncidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const investigatingIncidents = myIncidents.filter(i => i.status === 'investigating' || i.status === 'in_progress').length;
  const resolvedThisMonth = myIncidents.filter(i => {
    if (i.status !== 'resolved' && i.status !== 'closed') return false;
    const dateValue = i.resolved_at || i.updated_at;
    if (!dateValue) return false;
    const resolvedDate = new Date(dateValue);
    const now = new Date();
    return resolvedDate.getMonth() === now.getMonth() && resolvedDate.getFullYear() === now.getFullYear();
  }).length;
  return (
    <div className="min-h-screen bg-[#1A1D23]">
      {/* Header */}
      <header className="bg-[#2A2D35] border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-[#00D4FF]" />
              <div>
                <h1 className="text-xl font-bold text-white">Secura</h1>
                <p className="text-xs text-gray-400">👤 Employee Dashboard</p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{unreadCount}</span>
                  </span>
                )}
              </button>
              
              <div className="flex items-center space-x-3">
                
                
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{userProfile?.full_name}</p>
                  <p className="text-xs text-gray-400">{userProfile?.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Profile Avatar */}
                  <Link href="/profile/edit" className="relative group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-600 hover:border-[#00D4FF] transition-all duration-200 group-hover:scale-105">
                      {userProfile?.full_name ? (
                        userProfile.full_name.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)
                      ) : (
                        'EM'
                      )}
                    </div>
                    {/* Online Status Indicator */}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#2A2D35]"></div>
                    {/* Tooltip */}
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Edit Profile
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {userProfile?.full_name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-400">
            Report security incidents quickly and track their progress in real-time.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">My Open Incidents</p>
                <p className="text-3xl font-bold text-white">{openIncidents}</p>
                <p className="text-xs text-gray-500 mt-1">Active reports</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Under Investigation</p>
                <p className="text-3xl font-bold text-white">{investigatingIncidents}</p>
                <p className="text-xs text-gray-500 mt-1">Security team assigned</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Resolved This Month</p>
                <p className="text-3xl font-bold text-white">{resolvedThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully handled</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowIncidentForm(true)}
                className="w-full bg-[#00D4FF] text-[#1A1D23] p-4 rounded-lg text-left transition-all hover:bg-[#00C4EF] hover:scale-[1.02] hover:shadow-lg group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Report New Incident</h4>
                    <p className="text-sm opacity-80 mt-1">Submit a security incident report</p>
                  </div>
                  <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                </div>
              </button>
              
              <button
                onClick={() => setShowMyIncidents(true)}
                className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-[1.02] hover:shadow-lg group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">View My Incidents</h4>
                    <p className="text-sm text-gray-300 mt-1">Track your submitted reports ({myIncidents.length} total)</p>
                  </div>
                  <FileText className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </div>
              </button>
              
              <button 
                onClick={() => setShowMessaging(true)}
                className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-[1.02] hover:shadow-lg group relative overflow-visible"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium">Security Chat</h4>
                    <p className="text-sm text-gray-300 mt-1">Chat with security team</p>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-xs text-gray-400">
                        {isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0 ml-4">
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center z-10 text-xs text-white font-bold min-w-[16px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <MessageCircle className="h-6 w-6 text-gray-300 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </button>

              {/* Security Team Application Button */}
              {canApply && (
                <Link
                  href="/applications/apply"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg text-left transition-all hover:from-purple-700 hover:to-blue-700 hover:scale-[1.02] hover:shadow-lg group block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Join Security Team</h4>
                      <p className="text-sm text-gray-100 mt-1">Apply to become a security team member</p>
                    </div>
                    <UserCheck className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Application Status Button */}
              <Link
                href="/applications/status"
                className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-[1.02] hover:shadow-lg group block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Application Status</h4>
                    <p className="text-sm text-gray-300 mt-1">Track your security team applications</p>
                  </div>
                  <FileText className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {myIncidents.length > 0 ? (
                myIncidents.slice(0, 5).map((incident) => {
                  const statusInfo = getStatusIcon(incident.status);
                  const timeAgo = getTimeAgo(new Date(incident.updated_at || incident.created_at));
                  
                  return (
                    <div key={incident.id} className="flex items-center space-x-3 p-3 bg-[#1A1D23] rounded-lg">
                      <div className={`w-2 h-2 ${statusInfo.color} rounded-full`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          Incident: {incident.title || incident.description?.substring(0, 40) + '...' || 'Untitled'} {statusInfo.text}
                        </p>
                        <p className="text-xs text-gray-400">
                          {incident.severity.toUpperCase()} • {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No recent incidents</p>
                  <p className="text-gray-500 text-xs mt-1">Your reported incidents will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="mt-8 bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">🛡️ Security Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#1A1D23] rounded-lg">
              <h4 className="font-medium text-white mb-2">Recognize Phishing</h4>
              <p className="text-sm text-gray-400">Always verify sender identity before clicking links or downloading attachments.</p>
            </div>
            <div className="p-4 bg-[#1A1D23] rounded-lg">
              <h4 className="font-medium text-white mb-2">Report Suspicious Activity</h4>
              <p className="text-sm text-gray-400">When in doubt, report it. Better safe than sorry when it comes to security.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Incident Report Modal */}
      {showIncidentForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <IncidentReportForm 
              onClose={() => setShowIncidentForm(false)} 
              onSuccess={() => {
                // Refresh incidents after successful submission
                fetchMyIncidents();
              }}
            />
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {showMessaging && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl h-[600px]">
            <SecurityMessaging onClose={() => setShowMessaging(false)} />
          </div>
        </div>
      )}

      {/* My Incidents Modal */}
      {showMyIncidents && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#2A2D35] rounded-lg border border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">My Incidents</h2>
                <p className="text-sm text-gray-400 mt-1">Track all your submitted security reports</p>
              </div>
              <button
                onClick={() => setShowMyIncidents(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {myIncidents.length > 0 ? (
                <div className="p-6 space-y-4">
                  {myIncidents.map((incident) => {
                    const statusInfo = getStatusIcon(incident.status);
                    const timeAgo = getTimeAgo(new Date(incident.created_at));
                    const updatedAgo = getTimeAgo(new Date(incident.updated_at || incident.created_at));
                    
                    return (
                      <div key={incident.id} className="bg-[#1A1D23] p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className={`w-3 h-3 ${statusInfo.color} rounded-full`}></div>
                              <h3 className="font-medium text-white">
                                {incident.title || 'Untitled Incident'}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                incident.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                incident.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                                incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>
                                {incident.severity.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                              {incident.description || 'No description provided'}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <span>Type: {incident.incident_type?.replace('_', ' ') || 'Unknown'}</span>
                              <span>•</span>
                              <span>Status: {statusInfo.text}</span>
                              <span>•</span>
                              <span>Reported: {timeAgo}</span>
                              {incident.assigned_to_name && (
                                <>
                                  <span>•</span>
                                  <span>Assigned to: <span className="text-[#00D4FF]">{incident.assigned_to_name}</span></span>
                                </>
                              )}
                              {incident.updated_at !== incident.created_at && (
                                <>
                                  <span>•</span>
                                  <span>Last updated: {updatedAgo}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 ml-4">
                            <IncidentChatButton 
                              incidentId={incident.id}
                              incidentTitle={incident.title}
                              assignedToId={incident.assigned_to}
                              assignedToName={incident.assigned_to_name}
                              incidentStatus={incident.status}
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                        </div>
                        
                        {/* Additional Info */}
                        {(incident.location || (incident.attachments?.length ?? 0) > 0 || incident.assigned_to_name) && (
                          <div className="space-y-3 pt-3 border-t border-gray-700">
                            <div className="flex flex-wrap items-center gap-4">
                              {incident.location && (
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    {typeof incident.location === 'string' 
                                      ? incident.location 
                                      : incident.location.address || 
                                        `${incident.location.building || ''}${incident.location.floor ? ` Floor ${incident.location.floor}` : ''}${incident.location.room ? ` Room ${incident.location.room}` : ''}`.trim() ||
                                        'Location provided'
                                    }
                                  </span>
                                </div>
                              )}
                              {(incident.attachments?.length ?? 0) > 0 && (
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{incident.attachments!.length} attachment{incident.attachments!.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {incident.assigned_to_name && (
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <User className="h-3 w-3" />
                                  <span>Assigned to: {incident.assigned_to_name}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Attachments Display */}
                            {incident.attachments && incident.attachments.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-400 mb-2">Attachments:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {incident.attachments.map((attachment: Attachment, index: number) => {
                                    const isImage = attachment.file_type?.startsWith('image/') ||
                                                   attachment.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                                                   attachment.original_filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                                    return (
                                      <div key={index} className="bg-[#2A2D35] p-2 rounded border border-gray-600">
                                        <div className="flex items-start space-x-2">
                                          {isImage ? (
                                            <ImageIcon className="h-4 w-4 text-blue-400 mt-1 flex-shrink-0" />
                                          ) : (
                                            <FileText className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white font-medium truncate">
                                              {attachment.original_filename || attachment.filename || `Attachment ${index + 1}`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                              {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                                            </p>

                                            {/* Image Preview */}
                                            {isImage && attachment.file_url && (
                                              <div className="mt-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={attachment.thumbnail_url || attachment.file_url}
                                                  alt={attachment.original_filename || 'Attachment'}
                                                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={() => window.open(attachment.file_url, '_blank')}
                                                />
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Download Button */}
                                          {attachment.file_url && (
                                            <button
                                              onClick={() => window.open(attachment.file_url, '_blank')}
                                              className="p-1 text-gray-400 hover:text-[#00D4FF] transition-colors flex-shrink-0"
                                              title="Download/View"
                                            >
                                              <Download className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Incidents Yet</h3>
                  <p className="text-gray-400 mb-4">You haven&apos;t reported any security incidents yet.</p>
                  <button
                    onClick={() => {
                      setShowMyIncidents(false);
                      setShowIncidentForm(true);
                    }}
                    className="bg-[#00D4FF] text-[#1A1D23] px-4 py-2 rounded-lg font-medium hover:bg-[#00C4EF] transition-colors"
                  >
                    Report Your First Incident
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}