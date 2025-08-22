import React from 'react';
import { DndProvider } from 'react-dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { dndBackendOptions } from './utils/dndBackend';
import { useMobile } from './context/MobileContext';
import SchedulerLayout from './components/layout/SchedulerLayout';
import MobileSchedulerLayout from './components/mobile/MobileSchedulerLayout';
import MobileDragLayer from './components/mobile/MobileDragLayer';

function App() {
  const { isMobile } = useMobile();

  return (
    <div id="app-root" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DndProvider backend={MultiBackend} options={dndBackendOptions}>
        {isMobile ? <MobileSchedulerLayout /> : <SchedulerLayout />}
        <MobileDragLayer />
      </DndProvider>
    </div>
  );
}

export default App;