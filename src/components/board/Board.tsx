import React, { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import JobColumn from './JobColumn';
import AddJobModal from '../modals/AddJobModal';
import ErrorBoundary from '../common/ErrorBoundary';

const Board: React.FC = () => {
  const { jobs, isLoading } = useScheduler();
  const { openModal, closeModal, getZIndex } = useModal();
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  
  const openAddJobModal = () => {
    setIsAddJobModalOpen(true);
    openModal('add-job');
  };
  
  const closeAddJobModal = () => {
    setIsAddJobModalOpen(false);
    closeModal('add-job');
  };
  
  return (
    <ErrorBoundary>
      <div className="flex-1 overflow-x-auto bg-slate-100">
        {isLoading && (
          <div className="p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-blue-800 text-sm">Syncing with database...</span>
            </div>
          </div>
        )}
        <div className="p-4 min-w-max">
          <div className="flex space-x-4">
            {jobs.map(job => (
              <JobColumn key={job.id} job={job} />
            ))}
            
            <button
              onClick={openAddJobModal}
              className="w-64 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-md text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-colors bg-white/50"
            >
              <PlusCircle size={32} />
              <span className="mt-2 font-medium">Add New Job</span>
            </button>
          </div>
        </div>
        
        {isAddJobModalOpen && (
          <div style={{ zIndex: getZIndex('add-job') }}>
            <AddJobModal onClose={closeAddJobModal} />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Board;