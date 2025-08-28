import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { useMobile } from '../../context/MobileContext';
import { useScheduler } from '../../context/SchedulerContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Board from '../board/Board';
import WeekViewCompact from '../board/WeekViewCompact';
import MonthView from '../board/MonthView';
import JobsApprovedSidebar from '../jobs/JobsApprovedSidebar';

const SchedulerLayout: React.FC = () => {
  const { isDesktop } = useMobile();
  const { isLoading, error, refreshData, jobs, resources, currentView, selectedDate, setSelectedDate } = useScheduler();
  const [hasInitialLoad, setHasInitialLoad] = React.useState(false);
  
  // Track when we've done the initial load
  React.useEffect(() => {
    if (!isLoading && (jobs.length > 0 || resources.length > 0)) {
      setHasInitialLoad(true);
    }
  }, [isLoading, jobs.length, resources.length]);
  
  // Render appropriate view based on currentView state
  const renderMainView = () => {
    switch (currentView) {
      case 'week':
        return <WeekViewCompact startDate={selectedDate} onDateChange={setSelectedDate} />;
      case 'month':
        return <MonthView selectedMonth={selectedDate} onMonthChange={setSelectedDate} />;
      case 'day':
      default:
        return <Board />;
    }
  };
  
  // Only render desktop layout on desktop
  if (!isDesktop) {
    return null;
  }

  // Loading state - only show on very first load
  if (isLoading && !hasInitialLoad) {
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
      {/* Manual Refresh Button for debugging */}
      <button
        onClick={refreshData}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg"
        title="Manual refresh (for debugging)"
      >
        <RotateCcw size={20} />
      </button>
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'week' ? <JobsApprovedSidebar /> : (
          currentView === 'month' ? null : <Sidebar />
        )}
        {renderMainView()}
      </div>
    </div>
  );
};

export default SchedulerLayout;