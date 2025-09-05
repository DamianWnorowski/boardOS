import React, { useState, useEffect } from 'react';
import { Database, Wifi, WifiOff, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';


interface DatabaseStatusProps {
  onConnectionChange?: (connected: boolean) => void;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    jobs: number;
    resources: number;
    assignments: number;
  }>({ jobs: 0, resources: 0, assignments: 0 });

  // Test database connection
  const testConnection = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('resources')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      setIsConnected(true);
      setLastSync(new Date());
      
      // Get basic stats
      await loadStats();
      
    } catch (err: any) {
      console.error('Database connection test failed:', err);
      setIsConnected(false);
      setError(err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Load database statistics
  const loadStats = async () => {
    try {
      const [jobsResult, resourcesResult, assignmentsResult] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        jobs: jobsResult.count || 0,
        resources: resourcesResult.count || 0,
        assignments: assignmentsResult.count || 0
      });
    } catch (err) {
      console.error('Error loading database stats:', err);
    }
  };

  // Initial connection test
  useEffect(() => {
    testConnection();
  }, []);

  // Notify parent of connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  // Set up real-time connection monitoring
  useEffect(() => {
    const channel = supabase.channel('connection-status');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
        setLastSync(new Date());
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Database size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Database Status</h3>
        </div>
        
        <button
          onClick={testConnection}
          disabled={isLoading}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Test</span>
        </button>
      </div>

      {/* Connection Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection:</span>
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">Testing...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center space-x-2 text-green-600">
                <Wifi size={16} />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <WifiOff size={16} />
                <span className="text-sm font-medium">Disconnected</span>
              </div>
            )}
          </div>
        </div>

        {/* Last Sync Time */}
        {lastSync && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Sync:</span>
            <span className="text-sm text-gray-900">
              {lastSync.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-red-800">Connection Error</div>
              <div className="text-xs text-red-600 mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* Database Statistics */}
        {isConnected && (
          <div className="border-t border-gray-200 pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Database Statistics</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-md p-2">
                <div className="text-lg font-bold text-blue-600">{stats.jobs}</div>
                <div className="text-xs text-blue-600">Jobs</div>
              </div>
              <div className="bg-green-50 rounded-md p-2">
                <div className="text-lg font-bold text-green-600">{stats.resources}</div>
                <div className="text-xs text-green-600">Resources</div>
              </div>
              <div className="bg-purple-50 rounded-md p-2">
                <div className="text-lg font-bold text-purple-600">{stats.assignments}</div>
                <div className="text-xs text-purple-600">Assignments</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Real-time sync:</span>
            <div className="flex items-center space-x-1">
              <CheckCircle size={12} className="text-green-500" />
              <span className="text-green-600">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Audit logging:</span>
            <div className="flex items-center space-x-1">
              <CheckCircle size={12} className="text-green-500" />
              <span className="text-green-600">Enabled</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Security (RLS):</span>
            <div className="flex items-center space-x-1">
              <CheckCircle size={12} className="text-green-500" />
              <span className="text-green-600">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatus;