import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Users, Briefcase, Clock } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';

import { Job, Assignment, Resource } from '../../types';
import AddJobModal from '../modals/AddJobModal';

interface WeekViewCompactProps {
  startDate: Date;
  onDateChange: (date: Date) => void;
}

const WeekViewCompact: React.FC<WeekViewCompactProps> = ({ startDate, onDateChange }) => {
  const { jobs, resources, assignments, addJob, isLoading: schedulerLoading } = useScheduler();
  const [weekJobs, setWeekJobs] = useState<Map<string, Job[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  
  // Calculate week dates (memoized to prevent infinite re-renders)
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [startDate]);
  
  // Organize jobs by date for the week
  useEffect(() => {
    // Set loading while SchedulerContext is loading
    if (schedulerLoading) {
      setIsLoading(true);
      return;
    }
    
    const jobsByDate = new Map<string, Job[]>();
    const today = new Date().toISOString().split('T')[0];
    
    for (const date of weekDates) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter jobs by schedule_date from the jobs already loaded by SchedulerContext
      const dateJobs = jobs.filter(job => {
        // If job has no schedule_date, it defaults to today
        const jobDate = job.schedule_date || today;
        return jobDate === dateStr;
      });
      
      jobsByDate.set(dateStr, dateJobs);
    }
    
    setWeekJobs(jobsByDate);
    setIsLoading(false);
  }, [weekDates, jobs, schedulerLoading]); // Reload when scheduler loading state changes
  
  // Navigate weeks
  const handlePreviousWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };
  
  const handleNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };
  
  const handleToday = () => {
    onDateChange(new Date());
  };
  
  // Format date for display
  const formatDateCompact = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  // Check if date is weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };
  
  // Get job assignments for display
  const getJobAssignments = (job: Job): Assignment[] => {
    return assignments.filter(a => a.jobId === job.id);
  };
  
  // Get foreman assigned to a job
  const getJobForeman = (job: Job): Resource | null => {
    const jobAssignments = getJobAssignments(job);
    const foremanAssignment = jobAssignments.find(a => {
      const resource = resources.find(r => r.id === a.resourceId);
      return resource?.type === 'foreman';
    });
    
    if (foremanAssignment) {
      return resources.find(r => r.id === foremanAssignment.resourceId) || null;
    }
    return null;
  };
  
  // Get resource names for job
  const getJobResourceSummary = (job: Job): string => {
    const jobAssignments = getJobAssignments(job);
    const resourceNames = jobAssignments
      .map(a => {
        const resource = resources.find(r => r.id === a.resourceId);
        return resource ? resource.name.split(' ')[0] : '?'; // Just first name
      })
      .slice(0, 3); // Limit to 3 names
    
    const additional = jobAssignments.length > 3 ? `+${jobAssignments.length - 3}` : '';
    return resourceNames.join(', ') + (additional ? ` ${additional}` : '');
  };
  
  // Get job type icon
  const getJobTypeIcon = (jobType: Job['type']) => {
    switch (jobType) {
      case 'paving': return '';
      case 'milling': return '';
      case 'drainage': return '';
      case 'stripping': return '';
      default: return '';
    }
  };
  
  // Handle adding job to specific date
  const handleAddJob = (date: Date) => {
    setSelectedDate(date);
    setShowAddJobModal(true);
  };
  
  
  // Get statistics for a date
  const getDayStats = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayJobs = weekJobs.get(dateStr) || [];
    
    const totalResources = dayJobs.reduce((count, job) => {
      return count + getJobAssignments(job).length;
    }, 0);
    
    return {
      jobs: dayJobs.length,
      resources: totalResources
    };
  };
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compact Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-gray-800">
              Week: {formatMonthYear(weekDates[0])}
            </h3>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePreviousWeek}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              
              <button
                onClick={handleToday}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <Calendar size={12} />
                <span>Today</span>
              </button>
              
              <button
                onClick={handleNextWeek}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </div>
        </div>
      </div>
      
      {/* Compact Week Grid */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max">
          {weekDates.map((date, _index) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayJobs = weekJobs.get(dateStr) || [];
            const stats = getDayStats(date);
            
            return (
              <div
                key={dateStr}
                className={`flex-1 min-w-[200px] max-w-[240px] border-r border-gray-200 flex flex-col ${
                  isWeekend(date) ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                {/* Compact Day Header */}
                <div
                  className={`border-b border-gray-200 p-2 ${
                    isToday(date) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-800'}`}>
                        {formatDateCompact(date)}
                      </span>
                      {isToday(date) && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-100 px-1 rounded">TODAY</span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleAddJob(date)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Add job"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  {/* Compact Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Briefcase size={10} />
                        <span>{stats.jobs}</span>
                      </div>
                      {stats.resources > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users size={10} />
                          <span>{stats.resources}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Compact Jobs List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {isLoading ? (
                    <div className="text-center text-gray-500 py-2 text-xs">
                      Loading...
                    </div>
                  ) : dayJobs.length > 0 ? (
                    dayJobs
                      .sort((a, b) => {
                        const foremanA = getJobForeman(a);
                        const foremanB = getJobForeman(b);
                        
                        // Define foreman priority order
                        const getForemanPriority = (foreman: Resource | null, shift: 'day' | 'night') => {
                          const name = foreman?.name.toLowerCase() || '';
                          
                          if (shift === 'day') {
                            if (name.includes('francis')) return 1;
                            if (name.includes('soto')) return 2;
                            if (name.includes('mark')) return 3;
                            if (foreman) return 4; // other foreman day
                            return 5; // no foreman day
                          } else { // night
                            if (!foreman) return 6; // no foreman night
                            if (foreman && !['francis', 'soto', 'mark'].some(n => name.includes(n))) return 7; // other foreman night
                            if (name.includes('francis')) return 8; // francis night
                            if (name.includes('soto')) return 9; // soto night
                            if (name.includes('mark')) return 10; // mark night
                            return 11; // fallback
                          }
                        };
                        
                        const priorityA = getForemanPriority(foremanA, a.shift);
                        const priorityB = getForemanPriority(foremanB, b.shift);
                        
                        return priorityA - priorityB;
                      })
                      .map((job) => {
                      const jobAssignments = getJobAssignments(job);
                      const resourceSummary = getJobResourceSummary(job);
                      const foreman = getJobForeman(job);
                      
                      return (
                        <div
                          key={job.id}
                          className={`
                            p-2 rounded-md border text-xs transition-all hover:shadow-sm cursor-pointer
                            ${job.shift === 'night' 
                              ? job.finalized ? 'bg-red-50 border-red-300' : 'bg-red-100 border-red-400'
                              : job.finalized ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                            }
                          `}
                        >
                          {/* Job Title Row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs">{getJobTypeIcon(job.type)}</span>
                              <span className="font-medium text-gray-800 truncate">
                                {job.name}
                              </span>
                            </div>
                            <div className={`
                              px-1 py-0.5 rounded text-xs font-medium
                              ${job.shift === 'day' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}
                            `}>
                              {job.shift.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          
                          {/* Job Number */}
                          {job.number && (
                            <div className="text-xs text-gray-500 mb-1">
                              #{job.number}
                            </div>
                          )}
                          
                          {/* Foreman Indicator */}
                          {foreman && (
                            <div className="text-xs text-orange-600 mb-1 flex items-center space-x-1 font-medium">
                              <span>📋</span>
                              <span>{foreman.name.split(' ')[0]}</span>
                            </div>
                          )}
                          
                          {/* Resources Summary */}
                          {resourceSummary && (
                            <div className="text-xs text-gray-600 mb-1 flex items-center space-x-1">
                              <Users size={10} />
                              <span className="truncate">{resourceSummary}</span>
                            </div>
                          )}
                          
                          {/* Job Time */}
                          {job.startTime && (
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <Clock size={10} />
                              <span>{job.startTime}</span>
                            </div>
                          )}
                          
                          {/* Status Indicators */}
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center space-x-1">
                              {job.finalized && (
                                <span className="text-xs text-green-600 font-medium">✓ Final</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {jobAssignments.length} assigned
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      <div className="mb-1 text-xs">No jobs</div>
                      <button
                        onClick={() => handleAddJob(date)}
                        className="text-blue-600 hover:text-blue-700 text-xs flex items-center justify-center space-x-1 mx-auto"
                      >
                        <Plus size={12} />
                        <span>Add</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Add Job Modal */}
      {showAddJobModal && selectedDate && (
        <AddJobModal
          onClose={() => {
            setShowAddJobModal(false);
            setSelectedDate(null);
          }}
          onAdd={async (jobData) => {
            const jobWithDate = {
              ...jobData,
              schedule_date: selectedDate.toISOString().split('T')[0]
            };
            await addJob(jobWithDate);
            setShowAddJobModal(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
};

export default WeekViewCompact;