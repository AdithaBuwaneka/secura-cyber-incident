'use client';

import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Upload, AlertTriangle, MapPin, Clock, X, FileText, Image, Send } from 'lucide-react';
import { RootState } from '@/store';
import toast from 'react-hot-toast';

interface IncidentFormData {
  title: string;
  description: string;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  attachments: File[];
  timestamp: string;
}

interface AISuggestion {
  category: string;
  confidence: number;
  reason: string;
}

interface MLPrediction {
  severity: string;
  severity_confidence: number;
  incident_type: string;
  incident_type_confidence: number;
  was_revised: boolean;
  gemini_analysis?: boolean;
  mitigation_strategies?: Array<{
    strategy: string;
    priority: number;
  }>;
  threat_summary?: string;
  risk_factors?: string[];
}

interface IncidentReportFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function IncidentReportForm({ onClose, onSuccess }: IncidentReportFormProps) {
  const { idToken } = useSelector((state: RootState) => state.auth);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    incident_type: '',
    severity: 'low',
    location: '',
    attachments: [],
    timestamp: new Date().toISOString(),
  });

  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageAnalysisResults, setImageAnalysisResults] = useState<Record<string, {
    status: string;
    ocr_text: string;
    threat_indicators: string[];
    summary?: string;
    confidence?: number;
    recommendations?: string[];
    error?: string;
  }>>({});

  // AI-powered suggestions based on description using our trained ML model
  const handleDescriptionChange = useCallback(async (description: string) => {
    setFormData(prev => ({ ...prev, description }));
    
    // Call our trained ML model API for real-time predictions
    if (description.length > 20 && idToken) {
      try {
        const response = await fetch(`${API_URL}/api/ai/predict-incident`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: formData.title,
            description: description,
            context: 'real_time_suggestions'
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Convert ML model predictions to suggestions format
          const suggestions: AISuggestion[] = data.categories?.map((cat: {category: string, confidence: number, reasoning: string}) => ({
            category: cat.category,
            confidence: cat.confidence,
            reason: cat.reasoning
          })) || [];
          
          setAISuggestions(suggestions);
          
          // Also auto-update severity if it's still at default 'low'
          if (data.severity?.severity && formData.severity === 'low') {
            setFormData(prev => ({ 
              ...prev, 
              severity: data.severity.severity 
            }));
          }
        } else {
          // Fallback to keyword-based suggestions if API fails
          const suggestions: AISuggestion[] = [];
          const text = description.toLowerCase();
          
          if (text.includes('phishing') || text.includes('email') || text.includes('suspicious link')) {
            suggestions.push({ category: 'phishing', confidence: 0.92, reason: 'Keywords: phishing, email' });
          }
          if (text.includes('malware') || text.includes('virus') || text.includes('ransomware')) {
            suggestions.push({ category: 'malware', confidence: 0.88, reason: 'Keywords: malware, virus' });
          }
          if (text.includes('unauthorized') || text.includes('access') || text.includes('hacked')) {
            suggestions.push({ category: 'unauthorized_access', confidence: 0.85, reason: 'Keywords: unauthorized, access' });
          }
          if (text.includes('data breach') || text.includes('leak') || text.includes('exposed')) {
            suggestions.push({ category: 'data_breach', confidence: 0.87, reason: 'Keywords: data breach, leak' });
          }
          
          setAISuggestions(suggestions);
        }
      } catch (error) {
        console.error('ML model prediction failed:', error);
        // Fallback to basic keyword matching
        setAISuggestions([]);
      }
    } else {
      setAISuggestions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.title, idToken, API_URL]);

  // Generate AI predictions for severity and incident type
  const generateAIPredictions = async () => {
    if (!formData.title && !formData.description) {
      toast.error('Please provide a title or description first');
      return;
    }

    setIsGeneratingPrediction(true);
    
    // First, analyze any uploaded images to get OCR text
    const ocrTexts: string[] = [];
    if (formData.attachments.length > 0) {
      for (const file of formData.attachments) {
        if (file.type.startsWith('image/')) {
          try {
            // Upload image temporarily to get URL
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            
            // You might need to upload to a temporary endpoint or use ImageKit
            // For now, let's assume we have the analysis results from earlier
            const analysisResult = imageAnalysisResults[file.name];
            if (analysisResult?.ocr_text) {
              ocrTexts.push(analysisResult.ocr_text);
            }
          } catch (error) {
            console.error('Error processing image:', error);
          }
        }
      }
    }
    
    try {
      const response = await fetch(`${API_URL}/api/ai/predict-incident`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title || '',
          description: formData.description || '',
          context: { 
            source: 'gemini_analysis',
            ocr_text: ocrTexts.join('\n\n---\n\n')  // Combine all OCR texts
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Extract prediction from response
        const prediction: MLPrediction = {
          severity: data.severity?.severity || 'low',
          severity_confidence: data.severity?.confidence || 0,
          incident_type: data.categories?.[0]?.category || '',
          incident_type_confidence: data.categories?.[0]?.confidence || 0,
          was_revised: false,
          gemini_analysis: data.gemini_analysis || false,
          mitigation_strategies: data.mitigation_strategies || [],
          threat_summary: data.gemini_full_analysis || data.summary || '',
          risk_factors: data.severity?.factors || []
        };

        setMlPrediction(prediction);
        
        // Auto-apply predictions to form
        setFormData(prev => ({
          ...prev,
          severity: prediction.severity as 'low' | 'medium' | 'high' | 'critical',
          incident_type: prediction.incident_type
        }));

        toast.success('AI predictions generated successfully!');
      } else {
        toast.error('Failed to generate AI predictions');
      }
    } catch (error) {
      console.error('Failed to generate predictions:', error);
      toast.error('Failed to generate AI predictions');
    } finally {
      setIsGeneratingPrediction(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const analyzeImageWithGemini = async (file: File) => {
    if (!idToken) return;
    try {
      // First, upload the image to ImageKit to get a URL
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      
      // Upload to a temporary endpoint or ImageKit
      // For now, we'll use a data URL approach
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Store analyzing status
      setImageAnalysisResults(prev => ({
        ...prev,
        [file.name]: {
          status: 'analyzing',
          ocr_text: '',
          threat_indicators: []
        }
      }));
      
      
      // Call the analyze-incident-image endpoint
      const response = await fetch(`${API_URL}/api/ai/analyze-incident-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: imageDataUrl,  // Send as data URL
          context: 'use_gemini'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Image analysis result:', result);
        
        // Store the analysis results
        setImageAnalysisResults(prev => ({
          ...prev,
          [file.name]: {
            status: 'completed',
            ocr_text: result.extracted_text || result.ocr_text || '',
            threat_indicators: result.threat_indicators || [],
            summary: result.summary || '',
            confidence: result.confidence || 0,
            recommendations: result.recommendations || []
          }
        }));
        
        toast.success(`Analysis complete for ${file.name}`);
      } else {
        const error = await response.text();
        console.error('Analysis failed:', error);
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Image analysis error:', error);

      // Update status to failed
      setImageAnalysisResults(prev => ({
        ...prev,
        [file.name]: {
          status: 'failed',
          ocr_text: '',
          threat_indicators: ['Analysis failed'],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
      }));
      
      // Analyze dropped images
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          analyzeImageWithGemini(file);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) {
      toast.error('Authentication required');
      return;
    }
    
    if (!formData.title && !formData.description) {
      toast.error('Please provide at least a title or description');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create incident payload matching backend IncidentCreate model
      const incidentData = {
        title: formData.title || null,  // Send null instead of empty string
        description: formData.description || null,  // Send null instead of empty string
        incident_type: formData.incident_type || null,
        severity: formData.severity,
        location: formData.location ? {
          address: formData.location
        } : null,
        additional_context: {
          timestamp: formData.timestamp,
          reporter_client: 'web',
          ml_prediction: mlPrediction ? {
            original_severity: mlPrediction.severity,
            original_incident_type: mlPrediction.incident_type,
            severity_confidence: mlPrediction.severity_confidence,
            incident_type_confidence: mlPrediction.incident_type_confidence,
            was_revised: formData.severity !== mlPrediction.severity || formData.incident_type !== mlPrediction.incident_type
          } : null
        },
        attachments: [] // File IDs will be populated after upload
      };

      // Submit incident to backend
      const response = await fetch(`${API_URL}/api/incidents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(incidentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit incident');
      }

      const result = await response.json();
      console.log('Incident created:', result);
      
      // If we have files, upload them
      if (formData.attachments.length > 0) {
        console.log('Uploading attachments for incident:', result.incident_id || result.id);
        await uploadAttachments(result.incident_id || result.id);
        console.log('All attachments uploaded successfully');
      }

      toast.success('Incident reported successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        incident_type: '',
        severity: 'low',
        location: '',
        attachments: [],
        timestamp: new Date().toISOString(),
      });
      setAISuggestions([]);
      
      // Add a small delay to ensure the backend has processed the attachments
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Trigger parent refresh
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal after refresh
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('Failed to submit incident:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAttachments = async (incidentId: string) => {
    const uploadPromises = formData.attachments.map(async (file) => {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('incident_id', incidentId);

      try {
        console.log(`Uploading file: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
        
        const response = await fetch(`${API_URL}/api/incidents/${incidentId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          body: uploadFormData
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to upload file ${file.name}:`, response.status, errorText);
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        const result = await response.json();
        console.log(`File ${file.name} uploaded successfully:`, result);
        return result;
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    });

    try {
      // Upload all files in parallel
      const results = await Promise.all(uploadPromises);
      console.log('All attachments uploaded:', results);
      return results;
    } catch (error) {
      console.error('Failed to upload some attachments:', error);
      toast.error('Incident submitted but some files failed to upload');
      throw error;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-[#1A1D23] text-white">
      <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-[#00D4FF]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Report Security Incident</h2>
              <p className="text-gray-400 text-sm">Help us protect our organization by reporting security concerns</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Incident Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
              placeholder="Brief description of the incident"
            />
          </div>

          {/* Description Field with AI Suggestions */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Detailed Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={4}
              className="w-full p-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
              placeholder="Provide detailed information about the security incident..."
            />
            
            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mt-3 p-4 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg">
                <p className="text-sm text-[#00D4FF] mb-3 flex items-center">
                  🤖 ML Model-Powered Category Suggestions (Trained on 1000+ incidents):
                </p>
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, incident_type: suggestion.category }))}
                    className="block w-full text-left p-3 bg-[#1A1D23] hover:bg-[#374151] rounded-lg mb-2 transition-colors border border-gray-700 hover:border-[#00D4FF]/50"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white">{suggestion.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-xs text-[#00D4FF] bg-[#00D4FF]/20 px-2 py-1 rounded">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{suggestion.reason}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Prediction Button and Results */}
          {(formData.title || formData.description) && (
            <div className="mb-6">
              <button
                type="button"
                onClick={generateAIPredictions}
                disabled={isGeneratingPrediction}
                className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGeneratingPrediction ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating AI Predictions...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>Generate AI Predictions</span>
                  </>
                )}
              </button>

              {/* Show ML/Gemini Predictions */}
              {mlPrediction && (
                <div className="mt-4 space-y-4">
                  {/* Main Prediction Card */}
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-purple-300 flex items-center">
                        {mlPrediction.gemini_analysis ? (
                          <>✨ Gemini AI Analysis</>
                        ) : (
                          <>🤖 Gemini AI Analysis</>
                        )}
                      </p>
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                        {Math.round(((mlPrediction.severity_confidence + mlPrediction.incident_type_confidence) / 2) * 100)}% confidence
                      </span>
                    </div>
                    
                    {/* Classification Results */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-[#1A1D23] p-3 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Incident Type</p>
                        <p className="text-sm font-medium text-white">
                          {mlPrediction.incident_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-xs text-purple-400 mt-1">
                          {Math.round(mlPrediction.incident_type_confidence * 100)}% confident
                        </p>
                      </div>
                      <div className="bg-[#1A1D23] p-3 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Severity Level</p>
                        <div className="flex items-center space-x-2">
                          <div className={`h-2 w-2 rounded-full ${getSeverityColor(mlPrediction.severity.charAt(0).toUpperCase() + mlPrediction.severity.slice(1))}`}></div>
                          <p className="text-sm font-medium text-white">
                            {mlPrediction.severity.charAt(0).toUpperCase() + mlPrediction.severity.slice(1)}
                          </p>
                        </div>
                        <p className="text-xs text-purple-400 mt-1">
                          {Math.round(mlPrediction.severity_confidence * 100)}% confident
                        </p>
                      </div>
                    </div>
                    
                    {/* Threat Summary if available */}
                    {mlPrediction.threat_summary && (
                      <div className="bg-[#1A1D23] p-3 rounded-lg mb-3">
                        <p className="text-xs text-gray-400 mb-2">Analysis Summary</p>
                        <p className="text-sm text-white whitespace-pre-wrap">
                          {mlPrediction.threat_summary.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                    
                    {/* Risk Factors */}
                    {mlPrediction.risk_factors && mlPrediction.risk_factors.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-2">Risk Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {mlPrediction.risk_factors.slice(0, 3).map((factor, idx) => (
                            <span key={idx} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Mitigation Strategies */}
                    {mlPrediction.mitigation_strategies && mlPrediction.mitigation_strategies.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Recommended Actions</p>
                        <div className="space-y-2">
                          {mlPrediction.mitigation_strategies.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <span className="text-xs text-green-400 mt-0.5">•</span>
                              <p className="text-xs text-gray-300 flex-1">{item.strategy}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-3 italic">
                      💡 Review and modify these predictions if needed before submitting
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category and Severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Incident Type</label>
              <input
                type="text"
                value={formData.incident_type}
                onChange={(e) => setFormData(prev => ({ ...prev, incident_type: e.target.value }))}
                className="w-full p-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
                placeholder="e.g., phishing, malware, unauthorized_access"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Severity Level</label>
              <div className="flex space-x-2">
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      formData.severity === level
                        ? 'border-[#00D4FF] bg-[#00D4FF]/20'
                        : 'border-gray-600 bg-[#1A1D23] hover:bg-[#374151]'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${getSeverityColor(level.charAt(0).toUpperCase() + level.slice(1))}`}></div>
                      <span className="text-sm">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location Field */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full p-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
              placeholder="Building, floor, or department"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Evidence Attachments (Max 10MB per file)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-white">Drag and drop files here, or click to select</p>
              <p className="text-sm text-gray-400 mt-2">Supports images, documents, and logs (Max 10MB each)</p>
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                accept="image/*,.pdf,.txt,.log,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files);
                    // Check file size (10MB limit)
                    const validFiles = files.filter(file => {
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
                        return false;
                      }
                      return true;
                    });
                    setFormData(prev => ({
                      ...prev,
                      attachments: [...prev.attachments, ...validFiles]
                    }));
                    
                    // Analyze images immediately for OCR
                    validFiles.forEach(file => {
                      if (file.type.startsWith('image/')) {
                        analyzeImageWithGemini(file);
                      }
                    });
                  }
                }}
              />
            </div>
            
            {/* Show uploaded files */}
            {formData.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-white">Attached Files:</p>
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#1A1D23] rounded-lg border border-gray-700">
                    <div className="flex items-center space-x-3">
                      {file.type.startsWith('image/') ? (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <Image className="h-4 w-4 text-blue-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white">{file.name}</p>
                        <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        {/* Show OCR analysis status */}
                        {file.type.startsWith('image/') && imageAnalysisResults[file.name] && (
                          <div className="mt-1">
                            {imageAnalysisResults[file.name].status === 'analyzing' ? (
                              <p className="text-xs text-[#00D4FF] flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#00D4FF] mr-2"></div>
                                Analyzing with OCR + Gemini AI...
                              </p>
                            ) : (
                              <p className="text-xs text-green-400">
                                ✓ OCR Complete - {imageAnalysisResults[file.name].threat_indicators?.length || 0} threats found
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        attachments: prev.attachments.filter((_, i) => i !== index)
                      }))}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            Incident timestamp: {new Date(formData.timestamp).toLocaleString()}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-[#374151] hover:bg-[#4B5563] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!formData.title && !formData.description)}
              className="px-6 py-3 bg-[#00D4FF] hover:bg-[#00C4EF] text-[#1A1D23] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1D23]"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Incident Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}