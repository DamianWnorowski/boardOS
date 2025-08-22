import React from 'react';
import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { dndBackendOptions } from './utils/dndBackend';
import { useMobile } from './context/MobileContext';
import SchedulerLayout from './components/layout/SchedulerLayout';
import MobileSchedulerLayout from './components/mobile/MobileSchedulerLayout';
import MobileDragLayer from './components/mobile/MobileDragLayer';
import DatabaseTestPage from './components/layout/DatabaseTestPage';

function App() {
  const { isMobile } = useMobile();
  const [showDatabaseTest, setShowDatabaseTest] = useState(false);

  if (showDatabaseTest) {
    return <DatabaseTestPage onBack={() => setShowDatabaseTest(false)} />;
  }

  return (
    <div id="app-root" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DndProvider backend={MultiBackend} options={dndBackendOptions}>
        {/* Database Test Toggle Button */}
        <button
          onClick={() => setShowDatabaseTest(true)}
          className="fixed top-4 right-4 z-50 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-lg text-sm font-medium"
        >
          Database Test
        </button>
        
        {isMobile ? <MobileSchedulerLayout /> : <SchedulerLayout />}
        <MobileDragLayer />
      </DndProvider>
    </div>
  );
}

export default App;