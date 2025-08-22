import React from 'react';
import { useMobile } from '../../context/MobileContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Board from '../board/Board';

const SchedulerLayout: React.FC = () => {
  const { isDesktop } = useMobile();
  
  // Only render desktop layout on desktop
  if (!isDesktop) {
    return null;
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