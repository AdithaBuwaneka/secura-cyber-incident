'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Activity, 
  Download, 
  RefreshCw,
  Save,
  Wifi,
  CheckCircle
} from 'lucide-react';
import { RootState } from '@/store';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface SystemStats {
  uptime: string;
  memory_usage: number;
  cpu_usage: number;
  disk_usage: number;
  active_connections: number;
  last_backup: string;
  database_size: string;
}

interface SystemConfig {
  notifications_enabled: boolean;
  email_alerts: boolean;
  auto_backup: boolean;
  backup_frequency: string;
  session_timeout: number;
  max_file_size: number;
  allowed_file_types: string[];
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
  };
}

export default function SystemConfig() {
  const { idToken, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);


  const fetchSystemData = React.useCallback(async () => {
    if (!idToken || !isAuthenticated) return;
    setLoading(true);
    try {
      const [statsResponse, configResponse] = await Promise.all([
        fetch(`${API_URL}/api/system/stats`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        }),
        fetch(`${API_URL}/api/system/config`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        })
      ]);
      
      // Handle stats response
      let statsData = null;
      if (statsResponse.ok) {
        statsData = await statsResponse.json();
      } else {
        const errorText = await statsResponse.text();
        console.error('Stats error:', statsResponse.status, errorText);
        toast.error('Failed to load system stats');
      }
      
      // Handle config response
      let configData = null;
      if (configResponse.ok) {
        configData = await configResponse.json();
      } else {
        const errorText = await configResponse.text();
        console.error('Config error:', configResponse.status, errorText);
        toast.error('Failed to load system configuration');
      }
      
      setSystemStats(statsData);
      setConfig(configData);
    } catch (error) {
      console.error('Error fetching system data:', error);
      toast.error('Failed to load system data. Check connection.');
    } finally {
      setLoading(false);
    }
  }, [idToken, isAuthenticated]);

  useEffect(() => {
    if (idToken && isAuthenticated) {
      fetchSystemData();
    }
  }, [idToken, isAuthenticated, fetchSystemData]);

  const handleConfigChange = (section: string, key: string, value: string | number | boolean | string[]) => {
    if (!config) return;
    
    if (section === 'password_policy') {
      setConfig(prev => ({
        ...prev!,
        password_policy: {
          ...prev!.password_policy,
          [key]: value
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev!,
        [key]: value
      }));
    }
  };

  const handleSaveConfig = async () => {
    if (!config || !idToken || !isAuthenticated) return;
    
    setSaving(true);
    try {

      const response = await fetch(`${API_URL}/api/system/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      toast.success('System configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update system configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!systemStats || !idToken || !isAuthenticated) return;
    
    setLoading(true);
    try {

      const response = await fetch(`${API_URL}/api/system/backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initiate backup');
      }

      const result = await response.json();
      toast.success(`Backup initiated successfully. ${result.estimated_completion}`);
      
      // Refresh stats to get updated backup time
      fetchSystemData();
    } catch (error) {
      console.error('Error initiating backup:', error);
      toast.error('Backup failed');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'security', label: 'Security Policy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backup', label: 'Backup & Recovery', icon: Database },
    { id: 'monitoring', label: 'System Monitoring', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">System Configuration</h2>
          <p className="text-gray-400 mt-1">Manage system settings and monitor performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span className="text-green-400 text-sm font-medium">System Healthy</span>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#2A2D35] rounded-lg border border-gray-700">
        <div className="flex space-x-0 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSection === section.id
                  ? 'bg-[#00D4FF] text-[#1A1D23]'
                  : 'text-gray-400 hover:text-white hover:bg-[#374151]'
              }`}
            >
              <section.icon className="h-4 w-4" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {(loading && !config) ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-[#00D4FF] animate-spin" />
          <span className="ml-3 text-gray-400">Loading system configuration...</span>
        </div>
      ) : (
        <>      
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
          {activeSection === 'general' && (
            <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">General Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={config?.session_timeout || 0}
                    onChange={(e) => handleConfigChange('', 'session_timeout', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Max File Size (MB)</label>
                  <input
                    type="number"
                    value={config?.max_file_size || 0}
                    onChange={(e) => handleConfigChange('', 'max_file_size', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Allowed File Types</label>
                  <div className="flex flex-wrap gap-2">
                    {["pdf", "doc", "docx", "jpg", "png", "gif", "txt", "zip"].map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config?.allowed_file_types?.includes(type) || false}
                          onChange={(e) => {
                            if (!config) return;
                            const types = e.target.checked
                              ? [...config.allowed_file_types, type]
                              : config.allowed_file_types.filter(t => t !== type);
                            handleConfigChange('', 'allowed_file_types', types);
                          }}
                          className="sr-only"
                        />
                        <div className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          config?.allowed_file_types?.includes(type)
                            ? 'bg-[#00D4FF] text-[#1A1D23]'
                            : 'bg-[#1A1D23] text-gray-400 border border-gray-600'
                        }`}>
                          .{type}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Security Policy</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">Password Requirements</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Minimum Length</label>
                      <input
                        type="number"
                        value={config?.password_policy?.min_length || 8}
                        onChange={(e) => handleConfigChange('password_policy', 'min_length', parseInt(e.target.value))}
                        className="w-32 px-4 py-2 bg-[#1A1D23] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4FF]"
                        min="6"
                        max="32"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'require_uppercase', label: 'Require Uppercase' },
                        { key: 'require_lowercase', label: 'Require Lowercase' },
                        { key: 'require_numbers', label: 'Require Numbers' },
                        { key: 'require_symbols', label: 'Require Symbols' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={Boolean(config?.password_policy?.[item.key as keyof typeof config.password_policy])}
                            onChange={(e) => handleConfigChange('password_policy', item.key, e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                            config?.password_policy?.[item.key as keyof typeof config.password_policy]
                              ? 'bg-[#00D4FF] border-[#00D4FF]'
                              : 'border-gray-600'
                          }`}>
                            {config?.password_policy?.[item.key as keyof typeof config.password_policy] && (
                              <CheckCircle className="h-3 w-3 text-[#1A1D23]" />
                            )}
                          </div>
                          <span className="text-white text-sm">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Notification Settings</h3>
              <div className="space-y-6">
                {[
                  { key: 'notifications_enabled', label: 'System Notifications', desc: 'Enable in-app notifications' },
                  { key: 'email_alerts', label: 'Email Alerts', desc: 'Send critical alerts via email' },
                  { key: 'auto_backup', label: 'Backup Notifications', desc: 'Notify when backups complete' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-[#1A1D23] rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">{item.label}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config?.[item.key as keyof SystemConfig] as boolean) || false}
                        onChange={(e) => handleConfigChange('', item.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D4FF]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Backup & Recovery</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#1A1D23] rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Manual Backup</h4>
                    <p className="text-gray-400 text-sm">Create an immediate system backup</p>
                  </div>
                  <button
                    onClick={handleBackup}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-[#00D4FF] text-[#1A1D23] rounded-lg font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Backing up...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Start Backup
                      </>
                    )}
                  </button>
                </div>

                <div>
  <label className="block text-sm font-medium text-white mb-2">Backup Frequency</label>
  <div className="w-full bg-gray-700 rounded-full h-2">
    <div 
      className="bg-green-400 h-2 rounded-full transition-all duration-300"
      style={{ width: `${systemStats?.memory_usage || 0}%` }}
    ></div>
  </div>
                </div>

                <div className="bg-[#1A1D23] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Disk Usage</span>
                    <span className="text-white font-medium">{systemStats?.disk_usage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${systemStats?.disk_usage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#1A1D23] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Active Users</span>
                    <span className="text-white font-medium">{systemStats?.active_connections || 0}</span>
                  </div>
                  <div className="flex items-center text-green-400 text-sm">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Uptime</span>
                <span className="text-white text-sm">{systemStats?.uptime || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Last Backup</span>
                <span className="text-white text-sm">
                  {systemStats?.last_backup ? new Date(systemStats.last_backup).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Database Size</span>
                <span className="text-white text-sm">{systemStats?.database_size || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-[#1A1D23] rounded-lg hover:bg-[#374151] transition-colors">
                <span className="text-white text-sm">Export Logs</span>
                <Download className="h-4 w-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-[#1A1D23] rounded-lg hover:bg-[#374151] transition-colors">
                <span className="text-white text-sm">System Restart</span>
                <RefreshCw className="h-4 w-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-[#1A1D23] rounded-lg hover:bg-[#374151] transition-colors">
                <span className="text-white text-sm">Clear Cache</span>
                <Database className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}