'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import toast from 'react-hot-toast';
import {
  Calendar,
  User,
  MessageSquare,
  Paperclip,
  MapPin,
  FileText,
  Image as ImageIcon,
  Download,
  X
} from 'lucide-react';

interface IncidentAttachment {
  file_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  file_hash: string;
  upload_timestamp: string;
  uploader_id: string;
}

interface IncidentDetail {
  id: string;
  title: string | null;
  description: string | null;
  incident_type: string;
  severity: string;
  status: string;
  reporter_id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_department?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_at?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  attachments: IncidentAttachment[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  ai_analysis?: Record<string, unknown>;
}

interface Message {
  id: string;
  incident_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  message_type: string;
  created_at: string;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { idToken, userProfile } = useSelector((state: RootState) => state.auth);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/secura';

  useEffect(() => {
    if (params.id && idToken) {
      fetchIncidentDetails();
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, idToken]);

  const fetchIncidentDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/incidents/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Incident data received:', data);
        console.log('Attachments:', data.attachments);
        setIncident(data);
      } else if (response.status === 404) {
        toast.error('Incident not found');
        router.push('/dashboard');
      } else {
        toast.error('Failed to load incident details');
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
      toast.error('Failed to load incident');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/incidents/${params.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      const response = await fetch(`${API_URL}/api/incidents/${params.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          message_type: 'text'
        })
      });

      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        toast.success('Message sent');
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

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
    switch (status) {
      case 'pending': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
      case 'investigating': return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
      case 'resolved': return 'text-green-500 border-green-500/50 bg-green-500/10';
      case 'closed': return 'text-gray-500 border-gray-500/50 bg-gray-500/10';
      default: return 'text-gray-500 border-gray-500/50 bg-gray-500/10';
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4FF]"></div>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0F1114] p-6">
      <div className="w-full max-w-4xl mx-auto bg-[#1A1D23] rounded-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Incident Details</h2>
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Incident ID and Status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-400">Incident ID</p>
              <p className="text-lg font-mono text-white">{incident.id}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(incident.status)}`}>
              {incident.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Title and Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {incident.title || 'Untitled Incident'}
            </h3>
            <p className="text-gray-300 whitespace-pre-wrap">
              {incident.description || 'No description provided'}
            </p>
          </div>

          {/* Severity and Type */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Severity</p>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                <span className="text-white font-medium">
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                </span>
              </div>
            </div>
            <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Incident Type</p>
              <p className="text-white font-medium">
                {incident.incident_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
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
                <p className="text-white">{incident.reporter_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-white">{incident.reporter_email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-white">{incident.reporter_department || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reported</p>
                <p className="text-white">{new Date(incident.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          {incident.location && (
            <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </h4>
              <p className="text-white">
                {incident.location.address || 'No specific location'}
              </p>
            </div>
          )}

          {/* Attachments */}
          {incident.attachments && incident.attachments.length > 0 && (
            <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <Paperclip className="h-4 w-4 mr-2" />
                Attachments ({incident.attachments.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incident.attachments.map((attachment: IncidentAttachment & { file_url?: string; imagekit_url?: string }, index) => {
                  const isImage = attachment.file_type?.startsWith('image/') ||
                                 attachment.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                  // Check if attachment has file_url (from backend) or construct it
                  let fileUrl = '';
                  if (attachment.file_url) {
                    fileUrl = attachment.file_url;
                  } else if (attachment.imagekit_url) {
                    fileUrl = attachment.imagekit_url;
                  } else if (attachment.file_id?.startsWith('http')) {
                    fileUrl = attachment.file_id;
                  } else {
                    // Construct ImageKit URL
                    fileUrl = `${IMAGEKIT_URL}/incidents/${incident.id}/${attachment.filename}`;
                  }

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
                          {isImage && fileUrl && (
                            <div className="mt-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fileUrl}
                                alt={attachment.original_filename || 'Attachment'}
                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(fileUrl, '_blank')}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-1">
                          {fileUrl && (
                            <button
                              onClick={() => window.open(fileUrl, '_blank')}
                              className="p-2 text-gray-400 hover:text-[#00D4FF] transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
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
                <span className="text-white">{new Date(incident.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-white">{new Date(incident.updated_at).toLocaleString()}</span>
              </div>
              {incident.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Resolved</span>
                  <span className="text-white">{new Date(incident.resolved_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages Section */}
          <div className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 mb-6">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Communication Thread
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-3 mb-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No messages yet</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="bg-[#1A1D23] p-3 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="font-medium text-white">{message.sender_name}</span>
                        <span className="text-xs text-gray-500 ml-2">({message.sender_role})</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{message.content}</p>
                  </div>
                ))
              )}
            </div>
            
            {/* Message Input */}
            {userProfile && (userProfile.role === 'security_team' || userProfile.role === 'admin' || incident.reporter_id === userProfile.uid) && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={isSendingMessage || !newMessage.trim()}
                  className="px-4 py-2 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50 text-sm"
                >
                  Send
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-[#374151] hover:bg-[#4B5563] text-white rounded-lg transition-colors"
            >
              Close
            </button>
            {userProfile && (userProfile.role === 'security_team' || userProfile.role === 'admin') && !incident.assigned_to && (
              <button className="px-6 py-3 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] font-medium rounded-lg transition-colors">
                Assign to Me
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}