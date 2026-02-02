'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Edit3, 
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { fetchUsers, updateUserRole, toggleUserStatus } from '@/store/users/userSlice';
import AddSecurityMemberModal from './AddSecurityMemberModal';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const { users, loading, error } = useSelector((state: RootState) => state.users);
  const { userProfile } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState<'security' | 'employees'>('security');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleRoleChange = async (uid: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'security_team' ? 'employee' : 'security_team';
      await dispatch(updateUserRole({ uid, newRole })).unwrap();
      toast.success(`User role updated to ${newRole === 'security_team' ? 'Security Team' : 'Employee'}`);
    } catch {
      toast.error('Failed to update user role');
    }
  };

  const handleStatusToggle = async (uid: string, currentStatus: boolean) => {
    try {
      await dispatch(toggleUserStatus({ uid, isActive: !currentStatus })).unwrap();
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'security' ? user.role === 'security_team' : user.role === 'employee';
    const matchesStatus = showInactive || user.is_active;
    return matchesSearch && matchesTab && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Admin', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
      security_team: { label: 'Security Team', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      employee: { label: 'Employee', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.employee;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </span>
    );
  };

  const handleAddMemberSuccess = () => {
    // Refresh the users list
    dispatch(fetchUsers());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 mt-1">Manage users and their roles across the system</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Security Member</span>
          </button>
          <button
            onClick={() => dispatch(fetchUsers())}
            disabled={loading}
            className="flex items-center space-x-2 bg-[#00D4FF] text-[#1A1D23] px-4 py-2 rounded-lg hover:bg-[#00C4EF] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#2A2D35] rounded-lg p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'security'
                ? 'bg-[#00D4FF] text-[#1A1D23]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Security Team</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
              {users.filter(u => u.role === 'security_team').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'employees'
                ? 'bg-[#00D4FF] text-[#1A1D23]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Employees</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
              {users.filter(u => u.role === 'employee').length}
            </span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#2A2D35] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF]"
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
            showInactive
              ? 'bg-[#00D4FF] text-[#1A1D23] border-[#00D4FF]'
              : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-500'
          }`}
        >
          {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span>{showInactive ? 'Show All' : 'Active Only'}</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#2A2D35] rounded-lg border border-gray-700 overflow-hidden">
        {error ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 font-medium">Error loading users</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => dispatch(fetchUsers())}
              className="mt-4 bg-[#00D4FF] text-[#1A1D23] px-4 py-2 rounded-lg hover:bg-[#00C4EF] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-[#00D4FF] animate-spin" />
            <span className="ml-3 text-gray-400">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No users found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'No users in this category'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1A1D23] border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-[#1A1D23]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#00D4FF] to-blue-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-[#1A1D23]">
                              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                          {user.phone_number && (
                            <div className="text-xs text-gray-500">{user.phone_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.is_active)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {/* Role Change Button */}
                        {user.uid !== userProfile?.uid && user.role !== 'admin' && (
                          <button
                            onClick={() => handleRoleChange(user.uid, user.role)}
                            className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-md hover:bg-blue-500/30 transition-colors"
                            title={user.role === 'security_team' ? 'Change to Employee' : 'Change to Security Team'}
                          >
                            {user.role === 'security_team' ? 'Make Employee' : 'Make Security'}
                          </button>
                        )}
                        
                        {/* Status Toggle Button */}
                        {user.uid !== userProfile?.uid && (
                          <button
                            onClick={() => handleStatusToggle(user.uid, user.is_active)}
                            className={`text-xs px-3 py-1 rounded-md transition-colors ${
                              user.is_active
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                            }`}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        
                        {/* Edit Button */}
                        <button className="text-gray-400 hover:text-white transition-colors">
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Security Team</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.role === 'security_team').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Inactive Users</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => !u.is_active).length}
              </p>
            </div>
            <UserX className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Add Security Member Modal */}
      <AddSecurityMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={handleAddMemberSuccess}
      />
    </div>
  );
} 