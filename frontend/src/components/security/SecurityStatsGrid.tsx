'use client';

import React from 'react';
import {
  Users,
  FileText,
  AlertTriangle,
  Search,
  CheckCircle
} from 'lucide-react';

interface Incident {
  id: string;
  status: string;
}

interface SecurityStatsGridProps {
  incidents: Incident[];
  onlineTeamMembers: number;
  totalTeamMembers: number;
  onTeamDetailsClick: () => void;
}

export default function SecurityStatsGrid({
  incidents,
  onlineTeamMembers,
  totalTeamMembers,
  onTeamDetailsClick
}: SecurityStatsGridProps) {
  // Calculate comprehensive stats
  const totalIncidentsCount = incidents.length;
  
  const pendingIncidentsCount = incidents.filter(i => 
    i.status === 'pending' || i.status === 'new'
  ).length;

  const investigatingCount = incidents.filter(i => 
    i.status === 'investigating' || i.status === 'in_progress'
  ).length;

  const resolvedIncidentsCount = incidents.filter(i => 
    i.status === 'resolved' || i.status === 'closed'
  ).length;


  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
      {/* Total Incidents */}
      <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Incidents</p>
            <p className="text-3xl font-bold text-white">{totalIncidentsCount}</p>
            <p className="text-xs text-gray-500 mt-1">All time incidents</p>
          </div>
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>
      
      {/* Pending Incidents */}
      <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Pending Incidents</p>
            <p className="text-3xl font-bold text-white">{pendingIncidentsCount}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting assignment</p>
          </div>
          <div className="p-3 bg-yellow-500/20 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>
      
      {/* Investigating */}
      <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Investigating</p>
            <p className="text-3xl font-bold text-white">{investigatingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Active investigations</p>
          </div>
          <div className="p-3 bg-orange-500/20 rounded-lg">
            <Search className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>
      
      {/* Resolved Incidents */}
      <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Resolved</p>
            <p className="text-3xl font-bold text-white">{resolvedIncidentsCount}</p>
            <p className="text-xs text-gray-500 mt-1">Completed cases</p>
          </div>
          <div className="p-3 bg-green-500/20 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>
      
      {/* Team Online */}
      <div 
        className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700 cursor-pointer hover:bg-[#2E3139] hover:border-gray-600 transition-all duration-200"
        onClick={onTeamDetailsClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Team Online</p>
            <p className="text-3xl font-bold text-white">{onlineTeamMembers}/{totalTeamMembers}</p>
            <p className="text-xs text-gray-500 mt-1">Click to view details</p>
          </div>
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <Users className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
}