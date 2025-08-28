import React from 'react';
import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { dndBackendOptions } from './utils/dndBackend';
import { useMobile } from './context/MobileContext';
import { useScheduler } from './context/SchedulerContext';
import SchedulerLayout from './components/layout/SchedulerLayout';
import MobileSchedulerLayout from './components/mobile/MobileSchedulerLayout';
import MobileDragLayer from './components/mobile/MobileDragLayer';
import MagnetDragLayer from './components/ui/MagnetDragLayer';
import DatabaseTestPage from './components/layout/DatabaseTestPage';
import CompactQuickSelect from './components/ui/CompactQuickSelect';
import KeyboardShortcutsHelp from './components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './context/KeyboardShortcutsContext';
import { RefreshCw } from 'lucide-react';

function App() {
  const { isMobile } = useMobile();
  const { refreshData } = useScheduler();
  const { isHelpOpen, closeHelp } = useKeyboardShortcuts();
  const [showDatabaseTest, setShowDatabaseTest] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (showDatabaseTest) {
    return <DatabaseTestPage onBack={() => setShowDatabaseTest(false)} />;
  }

  return (
    <div id="app-root" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DndProvider backend={MultiBackend} options={dndBackendOptions}>
        {/* Control Buttons */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md shadow-lg text-sm font-medium flex items-center gap-2 ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          {/* Database Test Toggle Button */}
          <button
            onClick={() => setShowDatabaseTest(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-lg text-sm font-medium"
          >
            Database Test
          </button>
        </div>
        
        {isMobile ? <MobileSchedulerLayout /> : <SchedulerLayout />}
        {isMobile && <MobileDragLayer />}
        <MagnetDragLayer />
        <CompactQuickSelect />
        <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />
      </DndProvider>
    </div>
  );
}

export default App;