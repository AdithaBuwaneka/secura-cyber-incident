'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  TrendingUp, 
  Brain, 
  MessageSquare, 
  Bell, 
  LogOut,
  User,
  Users,
  ChevronDown
} from 'lucide-react';
import TeamChatPanel from '../messaging/TeamChatPanel';

interface UserProfile {
  uid?: string;
  email?: string;
  full_name?: string;
  role?: string;
}

interface SecurityHeaderProps {
  userProfile: UserProfile | null;
  unreadCount: number;
  isTeamLeader: () => boolean;
  onAnalyticsClick: () => void;
  onAIClick: () => void;
  onMessagingClick: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}

export default function SecurityHeader({
  userProfile,
  unreadCount,
  isTeamLeader,
  onAnalyticsClick,
  onAIClick,
  onMessagingClick,
  onProfileClick,
  onLogout
}: SecurityHeaderProps) {
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [showMessagingDropdown, setShowMessagingDropdown] = useState(false);

  return (
    <>
      {/* Team Chat Panel */}
      {showTeamChat && (
        <TeamChatPanel onClose={() => setShowTeamChat(false)} />
      )}
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#2A2D35] border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 min-w-0">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-[#00D4FF] flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">Secura</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 hidden min-[360px]:block truncate">
                <span className="md:hidden">🛡️ Security</span>
                <span className="hidden md:inline">🛡️ Security Team Dashboard</span>
              </p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Analytics - hidden on very small screens */}
            <button 
              onClick={onAnalyticsClick}
              className="hidden min-[400px]:flex p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
              title="Analytics"
            >
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {/* AI Analysis - hidden on very small screens */}
            <button 
              onClick={onAIClick}
              className="hidden min-[400px]:flex p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
              title="AI Analysis"
            >
              <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {/* Messaging Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowMessagingDropdown(!showMessagingDropdown)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors relative flex items-center space-x-0.5 sm:space-x-1"
                title="Messages"
              >
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[9px] sm:text-xs text-white font-bold">{unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Messaging Dropdown Menu */}
              {showMessagingDropdown && (
                <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-[#2A2D35] border border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-1.5 sm:p-2">
                    <button
                      onClick={() => {
                        onMessagingClick();
                        setShowMessagingDropdown(false);
                      }}
                      className="w-full flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">Incident Chats</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto px-1 sm:px-1.5 py-0.5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowTeamChat(true);
                        setShowMessagingDropdown(false);
                      }}
                      className="w-full flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
                    >
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">Team Chat</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[8px] sm:text-xs text-white font-bold">3</span>
              </span>
            </button>

            {/* Profile Button */}
            <button 
              onClick={onProfileClick}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
              title="My Profile"
            >
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {/* User Info - hide name on small screens */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white truncate max-w-[120px]">{userProfile?.full_name}</p>
                <p className="text-xs text-gray-400">Security Analyst</p>
              </div>
            </div>
            
            {/* Role Badge and Logout */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className={`hidden sm:inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                isTeamLeader() 
                  ? 'bg-yellow-500/20 text-yellow-300' 
                  : 'bg-orange-500/20 text-orange-300'
              }`}>
                <span className="md:hidden">{isTeamLeader() ? '👑 Lead' : '🛡️ Team'}</span>
                <span className="hidden md:inline">{isTeamLeader() ? '👑 Team Leader' : '🛡️ Security Team'}</span>
              </span>
              <button
                onClick={onLogout}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}