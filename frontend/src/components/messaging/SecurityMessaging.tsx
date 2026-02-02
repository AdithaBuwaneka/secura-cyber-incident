'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  MessageSquare, 
  Search,
  X,
  Shield,
  User as UserIcon
} from 'lucide-react';
import { RootState } from '@/store';
import MessageThread from './MessageThread';
import { useMessaging } from './MessagingProvider';

interface Conversation {
  id: string;
  incident_id?: string;
  participant_name: string;
  participant_role: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: 'active' | 'resolved' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityMessagingProps {
  onClose?: () => void;
}

export default function SecurityMessaging({ onClose }: SecurityMessagingProps) {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const { isConnected, unreadCount } = useMessaging();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const loadConversations = useCallback(async () => {
    // Helper function to create conversations for employee's incidents
    const createConversationsForEmployeeIncidents = async () => {
      try {
        console.log('SecurityMessaging: Creating conversations for employee incidents...');
        
        // Get employee's incidents
        const incidentsResponse = await fetch(`${API_URL}/api/incidents/?limit=10`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (incidentsResponse.ok) {
          const incidents = await incidentsResponse.json();
          console.log('SecurityMessaging: Found incidents:', incidents);
          
          // Create conversations for incidents that have assigned security members
          for (const incident of incidents) {
            if (incident.assigned_to) {
              console.log(`SecurityMessaging: Creating conversation for incident ${incident.id} with ${incident.assigned_to_name}`);
              try {
                const response = await fetch(`${API_URL}/api/messaging/conversations/incident/${incident.id}`, {
                  headers: {
                    'Authorization': `Bearer ${idToken}`
                  }
                });
                
                if (response.ok) {
                  console.log(`SecurityMessaging: Conversation created/found for incident ${incident.id}`);
                } else {
                  console.error(`SecurityMessaging: Failed to create conversation for incident ${incident.id}: ${response.status}`);
                  const errorText = await response.text();
                  console.error('Error details:', errorText);
                }
              } catch (error) {
                console.error(`SecurityMessaging: Failed to create conversation for incident ${incident.id}:`, error);
              }
            }
          }
        } else {
          console.error('SecurityMessaging: Failed to fetch incidents:', incidentsResponse.status);
          const errorText = await incidentsResponse.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('SecurityMessaging: Failed to create conversations for incidents:', error);
      }
    };

    try {
      console.log('SecurityMessaging: Starting to load conversations...');
      console.log('API_URL:', API_URL);
      console.log('idToken exists:', !!idToken);
      console.log('userProfile:', userProfile);
      
      if (!idToken) {
        console.error('SecurityMessaging: No idToken available');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/messaging/conversations`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('SecurityMessaging: Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('SecurityMessaging: Raw data from API:', data);
        
        // Check if data has the expected structure
        const conversations = data.conversations || [];
        console.log('SecurityMessaging: Total conversations:', conversations.length);
        
        // Filter out team internal conversations - those belong in Team Chat only
        const incidentConversations = conversations.filter((conv: any) => 
          conv.conversation_type !== 'team_internal' && conv.conversation_type !== 'direct_message'
        );
        
        console.log('SecurityMessaging: Incident conversations:', incidentConversations.length);
        
        let formattedConversations: Conversation[] = incidentConversations.map((conv: any) => {
          const participantName = getOtherParticipantName(conv.participants);
          const participantRole = getOtherParticipantRole(conv.participants);
          
          console.log(`Conversation ${conv.id}: participant_name=${participantName}, role=${participantRole}`);
          
          return {
            id: conv.id,
            incident_id: conv.incident_id,
            participant_name: participantName || 'Security Team',
            participant_role: participantRole,
            last_message: conv.last_message_content || 'No messages yet',
            last_message_time: conv.last_message_time || conv.created_at,
            unread_count: 0, // Will be calculated separately
            status: conv.conversation_type === 'incident_chat' ? 'active' : 'active',
            priority: 'high' // All incident conversations are high priority
          };
        });
        
        // For employees, also check if we need to create conversations for their incidents
        if (userProfile?.role === 'employee' && formattedConversations.length === 0) {
          console.log('SecurityMessaging: No conversations found for employee, checking incidents...');
          await createConversationsForEmployeeIncidents();
          // Reload conversations after creating them
          const newResponse = await fetch(`${API_URL}/api/messaging/conversations`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (newResponse.ok) {
            const newData = await newResponse.json();
            const newConversations = newData.conversations || [];
            // Filter out team internal conversations - those belong in Team Chat only
            const newIncidentConversations = newConversations.filter((conv: any) => 
              conv.conversation_type !== 'team_internal' && conv.conversation_type !== 'direct_message'
            );
            formattedConversations = newIncidentConversations.map((conv: any) => ({
              id: conv.id,
              incident_id: conv.incident_id,
              participant_name: getOtherParticipantName(conv.participants) || 'Security Team',
              participant_role: getOtherParticipantRole(conv.participants),
              last_message: conv.last_message_content || 'No messages yet',
              last_message_time: conv.last_message_time || conv.created_at,
              unread_count: 0,
              status: conv.conversation_type === 'incident_chat' ? 'active' : 'active',
              priority: 'high' // All incident conversations are high priority
            }));
          }
        }
        
        console.log('SecurityMessaging: Final formatted conversations:', formattedConversations);
        setConversations(formattedConversations);
      } else {
        console.error('SecurityMessaging: Failed to load conversations - status:', response.status);
        const errorText = await response.text();
        console.error('SecurityMessaging: Error response:', errorText);
        setConversations([]);
      }
    } catch (error) {
      console.error('SecurityMessaging: Exception while loading conversations:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setConversations([]);
    } finally {
      console.log('SecurityMessaging: Setting isLoading to false');
      setIsLoading(false);
    }
  }, [idToken, API_URL, userProfile?.role, userProfile]);

  // Helper functions for participant handling
  const getOtherParticipantName = (participants: any[]) => {
    console.log('getOtherParticipantName: participants =', participants);
    console.log('getOtherParticipantName: current user uid =', userProfile?.uid);
    console.log('getOtherParticipantName: current user role =', userProfile?.role);
    
    if (!participants || participants.length === 0) {
      return 'Security Team';
    }
    
    // For employees, show the security team member
    // For security team, show the employee
    if (userProfile?.role === 'employee') {
      // Find the security team member
      const securityMember = participants.find(p => 
        p.user_id !== userProfile?.uid && 
        (p.user_role === 'security_team' || p.user_role === 'admin')
      );
      console.log('getOtherParticipantName: found security member =', securityMember);
      return securityMember?.user_name || 'Security Team';
    } else {
      // For security team, show the employee
      const otherParticipant = participants.find(p => p.user_id !== userProfile?.uid);
      console.log('getOtherParticipantName: otherParticipant =', otherParticipant);
      return otherParticipant?.user_name || 'Unknown User';
    }
  };

  const getOtherParticipantRole = (participants: any[]) => {
    if (!participants || participants.length === 0) {
      return 'security_team';
    }
    
    if (userProfile?.role === 'employee') {
      // Find the security team member
      const securityMember = participants.find(p => 
        p.user_id !== userProfile?.uid && 
        (p.user_role === 'security_team' || p.user_role === 'admin')
      );
      return securityMember?.user_role || 'security_team';
    } else {
      // For security team, show the employee's role
      const otherParticipant = participants.find(p => p.user_id !== userProfile?.uid);
      return otherParticipant?.user_role || 'employee';
    }
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);


  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.last_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conv.incident_id && conv.incident_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || conv.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400';
      case 'resolved': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex h-[600px] bg-[#2A2D35] border border-gray-700 rounded-lg overflow-hidden min-h-0">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col min-h-0 overflow-hidden" style={{ height: '600px' }}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-[#00D4FF]" />
              <h3 className="font-semibold text-white">Security Messaging</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full p-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF] text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '300px', height: '300px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00D4FF]"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Use the incident chat buttons to start conversations</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-3 border-b border-gray-700 cursor-pointer transition-colors hover:bg-[#1A1D23] ${
                  selectedConversation?.id === conversation.id ? 'bg-[#1A1D23] border-l-4 border-l-[#00D4FF]' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {conversation.participant_role === 'employee' ? (
                      <UserIcon className="h-8 w-8 text-blue-400 bg-blue-500/20 p-1.5 rounded-full" />
                    ) : (
                      <Shield className="h-8 w-8 text-orange-400 bg-orange-500/20 p-1.5 rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-white truncate">
                        {conversation.participant_name}
                      </h4>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(conversation.priority)}`}></div>
                        {conversation.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {conversation.incident_id && (
                      <p className="text-xs text-[#00D4FF] mb-1">
                        Incident #{conversation.incident_id.substring(0, 8)}...
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 truncate mb-1">
                      {conversation.last_message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(conversation.last_message_time)}
                      </span>
                      <span className={`text-xs ${getStatusColor(conversation.status)}`}>
                        {conversation.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 min-h-0">
        {selectedConversation ? (
          <MessageThread 
            incidentId={selectedConversation.incident_id}
            onClose={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Conversation</h3>
            <p className="text-sm text-center">
              Choose a conversation from the list to start messaging with employees about their security incidents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}