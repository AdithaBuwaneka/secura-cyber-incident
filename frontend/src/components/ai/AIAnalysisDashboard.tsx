'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { 
  Brain, 
  Target, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  BarChart3,
  FileSearch,
  LineChart,
  ShieldAlert,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { RootState } from '@/store';
import toast from 'react-hot-toast';

interface AIAnalysisResult {
  categories: Array<{
    category: string;
    confidence: number;
    reasoning: string;
  }>;
  severity: {
    severity: string;
    confidence: number;
    reasoning: string;
  };
  mitigation_strategies: Array<{
    strategy: string;
    priority: number;
    estimated_time: string;
    resources_required: string[];
  }>;
  confidence_score: number;
}

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

interface Incident {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  severity: string;
  incident_type: string;
  created_at: string;
  reporter_name: string;
  attachments?: IncidentAttachment[];
}

export default function AIAnalysisDashboard() {
  const { idToken, userProfile } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState('analysis');
  const [analysisInput, setAnalysisInput] = useState({
    title: '',
    description: ''
  });
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [threatIntelligence, setThreatIntelligence] = useState<any>(null);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<any>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const fetchIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const response = await fetch(`${API_URL}/api/incidents?limit=100`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      } else {
        toast.error('Failed to fetch incidents');
      }
    } catch (error) {
      console.error('Fetch incidents error:', error);
      toast.error('Failed to load incidents');
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  const handleIncidentSelect = (incidentId: string) => {
    const incident = incidents.find(inc => inc.id === incidentId);
    if (incident) {
      setSelectedIncident(incident);
      setAnalysisInput({
        title: incident.title || '',
        description: incident.description || ''
      });
      setAnalysisResult(null);
    }
  };

  const fetchThreatIntelligence = async () => {
    setIsLoadingIntel(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/threat-intelligence?days=30`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setThreatIntelligence(data);
      } else {
        toast.error('Failed to fetch threat intelligence');
      }
    } catch (error) {
      console.error('Threat intelligence error:', error);
      toast.error('Failed to load threat intelligence');
    } finally {
      setIsLoadingIntel(false);
    }
  };

  const fetchPredictiveAnalytics = async () => {
    setIsLoadingIntel(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/predictive-analytics?timeframe_days=90`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPredictiveAnalytics(data);
        toast.success('Predictive analytics loaded from real incident data');
      } else {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        toast.error(`Failed to load predictive analytics: ${response.status}`);
      }
    } catch (error) {
      console.error('Predictive analytics error:', error);
      toast.error('Failed to connect to predictive analytics service');
    } finally {
      setIsLoadingIntel(false);
    }
  };


  React.useEffect(() => {
    fetchIncidents();
  }, [idToken]);

  React.useEffect(() => {
    if (activeTab === 'intelligence' && !threatIntelligence) {
      fetchThreatIntelligence();
    } else if (activeTab === 'predictive' && !predictiveAnalytics) {
      fetchPredictiveAnalytics();
    }
  }, [activeTab]);

  const handleAnalyze = async () => {
    if (!selectedIncident) {
      toast.error('Please select an incident to analyze');
      return;
    }

    // Check if user has required role
    if (userProfile?.role !== 'security_team' && userProfile?.role !== 'admin') {
      toast.error('AI analysis requires security team or admin access');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // First, check if incident has images and analyze them
      let imageAnalysisText = '';
      const imageAttachments = selectedIncident.attachments?.filter(att => 
        att.file_type.startsWith('image/') || 
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].some(ext => att.filename.toLowerCase().endsWith(`.${ext}`))
      );

      if (imageAttachments && imageAttachments.length > 0) {
        // Construct proper ImageKit URL for the attachment
        const attachment = imageAttachments[0];
        let imageUrl = '';
        
        // Check if the attachment has a direct URL or we need to construct it
        if (attachment.file_id.startsWith('http')) {
          imageUrl = attachment.file_id;
        } else {
          // Construct ImageKit URL
          const imagekitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/secura';
          imageUrl = `${imagekitEndpoint}/incidents/${selectedIncident.id}/${attachment.filename}`;
        }
        
        try {
          const imageResponse = await fetch(`${API_URL}/api/ai/analyze-image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image_url: imageUrl,
              incident_id: selectedIncident.id,
              context: 'use_gemini'  // Enable Gemini AI analysis
            })
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            imageAnalysisText = imageData.extracted_text || '';
            if (imageAnalysisText) {
              toast.success('Image OCR completed - text extracted');
            } else {
              toast.info('Image analyzed but no text found');
            }
          }
        } catch (imgError) {
          console.error('Image analysis error:', imgError);
          toast.warning('Could not analyze image, proceeding with available text');
        }
      }

      // Combine available data for analysis
      const combinedText = [
        selectedIncident.title || '',
        selectedIncident.description || '',
        imageAnalysisText
      ].filter(text => text.trim()).join(' ');

      if (!combinedText.trim()) {
        toast.error('Insufficient data for analysis. No title, description, or readable image content found.');
        setAnalysisResult({
          categories: [{
            category: 'unknown',
            confidence: 0.1,
            reasoning: 'Insufficient data available for proper categorization'
          }],
          severity: {
            severity: 'unknown',
            confidence: 0.1,
            reasoning: 'Cannot assess severity without adequate incident information'
          },
          mitigation_strategies: [{
            strategy: 'Gather more information about the incident',
            priority: 1,
            estimated_time: 'Immediate',
            resources_required: ['Incident reporter', 'Security team']
          }],
          confidence_score: 0.1
        });
        return;
      }

      // Prepare request data
      const requestData = {
        title: selectedIncident.title || 'Incident Analysis',
        description: combinedText || 'No description available',
        context: {
          has_image: imageAttachments && imageAttachments.length > 0,
          image_text: imageAnalysisText,
          incident_type: selectedIncident.incident_type,
          severity: selectedIncident.severity
        }
      };

      console.log('Sending AI analysis request:', requestData);

      // Perform AI analysis with combined data
      const response = await fetch(`${API_URL}/api/ai/analyze-incident`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        toast.success('AI analysis completed');
      } else {
        let errorMessage = 'AI analysis failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.error('AI analysis error response:', errorData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze incident');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'phishing': return '🎣';
      case 'malware': return '🦠';
      case 'data_breach': return '💾';
      case 'unauthorized_access': return '🔓';
      case 'social_engineering': return '🎭';
      case 'physical_security': return '🏢';
      default: return '⚠️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Brain className="h-8 w-8 text-[#00D4FF] mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-white">AI Security Analysis</h2>
          <p className="text-gray-400">Advanced threat intelligence and predictive security analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-[#1A1D23] p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'analysis' 
              ? 'bg-[#00D4FF] text-[#1A1D23] font-medium' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileSearch className="h-4 w-4 mr-2" />
          Incident Analysis
        </button>
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'intelligence' 
              ? 'bg-[#00D4FF] text-[#1A1D23] font-medium' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Threat Intelligence
        </button>
        <button
          onClick={() => setActiveTab('predictive')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'predictive' 
              ? 'bg-[#00D4FF] text-[#1A1D23] font-medium' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LineChart className="h-4 w-4 mr-2" />
          Predictive Analytics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' && (
        <>
          {/* Incident Selection Section */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Select Incident for Analysis</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Choose an Incident
                </label>
                <select
                  value={selectedIncident?.id || ''}
                  onChange={(e) => handleIncidentSelect(e.target.value)}
                  className="w-full p-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                  disabled={isLoadingIncidents}
                >
                  <option value="">Select an incident...</option>
                  {incidents.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.title || 'Untitled'} - {incident.status} ({new Date(incident.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {selectedIncident && (
                <div className="p-4 bg-[#1A1D23] rounded-lg border border-gray-600">
                  <h4 className="font-medium text-white mb-2">Incident Summary</h4>
                  <div className="space-y-2 text-sm">
                    {selectedIncident.title && (
                      <div className="flex items-start">
                        <span className="text-gray-400 w-24">Title:</span>
                        <span className="text-white flex-1">{selectedIncident.title}</span>
                      </div>
                    )}
                    {selectedIncident.description && (
                      <div className="flex items-start">
                        <span className="text-gray-400 w-24">Description:</span>
                        <span className="text-white flex-1">{selectedIncident.description}</span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedIncident.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                        selectedIncident.status === 'investigating' ? 'bg-blue-500/20 text-blue-300' :
                        selectedIncident.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {selectedIncident.status}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Severity:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(selectedIncident.severity)}`}>
                        {selectedIncident.severity}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Type:</span>
                      <span className="text-white flex-1">{selectedIncident.incident_type || 'N/A'}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Reporter:</span>
                      <span className="text-white flex-1">{selectedIncident.reporter_name}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Date:</span>
                      <span className="text-white flex-1">{new Date(selectedIncident.created_at).toLocaleString()}</span>
                    </div>
                    {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                      <div className="flex items-start">
                        <span className="text-gray-400 w-24">Attachments:</span>
                        <div className="flex-1">
                          {selectedIncident.attachments.map((att, idx) => (
                            <div key={idx} className="text-white">
                              {att.file_type.startsWith('image/') ? '🖼️' : '📎'} {att.original_filename}
                              {att.file_type.startsWith('image/') && <span className="text-green-400 text-xs ml-2">(Will be analyzed with OCR)</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!selectedIncident.title && !selectedIncident.description && (!selectedIncident.attachments || selectedIncident.attachments.length === 0) && (
                      <div className="text-yellow-400 italic">
                        ⚠️ This incident has no title, description, or attachments. Analysis may be limited.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedIncident}
                className="flex items-center px-6 py-3 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1D23] mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Selected Incident
                  </>
                )}
              </button>
            </div>
          </div>

      {/* Results Section */}
      {analysisResult && selectedIncident && (
        <div className="space-y-6">
          {/* Incident Analysis Summary */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-4">
              <Brain className="h-5 w-5 text-[#00D4FF] mr-2" />
              <h3 className="text-lg font-semibold text-white">AI Analysis Summary</h3>
            </div>
            <div className="p-4 bg-[#1A1D23] rounded-lg">
              <h4 className="font-medium text-white mb-3">Incident: {selectedIncident.title || 'Untitled Incident'}</h4>
              {selectedIncident.description && (
                <p className="text-gray-300 text-sm mb-4">{selectedIncident.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Current Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    selectedIncident.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                    selectedIncident.status === 'investigating' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {selectedIncident.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">AI Confidence:</span>
                  <span className="ml-2 text-[#00D4FF] font-semibold">
                    {Math.round(analysisResult.confidence_score * 100)}%
                  </span>
                </div>
              </div>
              {analysisResult.confidence_score < 0.3 && (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs">
                  ⚠️ Low confidence analysis. The incident may lack sufficient information for accurate analysis.
                </div>
              )}
            </div>
          </div>

          {/* Category Analysis */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-4">
              <Target className="h-5 w-5 text-[#00D4FF] mr-2" />
              <h3 className="text-lg font-semibold text-white">Category Analysis</h3>
            </div>
            
            <div className="space-y-3">
              {analysisResult.categories.map((category, index) => (
                <div key={index} className="p-4 bg-[#1A1D23] rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getCategoryIcon(category.category)}</span>
                      <div>
                        <h4 className="font-medium text-white">
                          {category.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-400">{category.reasoning}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00D4FF] font-semibold">
                        {Math.round(category.confidence * 100)}%
                      </div>
                      <div className="h-1 w-16 bg-gray-700 rounded-full mt-1">
                        <div 
                          className="h-1 bg-[#00D4FF] rounded-full"
                          style={{ width: `${category.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Assessment */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-[#00D4FF] mr-2" />
              <h3 className="text-lg font-semibold text-white">Severity Assessment</h3>
            </div>
            
            <div className="p-4 bg-[#1A1D23] rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(analysisResult.severity.severity)}`}>
                    {analysisResult.severity.severity.toUpperCase()}
                  </div>
                </div>
                <div className="text-[#00D4FF] font-semibold">
                  {Math.round(analysisResult.severity.confidence * 100)}% confidence
                </div>
              </div>
              <p className="text-gray-400 text-sm">{analysisResult.severity.reasoning}</p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
            </div>
            
            <div className="space-y-3">
              {analysisResult.mitigation_strategies.map((strategy, index) => (
                <div key={index} className="p-4 bg-[#1A1D23] rounded-lg border border-gray-600 hover:border-[#00D4FF]/50 transition-colors">
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-8 h-8 bg-[#00D4FF]/20 text-[#00D4FF] rounded-full text-sm font-bold mr-3 flex-shrink-0">
                      {strategy.priority}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-2">{strategy.strategy}</h4>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center text-gray-400">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{strategy.estimated_time}</span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Shield className="h-3 w-3 mr-1" />
                          <span>{strategy.resources_required.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View Full Incident Link */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Incident Details</h3>
                <p className="text-gray-400 text-sm">View complete incident information, messages, and attachments</p>
              </div>
              <Link 
                href={`/incidents/${selectedIncident.id}`}
                className="flex items-center px-6 py-3 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Incident
              </Link>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Threat Intelligence Tab */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {isLoadingIntel ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
            </div>
          ) : threatIntelligence ? (
            <>
              {/* Trending Threats */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-[#00D4FF] mr-2" />
                  Trending Threats
                </h3>
                <div className="space-y-3">
                  {threatIntelligence.trending_threats?.map((threat: any, index: number) => (
                    <div key={index} className="p-4 bg-[#1A1D23] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{threat.threat_type}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          threat.risk_level === 'Critical' ? 'bg-red-500/20 text-red-300' :
                          threat.risk_level === 'High' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {threat.risk_level}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <Activity className="h-4 w-4 mr-1" />
                        <span>{threat.increase_percentage}% increase in activity</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industry Alerts */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-400 mr-2" />
                  Industry Alerts
                </h3>
                <div className="space-y-3">
                  {threatIntelligence.industry_alerts?.map((alert: any, index: number) => (
                    <div key={index} className="p-4 bg-[#1A1D23] rounded-lg border-l-4 border-orange-400">
                      <p className="text-white font-medium mb-1">{alert.alert}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Severity: {alert.severity}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 text-yellow-400 mr-2" />
                  AI Recommendations
                </h3>
                <div className="space-y-2">
                  {threatIntelligence.recommendations?.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Predictive Analytics Tab */}
      {activeTab === 'predictive' && (
        <div className="space-y-6">
          {isLoadingIntel ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
            </div>
          ) : predictiveAnalytics ? (
            <>
              {/* Predicted Incident Volume */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-[#00D4FF] mr-2" />
                  Predicted Incident Volume
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#1A1D23] rounded-lg text-center">
                    <p className="text-gray-400 text-sm mb-1">Next Week</p>
                    <p className="text-3xl font-bold text-[#00D4FF]">
                      {predictiveAnalytics.predicted_incident_volume?.next_week || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">incidents expected</p>
                  </div>
                  <div className="p-4 bg-[#1A1D23] rounded-lg text-center">
                    <p className="text-gray-400 text-sm mb-1">Next Month</p>
                    <p className="text-3xl font-bold text-[#00D4FF]">
                      {predictiveAnalytics.predicted_incident_volume?.next_month || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">incidents expected</p>
                  </div>
                  <div className="p-4 bg-[#1A1D23] rounded-lg text-center">
                    <p className="text-gray-400 text-sm mb-1">Confidence</p>
                    <p className="text-3xl font-bold text-green-400">
                      {Math.round((predictiveAnalytics.predicted_incident_volume?.confidence || 0) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">accuracy rate</p>
                  </div>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <ShieldAlert className="h-5 w-5 text-red-400 mr-2" />
                  Risk Factors Analysis
                </h3>
                <div className="space-y-3">
                  {predictiveAnalytics.risk_factors?.map((risk: any, index: number) => (
                    <div key={index} className="p-4 bg-[#1A1D23] rounded-lg">
                      <h4 className="font-medium text-white mb-2">{risk.factor}</h4>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-gray-400">Impact Score</p>
                          <div className="flex items-center mt-1">
                            <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                                style={{ width: `${risk.impact_score * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-white ml-2">
                              {Math.round(risk.impact_score * 100)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Likelihood</p>
                          <div className="flex items-center mt-1">
                            <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                                style={{ width: `${risk.likelihood * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-white ml-2">
                              {Math.round(risk.likelihood * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Shield className="h-5 w-5 text-green-400 mr-2" />
                  Proactive Security Measures
                </h3>
                <div className="space-y-3">
                  {predictiveAnalytics.recommended_actions?.map((action: string, index: number) => (
                    <div key={index} className="flex items-center p-3 bg-[#1A1D23] rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-full mr-3">
                        <span className="text-green-400 text-sm font-bold">{index + 1}</span>
                      </div>
                      <p className="text-white">{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Analysis Summary */}
              {predictiveAnalytics.data_summary && (
                <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 text-blue-400 mr-2" />
                    Analysis Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-[#1A1D23] rounded-lg text-center">
                      <p className="text-gray-400 text-xs mb-1">Incidents Analyzed</p>
                      <p className="text-2xl font-bold text-[#00D4FF]">
                        {predictiveAnalytics.data_summary.analyzed_incidents}
                      </p>
                    </div>
                    <div className="p-3 bg-[#1A1D23] rounded-lg text-center">
                      <p className="text-gray-400 text-xs mb-1">Trend Direction</p>
                      <p className={`text-lg font-semibold ${
                        predictiveAnalytics.data_summary.trend_direction === 'increasing' ? 'text-orange-400' :
                        predictiveAnalytics.data_summary.trend_direction === 'decreasing' ? 'text-green-400' :
                        'text-gray-400'
                      }`}>
                        {predictiveAnalytics.data_summary.trend_direction}
                      </p>
                    </div>
                    <div className="p-3 bg-[#1A1D23] rounded-lg text-center">
                      <p className="text-gray-400 text-xs mb-1">Most Common Type</p>
                      <p className="text-lg font-semibold text-white">
                        {predictiveAnalytics.data_summary.most_common_type?.replace('_', ' ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-[#1A1D23] rounded-lg text-center">
                      <p className="text-gray-400 text-xs mb-1">Timeframe</p>
                      <p className="text-lg font-semibold text-white">
                        {predictiveAnalytics.data_summary.timeframe_days} days
                      </p>
                    </div>
                  </div>
                  {predictiveAnalytics.data_summary.note && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        ℹ️ {predictiveAnalytics.data_summary.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}