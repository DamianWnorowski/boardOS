import React, { useState, useEffect } from 'react';
import { getZIndexClass } from '../../utils/zIndexLayers';
import { X, ChevronDown, ChevronUp, Bug, Database, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { supabase } from '../../lib/supabase';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DebugMetrics {
  jobCount: number;
  resourceCount: number;
  assignmentCount: number;
  dbConnectionStatus: 'connected' | 'disconnected' | 'checking';
  lastUpdate: Date;
  apiCalls: number;
  errors: string[];
  performance: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
  };
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const { jobs, resources, assignments, isLoading, error } = useScheduler();
  const [expanded, setExpanded] = useState({
    state: true,
    database: false,
    performance: false,
    errors: false
  });
  
  const [metrics, setMetrics] = useState<DebugMetrics>({
    jobCount: 0,
    resourceCount: 0,
    assignmentCount: 0,
    dbConnectionStatus: 'checking',
    lastUpdate: new Date(),
    apiCalls: 0,
    errors: [],
    performance: {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0
    }
  });

  // Update metrics when data changes
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      jobCount: jobs.length,
      resourceCount: resources.length,
      assignmentCount: assignments.length,
      lastUpdate: new Date()
    }));
  }, [jobs, resources, assignments]);

  // Check database connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('resources').select('count').limit(1);
        setMetrics(prev => ({
          ...prev,
          dbConnectionStatus: error ? 'disconnected' : 'connected',
          apiCalls: prev.apiCalls + 1
        }));
      } catch (err) {
        setMetrics(prev => ({
          ...prev,
          dbConnectionStatus: 'disconnected'
        }));
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Track performance metrics
  useEffect(() => {
    const updatePerformance = () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      
      setMetrics(prev => ({
        ...prev,
        performance: {
          loadTime: perfData ? perfData.loadEventEnd - perfData.loadEventStart : 0,
          renderTime: perfData ? perfData.domComplete - perfData.domInteractive : 0,
          memoryUsage: memory ? memory.usedJSHeapSize / 1048576 : 0 // Convert to MB
        }
      }));
    };

    updatePerformance();
    const interval = setInterval(updatePerformance, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track errors
  useEffect(() => {
    if (error) {
      setMetrics(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-9), error] // Keep last 10 errors
      }));
    }
  }, [error]);

  if (!isOpen) return null;

  const toggleSection = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={`fixed bottom-0 right-0 w-96 bg-gray-900 text-white rounded-tl-lg shadow-2xl ${getZIndexClass('DEBUG_PANEL')} max-h-[600px] overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bug size={18} />
          <span className="font-bold">Debug Panel</span>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* State Section */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => toggleSection('state')}
            className="w-full p-2 flex justify-between items-center hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              <Activity size={16} />
              Application State
            </span>
            {expanded.state ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expanded.state && (
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Jobs:</span>
                <span className="font-mono">{metrics.jobCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Resources:</span>
                <span className="font-mono">{metrics.resourceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Assignments:</span>
                <span className="font-mono">{metrics.assignmentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Loading:</span>
                <span className="font-mono">{isLoading ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update:</span>
                <span className="font-mono text-xs">{metrics.lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Database Section */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => toggleSection('database')}
            className="w-full p-2 flex justify-between items-center hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              <Database size={16} />
              Database
            </span>
            {expanded.database ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expanded.database && (
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Connection:</span>
                <span className="flex items-center gap-1">
                  {metrics.dbConnectionStatus === 'connected' ? (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-green-500">Connected</span>
                    </>
                  ) : metrics.dbConnectionStatus === 'checking' ? (
                    <>
                      <Activity size={14} className="text-yellow-500 animate-spin" />
                      <span className="text-yellow-500">Checking...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} className="text-red-500" />
                      <span className="text-red-500">Disconnected</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API Calls:</span>
                <span className="font-mono">{metrics.apiCalls}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Supabase URL:</span>
                <span className="font-mono text-xs truncate">
                  {import.meta.env.VITE_SUPABASE_URL?.slice(0, 20)}...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Performance Section */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => toggleSection('performance')}
            className="w-full p-2 flex justify-between items-center hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              <Activity size={16} />
              Performance
            </span>
            {expanded.performance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expanded.performance && (
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Load Time:</span>
                <span className="font-mono">{metrics.performance.loadTime.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Render Time:</span>
                <span className="font-mono">{metrics.performance.renderTime.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory Usage:</span>
                <span className="font-mono">{metrics.performance.memoryUsage.toFixed(2)}MB</span>
              </div>
            </div>
          )}
        </div>

        {/* Errors Section */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => toggleSection('errors')}
            className="w-full p-2 flex justify-between items-center hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              Errors ({metrics.errors.length})
            </span>
            {expanded.errors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expanded.errors && (
            <div className="p-3 space-y-2 text-sm">
              {metrics.errors.length === 0 ? (
                <span className="text-gray-400 italic">No errors recorded</span>
              ) : (
                metrics.errors.map((error, index) => (
                  <div key={index} className="bg-red-900/20 p-2 rounded text-xs font-mono text-red-400">
                    {error}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 p-2 border-t border-gray-700 text-xs text-gray-400 text-center">
        Press Ctrl+Shift+D to toggle debug panel
      </div>
    </div>
  );
};

export default DebugPanel;
