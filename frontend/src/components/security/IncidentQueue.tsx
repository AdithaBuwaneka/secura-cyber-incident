'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Eye, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface IncidentQueueProps {
  incidents: any[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onIncidentClick: (incident: any) => void;
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
    <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">Incident Queue</h3>
          <Link 
            href="/incidents/all"
            className="flex items-center space-x-2 text-sm text-[#00D4FF] hover:text-[#00C4EF] transition-colors"
          >
            <span>View All</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search incidents..."
              className="pl-10 pr-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button className="p-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Filter className="h-4 w-4" />
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
              <div key={incident.id} className="bg-[#1A1D23] p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                    <div>
                      <p className="font-medium text-white">
                        {incident.title || incident.description?.substring(0, 60) + '...' || 'Untitled Incident'}
                      </p>
                      <p className="text-sm text-gray-400">
                        ID: {incident.id.substring(0, 8)}... • {timeAgo}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                    {incident.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Reporter: {incident.reporter_name}</span>
                    <span>Type: {incident.incident_type || 'Uncategorized'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
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