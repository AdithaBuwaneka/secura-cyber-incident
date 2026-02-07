'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Shield, 
  TrendingUp,
  AlertTriangle,
  Bell,
  LogOut,
  UserPlus,
  Download,
  Activity,
  Database,
  ClipboardList
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/auth/authSlice';
import { fetchPendingApplications } from '@/store/applications/applicationSlice';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import AdminApplicationReview from '@/components/applications/AdminApplicationReview';
import UserManagement from '@/components/users/UserManagement';
import SystemConfig from '@/components/system/SystemConfig';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Footer } from '@/components/layout';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

interface OverviewData {
  users: {
    total: number;
    security_team: number;
    admins: number;
    employees: number;
    growth_rate: string;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    approval_rate: string;
  };
  incidents: {
    total: number;
    recent: number;
    trend: string;
  };
  system_health: {
    status: string;
    uptime: string;
    last_issue: string;
  };
}

export default function AdminDashboard() {
    const { userProfile, idToken, loading: authLoading, isAuthenticated } = useSelector((state: RootState) =>
  state.auth);
    const { pendingApplications } = useSelector((state: RootState) => state.applications);
    const dispatch = useDispatch<AppDispatch>();
    const [activeTab, setActiveTab] = useState('overview');
    const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(false);
    const [recentIncidents, setRecentIncidents] = useState<Array<{
      id: string;
      title?: string;
      severity: string;
      status: string;
      reporter_name: string;
      created_at: string;
    }>>([]);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    interface SystemLog {
      id?: string;
      timestamp?: number | { seconds?: number };
      level: string;
      message: string;
      user?: string;
      action?: string;
      ip_address?: string;
    }
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

    const fetchOverviewData = React.useCallback(async () => {
      if (!idToken || !isAuthenticated) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/system/overview`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch overview data');
        }
        const data = await response.json();
        setOverviewData(data);
      } catch (error) {
        console.error('Error fetching overview data:', error);
        toast.error('Failed to load overview data');
      } finally {
        setLoading(false);
      }
    }, [idToken, isAuthenticated, API_URL]);

    const fetchRecentLogs = React.useCallback(async () => {
      if (!idToken || !isAuthenticated) return;
      try {
        const response = await fetch(`${API_URL}/api/system/logs?limit=4`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (response.ok) {
          const logs = await response.json();
          setSystemLogs(logs);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }, [idToken, isAuthenticated, API_URL]);

    const fetchRecentIncidents = React.useCallback(async () => {
      if (!idToken || !isAuthenticated) return;
      try {
        const response = await fetch(`${API_URL}/api/incidents/?limit=5`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (response.ok) {
          const incidents = await response.json();
          setRecentIncidents(incidents);
        }
      } catch (error) {
        console.error('Failed to fetch recent incidents:', error);
      }
    }, [idToken, isAuthenticated, API_URL]);

    useEffect(() => {
      dispatch(fetchPendingApplications());
      if (activeTab === 'overview' && idToken && isAuthenticated) {
        // PERFORMANCE: Fetch all data in parallel instead of sequential
        Promise.all([
          fetchOverviewData(),
          fetchRecentLogs(),
          fetchRecentIncidents()
        ]).catch(err => console.error('Error loading dashboard data:', err));
      }
    }, [dispatch, activeTab, idToken, isAuthenticated, fetchOverviewData, fetchRecentLogs, fetchRecentIncidents]);


  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleExecutiveReports = async () => {
    if (!idToken || !isAuthenticated) {
      toast.error('Authentication required to generate reports');
      return;
    }

    // Check user role
    if (userProfile?.role !== 'admin') {
      toast.error(`Access denied. Current role: ${userProfile?.role}. Admin role required.`);
      return;
    }
    
    try {
      toast.loading('Generating executive report...');
      console.log('Generating report with API_URL:', API_URL);
      console.log('User profile:', userProfile);
      console.log('User role:', userProfile?.role);
      
      const response = await fetch(`${API_URL}/api/admin/reports/executive`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else {
          throw new Error(`Server error (${response.status}): ${errorText}`);
        }
      }

      const blob = await response.blob();
      console.log('PDF blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Received empty report file');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Executive report downloaded successfully');
    } catch (error) {
      toast.dismiss();
      console.error('Error generating report:', error);
      toast.error(`Failed to generate executive report: ${(error as Error).message}`);
    }
  };

  const handleSystemSettings = () => {
    setActiveTab('system');
  };

  const handleAuditLogs = async () => {
    if (!idToken || !isAuthenticated) return;
    
    try {
      const response = await fetch(`${API_URL}/api/system/logs?limit=100`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (response.ok) {
        const logs = await response.json();
        // Create downloadable audit log file
        const csvContent = "data:text/csv;charset=utf-8," + 
          "Timestamp,Level,Message,User,Action,IP Address\n" +
      logs.map((log: SystemLog) => {
        let dateStr = 'N/A';
        if (log.timestamp !== undefined) {
          if (typeof log.timestamp === 'object' && log.timestamp.seconds !== undefined) {
            dateStr = new Date(log.timestamp.seconds * 1000).toLocaleString();
          } else if (typeof log.timestamp === 'number') {
            dateStr = new Date(log.timestamp).toLocaleString();
          }
        }
        return `"${dateStr}","${log.level}","${log.message}","${log.user}","${log.action}","${log.ip_address || 'N/A'}"`;
      }).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Audit logs downloaded successfully');
      } else {
        throw new Error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to download audit logs');
    }
  };

  const handleUserPermissions = () => {
    setActiveTab('users');
    toast('Navigate to User Management tab to configure user permissions and roles', {
      icon: 'ℹ️',
      duration: 3000,
    });
  };

  // Show loading while authentication is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4FF] mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1D23]">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#2A2D35] border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-[#00D4FF]" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-white">Secura</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden min-[400px]:block">
                  <span className="md:hidden">🔑 Admin</span>
                  <span className="hidden md:inline">🔑 Admin Dashboard</span>
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors relative">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px] sm:text-xs text-white font-bold">5</span>
                </span>
              </button>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white truncate max-w-[120px]">{userProfile?.full_name}</p>
                  <p className="text-xs text-gray-400">System Administrator</p>
                </div>
                <div className="relative group">
                  {userProfile?.profile_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userProfile.profile_picture_url}
                      alt="Profile"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-600 hover:border-[#00D4FF] transition-all duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center text-white font-semibold text-xs sm:text-sm border-2 border-gray-600 hover:border-[#00D4FF] transition-all duration-200 group-hover:scale-105">
                      {userProfile?.full_name ? (
                        userProfile.full_name.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)
                      ) : (
                        'AD'
                      )}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-[#2A2D35]"></div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="hidden min-[500px]:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-500/20 text-purple-300">
                    <span className="md:hidden">🔑 Admin</span>
                    <span className="hidden md:inline">🔑 Administrator</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-400 transition-colors"
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

      {/* Navigation Tabs - Fixed below header */}
      <div className="fixed top-14 sm:top-16 left-0 right-0 z-40 bg-[#2A2D35] border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', shortLabel: 'Users', icon: Users },
              { id: 'applications', label: `Apps ${pendingApplications.length > 0 ? `(${pendingApplications.length})` : ''}`, shortLabel: 'Apps', icon: ClipboardList },
              { id: 'system', label: 'System', shortLabel: 'System', icon: Settings },
              { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#00D4FF] text-[#00D4FF]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden min-[400px]:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Spacer for fixed header + nav */}
      <div className="h-[100px] sm:h-[112px]"></div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Executive Stats */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
                <span className="ml-3 text-gray-400">Loading dashboard data...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-3xl font-bold text-white">{overviewData?.users?.total || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{overviewData?.users?.growth_rate || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Users className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Security Team</p>
                      <p className="text-3xl font-bold text-white">{overviewData?.users?.security_team || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{overviewData?.users?.admins || 0} admins</p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <Shield className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Recent Incidents</p>
                      <p className="text-3xl font-bold text-white">{overviewData?.incidents?.recent || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                    </div>
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <AlertTriangle className="h-8 w-8 text-orange-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Applications</p>
                      <p className="text-3xl font-bold text-white">{overviewData?.applications?.total || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {overviewData?.applications?.pending || 0} pending
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <ClipboardList className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">System Health</p>
                      <p className="text-3xl font-bold text-green-400">{overviewData?.system_health?.uptime || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-1">{overviewData?.system_health?.status || 'Unknown'}</p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <Activity className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* User Management */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[#00D4FF]" />
                  User Management
                </h3>
                <div className="space-y-4">
                  <button 
                    onClick={() => setActiveTab('users')}
                    className="w-full bg-[#00D4FF] text-[#1A1D23] p-4 rounded-lg text-left transition-all hover:bg-[#00C4EF] hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Manage Security Team</h4>
                        <p className="text-sm opacity-80 mt-1">Add/remove security personnel</p>
                      </div>
                      <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('applications')}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg text-left transition-all hover:from-purple-700 hover:to-blue-700 hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Review Applications</h4>
                        <p className="text-sm text-gray-100 mt-1">
                          {pendingApplications.length > 0 
                            ? `${pendingApplications.length} pending review` 
                            : 'No pending applications'}
                        </p>
                      </div>
                      <div className="relative">
                        {pendingApplications.length > 0 && (
                          <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">{pendingApplications.length}</span>
                          </span>
                        )}
                        <ClipboardList className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleUserPermissions}
                    className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">User Permissions</h4>
                        <p className="text-sm text-gray-300 mt-1">Configure access levels</p>
                      </div>
                      <Settings className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>

              {/* System Configuration */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-[#00D4FF]" />
                  System Configuration
                </h3>
                <div className="space-y-4">
                  <button 
                    onClick={handleExecutiveReports}
                    className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Executive Reports</h4>
                        <p className="text-sm text-gray-300 mt-1">Generate PDF reports with real data analytics</p>
                      </div>
                      <Download className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/health`);
                        const data = await response.json();
                        toast.success(`Backend connected: ${data.status}`);
                        console.log('Backend health:', data);
                      } catch (error) {
                        toast.error(`Backend connection failed: ${(error as Error).message}`);
                        console.error('Backend connection error:', error);
                      }
                    }}
                    className="w-full bg-[#059669] text-white p-4 rounded-lg text-left transition-all hover:bg-[#047857] hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Test Backend Connection</h4>
                        <p className="text-sm text-gray-300 mt-1">Check API connectivity and health</p>
                      </div>
                      <Activity className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleSystemSettings}
                    className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">System Settings</h4>
                        <p className="text-sm text-gray-300 mt-1">Configure system parameters</p>
                      </div>
                      <Database className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleAuditLogs}
                    className="w-full bg-[#374151] text-white p-4 rounded-lg text-left transition-all hover:bg-[#4B5563] hover:scale-105 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Audit Logs</h4>
                        <p className="text-sm text-gray-300 mt-1">View system audit trails</p>
                      </div>
                      <Activity className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Incident Management */}
            <div className="mt-8 bg-[#2A2D35] p-6 rounded-lg border border-gray-700 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Incidents</h3>
                <Link
                  href="/incidents/all"
                  className="text-[#00D4FF] hover:underline text-sm"
                >
                  View All Incidents
                </Link>
              </div>
              <div className="space-y-4">
                {recentIncidents.length > 0 ? (
                  recentIncidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="flex items-center space-x-4 p-3 bg-[#1A1D23] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        incident.severity === 'critical' ? 'bg-red-400' :
                        incident.severity === 'high' ? 'bg-orange-400' :
                        incident.severity === 'medium' ? 'bg-yellow-400' :
                        'bg-green-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">
                          {incident.title || 'Untitled Incident'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {incident.reporter_name} • {new Date(incident.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        incident.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                        incident.status === 'investigating' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <p>No recent incidents</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent System Activity</h3>
                <button 
                  onClick={() => setActiveTab('system')}
                  className="text-[#00D4FF] hover:underline text-sm"
                >
                  View All Logs
                </button>
              </div>
              <div className="space-y-4">
                {systemLogs.length > 0 ? (
                  systemLogs.map((log, index) => (
                    <div key={log.id ?? index} className="flex items-center space-x-4 p-3 bg-[#1A1D23] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        log.level === 'error' ? 'bg-red-400' :
                        log.level === 'warning' ? 'bg-yellow-400' :
                        log.level === 'success' ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{log.message || log.action || 'System activity'}</p>
                        <p className="text-xs text-gray-400">
                          By {log.user || 'System'} • {(() => {
                            if (!log.timestamp) return 'Recently';
                            if (typeof log.timestamp === 'object' && log.timestamp.seconds !== undefined) {
                              return new Date(log.timestamp.seconds * 1000).toLocaleString();
                            } else if (typeof log.timestamp === 'number') {
                              return new Date(log.timestamp).toLocaleString();
                            }
                            return 'Recently';
                          })()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  [
                    { action: 'System monitoring active', user: 'System', time: 'Recently', type: 'info' },
                    { action: 'Dashboard loaded successfully', user: 'Admin', time: 'Just now', type: 'success' },
                    { action: 'Configuration updated', user: 'System', time: 'Recently', type: 'info' },
                    { action: 'Security check completed', user: 'Security Monitor', time: 'Recently', type: 'success' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-[#1A1D23] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'success' ? 'bg-green-400' :
                        activity.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{activity.action}</p>
                        <p className="text-xs text-gray-400">By {activity.user} • {activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Other tab content would go here */}
        {activeTab !== 'overview' && (
          <div>
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'applications' && <AdminApplicationReview />}
            {activeTab === 'system' && <SystemConfig />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer variant="dashboard" />

      {/* Chatbot Widget */}
      <ChatbotWidget pageContext="admin-dashboard" position="bottom-right" />
    </div>
  );
}