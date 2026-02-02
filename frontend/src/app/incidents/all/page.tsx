'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  MapPin,
  Paperclip,
  UserCheck,
  Download,
  ScanLine,
  ImageIcon
} from 'lucide-react';
import { RootState } from '@/store';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';

interface IncidentFilters {
  status: string;
  severity: string;
  incident_type: string;
  date_range: string;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_incidents: number;
  incidents_per_page: number;
}

interface Attachment {
  file_id: string;
  filename: string;
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
  reporter_name?: string;
  reporter_email?: string;
  reporter_department?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_at?: string;
  resolved_at?: string;
  location?: {
    address?: string;
    building?: string;
  };
  attachments?: Attachment[];
}

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_online: boolean;
  last_activity: string;
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

export default function AllIncidentsPage() {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_incidents: 0,
    incidents_per_page: 10
  });
  
  const [filters, setFilters] = useState<IncidentFilters>({
    status: '',
    severity: '',
    incident_type: '',
    date_range: ''
  });

  // Incident details modal state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidentDetails, setShowIncidentDetails] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Image analysis state
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!idToken) return;
    
    try {
      const response = await fetch(`${API_URL}/api/user-activity/team-status`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const teamStatus = await response.json();
        setTeamMembers(teamStatus.members);
      } else {
        // Fallback to admin/users endpoint
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
            is_online: false,
            last_activity: new Date(user.last_login || new Date()).toISOString(),
            last_login: user.last_login
          }));
          setTeamMembers(securityTeam);
        }
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  }, [idToken, API_URL]);

  // Check if current user is team leader
  const isTeamLeader = () => {
    return userProfile?.email === 'security.lead@secura.com';
  };

  // Analyze image function
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

  // Handle incident assignment
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
          setSelectedIncident(prev => {
            if (!prev) return null;
            return {
              ...prev,
              assigned_to: undefined,
              assigned_to_name: undefined,
              assigned_at: undefined,
              status: 'new'
            };
          });

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

        setSelectedIncident(prev => {
          if (!prev) return null;
          return {
            ...prev,
            assigned_to: assigneeId,
            assigned_to_name: assigneeName,
            assigned_at: new Date().toISOString(),
            status: 'investigating'
          };
        });

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

  // Fetch incidents with pagination and filters
  const fetchIncidents = useCallback(async (page: number = 1, search: string = '', appliedFilters: IncidentFilters = filters) => {
    if (!idToken) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        limit: '10',
        offset: ((page - 1) * 10).toString(),
        include_pagination: 'true'
      });

      // Add search parameter
      if (search.trim()) {
        queryParams.append('search', search.trim());
      }

      // Add filter parameters
      if (appliedFilters.status) {
        queryParams.append('status_filter', appliedFilters.status);
      }
      if (appliedFilters.severity) {
        queryParams.append('severity_filter', appliedFilters.severity);
      }
      if (appliedFilters.incident_type) {
        queryParams.append('type_filter', appliedFilters.incident_type);
      }
      if (appliedFilters.date_range) {
        queryParams.append('date_range', appliedFilters.date_range);
      }

      const response = await fetch(`${API_URL}/api/incidents/?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // If the response includes pagination info, use it
        if (data.incidents && data.pagination) {
          setIncidents(data.incidents);
          setPagination(data.pagination);
        } else {
          // Fallback: assume it's just the incidents array
          setIncidents(Array.isArray(data) ? data : []);
          // Calculate pagination info manually
          const totalIncidents = Array.isArray(data) ? data.length : 0;
          setPagination({
            current_page: page,
            total_pages: Math.ceil(Math.max(1, totalIncidents / 10)),
            total_incidents: totalIncidents,
            incidents_per_page: 10
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to load incidents:', response.status, errorText);
        toast.error('Failed to load incidents');
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [idToken, API_URL, filters]);

  useEffect(() => {
    fetchIncidents(currentPage, searchTerm, filters);
    fetchTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, fetchIncidents, fetchTeamMembers]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    fetchIncidents(1, value, filters);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof IncidentFilters, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchIncidents(1, searchTerm, newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      severity: '',
      incident_type: '',
      date_range: ''
    };
    setFilters(clearedFilters);
    setSearchTerm('');
    setCurrentPage(1);
    fetchIncidents(1, '', clearedFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  // Utility functions
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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
    const now = new Date();
    const incidentDate = new Date(date);
    const seconds = Math.floor((now.getTime() - incidentDate.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Check if user can access all incidents
  const canViewAllIncidents = userProfile?.role === 'security_team' || userProfile?.role === 'admin';

  if (!canViewAllIncidents) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-6">You don&apos;t have permission to view all incidents.</p>
            <Link 
              href="/dashboard"
              className="bg-[#00D4FF] text-[#1A1D23] px-6 py-3 rounded-lg font-medium hover:bg-[#00C4EF] transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#1A1D23]">
        {/* Header */}
        <header className="bg-[#2A2D35] border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-[#00D4FF]" />
                  <div>
                    <h1 className="text-xl font-bold text-white">All Incidents</h1>
                    <p className="text-xs text-gray-400">Comprehensive incident management</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {pagination.total_incidents} total incidents
                </span>
                <button
                  onClick={() => fetchIncidents(currentPage, searchTerm, filters)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filter Bar */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search incidents by title, description, reporter..."
                    className="w-full pl-10 pr-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF]"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Toggle and Clear */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters 
                      ? 'bg-[#00D4FF] text-[#1A1D23] border-[#00D4FF]' 
                      : 'bg-[#1A1D23] text-gray-400 border-gray-600 hover:text-white'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </button>
                
                {(filters.status || filters.severity || filters.incident_type || filters.date_range || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full bg-[#1A1D23] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00D4FF]"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="investigating">Investigating</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {/* Severity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Severity</label>
                    <select
                      value={filters.severity}
                      onChange={(e) => handleFilterChange('severity', e.target.value)}
                      className="w-full bg-[#1A1D23] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00D4FF]"
                    >
                      <option value="">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Incident Type</label>
                    <select
                      value={filters.incident_type}
                      onChange={(e) => handleFilterChange('incident_type', e.target.value)}
                      className="w-full bg-[#1A1D23] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00D4FF]"
                    >
                      <option value="">All Types</option>
                      <option value="phishing">Phishing</option>
                      <option value="malware">Malware</option>
                      <option value="data_breach">Data Breach</option>
                      <option value="unauthorized_access">Unauthorized Access</option>
                      <option value="policy_violation">Policy Violation</option>
                      <option value="system_vulnerability">System Vulnerability</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Date Range</label>
                    <select
                      value={filters.date_range}
                      onChange={(e) => handleFilterChange('date_range', e.target.value)}
                      className="w-full bg-[#1A1D23] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00D4FF]"
                    >
                      <option value="">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last_7_days">Last 7 Days</option>
                      <option value="last_30_days">Last 30 Days</option>
                      <option value="last_90_days">Last 90 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Incidents List */}
          <div className="bg-[#2A2D35] rounded-lg border border-gray-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Incidents ({pagination.total_incidents})
                </h2>
                <div className="text-sm text-gray-400">
                  Page {pagination.current_page} of {pagination.total_pages}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading incidents...</p>
                </div>
              ) : incidents.length > 0 ? (
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="bg-[#1A1D23] p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                          <div>
                            <h3 className="font-medium text-white">
                              {incident.title || 'Untitled Incident'}
                            </h3>
                            <p className="text-sm text-gray-400">
                              ID: {incident.id.substring(0, 8)}... • {getTimeAgo(incident.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                            {incident.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <button
                            onClick={() => handleIncidentClick(incident)}
                            className="p-2 text-gray-400 hover:text-[#00D4FF] transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {incident.description && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {incident.description}
                        </p>
                      )}

                      {/* Details Row */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>Reporter: {incident.reporter_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Type: {incident.incident_type?.replace('_', ' ') || 'Uncategorized'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {new Date(incident.created_at).toLocaleDateString()}</span>
                        </div>
                        {incident.assigned_to_name && (
                          <div className="flex items-center space-x-1">
                            <Shield className="h-3 w-3" />
                            <span>Assigned: {incident.assigned_to_name}</span>
                          </div>
                        )}
                        {incident.attachments && incident.attachments.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{incident.attachments.length} attachment{incident.attachments.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Incidents Found</h3>
                  <p className="text-gray-400">
                    {searchTerm || filters.status || filters.severity || filters.incident_type || filters.date_range
                      ? 'Try adjusting your search criteria or filters.'
                      : 'No incidents have been reported yet.'}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((pagination.current_page - 1) * pagination.incidents_per_page) + 1} to{' '}
                    {Math.min(pagination.current_page * pagination.incidents_per_page, pagination.total_incidents)} of{' '}
                    {pagination.total_incidents} incidents
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page <= 1}
                      className="flex items-center space-x-1 px-3 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.current_page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.current_page >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = pagination.current_page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              pageNum === pagination.current_page
                                ? 'bg-[#00D4FF] text-[#1A1D23]'
                                : 'bg-[#1A1D23] border border-gray-600 text-gray-400 hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page >= pagination.total_pages}
                      className="flex items-center space-x-1 px-3 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

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
                                    onClick={() => attachment.file_url && analyzeImage(attachment.file_url)}
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
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowIncidentDetails(false);
                      setSelectedIncident(null);
                    }}
                    className="px-6 py-3 bg-[#374151] hover:bg-[#4B5563] text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
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
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
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
      </div>
    </ProtectedRoute>
  );
}