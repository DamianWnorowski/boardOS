import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, Calendar } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import JobsScopeCard from './JobsScopeCard';
import AddJobModal from '../modals/AddJobModal';
import EditJobModal from '../modals/EditJobModal';
import ErrorBoundary from '../common/ErrorBoundary';

const JobsApprovedSidebar: React.FC = () => {
  const { 
    jobs, 
    selectedDate, 
    searchTerm, 
    setSearchTerm, 
    addJob 
  } = useScheduler();
  const { openModal, closeModal } = useModal();
  
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'final'>('all');

  // Calculate week dates
  const getWeekDates = (date: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(date);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const weekDates = getWeekDates(selectedDate);
  const weekDateStrings = weekDates.map(d => d.toISOString().split('T')[0]);

  // Filter jobs for the current week
  const weekJobs = useMemo(() => {
    return jobs.filter(job => {
      // Filter by week dates
      const jobDate = job.schedule_date || new Date().toISOString().split('T')[0];
      const isInWeek = weekDateStrings.includes(jobDate);
      
      // Filter by search term
      const matchesSearch = !searchTerm || 
        job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'final' && job.finalized) ||
        (statusFilter === 'pending' && !job.finalized) ||
        (statusFilter === 'approved' && !job.finalized); // Assume non-finalized jobs are "approved"
      
      return isInWeek && matchesSearch && matchesStatus;
    });
  }, [jobs, weekDateStrings, searchTerm, statusFilter]);

  // Group jobs by date
  const jobsByDate = useMemo(() => {
    const grouped = new Map<string, typeof weekJobs>();
    
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dateJobs = weekJobs.filter(job => {
        const jobDate = job.schedule_date || new Date().toISOString().split('T')[0];
        return jobDate === dateStr;
      });
      grouped.set(dateStr, dateJobs);
    });
    
    return grouped;
  }, [weekJobs, weekDates]);

  const handleAddJob = () => {
    setShowAddJobModal(true);
    openModal('add-job');
  };

  const handleJobClick = (job: any) => {
    setSelectedJob(job);
    setShowEditJobModal(true);
    openModal('job-details');
  };

  const handleEditJob = (job: any) => {
    setSelectedJob(job);
    setShowEditJobModal(true);
    openModal('job-edit');
  };

  const formatDateHeader = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const totalJobs = weekJobs.length;
  const finalizedJobs = weekJobs.filter(job => job.finalized).length;

  return (
    <ErrorBoundary>
      <aside className="w-80 bg-white/95 border-r border-slate-200 flex flex-col h-full overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Jobs Approved</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{finalizedJobs}/{totalJobs}</span>
              <span className="text-green-600">✓</span>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>

          {/* Status Filter */}
          <div className="flex items-center mb-3">
            <Filter size={14} className="mr-2 text-gray-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="final">Finalized</option>
            </select>
          </div>

          {/* Week Range */}
          <div className="text-xs text-gray-500 text-center">
            Week: {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {weekDates.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const dayJobs = jobsByDate.get(dateStr) || [];
              
              if (dayJobs.length === 0) return null;
              
              return (
                <div key={dateStr} className="border-b border-gray-100 last:border-b-0">
                  {/* Date Header */}
                  <div className={`px-3 py-2 text-xs font-medium flex items-center justify-between ${
                    isToday(date) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Calendar size={12} />
                      <span>{formatDateHeader(date)}</span>
                      {isToday(date) && <span className="text-blue-600 font-semibold">TODAY</span>}
                    </div>
                    <span className="text-gray-500">{dayJobs.length}</span>
                  </div>
                  
                  {/* Jobs for this date */}
                  <div className="p-2 space-y-2">
                    {dayJobs
                      .sort((a, b) => {
                        // Sort by finalized status (finalized first), then by name
                        if (a.finalized && !b.finalized) return -1;
                        if (!a.finalized && b.finalized) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map(job => (
                        <JobsScopeCard
                          key={job.id}
                          job={job}
                          onClick={() => handleJobClick(job)}
                          onEdit={() => handleEditJob(job)}
                        />
                      ))
                    }
                  </div>
                </div>
              );
            })}
            
            {weekJobs.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <div className="mb-3">
                  <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No jobs found for this week</p>
                </div>
                <button
                  onClick={handleAddJob}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center space-x-1 mx-auto"
                >
                  <Plus size={14} />
                  <span>Add Job</span>
                </button>
              </div>
            )}
          </ErrorBoundary>
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleAddJob}
            className="flex items-center justify-center w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} className="mr-1" />
            <span>Add Job</span>
          </button>
        </div>
        
        {/* Add Job Modal */}
        {showAddJobModal && (
          <AddJobModal
            onClose={() => {
              setShowAddJobModal(false);
              closeModal('add-job');
            }}
            onAdd={async (jobData) => {
              await addJob(jobData);
              setShowAddJobModal(false);
              closeModal('add-job');
            }}
          />
        )}

        {/* Job Edit Modal */}
        {showEditJobModal && selectedJob && (
          <EditJobModal
            job={selectedJob}
            onClose={() => {
              setSelectedJob(null);
              setShowEditJobModal(false);
              closeModal('job-details');
              closeModal('job-edit');
            }}
          />
        )}
      </aside>
    </ErrorBoundary>
  );
};

export default JobsApprovedSidebar;