import React from 'react';
import { ArrowLeft, UserCheck, Database, AlertCircle } from 'lucide-react';
import DatabaseStatus from '../database/DatabaseStatus';
import DatabaseTester from '../testing/DatabaseTester';

interface DatabaseTestPageProps {
  onBack: () => void;
}

const DatabaseTestPage: React.FC<DatabaseTestPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} />
              <span>Back to Scheduler</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Database Status Panel */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h2>
            <DatabaseStatus />
          </div>

          {/* Database Tester Panel */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Functionality Tests</h2>
            <DatabaseTester />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Connect to Supabase:</strong> Click the "Connect to Supabase" button in the top-right corner to set up your database connection.</p>
            <p><strong>2. Run Tests:</strong> Use the "Run Tests" button to validate that all database functionality is working correctly.</p>
            <p><strong>3. Check Status:</strong> Monitor the connection status and database statistics in real-time.</p>
            <p><strong>4. Review Logs:</strong> The audit trail will track all changes made to the system for compliance and debugging.</p>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <UserCheck className="text-green-600" size={24} />
              <h3 className="font-semibold">Role-Based Rules</h3>
            </div>
            <p className="text-sm text-gray-600">
              Magnet interaction rules enforce role-based restrictions. For example, laborers need CDL certification to drive trucks.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Database className="text-blue-600" size={24} />
              <h3 className="font-semibold">Real-time Sync</h3>
            </div>
            <p className="text-sm text-gray-600">
              All changes are instantly synchronized across all connected clients using Supabase Realtime.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="text-purple-600" size={24} />
              <h3 className="font-semibold">Audit Trail</h3>
            </div>
            <p className="text-sm text-gray-600">
              Complete audit logging tracks all magnet movements, assignments, and changes with user attribution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTestPage;