'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Eye, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface Incident {
  id: string;
  title?: string;
  description?: string;
  severity: string;
  status: string;
  incident_type?: string;
  reporter_name?: string;
  created_at: string;
  updated_at: string;
}

interface IncidentQueueProps {
  incidents: Incident[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onIncidentClick: (incident: Incident) => void;
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
  getTimeAgo: (date: Date) => string;
}

export default function IncidentQueue({
  incidents,
  loading,
  searchTerm,
  onSearchChange,
  onIncidentClick,
  getSeverityColor,
  getStatusColor,
  getTimeAgo
}: IncidentQueueProps) {
  // Filter incidents based on search term
  const filteredIncidents = incidents.filter(incident => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (incident.title?.toLowerCase().includes(searchLower) || false) ||
      (incident.description?.toLowerCase().includes(searchLower) || false) ||
      (incident.reporter_name?.toLowerCase().includes(searchLower) || false) ||
      (incident.incident_type?.toLowerCase().includes(searchLower) || false)
    );
  });

  return (
    <div className="bg-[#2A2D35] p-3 sm:p-6 rounded-lg border border-gray-700">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        {/* Title and View All */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <h3 className="text-base sm:text-lg font-semibold text-white">Incident Queue</h3>
          <Link 
            href="/incidents/all"
            className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-[#00D4FF] hover:text-[#00C4EF] transition-colors"
          >
            <span>View All</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {/* Search and Filter */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full sm:w-auto pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] text-xs sm:text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button className="p-1.5 sm:p-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length > 0 ? (
          filteredIncidents.map((incident) => {
            const createdAt = new Date(incident.created_at);
            const timeAgo = getTimeAgo(createdAt);
            
            return (
              <div key={incident.id} className="bg-[#1A1D23] p-3 sm:p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                {/* Header row - stack on very small screens */}
                <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${getSeverityColor(incident.severity)}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white text-sm sm:text-base truncate">
                        {incident.title || incident.description?.substring(0, 40) + '...' || 'Untitled Incident'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">
                        ID: {incident.id.substring(0, 8)}... • {timeAgo}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border self-start min-[400px]:self-center flex-shrink-0 ${getStatusColor(incident.status)}`}>
                    {incident.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                {/* Footer row - stack on mobile */}
                <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-sm text-gray-400">
                    <span className="truncate max-w-[120px] sm:max-w-none">Reporter: {incident.reporter_name}</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">Type: {incident.incident_type || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 self-end min-[480px]:self-center">
                    <button 
                      onClick={() => onIncidentClick(incident)}
                      className="p-1 text-gray-400 hover:text-[#00D4FF] transition-colors" 
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No incidents found</p>
          </div>
        )}
      </div>
    </div>
  );
}