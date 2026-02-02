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

interface SecurityHeaderProps {
  userProfile: any;
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
    <header className="bg-[#2A2D35] border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-[#00D4FF]" />
            <div>
              <h1 className="text-xl font-bold text-white">Secura</h1>
              <p className="text-xs text-gray-400">🛡️ Security Team Dashboard</p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={onAnalyticsClick}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Analytics"
            >
              <TrendingUp className="h-5 w-5" />
            </button>
            
            <button 
              onClick={onAIClick}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="AI Analysis"
            >
              <Brain className="h-5 w-5" />
            </button>
            
            {/* Messaging Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowMessagingDropdown(!showMessagingDropdown)}
                className="p-2 text-gray-400 hover:text-white transition-colors relative flex items-center space-x-1"
                title="Messages"
              >
                <MessageSquare className="h-5 w-5" />
                <ChevronDown className="h-3 w-3" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Messaging Dropdown Menu */}
              {showMessagingDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-[#2A2D35] border border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        onMessagingClick();
                        setShowMessagingDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 p-2 text-gray-300 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">Incident Chats</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowTeamChat(true);
                        setShowMessagingDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 p-2 text-gray-300 hover:text-white hover:bg-[#1A1D23] rounded-lg transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Team Chat</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">3</span>
              </span>
            </button>

            {/* Profile Button */}
            <button 
              onClick={onProfileClick}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="My Profile"
            >
              <User className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userProfile?.full_name}</p>
                <p className="text-xs text-gray-400">Security Analyst</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isTeamLeader() 
                    ? 'bg-yellow-500/20 text-yellow-300' 
                    : 'bg-orange-500/20 text-orange-300'
                }`}>
                  {isTeamLeader() ? '👑 Team Leader' : '🛡️ Security Team'}
                </span>
                <button
                  onClick={onLogout}
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
    </>
  );
}