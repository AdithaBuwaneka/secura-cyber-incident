'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  X,
  Calendar,
  MapPin,
  User,
  Users,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  ScanLine,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/auth/authSlice';
import SecurityMessaging from '@/components/messaging/SecurityMessaging';
import { useMessaging } from '@/components/messaging/MessagingProvider';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import AIAnalysisDashboard from '@/components/ai/AIAnalysisDashboard';
import SecurityTeamProfile from '@/components/profile/SecurityTeamProfile';
import SecurityHeader from '@/components/security/SecurityHeader';
import SecurityStatsGrid from '@/components/security/SecurityStatsGrid';
import IncidentQueue from '@/components/security/IncidentQueue';
import TeamStatusPanel from '@/components/security/TeamStatusPanel';
import AIInsightsPanel from '@/components/security/AIInsightsPanel';
import IncidentChatButton from '@/components/messaging/IncidentChatButton';
import { Footer } from '@/components/layout';
import toast from 'react-hot-toast';

interface Attachment {
  file_id?: string;
  filename?: string;
  original_filename?: string;
  file_size?: number;
  file_type?: string;
  file_url?: string;
}

interface Incident {
  id: string;
  title?: string;
  description?: string;
  status: string;
  severity: string;
  incident_type?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_department?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_at?: string;
  location?: {
    address?: string;
    building?: string;
    floor?: string;
    room?: string;
  };
  attachments?: Attachment[];
}

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_online: boolean;
  last_activity?: string;
  last_login?: string;
}

interface ImageAnalysisResult {
  summary: string;
  assessment?: string;
  confidence: number;
  extracted_text: string;
  threat_indicators: string[];
  recommendations: string[];
}

