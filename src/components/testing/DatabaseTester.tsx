import React, { useState } from 'react';
import { Play, Database, Users, Briefcase, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { DatabaseService } from '../../services/DatabaseService';
import { supabase, assignResourceToJob } from '../../lib/supabase';

interface TestResult {
  test: string;
  status: 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

const DatabaseTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const updateTestResult = (testName: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.test === testName ? { ...result, ...updates } : result
    ));
  };

  const runDatabaseTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Basic Connectivity
    addTestResult({ test: 'Database Connectivity', status: 'running', message: 'Testing connection...' });
    try {
      const { data, error } = await supabase.from('resources').select('count').limit(1);
      if (error) throw error;
      updateTestResult('Database Connectivity', { 
        status: 'success', 
        message: 'Successfully connected to database' 
      });
    } catch (error: any) {
      updateTestResult('Database Connectivity', { 
        status: 'error', 
        message: `Connection failed: ${error.message}` 
      });
      setIsRunning(false);
      return;
    }

    // Test 2: Create Test Resource
    addTestResult({ test: 'Create Resource', status: 'running', message: 'Creating test resource...' });
    let testResourceId = '';
    try {
      const testResource = await DatabaseService.createResource({
        type: 'laborer',
        name: 'Test Worker (Database Test)',
        identifier: 'TEST-001',
        location: 'Test Location',
        onSite: false
      });
      testResourceId = testResource.id;
      updateTestResult('Create Resource', { 
        status: 'success', 
        message: `Created resource: ${testResource.name}`,
        details: testResource
      });
    } catch (error: any) {
      updateTestResult('Create Resource', { 
        status: 'error', 
        message: `Failed to create resource: ${error.message}` 
      });
    }

    // Test 3: Create Test Job
    addTestResult({ test: 'Create Job', status: 'running', message: 'Creating test job...' });
    let testJobId = '';
    try {
      const testJob = await DatabaseService.createJob({
        name: 'Database Test Job',
        type: 'paving',
        shift: 'day',
        notes: 'This is a test job for database validation',
        startTime: '08:00'
      });
      testJobId = testJob.id;
      updateTestResult('Create Job', { 
        status: 'success', 
        message: `Created job: ${testJob.name}`,
        details: testJob
      });
    } catch (error: any) {
      updateTestResult('Create Job', { 
        status: 'error', 
        message: `Failed to create job: ${error.message}` 
      });
    }

    // Test 4: Assignment with Rules Validation
    if (testResourceId && testJobId) {
      addTestResult({ test: 'Assignment Rules', status: 'running', message: 'Testing assignment rules...' });
      try {
        // This should work - laborer to crew row
        const result = await assignResourceToJob(testResourceId, testJobId, 'crew');
        if (result.success) {
          updateTestResult('Assignment Rules', { 
            status: 'success', 
            message: 'Assignment rules validation passed',
            details: result
          });
        } else {
          updateTestResult('Assignment Rules', { 
            status: 'error', 
            message: result.error || 'Assignment failed' 
          });
        }
      } catch (error: any) {
        updateTestResult('Assignment Rules', { 
          status: 'error', 
          message: `Assignment failed: ${error.message}` 
        });
      }
    }

    // Test 5: Rule Violation (should fail)
    if (testResourceId && testJobId) {
      addTestResult({ test: 'Rule Violation', status: 'running', message: 'Testing rule violations...' });
      try {
        // This should fail - trying to assign laborer to equipment row without proper rules
        const result = await assignResourceToJob(testResourceId, testJobId, 'Equipment');
        if (!result.success) {
          updateTestResult('Rule Violation', { 
            status: 'success', 
            message: 'Rule violation correctly prevented',
            details: { expectedError: result.error }
          });
        } else {
          updateTestResult('Rule Violation', { 
            status: 'error', 
            message: 'Rule violation not prevented - this should have failed' 
          });
        }
      } catch (error: any) {
        updateTestResult('Rule Violation', { 
          status: 'success', 
          message: 'Rule violation correctly prevented by exception' 
        });
      }
    }

    // Test 6: Real-time Subscription
    addTestResult({ test: 'Real-time Sync', status: 'running', message: 'Testing real-time subscriptions...' });
    try {
      let subscriptionWorking = false;
      
      const subscription = supabase
        .channel('test-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resources' }, (payload) => {
          subscriptionWorking = true;
        })
        .subscribe();

      // Create a test resource to trigger the subscription
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for subscription to be ready
      
      const testResource2 = await DatabaseService.createResource({
        type: 'operator',
        name: 'Real-time Test Operator',
        identifier: 'REALTIME-001'
      });

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (subscriptionWorking) {
        updateTestResult('Real-time Sync', { 
          status: 'success', 
          message: 'Real-time subscriptions working correctly' 
        });
      } else {
        updateTestResult('Real-time Sync', { 
          status: 'error', 
          message: 'Real-time subscriptions not receiving events' 
        });
      }

      // Cleanup
      await DatabaseService.deleteResource(testResource2.id);
      supabase.removeChannel(subscription);
      
    } catch (error: any) {
      updateTestResult('Real-time Sync', { 
        status: 'error', 
        message: `Real-time test failed: ${error.message}` 
      });
    }

    // Test 7: Audit Trail
    addTestResult({ test: 'Audit Trail', status: 'running', message: 'Testing audit logging...' });
    try {
      const auditData = await DatabaseService.getAuditTrail('resource', undefined, 10);
      if (auditData && auditData.length > 0) {
        updateTestResult('Audit Trail', { 
          status: 'success', 
          message: `Found ${auditData.length} audit log entries`,
          details: auditData.slice(0, 3) // Show first 3 entries
        });
      } else {
        updateTestResult('Audit Trail', { 
          status: 'error', 
          message: 'No audit log entries found' 
        });
      }
    } catch (error: any) {
      updateTestResult('Audit Trail', { 
        status: 'error', 
        message: `Audit trail test failed: ${error.message}` 
      });
    }

    // Cleanup test data
    if (testResourceId) {
      try {
        await DatabaseService.deleteResource(testResourceId);
      } catch (error) {
        console.error('Error cleaning up test resource:', error);
      }
    }
    
    if (testJobId) {
      try {
        await DatabaseService.deleteJob(testJobId);
      } catch (error) {
        console.error('Error cleaning up test job:', error);
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw size={16} className="animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Database Testing Suite</h2>
          <button
            onClick={runDatabaseTests}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            <span>{isRunning ? 'Running Tests...' : 'Run Tests'}</span>
          </button>
        </div>
        
        {stats.jobs > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Database contains: {stats.jobs} jobs, {stats.resources} resources, {stats.assignments} assignments
          </div>
        )}
      </div>

      <div className="p-4">
        {testResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Database Test Suite</p>
            <p className="text-sm">Click "Run Tests" to validate database functionality</p>
          </div>
        ) : (
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-gray-900">{result.test}</span>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-50 border rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseTester;