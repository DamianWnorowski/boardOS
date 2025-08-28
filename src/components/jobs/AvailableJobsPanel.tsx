import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Clock, MapPin, Calculator } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Available Jobs</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Job Types</option>
          <option value="milling">Milling</option>
          <option value="paving">Paving</option>
          <option value="both">Mill & Pave</option>
          <option value="drainage">Drainage</option>
          <option value="stripping">Stripping</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary Stats */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">Unscheduled</div>
              <div className="space-y-0.5 text-gray-600">
                <div>{jobGroups.unscheduled.length} jobs</div>
                <div>{unscheduledStats.totalDays} est. days</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-orange-700 mb-1">In Progress</div>
              <div className="space-y-0.5 text-gray-600">
                <div>{jobGroups.inProgress.length} jobs</div>
                <div>{inProgressStats.totalDays} est. days</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-blue-700 mb-1">Upcoming</div>
              <div className="space-y-0.5 text-gray-600">
                <div>{jobGroups.upcoming.length} jobs</div>
                <div>{upcomingStats.totalDays} est. days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Unscheduled Jobs */}
        {jobGroups.unscheduled.length > 0 && (
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <h4 className="font-medium text-gray-800">Unscheduled</h4>
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                {jobGroups.unscheduled.length}
              </span>
            </div>
            <div className="space-y-2">
              {jobGroups.unscheduled.map(job => (
                <JobEstimateCard key={job.id} job={job} showScheduleButton />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Jobs */}
        {jobGroups.inProgress.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
              <h4 className="font-medium text-gray-800">In Progress</h4>
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                {jobGroups.inProgress.length}
              </span>
            </div>
            <div className="space-y-2">
              {jobGroups.inProgress.map(job => (
                <JobEstimateCard 
                  key={job.id} 
                  job={job} 
                  showProgressIndicator
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Jobs */}
        {jobGroups.upcoming.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
              <h4 className="font-medium text-gray-800">Upcoming</h4>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                {jobGroups.upcoming.length}
              </span>
            </div>
            <div className="space-y-2">
              {jobGroups.upcoming.map(job => (
                <JobEstimateCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {availableJobs.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <Calculator size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm mb-2">No available jobs found</p>
            {searchTerm && (
              <p className="text-xs">Try adjusting your search or filters</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleAddJob}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={16} className="mr-2" />
          Add New Job
        </button>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          💡 Tip: Drag jobs to calendar to schedule
        </div>
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