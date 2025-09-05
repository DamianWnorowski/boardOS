import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Copy } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { DatabaseService } from '../../services/DatabaseService';
import { Job } from '../../types';
import JobColumn from './JobColumn';
import AddJobModal from '../modals/AddJobModal';
// import { DndProvider } from 'react-dnd'; // Not currently used but may be needed for future drag-and-drop functionality
// import { HTML5Backend } from 'react-dnd-html5-backend';

interface WeekViewProps {
  startDate: Date;
  onDateChange: (date: Date) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ startDate, onDateChange }) => {
  const { jobs, assignments, addJob } = useScheduler();
  // const { resources } = useScheduler(); // Not currently used but available for resource-related functionality
  const [weekJobs, setWeekJobs] = useState<Map<string, Job[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  
  // Calculate week dates
  const getWeekDates = (start: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };
  
  const weekDates = getWeekDates(startDate);
  
  // Load jobs for the week
  useEffect(() => {
    const loadWeekJobs = async () => {
      setIsLoading(true);
      try {
        const jobsByDate = new Map<string, Job[]>();
        
        // Group jobs by their schedule_date
        for (const date of weekDates) {
          const dateStr = date.toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          
          // Filter jobs by schedule_date
          const dateJobs = jobs.filter(job => {
            // If job has no schedule_date, it defaults to today
            const jobDate = job.schedule_date || today;
            return jobDate === dateStr;
          });
          
          jobsByDate.set(dateStr, dateJobs);
        }
        
        setWeekJobs(jobsByDate);
      } catch (error) {
        console.error('Error loading week jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWeekJobs();
  }, [startDate, jobs, assignments]); // Also reload when assignments change
  
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
  const formatDate = (date: Date): string => {
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
  
  // Handle adding job to specific date
  const handleAddJob = (date: Date) => {
    setSelectedDate(date);
    setShowAddJobModal(true);
  };
  
  // Handle copying jobs from one day to another
  const handleCopyDay = async (sourceDate: Date, targetDate: Date) => {
    const sourceDateStr = sourceDate.toISOString().split('T')[0];
    const sourceJobs = weekJobs.get(sourceDateStr) || [];
    
    if (sourceJobs.length === 0) {
      alert('No jobs to copy from this day');
      return;
    }
    
    try {
      // Copy each job to the target date
      for (const job of sourceJobs) {
        await DatabaseService.copyJobToDate(job.id, targetDate);
      }
      
      // Reload week data
      window.location.reload(); // Simple reload for now
    } catch (error) {
      console.error('Error copying jobs:', error);
      alert('Failed to copy jobs. Please try again.');
    }
  };
  
  // Get job count for a date
  const getJobCount = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    return weekJobs.get(dateStr)?.length || 0;
  };
  
  // Get total resources assigned for a date
  const getResourceCount = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    const dayJobs = weekJobs.get(dateStr) || [];
    
    // Count unique resources assigned to jobs on this day
    const uniqueResources = new Set<string>();
    dayJobs.forEach(job => {
      assignments
        .filter(a => a.jobId === job.id)
        .forEach(a => uniqueResources.add(a.resourceId));
    });
    
    return uniqueResources.size;
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Week Navigation Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Week View - {formatMonthYear(weekDates[0])}
            </h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button
                onClick={handleToday}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <Calendar size={16} />
                <span>Today</span>
              </button>
              
              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Next week"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </div>
        </div>
      </div>
      
      {/* Week Days Grid */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max">
          {weekDates.map((date, _index) => {
            void _index; // Prevent unused variable warning
            const dateStr = date.toISOString().split('T')[0];
            const dayJobs = weekJobs.get(dateStr) || [];
            const jobCount = getJobCount(date);
            const resourceCount = getResourceCount(date);
            
            return (
              <div
                key={dateStr}
                className={`flex-1 min-w-[280px] border-r border-gray-200 flex flex-col ${
                  isWeekend(date) ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`border-b border-gray-200 p-3 ${
                    isToday(date) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className={`font-semibold ${isToday(date) ? 'text-blue-600' : 'text-gray-800'}`}>
                        {formatDate(date)}
                      </div>
                      {isToday(date) && (
                        <span className="text-xs text-blue-600 font-medium">TODAY</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAddJob(date)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Add job to this day"
                      >
                        <Plus size={16} />
                      </button>
                      
                      {jobCount > 0 && (
                        <button
                          onClick={() => {
                            const nextDay = new Date(date);
                            nextDay.setDate(nextDay.getDate() + 1);
                            if (nextDay <= weekDates[6]) {
                              handleCopyDay(date, nextDay);
                            }
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copy jobs to next day"
                        >
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Day Statistics */}
                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                    <span>{jobCount} jobs</span>
                    {resourceCount > 0 && (
                      <span>{resourceCount} resources</span>
                    )}
                  </div>
                </div>
                
                {/* Day Jobs */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {isLoading ? (
                    <div className="text-center text-gray-500 py-4">
                      Loading...
                    </div>
                  ) : dayJobs.length > 0 ? (
                    dayJobs.map((job) => (
                      <div key={job.id} className="transform scale-90 origin-top">
                        <JobColumn job={job} />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <div className="mb-2">No jobs scheduled</div>
                      <button
                        onClick={() => handleAddJob(date)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center space-x-1 mx-auto"
                      >
                        <Plus size={14} />
                        <span>Add job</span>
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
            // Add schedule_date to the job data
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

export default WeekView;