'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  Send, 
  Paperclip, 
  Shield, 
  User, 
  CheckCheck,
  X,
  Image,
  FileText,
  Download
} from 'lucide-react';
import { RootState } from '@/store';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'employee' | 'security_team' | 'admin';
  content: string;
  created_at: string;
  attachments?: File[];
  is_read: boolean;
  message_type: 'text' | 'file' | 'system';
}


interface MessageThreadProps {
  incidentId?: string;
  conversationId?: string;
  onClose?: () => void;
}

export default function MessageThread({ incidentId, conversationId, onClose }: MessageThreadProps) {
  const { userProfile, idToken } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string>('Security Support');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [otherParticipantName, setOtherParticipantName] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagePollingRef = useRef<NodeJS.Timeout | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  // Properly convert HTTP/HTTPS to WS/WSS for WebSocket connections
  const WS_URL = API_URL.replace(/^https?:\/\//, (match) => match === 'https://' ? 'wss://' : 'ws://');

  // Cache conversation data to avoid redundant API calls
  const conversationCacheRef = useRef<{ id: string; title: string; participants: any[] } | null>(null);

  const initializeWebSocket = useCallback(async (cachedConvId?: string) => {
    if (!idToken || !userProfile?.uid) {
      console.log('[MessageThread] Cannot initialize WebSocket: missing auth');
      return;
    }

    // Use cached conversation ID if available
    let targetConversationId = cachedConvId || conversationId || currentConversationId;

    if (!targetConversationId) {
      console.log('[MessageThread] Cannot initialize WebSocket: missing conversation ID');
      return;
    }

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[MessageThread] WebSocket already connected');
      return; // Already connected
    }

    try {
      const wsUrl = `${WS_URL}/api/messaging/ws/${targetConversationId}?token=${idToken}`;
      console.log('[MessageThread] Connecting to WebSocket:', WS_URL, 'Conversation:', targetConversationId);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('[MessageThread] WebSocket connected successfully');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'join_room',
            room_id: `conversation_${targetConversationId}`,
            user_id: userProfile?.uid
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'incident_message' || data.type === 'new_message' || data.type === 'message') {
            const messageData = data.message || data;

            const newMessage: Message = {
              id: messageData.id || Date.now().toString(),
              sender_id: messageData.sender_id || data.user_id || 'unknown',
              sender_name: messageData.sender_name || data.sender || 'Unknown',
              sender_role: messageData.sender_role || 'employee',
              content: messageData.content || messageData.message || '',
              created_at: messageData.created_at ?
                (typeof messageData.created_at === 'string' ? messageData.created_at : new Date(messageData.created_at).toISOString()) :
                (data.timestamp || new Date().toISOString()),
              attachments: messageData.attachments || [],
              is_read: false,
              message_type: messageData.message_type || 'text'
            };

            if (newMessage.sender_id !== userProfile?.uid) {
              setMessages(prev => {
                if (prev.some(msg => msg.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
            }
          } else if (data.type === 'typing') {
            setIsTyping(data.is_typing && data.user_id !== userProfile?.uid);
          }
        } catch (error) {
          console.error('[MessageThread] Failed to parse message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        console.log(`[MessageThread] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        // Reconnect after 5 seconds
        if (currentConversationId) {
          console.log('[MessageThread] Will attempt reconnect in 5s...');
          setTimeout(() => {
            initializeWebSocket(currentConversationId);
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[MessageThread] WebSocket error:', {
          readyState: wsRef.current?.readyState,
          url: WS_URL,
          conversationId: targetConversationId,
          error: error
        });
        setIsConnected(false);
      };
    } catch (error) {
      console.error('[MessageThread] Failed to initialize WebSocket:', error);
    }
  }, [conversationId, currentConversationId, idToken, userProfile?.uid, WS_URL]);

  const loadMessages = useCallback(async () => {
    if (!idToken) {
      setIsLoading(false);
      return;
    }

    let targetConversationId = conversationId || currentConversationId;

    // For team chats: conversationId is passed directly, fetch conversation details
    if (conversationId && !conversationCacheRef.current) {
      try {
        const convResponse = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (convResponse.ok) {
          const conversation = await convResponse.json();

          // Cache conversation data
          conversationCacheRef.current = {
            id: conversation.id,
            title: conversation.title || 'Team Chat',
            participants: conversation.participants || []
          };

          setCurrentConversationId(conversationId);
          setConversationTitle(conversationCacheRef.current.title);

          // Initialize WebSocket
          initializeWebSocket(conversationId);
        }
      } catch {
        // Continue anyway - we can still try to load messages
      }
    }
    // For incident chats: fetch conversation by incident ID
    else if (!targetConversationId && incidentId) {
      try {
        const convResponse = await fetch(`${API_URL}/api/messaging/conversations/incident/${incidentId}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (convResponse.ok) {
          const conversation = await convResponse.json();
          targetConversationId = conversation.id;

          // Cache conversation data
          conversationCacheRef.current = {
            id: conversation.id,
            title: conversation.incident_title || conversation.title || 'Incident',
            participants: conversation.participants || []
          };

          setCurrentConversationId(targetConversationId);
          setConversationTitle(conversationCacheRef.current.title);

          // Find other participant
          const otherParticipant = conversation.participants?.find(
            (p: { user_id: string; user_name?: string; user_role?: string }) => p.user_id !== userProfile?.uid
          );

          if (otherParticipant) {
            setOtherParticipantName(otherParticipant.user_name ||
              (otherParticipant.user_role === 'security_team' ? 'Security Team Member' : 'Employee'));
          }

          // Initialize WebSocket with the conversation ID
          initializeWebSocket(targetConversationId);
        } else {
          setIsLoading(false);
          return;
        }
      } catch {
        setIsLoading(false);
        return;
      }
    }
    // If we have conversationId but WebSocket not initialized yet
    else if (conversationId && !wsRef.current) {
      setCurrentConversationId(conversationId);
      initializeWebSocket(conversationId);
    }

    // Use the final target conversation ID
    targetConversationId = conversationId || currentConversationId || targetConversationId;

    if (!targetConversationId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations/${targetConversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];

        const processedMessages = messages.map((msg: Partial<Message> & { id: string; sender_id: string; created_at: string }) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name || 'Unknown User',
          sender_role: msg.sender_role || 'employee',
          content: msg.content || '',
          created_at: msg.created_at,
          attachments: msg.attachments || [],
          is_read: msg.is_read || false,
          message_type: msg.message_type || 'text'
        }));

        setMessages(processedMessages);
      } else if (response.status === 404) {
        toast.error('Conversation not found.');
      } else if (response.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      }
    } catch {
      toast.error('Network error while loading messages.');
    } finally {
      setIsLoading(false);
    }
  }, [incidentId, conversationId, currentConversationId, idToken, userProfile?.uid, API_URL, initializeWebSocket]);

  // Fallback message polling when WebSocket is not connected (reduced frequency)
  const startMessagePolling = useCallback(() => {
    if (messagePollingRef.current) {
      clearInterval(messagePollingRef.current);
    }

    // Only poll if not connected and we have a conversation
    if (isConnected || !currentConversationId || !idToken) return;

    messagePollingRef.current = setInterval(async () => {
      if (isConnected || !currentConversationId) return;

      try {
        const response = await fetch(`${API_URL}/api/messaging/conversations/${currentConversationId}/messages`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          const latestMessages = data.messages || [];

          setMessages(prev => {
            const processedMessages = latestMessages.map((msg: Partial<Message> & { id: string; sender_id: string; created_at: string }) => ({
              id: msg.id,
              sender_id: msg.sender_id,
              sender_name: msg.sender_name || 'Unknown User',
              sender_role: msg.sender_role || 'employee',
              content: msg.content || '',
              created_at: msg.created_at,
              attachments: msg.attachments || [],
              is_read: msg.is_read || false,
              message_type: msg.message_type || 'text'
            }));

            const newMessages = processedMessages.filter((msg: Message) =>
              !prev.some(existingMsg => existingMsg.id === msg.id)
            );

            return newMessages.length > 0 ? [...prev, ...newMessages] : prev;
          });
        }
      } catch {
        // Silent fail
      }
    }, 5000); // Poll every 5 seconds when disconnected (was 3)
  }, [isConnected, currentConversationId, idToken, API_URL]);

  useEffect(() => {
    // Load messages first - this will also initialize WebSocket with cached conversation ID
    loadMessages();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current);
      }
      conversationCacheRef.current = null;
    };
  }, [incidentId, conversationId, loadMessages]);

  // Start/stop polling based on connection status
  useEffect(() => {
    if (!isConnected) {
      startMessagePolling();
    } else {
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current);
      }
    }
    
    return () => {
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current);
      }
    };
  }, [isConnected, startMessagePolling]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    // Use cached or current conversation ID - no extra API call needed
    const targetConversationId = conversationId || currentConversationId || conversationCacheRef.current?.id;

    if (!targetConversationId) {
      toast.error('No conversation available');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations/${targetConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          message_type: 'text'
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Add message immediately to UI
        const tempMessage: Message = {
          id: result.message_id || Date.now().toString(),
          sender_id: userProfile?.uid || 'unknown',
          sender_name: userProfile?.full_name || 'Unknown',
          sender_role: (userProfile?.role as 'employee' | 'security_team' | 'admin') || 'employee',
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          attachments: [],
          is_read: false,
          message_type: 'text'
        };
        setMessages(prev => [...prev, tempMessage]);

        // Send via WebSocket for real-time delivery
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'new_message',
            message: tempMessage,
            timestamp: new Date().toISOString()
          }));
        }

        // Handle file uploads
        if (attachments.length > 0) {
          await uploadAttachments();
        }

        setNewMessage('');
        setAttachments([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.detail || 'Failed to send message');
      }
    } catch {
      toast.error('Failed to send message');
    }
  };

  const uploadAttachments = async () => {
    if (!incidentId || attachments.length === 0) return;

    try {
      // Upload files in parallel for speed
      await Promise.all(attachments.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('incident_id', incidentId);

        await fetch(`${API_URL}/api/incidents/${incidentId}/attachments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${idToken}` },
          body: formData
        });
      }));
    } catch {
      toast.error('Some files failed to upload');
    }
  };

  const handleFileSelect = (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'security_team':
      case 'admin':
        return <Shield className="h-4 w-4 text-orange-400" />;
      default:
        return <User className="h-4 w-4 text-blue-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'security_team':
        return 'bg-orange-500/20 text-orange-300';
      case 'admin':
        return 'bg-purple-500/20 text-purple-300';
      default:
        return 'bg-blue-500/20 text-blue-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#2A2D35] border border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
            <Shield className="h-5 w-5 text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {conversationTitle}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto max-h-96">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
          </div>
                          ) : messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-32 text-gray-400">
             <Shield className="h-8 w-8 mb-2" />
             <p className="text-sm">No messages yet. Start the conversation!</p>
           </div>
        ) : (
          <div className="space-y-4">
            {Array.isArray(messages) ? messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === userProfile?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.sender_id === userProfile?.uid ? 'order-2' : 'order-1'
                }`}>
                  <div className={`p-3 rounded-lg ${
                    message.sender_id === userProfile?.uid
                      ? 'bg-[#00D4FF] text-[#1A1D23]'
                      : 'bg-[#1A1D23] text-white border border-gray-700'
                  }`}>
                    {message.sender_id !== userProfile?.uid && (
                      <div className="flex items-center space-x-2 mb-2">
                        {getRoleIcon(message.sender_role)}
                        <span className="text-xs font-medium">{message.sender_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadge(message.sender_role)}`}>
                          {message.sender_role === 'security_team' ? 'Security' : 
                           message.sender_role === 'admin' ? 'Admin' : 'Employee'}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-sm">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-black/20 rounded">
                            <FileText className="h-3 w-3" />
                            <span className="text-xs">{file.name}</span>
                            <Download className="h-3 w-3 cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-70">
                        {formatTimestamp(message.created_at)}
                      </span>
                      {message.sender_id === userProfile?.uid && (
                        <CheckCheck className={`h-3 w-3 ${message.is_read ? 'text-green-400' : 'opacity-50'}`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Shield className="h-8 w-8 mb-2" />
                <p className="text-sm">Unable to load messages</p>
              </div>
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs">
                  <div className="p-3 bg-[#1A1D23] text-white border border-gray-700 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
            <Paperclip className="h-4 w-4" />
            <span>Attachments ({attachments.length})</span>
          </div>
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-[#1A1D23] rounded">
                <div className="flex items-center space-x-2">
                  {file.type.startsWith('image/') ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image className="h-4 w-4 text-blue-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-white">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 bg-[#1A1D23] border border-gray-600 rounded-lg">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 p-3 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                disabled={!isConnected}
              />
              <label className="p-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.txt,.log,.doc,.docx"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />
              </label>
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && attachments.length === 0) || !isConnected}
            className="p-3 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}