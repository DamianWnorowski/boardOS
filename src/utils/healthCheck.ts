/**
 * Health Check System for BoardOS
 * Provides comprehensive application and dependency health monitoring
 */

import { supabase } from '../lib/supabase';
import { config } from './envValidation';

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

// Individual component check result
export interface ComponentHealth {
  status: HealthStatus;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
  lastChecked: string;
}

// Overall health check result
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    app: ComponentHealth;
    database: ComponentHealth;
    auth: ComponentHealth;
    realtime: ComponentHealth;
    storage?: ComponentHealth;
  };
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

// Performance timing utility
function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  return fn().then(result => ({
    result,
    time: Math.round(performance.now() - start)
  }));
}

/**
 * Check application core functionality
 */
async function checkAppHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    // Basic app functionality checks
    const checks = {
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      webSocket: typeof WebSocket !== 'undefined',
    };
    
    const allPassed = Object.values(checks).every(Boolean);
    
    return {
      status: allPassed ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      details: checks,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown app error',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check database connectivity and basic operations
 */
async function checkDatabaseHealth(): Promise<ComponentHealth> {
  try {
    const { result: queryResult, time } = await measureTime(async () => {
      // Simple query to test connectivity
      const { data, error } = await supabase
        .from('resources')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return data;
    });
    
    return {
      status: 'healthy',
      responseTime: time,
      details: {
        queryExecuted: true,
        recordsFound: queryResult?.length || 0,
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check authentication service
 */
async function checkAuthHealth(): Promise<ComponentHealth> {
  try {
    const { result: sessionResult, time } = await measureTime(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data;
    });
    
    return {
      status: 'healthy',
      responseTime: time,
      details: {
        sessionCheck: true,
        hasActiveSession: !!sessionResult.session,
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Auth service unavailable',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check real-time subscriptions
 */
async function checkRealtimeHealth(): Promise<ComponentHealth> {
  try {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          status: 'degraded',
          error: 'Real-time connection timeout',
          lastChecked: new Date().toISOString(),
        });
      }, 5000);
      
      const startTime = performance.now();
      
      // Test real-time connection
      const channel = supabase.channel('health-check')
        .on('broadcast', { event: 'health-ping' }, () => {
          clearTimeout(timeout);
          channel.unsubscribe();
          
          resolve({
            status: 'healthy',
            responseTime: Math.round(performance.now() - startTime),
            details: {
              connectionEstablished: true,
            },
            lastChecked: new Date().toISOString(),
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Send a test message
            channel.send({
              type: 'broadcast',
              event: 'health-ping',
              payload: { test: true }
            });
          } else if (status === 'SUBSCRIPTION_ERROR') {
            clearTimeout(timeout);
            resolve({
              status: 'unhealthy',
              error: 'Real-time subscription failed',
              lastChecked: new Date().toISOString(),
            });
          }
        });
    });
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Real-time check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check storage service (optional)
 */
async function checkStorageHealth(): Promise<ComponentHealth> {
  try {
    const { result, time } = await measureTime(async () => {
      // List buckets to test storage connectivity
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return data;
    });
    
    return {
      status: 'healthy',
      responseTime: time,
      details: {
        bucketsAccessible: true,
        bucketCount: result?.length || 0,
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'degraded', // Storage is optional, so degraded not unhealthy
      error: error instanceof Error ? error.message : 'Storage service unavailable',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(includeStorage = false): Promise<HealthCheckResult> {
  const startTime = performance.now();
  
  // Run all health checks in parallel
  const [appHealth, dbHealth, authHealth, realtimeHealth, storageHealth] = await Promise.all([
    checkAppHealth(),
    checkDatabaseHealth(),
    checkAuthHealth(),
    checkRealtimeHealth(),
    includeStorage ? checkStorageHealth() : Promise.resolve(undefined),
  ]);
  
  // Build checks object
  const checks: HealthCheckResult['checks'] = {
    app: appHealth,
    database: dbHealth,
    auth: authHealth,
    realtime: realtimeHealth,
  };
  
  if (storageHealth) {
    checks.storage = storageHealth;
  }
  
  // Calculate summary
  const checkResults = Object.values(checks);
  const summary = {
    total: checkResults.length,
    healthy: checkResults.filter(check => check.status === 'healthy').length,
    degraded: checkResults.filter(check => check.status === 'degraded').length,
    unhealthy: checkResults.filter(check => check.status === 'unhealthy').length,
  };
  
  // Determine overall status
  let overallStatus: HealthStatus = 'healthy';
  if (summary.unhealthy > 0) {
    overallStatus = 'unhealthy';
  } else if (summary.degraded > 0) {
    overallStatus = 'degraded';
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: config.version(),
    environment: config.environment(),
    uptime: Math.round(performance.now() - startTime),
    checks,
    summary,
  };
}

/**
 * Lightweight health check for load balancers
 */
export async function quickHealthCheck(): Promise<{ status: HealthStatus; timestamp: string }> {
  try {
    // Quick database ping
    const { error } = await supabase
      .from('resources')
      .select('id')
      .limit(1);
    
    return {
      status: error ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create health check endpoint handler for React app
 */
export function createHealthEndpoint() {
  // In a real implementation, this would be handled by your router
  // For now, we'll expose it on window for testing
  if (typeof window !== 'undefined') {
    (window as any).healthCheck = {
      full: performHealthCheck,
      quick: quickHealthCheck,
    };
  }
}

// Initialize health check endpoint in development
if (import.meta.env.DEV) {
  createHealthEndpoint();
}

/**
 * Health check hook for React components
 */
export function useHealthCheck() {
  const [healthData, setHealthData] = React.useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const checkHealth = React.useCallback(async (includeStorage = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await performHealthCheck(includeStorage);
      setHealthData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  React.useEffect(() => {
    // Initial health check
    checkHealth();
    
    // Set up periodic health checks every 30 seconds
    const interval = setInterval(() => checkHealth(), 30000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);
  
  return {
    healthData,
    isLoading,
    error,
    refresh: checkHealth,
  };
}

// Add React import for the hook
import React from 'react';