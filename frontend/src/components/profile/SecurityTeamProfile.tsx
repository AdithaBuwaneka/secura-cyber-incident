'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  CheckCircle,
  AlertCircle,
  Trophy,
  Target,
  TrendingUp
} from 'lucide-react';
import { RootState } from '@/store';
import toast from 'react-hot-toast';

interface SecurityTeamProfileProps {
  onClose: () => void;
}

interface Incident {
  id: string;
  title?: string;
  description?: string;
  severity: string;
  status: string;
  incident_type?: string;
  reporter_name?: string;
  assigned_at?: string;
  resolved_at?: string;
  created_at: string;
}

export default function SecurityTeamProfile({ onClose }: SecurityTeamProfileProps) {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [assignedIncidents, setAssignedIncidents] = useState<Incident[]>([]);
  const [resolvedIncidents, setResolvedIncidents] = useState<Incident[]>([]);
  const [profileStats, setProfileStats] = useState({
    totalAssigned: 0,
    totalResolved: 0,
    avgResolutionTime: 0,
    currentActive: 0
  });
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Check if current user is team leader
  const isTeamLeader = () => {
    return userProfile?.email === 'security.lead@secura.com';
  };

  // Fetch assigned incidents
  const fetchAssignedIncidents = async () => {
    if (!idToken || !userProfile?.uid) {
      console.log('Missing idToken or userProfile.uid:', { idToken: !!idToken, uid: userProfile?.uid });
      return;
    }
    
    console.log('Fetching assigned incidents for user:', userProfile.uid);
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/incidents/assigned/${userProfile?.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const incidents = await response.json();
        console.log('Assigned incidents received:', incidents);
        setAssignedIncidents(incidents);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Error fetching assigned incidents:', response.status, errorData);
        toast.error(`Failed to load assigned incidents: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch assigned incidents:', error);
      toast.error('Failed to load assigned incidents');
    } finally {
      setLoading(false);
    }
  };

  // Fetch resolved incidents
  const fetchResolvedIncidents = async () => {
    if (!idToken || !userProfile?.uid) {
      console.log('Missing idToken or userProfile.uid for resolved:', { idToken: !!idToken, uid: userProfile?.uid });
      return;
    }
    
    console.log('Fetching resolved incidents for user:', userProfile.uid);
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/incidents/resolved/${userProfile?.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const incidents = await response.json();
        console.log('Resolved incidents received:', incidents);
        setResolvedIncidents(incidents);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Error fetching resolved incidents:', response.status, errorData);
        toast.error(`Failed to load resolved incidents: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch resolved incidents:', error);
      toast.error('Failed to load resolved incidents');
    } finally {
      setLoading(false);
    }
  };

  // Calculate profile statistics
  const calculateStats = () => {
    const totalAssigned = assignedIncidents.length + resolvedIncidents.length;
    const totalResolved = resolvedIncidents.length;
    const currentActive = assignedIncidents.filter(i => 
      i.status !== 'resolved' && i.status !== 'closed'
    ).length;

    // Calculate average resolution time
    let avgResolutionTime = 0;
    if (resolvedIncidents.length > 0) {
      const totalTime = resolvedIncidents.reduce((acc, incident) => {
        if (incident.resolved_at && incident.assigned_at) {
          const assignedTime = new Date(incident.assigned_at).getTime();
          const resolvedTime = new Date(incident.resolved_at).getTime();
          return acc + (resolvedTime - assignedTime);
        }
        return acc;
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedIncidents.length / (1000 * 60 * 60)); // Convert to hours
    }

    setProfileStats({
      totalAssigned,
      totalResolved,
      avgResolutionTime,
      currentActive
    });
  };

  // Mark incident as resolved
  const markResolved = async (incidentId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Incident marked as resolved');
        // Refresh data
        fetchAssignedIncidents();
        fetchResolvedIncidents();
      } else {
        toast.error('Failed to mark incident as resolved');
      }
    } catch (error) {
      console.error('Failed to resolve incident:', error);
      toast.error('Failed to mark incident as resolved');
    }
  };

  useEffect(() => {
    if (activeTab === 'assigned') {
      fetchAssignedIncidents();
    } else if (activeTab === 'resolved') {
      fetchResolvedIncidents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, idToken, userProfile?.uid]);

  useEffect(() => {
    calculateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedIncidents, resolvedIncidents]);

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

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-6xl max-h-[90vh] bg-[#1A1D23] rounded-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-[#2A2D35]">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#00D4FF]/20 rounded-lg">
              <User className="h-6 w-6 text-[#00D4FF]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Security Team Profile</h2>
              <p className="text-sm text-gray-400">
                {userProfile?.full_name} • {isTeamLeader() ? 'Team Leader' : 'Security Analyst'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 bg-[#2A2D35]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#00D4FF]/5'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'assigned'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#00D4FF]/5'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Assigned Incidents ({assignedIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'resolved'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#00D4FF]/5'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Resolved Incidents ({resolvedIncidents.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)]">
          {activeTab === 'profile' && (
            <div className="p-6 space-y-6">
              {/* Profile Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-[#00D4FF]" />
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Full Name</p>
                      <p className="text-white font-medium">{userProfile?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-medium">{userProfile?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Role</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isTeamLeader() 
                          ? 'bg-yellow-500/20 text-yellow-300' 
                          : 'bg-orange-500/20 text-orange-300'
                      }`}>
                        {isTeamLeader() ? '👑 Team Leader' : '🛡️ Security Analyst'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Department</p>
                      <p className="text-white font-medium">Security Team</p>
                    </div>
                  </div>
                </div>

                {/* Performance Statistics */}
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-[#00D4FF]" />
                    Performance Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="p-3 bg-blue-500/20 rounded-lg mb-2">
                        <Target className="h-6 w-6 text-blue-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{profileStats.totalAssigned}</p>
                      <p className="text-xs text-gray-400">Total Assigned</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-green-500/20 rounded-lg mb-2">
                        <CheckCircle className="h-6 w-6 text-green-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{profileStats.totalResolved}</p>
                      <p className="text-xs text-gray-400">Total Resolved</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-orange-500/20 rounded-lg mb-2">
                        <Clock className="h-6 w-6 text-orange-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{profileStats.avgResolutionTime}h</p>
                      <p className="text-xs text-gray-400">Avg Resolution</p>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-yellow-500/20 rounded-lg mb-2">
                        <AlertTriangle className="h-6 w-6 text-yellow-400 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-white">{profileStats.currentActive}</p>
                      <p className="text-xs text-gray-400">Current Active</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievement Badges */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-[#00D4FF]" />
                  Achievements
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-[#1A1D23] rounded-lg">
                    <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Security Expert</p>
                    <p className="text-xs text-gray-400">50+ incidents resolved</p>
                  </div>
                  <div className="text-center p-4 bg-[#1A1D23] rounded-lg">
                    <Clock className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Quick Responder</p>
                    <p className="text-xs text-gray-400">Fast resolution times</p>
                  </div>
                  <div className="text-center p-4 bg-[#1A1D23] rounded-lg">
                    <Target className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Critical Handler</p>
                    <p className="text-xs text-gray-400">Critical incidents managed</p>
                  </div>
                  <div className="text-center p-4 bg-[#1A1D23] rounded-lg">
                    <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Team Player</p>
                    <p className="text-xs text-gray-400">Excellent collaboration</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assigned' && (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Assigned Incidents</h3>
                <p className="text-sm text-gray-400">Incidents currently assigned to you</p>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading assigned incidents...</p>
                </div>
              ) : assignedIncidents.length > 0 ? (
                <div className="space-y-4">
                  {assignedIncidents.map((incident) => (
                    <div key={incident.id} className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                            <h4 className="font-medium text-white">
                              {incident.title || 'Untitled Incident'}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                              {incident.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                            {incident.description || 'No description provided'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>Type: {incident.incident_type?.replace('_', ' ') || 'Unknown'}</span>
                            <span>•</span>
                            <span>Assigned: {getTimeAgo(incident.assigned_at || incident.created_at)}</span>
                            <span>•</span>
                            <span>Reporter: {incident.reporter_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => markResolved(incident.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                            title="Mark as Resolved"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-[#00D4FF] transition-colors" title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Assigned Incidents</h3>
                  <p className="text-gray-400">You don&apos;t have any incidents assigned to you currently.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'resolved' && (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Resolved Incidents</h3>
                <p className="text-sm text-gray-400">Incidents you have successfully resolved</p>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading resolved incidents...</p>
                </div>
              ) : resolvedIncidents.length > 0 ? (
                <div className="space-y-4">
                  {resolvedIncidents.map((incident) => (
                    <div key={incident.id} className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <h4 className="font-medium text-white">
                              {incident.title || 'Untitled Incident'}
                            </h4>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                              RESOLVED
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                            {incident.description || 'No description provided'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>Type: {incident.incident_type?.replace('_', ' ') || 'Unknown'}</span>
                            <span>•</span>
                            <span>Resolved: {incident.resolved_at ? getTimeAgo(incident.resolved_at) : 'N/A'}</span>
                            <span>•</span>
                            <span>Reporter: {incident.reporter_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button className="p-1 text-gray-400 hover:text-[#00D4FF] transition-colors" title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Resolved Incidents</h3>
                  <p className="text-gray-400">You haven&apos;t resolved any incidents yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}