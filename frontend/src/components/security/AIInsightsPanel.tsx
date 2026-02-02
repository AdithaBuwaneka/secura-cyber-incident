'use client';

import React from 'react';

export default function AIInsightsPanel() {
  return (
    <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">🤖 AI Insights</h3>
      <div className="space-y-3">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm font-medium text-blue-300">Threat Pattern Detected</p>
          <p className="text-xs text-blue-400 mt-1">Similar phishing attempts from 3 different sources</p>
        </div>
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm font-medium text-yellow-300">Recommendation</p>
          <p className="text-xs text-yellow-400 mt-1">Consider blocking domain: suspicious-site.com</p>
        </div>
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm font-medium text-green-300">Security Tip</p>
          <p className="text-xs text-green-400 mt-1">Regular security awareness training reduces incidents by 45%</p>
        </div>
      </div>
    </div>
  );
}