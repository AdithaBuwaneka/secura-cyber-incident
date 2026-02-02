'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Users,
  Plus,
  MessageCircle,
  Shield,
  Search,
  X,
  Clock,
  Crown
} from 'lucide-react';
import { RootState } from '@/store';
import toast from 'react-hot-toast';
import MessageThread from './MessageThread';

interface SecurityMember {
  uid: string;
  full_name: string;
  email: string;
  role: string;
  is_online: boolean;
  last_seen?: string;
}

interface TeamChatRoom {
  id: string;
  title: string;
  created_by: string;
  created_by_name: string;
  participants: Array<{
    user_id: string;
    user_name: string;
    user_role: string;
  }>;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
}

interface TeamChatPanelProps {
  onClose: () => void;
}

type ChatView = 'main' | 'conversation' | 'direct_message';

export default function TeamChatPanel({ onClose }: TeamChatPanelProps) {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const [currentView, setCurrentView] = useState<ChatView>('main');
  const [teamChatRooms, setTeamChatRooms] = useState<TeamChatRoom[]>([]);
  const [securityMembers, setSecurityMembers] = useState<SecurityMember[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Check if current user is team lead
  const isTeamLead = () => {
    return userProfile?.email === 'security.lead@secura.com';
  };

  useEffect(() => {
    loadTeamChatRooms();
    loadSecurityMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTeamChatRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/team-conversations`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamChatRooms(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load team chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecurityMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/users/security-team`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const members = await response.json();
        setSecurityMembers(members);
      }
    } catch (error) {
      console.error('Failed to load security members:', error);
    }
  };

  const createTeamChatRoom = async () => {
    if (!newRoomTitle.trim()) {
      toast.error('Please enter a room title');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          conversation_type: 'team_internal',
          title: newRoomTitle.trim(),
          participants: securityMembers.map(m => m.uid),
          is_private: false
        })
      });

      if (response.ok) {
        const conversation = await response.json();
        setSelectedConversation(conversation.id);
        setCurrentView('conversation');
        await loadTeamChatRooms();
        setShowCreateRoom(false);
        setNewRoomTitle('');
        toast.success('Team chat room created');
      } else {
        toast.error('Failed to create team chat room');
      }
    } catch (error) {
      console.error('Failed to create team chat room:', error);
      toast.error('Failed to create team chat room');
    }
  };

  const createDirectMessage = async (targetUserId: string, targetUserName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          conversation_type: 'direct_message',
          title: `Direct message with ${targetUserName}`,
          participants: [targetUserId],
          is_private: true
        })
      });

      if (response.ok) {
        const conversation = await response.json();
        setSelectedConversation(conversation.id);
        setCurrentView('conversation');
        toast.success(`Started conversation with ${targetUserName}`);
      } else {
        toast.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create direct message:', error);
      toast.error('Failed to create conversation');
    }
  };

  const openConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setCurrentView('conversation');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedConversation(null);
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredRooms = teamChatRooms.filter(room =>
    room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.participants.some(p => p.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMembers = securityMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentView === 'conversation' && selectedConversation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-[#2A2D35] w-full max-w-6xl h-full max-h-[90vh] rounded-lg border border-gray-700 flex flex-col">
          <MessageThread 
            conversationId={selectedConversation}
            onClose={handleBackToMain}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-[#2A2D35] w-full max-w-6xl h-full max-h-[90vh] rounded-lg border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
              <Users className="h-5 w-5 text-[#00D4FF]" />
            </div>
            <div>
              <h1 className="font-semibold text-white">Team Chat</h1>
              <p className="text-xs text-gray-400">Security team communication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms and team members..."
              className="w-full pl-10 pr-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF]"
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Team Chat Rooms */}
          <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Team Chat Rooms</h2>
                {isTeamLead() && (
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] rounded-lg transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Room</span>
                  </button>
                )}
              </div>

              {/* Create Room Modal */}
              {showCreateRoom && (
                <div className="mb-4 p-3 bg-[#1A1D23] border border-gray-600 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-2">Create New Team Room</h3>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="Enter room title..."
                    className="w-full p-2 bg-[#2A2D35] border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] mb-3"
                    onKeyPress={(e) => e.key === 'Enter' && createTeamChatRoom()}
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={createTeamChatRoom}
                      className="px-3 py-1.5 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] rounded text-sm transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateRoom(false);
                        setNewRoomTitle('');
                      }}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team chat rooms</p>
                  {isTeamLead() && (
                    <p className="text-sm mt-1">Create the first team room to get started</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => openConversation(room.id)}
                      className="p-3 bg-[#1A1D23] hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Users className="h-4 w-4 text-[#00D4FF]" />
                            <h3 className="font-medium text-sm text-white truncate">{room.title}</h3>
                            {room.created_by === userProfile?.uid && (
                              <span title="Created by you">
                                <Crown className="h-3 w-3 text-yellow-400" />
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-400 mb-1">
                            {room.participants.length} members
                          </p>
                          
                          {room.last_message && (
                            <p className="text-xs text-gray-300 truncate">
                              <span className="font-medium">{room.last_message.sender_name}:</span> {room.last_message.content}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end space-y-1">
                          {room.last_message && (
                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>{formatLastMessageTime(room.last_message.created_at)}</span>
                            </div>
                          )}
                          
                          {room.unread_count > 0 && (
                            <div className="bg-[#00D4FF] text-[#1A1D23] text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {room.unread_count}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team Members for Direct Messages */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Direct Messages</h2>
            
            {securityMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No security team members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.uid}
                    className="p-3 bg-[#1A1D23] rounded-lg border border-gray-700 hover:border-[#00D4FF] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-8 h-8 bg-[#00D4FF]/20 rounded-full flex items-center justify-center">
                            {member.email === 'security.lead@secura.com' ? (
                              <Crown className="h-4 w-4 text-yellow-400" />
                            ) : (
                              <Shield className="h-4 w-4 text-[#00D4FF]" />
                            )}
                          </div>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1A1D23] ${
                            member.is_online ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-sm text-white">{member.full_name}</h3>
                          <p className="text-xs text-gray-400">
                            {member.email === 'security.lead@secura.com' ? 'Team Lead' : 'Security Team'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.is_online ? 'Online' : member.last_seen ? `Last seen ${formatLastMessageTime(member.last_seen)}` : 'Offline'}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => createDirectMessage(member.uid, member.full_name)}
                        disabled={member.uid === userProfile?.uid}
                        className="p-2 bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}