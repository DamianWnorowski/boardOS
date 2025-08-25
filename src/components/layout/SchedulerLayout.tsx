import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useMobile } from '../../context/MobileContext';
import { useScheduler } from '../../context/SchedulerContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Board from '../board/Board';

const SchedulerLayout: React.FC = () => {
  const { isDesktop } = useMobile();
  const { isLoading, error, refreshData } = useScheduler();
  
  // Only render desktop layout on desktop
  if (!isDesktop) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
            <p className="text-gray-600">Loading schedule data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertTriangle size={48} className="text-red-500 mb-4 mx-auto" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Database Connection Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refreshData}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mx-auto"
            >
              <RefreshCw size={16} className="mr-2" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Board />
      </div>
    </div>
  );
};

export default SchedulerLayout;