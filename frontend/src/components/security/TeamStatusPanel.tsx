'use client';

import React from 'react';

interface TeamStatusPanelProps {
  teamMembers: any[];
  incidents: any[];
}

export default function TeamStatusPanel({ teamMembers, incidents }: TeamStatusPanelProps) {
  return (
    <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Team Status</h3>
      <div className="space-y-3">
        {teamMembers.length > 0 ? teamMembers.map((member) => {
          const assignedIncidents = incidents.filter(i => 
            i.assigned_to === member.user_id && i.status !== 'resolved' && i.status !== 'closed'
          ).length;
          
          return (
            <div key={member.user_id} className="flex items-center justify-between p-2 bg-[#1A1D23] rounded-lg">
              <div>
                <p className="text-sm font-medium text-white">{member.full_name}</p>
                <p className="text-xs text-gray-400">{assignedIncidents} active cases</p>
              </div>
              <span className={`w-2 h-2 rounded-full ${
                member.is_online ? 'bg-green-400' : 'bg-gray-400'
              }`} title={member.is_online ? 'Online' : 'Offline'}></span>
            </div>
          );
        }) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Loading team members...</p>
          </div>
        )}
      </div>
    </div>
  );
}