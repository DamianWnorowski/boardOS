import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Clock, MapPin, Calculator, Briefcase, Calendar, AlertCircle } from 'lucide-react';
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
    <div className="flex flex-col h-full w-96 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-lg">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Briefcase size={24} />
            <h3 className="font-bold text-2xl">Available Jobs</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-200 hover:text-white transition-colors p-1 hover:bg-blue-500/20 rounded"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between text-base text-blue-100">
          <span>{availableJobs.length} total jobs</span>
          <span>{Math.round(availableJobs.reduce((sum, job) => {
            const est = DurationEstimationService.calculateJobDuration(job);
            return sum + est.total_days;
          }, 0))} est. days</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, number, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer"
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
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Summary Stats */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <Clock size={20} className="text-gray-500" />
                <span className="text-lg font-bold text-gray-900">{jobGroups.unscheduled.length}</span>
              </div>
              <div className="text-sm font-semibold text-gray-700">Unscheduled</div>
              <div className="text-sm text-gray-500 mt-1">{unscheduledStats.totalDays} days</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle size={20} className="text-orange-500" />
                <span className="text-lg font-bold text-orange-700">{jobGroups.inProgress.length}</span>
              </div>
              <div className="text-sm font-semibold text-orange-700">Active</div>
              <div className="text-sm text-gray-500 mt-1">{inProgressStats.totalDays} days</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <Calendar size={20} className="text-blue-500" />
                <span className="text-lg font-bold text-blue-700">{jobGroups.upcoming.length}</span>
              </div>
              <div className="text-sm font-semibold text-blue-700">Scheduled</div>
              <div className="text-sm text-gray-500 mt-1">{upcomingStats.totalDays} days</div>
            </div>
          </div>
        </div>

        {/* Unscheduled Jobs */}
        {jobGroups.unscheduled.length > 0 && (
          <div className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Clock size={20} className="text-gray-500" />
                <h4 className="text-lg font-semibold text-gray-800">Unscheduled</h4>
                <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full font-bold">
                  {jobGroups.unscheduled.length}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {jobGroups.unscheduled.map(job => (
                <div key={job.id} className="transform transition-all hover:scale-[1.02]">
                  <JobEstimateCard job={job} showScheduleButton />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress Jobs */}
        {jobGroups.inProgress.length > 0 && (
          <div className="p-6 bg-orange-50/50 border-t border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <AlertCircle size={20} className="text-orange-500" />
                <h4 className="text-lg font-semibold text-orange-800">Active Jobs</h4>
                <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-bold">
                  {jobGroups.inProgress.length}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {jobGroups.inProgress.map(job => (
                <div key={job.id} className="transform transition-all hover:scale-[1.02]">
                  <JobEstimateCard job={job} showProgressIndicator />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Jobs */}
        {jobGroups.upcoming.length > 0 && (
          <div className="p-6 bg-blue-50/50 border-t border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Calendar size={20} className="text-blue-500" />
                <h4 className="text-lg font-semibold text-blue-800">Scheduled</h4>
                <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-bold">
                  {jobGroups.upcoming.length}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {jobGroups.upcoming.map(job => (
                <div key={job.id} className="transform transition-all hover:scale-[1.02]">
                  <JobEstimateCard key={job.id} job={job} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {availableJobs.length === 0 && (
          <div className="p-8 text-center">
            <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <Briefcase size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-700 font-medium mb-2">No jobs found</p>
            {searchTerm ? (
              <p className="text-sm text-gray-500">
                Try adjusting your search terms or filters
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Click "Add New Job" to create your first job
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-white border-t border-gray-200 shadow-lg">
        <button
          onClick={handleAddJob}
          className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-lg font-medium"
        >
          <Plus size={20} className="mr-2" />
          Add New Job
        </button>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          Tip: Drag jobs to calendar to schedule them
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