export default function SecurityTeamDashboard() {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const { unreadCount } = useMessaging();
  const [searchTerm, setSearchTerm] = useState('');
  const [showMessaging, setShowMessaging] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidentDetails, setShowIncidentDetails] = useState(false);
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [showCriticalIncidents, setShowCriticalIncidents] = useState(false);
  const [criticalIncidents, setCriticalIncidents] = useState<Incident[]>([]);
  const [loadingCritical, setLoadingCritical] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    closed: 0,
    open: 0,
    closed_total: 0,
    critical_high_open: 0
  });
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Fetch critical/high incidents for the modal
  const fetchCriticalIncidents = async () => {
    if (idToken) {
      try {
        setLoadingCritical(true);
        // Fetch incidents with severity filter
        const response = await fetch(`${API_URL}/api/incidents/?limit=100`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const allIncidents = data.incidents || data;
          // Filter for critical/high severity that are not resolved
          const critical = allIncidents.filter((i: Incident) =>
            (i.severity === 'critical' || i.severity === 'high') &&
            i.status !== 'resolved' && i.status !== 'closed'
          );
          setCriticalIncidents(critical);
        }
      } catch (error) {
        console.error('Failed to fetch critical incidents:', error);
      } finally {
        setLoadingCritical(false);
      }
    }
  };

  // FAST: Fetch dashboard stats (counts only)
  const fetchDashboardStats = async () => {
    if (idToken) {
      try {
        const response = await fetch(`${API_URL}/api/incidents/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard stats:', data);
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    }
  };

  // FAST: Fetch recent incidents for queue (no attachments)
  const fetchIncidents = async () => {
    if (idToken) {
      try {
        setLoading(true);
        // Use FAST endpoint - only gets 10 recent incidents without attachments
        const response = await fetch(`${API_URL}/api/incidents/dashboard/queue?limit=10`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard queue:', data);
          setIncidents(data.incidents || data);
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
        toast.error('Failed to load incidents');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    
    // Fetch team members with online status
    const fetchTeamMembers = async () => {
      if (idToken) {
        try {
          const response = await fetch(`${API_URL}/api/user-activity/team-status`, {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const teamStatus = await response.json();
            setTeamMembers(teamStatus.members);
            console.log('Team status:', teamStatus);
          } else {
            // Fallback to admin/users endpoint if user-activity fails
            console.log('Falling back to admin/users endpoint');
            const fallbackResponse = await fetch(`${API_URL}/api/admin/users`, {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            
            if (fallbackResponse.ok) {
              const allUsers = await fallbackResponse.json();
              const securityTeam = allUsers.filter((user: { role: string }) =>
                user.role === 'security_team'
              ).map((user: { uid: string; email: string; full_name: string; role: string; last_login?: string }) => ({
                user_id: user.uid,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_online: false, // Default to offline for fallback
                last_activity: new Date(user.last_login || new Date()).toISOString(),
                last_login: user.last_login
              }));
              setTeamMembers(securityTeam);
            }
          }
        } catch (error) {
          console.error('Failed to fetch team members:', error);
          // Don't show error toast for team members as it's not critical
        }
      }
    };
    
    fetchIncidents();
    fetchDashboardStats();
    fetchTeamMembers();
    
    // Note: Removed automatic 30-second refresh to reduce server load
    // Data will be updated via WebSocket notifications and manual refresh
    
    // Listen for WebSocket messages about new incidents
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_incident') {
          console.log('New incident notification received:', data);
          // Refresh incidents and stats when a new one is reported
          fetchIncidents();
          fetchDashboardStats();
          toast(`New incident reported: ${data.title || 'Untitled'}`);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    // Add WebSocket listener if available
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
  }, [idToken, API_URL]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const analyzeImage = async (imageUrl: string, incidentContext?: string) => {
    setAnalyzingImage(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: imageUrl,
          incident_id: selectedIncident?.id,
          context: incidentContext || selectedIncident?.incident_type
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        setImageAnalysis(analysis);
        setShowImageAnalysis(true);
      } else {
        toast.error('Failed to analyze image');
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast.error('Failed to analyze image');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleAssignIncident = async (incidentId: string, assigneeId: string) => {
    try {
      if (assigneeId === '') {
        // Handle unassignment
        const response = await fetch(`${API_URL}/api/incidents/${incidentId}/unassign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setSelectedIncident(prev => prev ? ({
            ...prev,
            assigned_to: undefined,
            assigned_to_name: undefined,
            assigned_at: undefined,
            status: 'new'
          }) : null);

          fetchIncidents();
          fetchDashboardStats();
          toast.success('Incident unassigned successfully');
        } else {
          toast.error('Failed to unassign incident');
        }
        return;
      }
      
      // Handle assignment
      const response = await fetch(`${API_URL}/api/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignee_id: assigneeId
        })
      });

      if (response.ok) {
        const assigneeName = teamMembers.find(m => m.user_id === assigneeId)?.full_name;
        
        // Update the selected incident with assignment info
        setSelectedIncident(prev => prev ? ({
          ...prev,
          assigned_to: assigneeId,
          assigned_to_name: assigneeName,
          assigned_at: new Date().toISOString(),
          status: 'investigating'
        }) : null);

        // Refresh incidents list and stats to update the UI
        fetchIncidents();
        fetchDashboardStats();

        toast.success(`Incident assigned to ${assigneeName}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to assign incident');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to process assignment');
    }
  };

  // Check if current user is team leader
  const isTeamLeader = () => {
    return userProfile?.email === 'security.lead@secura.com';
  };

  // Handle incident click - fetch full details
  const handleIncidentClick = async (incident: Incident) => {
    try {
      const response = await fetch(`${API_URL}/api/incidents/${incident.id}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const fullIncident = await response.json();
        console.log('Fetched full incident:', fullIncident);
        setSelectedIncident(fullIncident);
        setShowIncidentDetails(true);
      } else {
        // Fallback to existing data
        setSelectedIncident(incident);
        setShowIncidentDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch incident details:', error);
      // Fallback to existing data
      setSelectedIncident(incident);
      setShowIncidentDetails(true);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
      case 'pending': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'investigating': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'assigned': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };
  
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };
  
  // Calculate team online status
  const totalTeamMembers = teamMembers.length;
  const onlineTeamMembers = teamMembers.filter(member => member.is_online === true).length;

  return (
    <div className="min-h-screen bg-[#1A1D23]">
      {/* Header */}
      <SecurityHeader
        userProfile={userProfile}
        unreadCount={unreadCount}
        isTeamLeader={isTeamLeader}
        onAnalyticsClick={() => setShowAnalytics(true)}
        onAIClick={() => setShowAI(true)}
        onMessagingClick={() => setShowMessaging(true)}
        onProfileClick={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {/* Spacer for fixed header */}
      <div className="h-16"></div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Critical Alert Banner */}
        {stats.critical_high_open > 0 && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 p-4 rounded-lg mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-400 animate-pulse" />
                <div>
                  <p className="font-semibold text-red-200">Critical Incidents Require Attention</p>
                  <p className="text-sm text-red-300">
                    {stats.critical_high_open} high-priority incidents need immediate investigation
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  fetchCriticalIncidents();
                  setShowCriticalIncidents(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Review Now
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <SecurityStatsGrid
          stats={stats}
          onlineTeamMembers={onlineTeamMembers}
          totalTeamMembers={totalTeamMembers}
          onTeamDetailsClick={() => setShowTeamDetails(true)}
        />

        {/* Incident Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incident Queue */}
          <div className="lg:col-span-2">
            <IncidentQueue
              incidents={incidents}
              loading={loading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onIncidentClick={handleIncidentClick}
              getSeverityColor={getSeverityColor}
              getStatusColor={getStatusColor}
              getTimeAgo={getTimeAgo}
            />
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <AIInsightsPanel />
            <TeamStatusPanel teamMembers={teamMembers} incidents={incidents} />
          </div>
        </div>
      </main>

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-7xl h-[90vh] overflow-y-auto bg-[#1A1D23] rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Security Analytics</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AnalyticsDashboard />
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAI && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl h-[90vh] overflow-y-auto bg-[#1A1D23] rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">AI Security Analysis</h2>
                <button
                  onClick={() => setShowAI(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AIAnalysisDashboard />
            </div>
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {showMessaging && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl h-[80vh]">
            <SecurityMessaging onClose={() => setShowMessaging(false)} />
          </div>
        </div>
      )}

      {/* Incident Details Modal */}
      {showIncidentDetails && selectedIncident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A1D23] rounded-lg">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Incident Details</h2>
                <button
                  onClick={() => {
                    setShowIncidentDetails(false);
                    setSelectedIncident(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Incident ID and Status */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-400">Incident ID</p>
                  <p className="text-lg font-mono text-white">{selectedIncident.id}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedIncident.status)}`}>
                  {selectedIncident.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Title and Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {selectedIncident.title || 'Untitled Incident'}
                </h3>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {selectedIncident.description || 'No description provided'}
                </p>
              </div>

              {/* Severity and Type */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Severity</p>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(selectedIncident.severity)}`}></div>
                    <span className="text-white font-medium">
                      {selectedIncident.severity.charAt(0).toUpperCase() + selectedIncident.severity.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Incident Type</p>
                  <p className="text-white font-medium">
                    {selectedIncident.incident_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
                  </p>
                </div>
              </div>

              {/* Reporter Information */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Reporter Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-white">{selectedIncident.reporter_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-white">{selectedIncident.reporter_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="text-white">{selectedIncident.reporter_department || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reported</p>
                    <p className="text-white">{new Date(selectedIncident.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              {selectedIncident.location && (
                <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location
                  </h4>
                  <p className="text-white">
                    {selectedIncident.location.address || selectedIncident.location.building || 'No specific location'}
                  </p>
                </div>
              )}

              {/* Attachments */}
              {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attachments ({selectedIncident.attachments.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedIncident.attachments.map((attachment: Attachment, index: number) => {
                      const isImage = attachment.file_type?.startsWith('image/') ||
                                     attachment.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                      return (
                        <div key={index} className="bg-[#1A1D23] p-3 rounded-lg border border-gray-700">
                          <div className="flex items-start space-x-3">
                            {isImage ? (
                              <ImageIcon className="h-5 w-5 text-blue-400 mt-1" />
                            ) : (
                              <FileText className="h-5 w-5 text-gray-400 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium">
                                {attachment.original_filename || attachment.filename || `Attachment ${index + 1}`}
                              </p>
                              <p className="text-xs text-gray-400">
                                {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                              </p>
                              {isImage && attachment.file_url && (
                                <div className="mt-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={attachment.file_url}
                                    alt={attachment.original_filename || 'Attachment'}
                                    className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(attachment.file_url, '_blank')}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col space-y-1">
                              {attachment.file_url && (
                                <button
                                  onClick={() => window.open(attachment.file_url, '_blank')}
                                  className="p-2 text-gray-400 hover:text-[#00D4FF] transition-colors"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              )}
                              {isImage && attachment.file_url && (
                                <button
                                  onClick={() => analyzeImage(attachment.file_url!)}
                                  className="p-2 text-gray-400 hover:text-[#00D4FF] transition-colors"
                                  title="Analyze Image"
                                  disabled={analyzingImage}
                                >
                                  {analyzingImage ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-[#00D4FF] border-t-transparent rounded-full" />
                                  ) : (
                                    <ScanLine className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignment Section */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assignment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Current Assignee</p>
                    <p className="text-white">
                      {selectedIncident.assigned_to_name || 'Unassigned'}
                    </p>
                    {selectedIncident.assigned_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Assigned {new Date(selectedIncident.assigned_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {isTeamLeader() ? 'Assign to Team Member' : 'Assignment Actions'}
                    </p>
                    
                    {!selectedIncident.assigned_to ? (
                      // Unassigned incident
                      <div className="space-y-2">
                        {isTeamLeader() ? (
                          // Team Leader: Can assign to anyone
                          <select
                            className="w-full bg-[#1A1D23] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D4FF]"
                            onChange={(e) => handleAssignIncident(selectedIncident.id, e.target.value)}
                          >
                            <option value="">Select team member...</option>
                            {teamMembers.map(member => (
                              <option key={member.user_id} value={member.user_id}>
                                {member.full_name} {member.is_online ? '(Online)' : '(Offline)'}
                                {member.user_id === userProfile?.uid ? ' (You)' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          // Team Member: Can only assign to themselves
                          <button
                            onClick={() => handleAssignIncident(selectedIncident.id, userProfile?.uid || '')}
                            className="w-full bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                          >
                            Pick This Incident
                          </button>
                        )}
                      </div>
                    ) : (
                      // Already assigned incident
                      <div className="space-y-2">
                        <p className="text-white text-sm">
                          {selectedIncident.assigned_to === userProfile?.uid ? 
                            'Assigned to you' : 
                            `Assigned to ${selectedIncident.assigned_to_name}`
                          }
                        </p>
                        
                        <div className="flex items-center justify-between">
                          {isTeamLeader() ? (
                            // Team Leader: Can reassign to anyone or unassign
                            <div className="flex space-x-2 w-full">
                              <select
                                className="flex-1 bg-[#1A1D23] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D4FF]"
                                onChange={(e) => handleAssignIncident(selectedIncident.id, e.target.value)}
                                defaultValue=""
                              >
                                <option value="">Reassign to...</option>
                                {teamMembers.map(member => (
                                  <option key={member.user_id} value={member.user_id}>
                                    {member.full_name} {member.is_online ? '(Online)' : '(Offline)'}
                                    {member.user_id === userProfile?.uid ? ' (You)' : ''}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignIncident(selectedIncident.id, '')}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                              >
                                Unassign
                              </button>
                            </div>
                          ) : (
                            // Team Member: Can only unassign if it's assigned to them
                            selectedIncident.assigned_to === userProfile?.uid && (
                              <button
                                onClick={() => handleAssignIncident(selectedIncident.id, '')}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                              >
                                Release Assignment
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created</span>
                    <span className="text-white">{new Date(selectedIncident.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-white">{new Date(selectedIncident.updated_at).toLocaleString()}</span>
                  </div>
                  {selectedIncident.resolved_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Resolved</span>
                      <span className="text-white">{new Date(selectedIncident.resolved_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <IncidentChatButton 
                    incidentId={selectedIncident.id}
                    incidentTitle={selectedIncident.title}
                    assignedToId={selectedIncident.assigned_to}
                    assignedToName={selectedIncident.assigned_to_name}
                    incidentStatus={selectedIncident.status}
                    size="md"
                    showLabel={true}
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowIncidentDetails(false);
                      setSelectedIncident(null);
                    }}
                    className="px-6 py-3 bg-[#374151] hover:bg-[#4B5563] text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {!selectedIncident.assigned_to && !isTeamLeader() && (
                    <button 
                      onClick={() => handleAssignIncident(selectedIncident.id, userProfile?.uid || '')}
                      className="px-6 py-3 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] font-medium rounded-lg transition-colors"
                    >
                      Pick This Incident
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Analysis Modal */}
      {showImageAnalysis && imageAnalysis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A1D23] rounded-lg">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <ScanLine className="h-6 w-6 mr-2 text-[#00D4FF]" />
                  AI Image Analysis
                </h2>
                <button
                  onClick={() => {
                    setShowImageAnalysis(false);
                    setImageAnalysis(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Summary Section */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Summary</h3>
                <p className="text-white">{imageAnalysis.summary}</p>
              </div>
              
              {/* Assessment Section */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Assessment</h3>
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">
                    {imageAnalysis.assessment || 'Assessment not available'}
                  </p>
                  <div className="flex items-center ml-4">
                    <span className="text-xs text-gray-400 mr-2">Confidence:</span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00D4FF] to-[#00C4EF]"
                          style={{ width: `${imageAnalysis.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white ml-2">{(imageAnalysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted Text Section */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Extracted Text</h3>
                <pre className="text-white text-sm whitespace-pre-wrap font-mono bg-[#1A1D23] p-3 rounded">
                  {imageAnalysis.extracted_text}
                </pre>
              </div>

              {/* Threat Indicators */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-400" />
                  Threat Indicators ({imageAnalysis.threat_indicators.length})
                </h3>
                <div className="space-y-2">
                  {imageAnalysis.threat_indicators.map((indicator: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-white">{indicator}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                  Recommendations
                </h3>
                <div className="space-y-2">
                  {imageAnalysis.recommendations.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-green-400 text-sm flex-shrink-0">{index + 1}.</span>
                      <p className="text-sm text-white">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    // Copy analysis to clipboard
                    const analysisText = `
AI Image Analysis Report
========================
Summary: ${imageAnalysis.summary}
Confidence: ${(imageAnalysis.confidence * 100).toFixed(0)}%

Extracted Text:
${imageAnalysis.extracted_text}

Threat Indicators:
${imageAnalysis.threat_indicators.map((i: string) => `- ${i}`).join('\n')}

Recommendations:
${imageAnalysis.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}
                    `.trim();
                    navigator.clipboard.writeText(analysisText);
                    toast.success('Analysis copied to clipboard');
                  }}
                  className="px-4 py-2 bg-[#374151] hover:bg-[#4B5563] text-white rounded-lg transition-colors"
                >
                  Copy Report
                </button>
                <button
                  onClick={() => {
                    setShowImageAnalysis(false);
                    setImageAnalysis(null);
                  }}
                  className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showTeamDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[80vh] bg-[#2A2D35] rounded-lg border border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Users className="h-6 w-6 mr-2 text-[#00D4FF]" />
                  Security Team Status
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {onlineTeamMembers} of {totalTeamMembers} members online
                </p>
              </div>
              <button
                onClick={() => setShowTeamDetails(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="p-6">
                {teamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {teamMembers.map((member) => {
                      const assignedIncidents = incidents.filter(i => 
                        i.assigned_to === member.user_id && 
                        i.status !== 'resolved' && 
                        i.status !== 'closed'
                      ).length;
                      
                      const lastActivityTime = member.last_activity ? 
                        new Date(member.last_activity).toLocaleString() : 'Never';
                      const lastLoginTime = member.last_login ? 
                        new Date(member.last_login).toLocaleString() : 'Never';
                      
                      return (
                        <div key={member.user_id} className="bg-[#1A1D23] p-4 rounded-lg border border-gray-700">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className={`w-4 h-4 rounded-full ${
                                  member.is_online ? 'bg-green-400' : 'bg-gray-400'
                                }`}></div>
                                <div>
                                  <h3 className="font-medium text-white">{member.full_name}</h3>
                                  <p className="text-sm text-gray-400">{member.email}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mt-3">
                                <div>
                                  <p className="text-gray-500">Status:</p>
                                  <p className={member.is_online ? 'text-green-400' : 'text-gray-400'}>
                                    {member.is_online ? 'Online' : 'Offline'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Active Cases:</p>
                                  <p className="text-white">{assignedIncidents}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Last Activity:</p>
                                  <p className="text-gray-300">{lastActivityTime}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Last Login:</p>
                                  <p className="text-gray-300">{lastLoginTime}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="ml-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                member.is_online 
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                              }`}>
                                {member.is_online ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Team Members Found</h3>
                    <p className="text-gray-400">Unable to load security team information.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 bg-[#1A1D23]">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div>
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
                <button
                  onClick={() => setShowTeamDetails(false)}
                  className="px-4 py-2 bg-[#00D4FF] text-[#1A1D23] font-medium rounded-lg hover:bg-[#00C4EF] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Incidents Modal */}
      {showCriticalIncidents && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl max-h-[90vh] bg-[#2A2D35] rounded-lg border border-red-500/30 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-red-500/30 bg-gradient-to-r from-red-500/20 to-orange-500/20">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Critical Incidents</h2>
                  <p className="text-sm text-red-300 mt-1">
                    {stats.critical_high_open} high-priority incidents requiring immediate attention
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCriticalIncidents(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingCritical ? (
                <div className="p-12 text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-[#00D4FF] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400">Loading critical incidents...</p>
                </div>
              ) : criticalIncidents.length > 0 ? (
                <div className="p-6 space-y-4">
                  {criticalIncidents
                    .sort((a, b) => {
                      // Sort by severity (critical first) then by creation date
                      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
                      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((incident) => {
                      const timeAgo = new Date(incident.created_at).toLocaleString();
                      const isCritical = incident.severity === 'critical';
                      
                      return (
                        <div key={incident.id} className={`bg-[#1A1D23] p-4 rounded-lg border transition-colors hover:border-gray-600 ${
                          isCritical ? 'border-red-500/50' : 'border-orange-500/50'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  isCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                                }`}></div>
                                <h3 className="font-medium text-white">
                                  {incident.title || 'Untitled Incident'}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isCritical ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                                }`}>
                                  {incident.severity.toUpperCase()}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  incident.status === 'investigating' ? 'bg-blue-500/20 text-blue-300' :
                                  incident.status === 'assigned' ? 'bg-purple-500/20 text-purple-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {incident.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                                {incident.description || 'No description provided'}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-400">
                                <span>Type: {incident.incident_type?.replace('_', ' ') || 'Unknown'}</span>
                                <span>•</span>
                                <span>Reported: {timeAgo}</span>
                                <span>•</span>
                                <span>Reporter: {incident.reporter_name || 'Unknown'}</span>
                                {incident.assigned_to_name && (
                                  <>
                                    <span>•</span>
                                    <span>Assigned: {incident.assigned_to_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => {
                                  setSelectedIncident(incident);
                                  setShowIncidentDetails(true);
                                  setShowCriticalIncidents(false);
                                }}
                                className="p-2 text-gray-400 hover:text-[#00D4FF] hover:bg-gray-700 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Additional Info */}
                          {(incident.location || (incident.attachments?.length ?? 0) > 0) && (
                            <div className="pt-3 border-t border-gray-700">
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
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Critical Incidents</h3>
                  <p className="text-gray-400">All high-priority incidents have been resolved or are being handled.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <SecurityTeamProfile onClose={() => setShowProfile(false)} />
      )}

      {/* Footer */}
      <Footer variant="dashboard" />
    </div>
  );
}