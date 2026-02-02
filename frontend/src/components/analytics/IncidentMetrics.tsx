'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  Shield,
  Users,
  CheckCircle
} from 'lucide-react';
import { RootState } from '@/store';

interface MetricCard {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{className?: string}>;
  color: string;
}

interface IncidentMetricsProps {
  timeRange?: string;
}

// Mock data for development
const mockMetrics: MetricCard[] = [
  {
    title: 'Total Incidents',
    value: 167,
    change: '+12% from last month',
    trend: 'up',
    icon: Activity,
    color: 'blue'
  },
  {
    title: 'Resolution Rate',
    value: '85%',
    change: '+5% improvement',
    trend: 'up',
    icon: CheckCircle,
    color: 'green'
  },
  {
    title: 'Avg Response Time',
    value: '3.2h',
    change: '-0.5h improvement',
    trend: 'up',
    icon: Clock,
    color: 'orange'
  },
  {
    title: 'Critical Incidents',
    value: 8,
    change: '-2 from last month',
    trend: 'up',
    icon: AlertTriangle,
    color: 'red'
  },
  {
    title: 'Active Analysts',
    value: 6,
    change: '+1 team member',
    trend: 'up',
    icon: Users,
    color: 'purple'
  },
  {
    title: 'Threat Level',
    value: 'Medium',
    change: 'Stable',
    trend: 'neutral',
    icon: Shield,
    color: 'yellow'
  }
];

export default function IncidentMetrics({ timeRange = '30d' }: IncidentMetricsProps) {
  const { idToken } = useSelector((state: RootState) => state.auth);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const loadMetrics = useCallback(async () => {
    if (!idToken) {
      setMetrics(mockMetrics);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/analytics/metrics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(formatMetrics(data));
      } else {
        console.error('API request failed:', response.status, response.statusText);
        setMetrics(formatMetrics({})); // Use empty data to show 0 values
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics(formatMetrics({})); // Use empty data to show 0 values
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, idToken, API_URL]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const formatMetrics = (data: Record<string, unknown>): MetricCard[] => {
    const totalIncidents = (data.total_incidents as number) || 0;
    const resolutionRate = (data.resolution_rate as number) || 0;
    const avgResponseTime = (data.avg_response_time as number) || 0;
    const criticalIncidents = (data.critical_incidents as number) || 0;
    const activeAnalysts = (data.active_analysts as number) || 0;
    const threatLevel = (data.threat_level as string) || 'Low';
    
    return [
      {
        title: 'Total Incidents',
        value: totalIncidents,
        change: totalIncidents > 0 ? `${timeRange} period` : 'No incidents reported',
        trend: totalIncidents > 0 ? 'neutral' : 'neutral',
        icon: Activity,
        color: 'blue'
      },
      {
        title: 'Resolution Rate',
        value: `${resolutionRate}%`,
        change: resolutionRate >= 80 ? 'Good performance' : resolutionRate >= 60 ? 'Average performance' : 'Needs improvement',
        trend: resolutionRate >= 80 ? 'up' : resolutionRate >= 60 ? 'neutral' : 'down',
        icon: CheckCircle,
        color: 'green'
      },
      {
        title: 'Avg Response Time',
        value: `${avgResponseTime}h`,
        change: avgResponseTime <= 2 ? 'Excellent response' : avgResponseTime <= 4 ? 'Good response' : 'Slow response',
        trend: avgResponseTime <= 2 ? 'up' : avgResponseTime <= 4 ? 'neutral' : 'down',
        icon: Clock,
        color: 'orange'
      },
      {
        title: 'Critical Incidents',
        value: criticalIncidents,
        change: criticalIncidents === 0 ? 'No critical issues' : criticalIncidents <= 2 ? 'Low critical load' : 'High priority attention needed',
        trend: criticalIncidents === 0 ? 'up' : criticalIncidents <= 2 ? 'neutral' : 'down',
        icon: AlertTriangle,
        color: 'red'
      },
      {
        title: 'Total System Members',
        value: activeAnalysts,
        change: activeAnalysts > 0 ? `${activeAnalysts} registered users` : 'No registered users',
        trend: activeAnalysts > 0 ? 'up' : 'neutral',
        icon: Users,
        color: 'purple'
      },
      {
        title: 'Security Status',
        value: threatLevel,
        change: criticalIncidents === 0 ? 'System secure' : criticalIncidents <= 2 ? 'Monitor closely' : 'High alert',
        trend: 'neutral',
        icon: Shield,
        color: criticalIncidents === 0 ? 'green' : criticalIncidents <= 2 ? 'yellow' : 'red'
      }
    ];
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500/20 text-blue-400',
      green: 'bg-green-500/20 text-green-400',
      orange: 'bg-orange-500/20 text-orange-400',
      red: 'bg-red-500/20 text-red-400',
      purple: 'bg-purple-500/20 text-purple-400',
      yellow: 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-600 rounded w-24"></div>
                <div className="h-8 bg-gray-600 rounded w-16"></div>
                <div className="h-3 bg-gray-600 rounded w-32"></div>
              </div>
              <div className="w-12 h-12 bg-gray-600 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-[#2A2D35] p-6 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">{metric.title}</p>
              <p className="text-3xl font-bold text-white mt-1">{metric.value}</p>
              <div className="flex items-center mt-2 space-x-1">
                {getTrendIcon(metric.trend)}
                <span className={`text-sm ${
                  metric.trend === 'up' ? 'text-green-400' : 
                  metric.trend === 'down' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {metric.change}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${getColorClasses(metric.color)}`}>
              <metric.icon className="h-8 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}