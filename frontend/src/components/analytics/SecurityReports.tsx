'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp,
  BarChart3,
  PieChart
} from 'lucide-react';
import { RootState } from '@/store';

interface Report {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  generated_date: string;
  period: string;
  file_size: string;
  status: 'ready' | 'generating' | 'failed';
}

export default function SecurityReports(): React.JSX.Element {
  const { idToken } = useSelector((state: RootState) => state.auth);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [generatingStates, setGeneratingStates] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const loadReports = useCallback(async () => {
    // Mock data for development
    const mockReportsData: Report[] = [
      {
        id: 'RPT-2024-001',
        title: 'Monthly Security Overview',
        type: 'monthly',
        generated_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        period: 'January 2024',
        file_size: '2.3 MB',
        status: 'ready'
      },
      {
        id: 'RPT-2024-002',
        title: 'Weekly Incident Analysis',
        type: 'weekly',
        generated_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        period: 'Week 3, January 2024',
        file_size: '1.8 MB',
        status: 'ready'
      },
      {
        id: 'RPT-2024-003',
        title: 'Quarterly Threat Assessment',
        type: 'quarterly',
        generated_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period: 'Q4 2023',
        file_size: '4.7 MB',
        status: 'ready'
      },
      {
        id: 'RPT-2024-004',
        title: 'Custom Phishing Analysis',
        type: 'custom',
        generated_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        period: 'December 2023',
        file_size: '1.2 MB',
        status: 'ready'
      }
    ];

    try {
      const response = await fetch(`${API_URL}/api/analytics/reports`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const apiReports = data.reports || [];
        
        // Ensure all reports have required properties and filter out invalid ones
        const validReports = apiReports
          .filter((report: any) => report && typeof report === 'object')
          .map((report: any) => ({
            id: report.id || `unknown-${Date.now()}`,
            title: report.title || 'Untitled Report',
            type: report.type || 'custom',
            generated_date: report.generated_date || new Date().toISOString(),
            period: report.period || 'Unknown Period',
            file_size: report.file_size || '0 MB',
            status: report.status || 'ready'
          }));
        
        setReports(validReports);
      } else {
        setReports(mockReportsData);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports(mockReportsData);
    } finally {
      setIsLoading(false);
    }
  }, [idToken, API_URL]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const generateReport = async (type: string, customParams?: { startDate?: string; endDate?: string }) => {
    try {
      setGeneratingStates(prev => ({ ...prev, [type]: true }));
      
      let url = `${API_URL}/api/analytics/reports/generate?report_type=${type}`;
      
      if (customParams && customParams.startDate && customParams.endDate) {
        // Calculate period days from date range
        const start = new Date(customParams.startDate);
        const end = new Date(customParams.endDate);
        const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        url += `&period_days=${periodDays}&start_date=${customParams.startDate}&end_date=${customParams.endDate}`;
      } else {
        // Default period for each report type
        const defaultPeriods = { weekly: 7, monthly: 30, quarterly: 90, custom: 30 };
        url += `&period_days=${defaultPeriods[type as keyof typeof defaultPeriods] || 30}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Report generation response:', data);
        
        // Add new report to the list if report object exists
        if (data.report) {
          setReports(prev => {
            // Check if report with same ID already exists to prevent duplicates
            const existingReport = prev.find(r => r.id === data.report.id);
            if (existingReport) {
              console.warn('Report with same ID already exists:', data.report.id);
              return prev; // Don't add duplicate
            }
            return [data.report, ...prev];
          });
          console.log('Added new report to list:', data.report);
          
          // Show success message for longer
          setSuccessMessage(`${data.report.title} generated successfully!`);
          setTimeout(() => setSuccessMessage(null), 5000);
          
          // Remove the delayed refresh as it's not needed
        } else {
          console.warn('No report object in response:', data);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Report generation failed:', response.status, errorData);
        // You could add toast notification here
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingStates(prev => ({ ...prev, [type]: false }));
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      console.log('Starting download for report:', reportId);
      
      const response = await fetch(`${API_URL}/api/analytics/reports/${reportId}/download`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      console.log('Download response status:', response.status);

      if (response.ok) {
        const blob = await response.blob();
        console.log('PDF blob size:', blob.size);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${reportId}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Clean up immediately
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
        
        console.log('Download initiated successfully');
      } else {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };


  const filteredReports = reports.filter(report => 
    report && (selectedType === 'all' || (report.type && report.type === selectedType))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'generating':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'weekly':
        return <Calendar className="h-4 w-4" />;
      case 'monthly':
        return <BarChart3 className="h-4 w-4" />;
      case 'quarterly':
        return <TrendingUp className="h-4 w-4" />;
      case 'custom':
        return <PieChart className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-500/20 text-green-300 border border-green-500/30 px-4 py-2 rounded-lg">
          {successMessage}
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Security Reports</h3>
          <p className="text-gray-400 mt-1">Generate and download comprehensive security analytics reports</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-[#2A2D35] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF] text-sm"
          >
            <option value="all">All Reports</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Generate Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { type: 'weekly', title: 'Weekly Report', icon: Calendar, description: 'Past 7 days analysis' },
          { type: 'monthly', title: 'Monthly Report', icon: BarChart3, description: 'Comprehensive monthly overview' },
          { type: 'quarterly', title: 'Quarterly Report', icon: TrendingUp, description: 'Strategic 3-month analysis' },
          { type: 'custom', title: 'Custom Report', icon: PieChart, description: 'Tailored date range' }
        ].map((reportType) => (
          <div key={reportType.type} className="bg-[#2A2D35] p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
                <reportType.icon className="h-5 w-5 text-[#00D4FF]" />
              </div>
              <button
                onClick={() => {
                  if (reportType.type === 'custom') {
                    setShowCustomModal(true);
                  } else {
                    generateReport(reportType.type);
                  }
                }}
                disabled={generatingStates[reportType.type] || false}
                className="px-3 py-1 bg-[#00D4FF] text-[#1A1D23] rounded text-sm font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50"
              >
                {generatingStates[reportType.type] ? 'Generating...' : reportType.type === 'custom' ? 'Customize' : 'Generate'}
              </button>
            </div>
            <h4 className="font-medium text-white mb-1">{reportType.title}</h4>
            <p className="text-xs text-gray-400">{reportType.description}</p>
          </div>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-[#2A2D35] rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h4 className="text-lg font-semibold text-white">Generated Reports</h4>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#1A1D23] rounded-lg animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-600 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-600 rounded w-48"></div>
                      <div className="h-3 bg-gray-600 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="w-20 h-8 bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No reports found</p>
              <p className="text-sm text-gray-500 mt-1">Generate your first report using the cards above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.filter(Boolean).map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-[#1A1D23] rounded-lg hover:bg-[#1F2328] transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
                      {getTypeIcon(report.type)}
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-white">{report.title}</h5>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-400">
                          {report.period} • {formatDate(report.generated_date)}
                        </span>
                        <span className="text-sm text-gray-500">{report.file_size}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {report.status === 'ready' && (
                      <button
                        onClick={() => downloadReport(report.id)}
                        className="p-2 text-gray-400 hover:text-[#00D4FF] transition-colors"
                        title="Download Report"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {report.status === 'generating' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00D4FF]"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Report Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700 w-96">
            <h3 className="text-xl font-bold text-white mb-4">Customize Report</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF]"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateReport('custom', customDateRange);
                  setShowCustomModal(false);
                }}
                disabled={generatingStates['custom'] || false}
                className="px-4 py-2 bg-[#00D4FF] text-[#1A1D23] rounded font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50"
              >
                {generatingStates['custom'] ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}