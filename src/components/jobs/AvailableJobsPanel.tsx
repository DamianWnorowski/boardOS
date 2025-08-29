import React, { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { Job } from '../../types';
import { DurationEstimationService } from '../../services/DurationEstimationService';
import JobEstimateCard from './JobEstimateCard';
import AddJobModal from '../modals/AddJobModal';
import { useModal } from '../../context/ModalContext';

interface AvailableJobsPanelProps {
  onClose?: () => void;
}

const AvailableJobsPanel: React.FC<AvailableJobsPanelProps> = ({ onClose }) => {
  const { jobs, addJob } = useScheduler();
  const { openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Job['type']>('all');
  const [showAddJobModal, setShowAddJobModal] = useState(false);

  // Filter available jobs (exclude completed jobs and properly handle scheduling)
  const availableJobs = useMemo(() => {
    return jobs.filter(job => {
      // Skip completed jobs (jobs with actual_end date)
      if (job.actual_end) return false;
      
      // Skip past jobs that have ended (unless they're templates for recurring work)
      if (job.schedule_date && job.end_date && !job.is_template) {
        const endDate = new Date(job.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (endDate < today) return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = job.name.toLowerCase().includes(searchLower);
        const matchesNumber = job.number?.toLowerCase().includes(searchLower);
        const matchesLocation = job.location?.address.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesNumber && !matchesLocation) return false;
      }

      // Filter by type
      if (typeFilter !== 'all' && job.type !== typeFilter) return false;

      return true;
    });
  }, [jobs, searchTerm, typeFilter]);

  // Group jobs by meaningful status categories
  const jobGroups = useMemo(() => {
    const unscheduled = availableJobs.filter(job => !job.schedule_date);
    const inProgress = availableJobs.filter(job => 
      job.actual_start && !job.actual_end
    );
    const upcoming = availableJobs.filter(job => 
      job.schedule_date && !job.actual_start
    );

    return {
      unscheduled,
      inProgress: inProgress.sort((a, b) => 
        (a.actual_start || '').localeCompare(b.actual_start || '')
      ),
      upcoming: upcoming.sort((a, b) => 
        (a.schedule_date || '').localeCompare(b.schedule_date || '')
      )
    };
  }, [availableJobs]);

  const handleAddJob = () => {
    setShowAddJobModal(true);
    openModal('available-jobs-add');
  };

  const getTotalEstimate = (jobs: Job[]) => {
    let totalDays = 0;
    let totalSqYards = 0;
    let totalTons = 0;

    jobs.forEach(job => {
      const estimate = DurationEstimationService.calculateJobDuration(job);
      totalDays += estimate.total_days;
      totalSqYards += job.estimated_sqyards || 0;
      totalTons += job.estimated_tons || 0;
    });

    return { totalDays, totalSqYards, totalTons };
  };

  const unscheduledStats = getTotalEstimate(jobGroups.unscheduled);
  const inProgressStats = getTotalEstimate(jobGroups.inProgress);
  const upcomingStats = getTotalEstimate(jobGroups.upcoming);

  return (
    <div className="flex flex-col h-full w-96 bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Available Jobs</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <div className="text-base text-gray-600">
          {availableJobs.length} jobs • {Math.round(availableJobs.reduce((sum, job) => {
            const est = DurationEstimationService.calculateJobDuration(job);
            return sum + est.total_days;
          }, 0))} days total
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="w-full px-3 py-2.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="milling">Milling</option>
          <option value="paving">Paving</option>
          <option value="both">Mill & Pave</option>
          <option value="drainage">Drainage</option>
          <option value="stripping">Stripping</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Summary Stats */}
        {(jobGroups.unscheduled.length > 0 || jobGroups.inProgress.length > 0 || jobGroups.upcoming.length > 0) && (
          <div className="flex gap-2 mb-3 text-base">
            {jobGroups.unscheduled.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <span className="font-medium">Unscheduled:</span>
                <span>{jobGroups.unscheduled.length}</span>
              </div>
            )}
            {jobGroups.inProgress.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded">
                <span className="font-medium">Active:</span>
                <span>{jobGroups.inProgress.length}</span>
              </div>
            )}
            {jobGroups.upcoming.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded">
                <span className="font-medium">Scheduled:</span>
                <span>{jobGroups.upcoming.length}</span>
              </div>
            )}
          </div>
        )}

        {/* Unscheduled Jobs */}
        {jobGroups.unscheduled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-600 mb-3">Unscheduled Jobs</h4>
            <div className="space-y-2">
              {jobGroups.unscheduled.map(job => (
                <JobEstimateCard key={job.id} job={job} showScheduleButton />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Jobs */}
        {jobGroups.inProgress.length > 0 && (
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-600 mb-3">Active Jobs</h4>
            <div className="space-y-2">
              {jobGroups.inProgress.map(job => (
                <JobEstimateCard key={job.id} job={job} showProgressIndicator />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Jobs */}
        {jobGroups.upcoming.length > 0 && (
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-600 mb-3">Scheduled Jobs</h4>
            <div className="space-y-2">
              {jobGroups.upcoming.map(job => (
                <JobEstimateCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {availableJobs.length === 0 && (
          <div className="text-center text-gray-500 mt-4">
            <p className="text-base">No jobs available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleAddJob}
          className="flex items-center justify-center w-full py-2.5 bg-blue-600 text-white text-base rounded-md hover:bg-blue-700 transition-colors"
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
            closeModal('available-jobs-add');
          }}
          onAdd={async (jobData) => {
            await addJob(jobData);
            setShowAddJobModal(false);
            closeModal('available-jobs-add');
          }}
        />
      )}
    </div>
  );
};

export default AvailableJobsPanel;