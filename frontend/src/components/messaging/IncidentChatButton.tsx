'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { MessageCircle, X, Users, Shield } from 'lucide-react';
import { RootState } from '@/store';
import MessageThread from './MessageThread';
import toast from 'react-hot-toast';

interface SecurityTeamMember {
  uid: string;
  full_name: string;
  email: string;
  is_online?: boolean;
}

interface IncidentChatButtonProps {
  incidentId: string;
  incidentTitle?: string;
  assignedToId?: string;
  assignedToName?: string;
  incidentStatus?: string;
  unreadCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function IncidentChatButton({
  incidentId,
  incidentTitle,
  assignedToId,
  assignedToName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  incidentStatus: _incidentStatus,
  unreadCount = 0,
  size = 'md',
  showLabel = true
}: IncidentChatButtonProps) {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const [showChat, setShowChat] = useState(false);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [securityTeamMembers, setSecurityTeamMembers] = useState<SecurityTeamMember[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  // Fetch security team members
  const fetchSecurityTeamMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const users = await response.json();
        const securityTeam = users.filter((user: { role: string }) => user.role === 'security_team');
        setSecurityTeamMembers(securityTeam);
      }
    } catch (error) {
      console.error('Failed to fetch security team:', error);
    }
  };

  // Handle chat button click
  const handleChatClick = () => {
    if (assignedToId) {
      // If incident is assigned to someone, chat directly with them
      setShowChat(true);
    } else if (userProfile?.role === 'employee') {
      // If employee and no one assigned, show member selection
      fetchSecurityTeamMembers();
      setShowMemberSelection(true);
    } else {
      // Security team members can chat directly
      setShowChat(true);
    }
  };

  // Create targeted conversation
  const createTargetedConversation = async (targetMemberId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_type: 'incident_chat',
          incident_id: incidentId,
          participants: [targetMemberId], // Just the selected security member
          title: `Chat with ${securityTeamMembers.find(m => m.uid === targetMemberId)?.full_name || 'Security Team'}`
        })
      });

      if (response.ok) {
        const conversation = await response.json();
        setConversationId(conversation.id);
        setShowChat(true);
        setShowMemberSelection(false);
      } else {
        toast.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  return (
    <>
      <button
        onClick={handleChatClick}
        className={`${buttonSizeClasses[size]} text-gray-400 hover:text-[#00D4FF] hover:bg-gray-700 rounded-lg transition-colors relative`}
        title={assignedToId ? `Chat with ${assignedToName}` : `Chat about ${incidentTitle || 'this incident'}`}
      >
        <MessageCircle className={sizeClasses[size]} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showLabel && size !== 'sm' && (
        <span className="ml-1 text-sm text-gray-400">
          {assignedToId ? `Chat with ${assignedToName}` : (unreadCount > 0 ? `Chat (${unreadCount})` : 'Chat')}
        </span>
      )}

      {/* Member Selection Modal */}
      {showMemberSelection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#2A2D35] rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Choose Security Team Member</h3>
              <button
                onClick={() => setShowMemberSelection(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">
              Select a security team member to chat with about this incident:
            </p>
            
            <div className="space-y-2">
              {securityTeamMembers.map((member) => (
                <button
                  key={member.uid}
                  onClick={() => createTargetedConversation(member.uid)}
                  className="w-full flex items-center space-x-3 p-3 bg-[#1A1D23] hover:bg-[#374151] rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-[#00D4FF]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{member.full_name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                  {member.is_online && (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
            
            {securityTeamMembers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No security team members available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl h-[80vh] bg-[#1A1D23] rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-[#2A2D35]">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-5 w-5 text-[#00D4FF]" />
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {assignedToId ? `Chat with ${assignedToName}` : 'Incident Chat'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {incidentTitle ? `About: ${incidentTitle}` : `Incident ID: ${incidentId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChat(false);
                  setConversationId(undefined);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="h-[calc(80vh-80px)]">
              <MessageThread 
                incidentId={incidentId}
                conversationId={conversationId}
                onClose={() => {
                  setShowChat(false);
                  setConversationId(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}