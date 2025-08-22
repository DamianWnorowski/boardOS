import React, { useState } from 'react';
import { Calendar, Users, Briefcase, Menu, X } from 'lucide-react';
import { useMobile } from '../../context/MobileContext';
import MobileJobCard from './MobileJobCard';
import MobileResourcePool from './MobileResourcePool';
import EditJobModal from '../modals/EditJobModal';
import { useOptimizedScheduler } from '../../hooks/useOptimizedScheduler';
import { Job } from '../../types';

type MobileTab = 'jobs' | 'resources' | 'schedule';

const MobileSchedulerLayout: React.FC = () => {
  const { isMobile } = useMobile();
  const { jobs } = useOptimizedScheduler();
  const [activeTab, setActiveTab] = useState<MobileTab>('jobs');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!isMobile) return null;

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setIsEditModalOpen(true);
  };

  const handleAssignResources = (job: Job) => {
    setSelectedJob(job);
    setActiveTab('resources');
  };

  const tabs = [
    { id: 'jobs' as const, label: 'Jobs', icon: Briefcase, count: jobs.length },
    { id: 'resources' as const, label: 'Resources', icon: Users, count: null },
    { id: 'schedule' as const, label: 'Schedule', icon: Calendar, count: null },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Construction Scheduler</h1>
            <div className="text-sm text-slate-300">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-2 text-center border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className="mx-auto mb-1" />
                <div className="text-xs font-medium">
                  {tab.label}
                  {tab.count !== null && (
                    <span className="ml-1 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'jobs' && (
          <div className="h-full overflow-y-auto p-4">
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg font-medium mb-2">No jobs scheduled</p>
                <p className="text-sm">Tap the + button to create your first job</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <MobileJobCard
                    key={job.id}
                    job={job}
                    onEdit={() => handleEditJob(job)}
                    onAssignResources={() => handleAssignResources(job)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <MobileResourcePool />
        )}

        {activeTab === 'schedule' && (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Calendar size={48} className="mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Schedule View</p>
              <p className="text-sm">Coming soon - Calendar view of all jobs</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Job Modal */}
      {isEditModalOpen && selectedJob && (
        <EditJobModal
          job={selectedJob}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

export default MobileSchedulerLayout;