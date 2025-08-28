import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { Job } from '../../types';
import MonthViewJobBar from './MonthViewJobBar';
import AvailableJobsPanel from '../jobs/AvailableJobsPanel';
import AddJobModal from '../modals/AddJobModal';

interface MonthViewProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ selectedMonth, onMonthChange }) => {
  const { jobs, addJob } = useScheduler();
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAvailableJobs, setShowAvailableJobs] = useState(false);

  // Calculate calendar grid (6 weeks to show full month)
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Create 42 days (6 weeks) for consistent grid
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    
    return days;
  }, [selectedMonth]);

  // Group jobs by their date spans
  const jobsByDateSpan = useMemo(() => {
    const jobMap = new Map<string, Job[]>();
    
    jobs.forEach(job => {
      if (!job.schedule_date) return;
      
      const startDate = new Date(job.schedule_date);
      const endDate = job.end_date ? new Date(job.end_date) : startDate;
      
      // Check if job overlaps with current month view
      const monthStart = calendarDays[0];
      const monthEnd = calendarDays[41];
      
      if (endDate >= monthStart && startDate <= monthEnd) {
        // For multi-day jobs, add to each day in the span
        const currentDate = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
        const spanEndDate = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));
        
        while (currentDate <= spanEndDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          if (!jobMap.has(dateKey)) {
            jobMap.set(dateKey, []);
          }
          jobMap.get(dateKey)!.push({
            ...job,
            // Add metadata for rendering
            _spanStart: startDate,
            _spanEnd: endDate,
            _isStartDay: currentDate.toDateString() === startDate.toDateString(),
            _isEndDay: currentDate.toDateString() === endDate.toDateString(),
            _totalSpanDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          } as Job & {
            _spanStart: Date;
            _spanEnd: Date;
            _isStartDay: boolean;
            _isEndDay: boolean;
            _totalSpanDays: number;
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });
    
    return jobMap;
  }, [jobs, calendarDays]);

  // Navigation handlers
  const handlePreviousMonth = () => {
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onMonthChange(nextMonth);
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  const handleAddJob = (date?: Date) => {
    setSelectedDate(date || null);
    setShowAddJobModal(true);
  };

  // Helper functions
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === selectedMonth.getMonth();
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getDayJobs = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return jobsByDateSpan.get(dateKey) || [];
  };

  return (
    <div className="flex h-full bg-white">
      {/* Available Jobs Panel - Collapsible */}
      {showAvailableJobs && (
        <div className="w-80 border-r border-gray-200">
          <AvailableJobsPanel onClose={() => setShowAvailableJobs(false)} />
        </div>
      )}

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {formatMonthYear(selectedMonth)}
              </h2>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <button
                  onClick={handleToday}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Today
                </button>
                
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAvailableJobs(!showAvailableJobs)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  showAvailableJobs 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Available Jobs
              </button>
              
              <button
                onClick={() => handleAddJob()}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Plus size={16} className="mr-1" />
                Add Job
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-full">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7" style={{ minHeight: '600px' }}>
              {calendarDays.map((date, index) => {
                const dayJobs = getDayJobs(date);
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                const isWeekendDay = isWeekend(date);

                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-24 border-r border-b border-gray-200 last:border-r-0 ${
                      index >= 35 ? '' : ''
                    } ${
                      isCurrentMonthDay 
                        ? 'bg-white' 
                        : 'bg-gray-50'
                    } ${
                      isWeekendDay && isCurrentMonthDay
                        ? 'bg-blue-25'
                        : ''
                    }`}
                    style={{ minHeight: '100px' }}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between p-2">
                      <span
                        className={`text-sm font-medium ${
                          isTodayDate
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                            : isCurrentMonthDay
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      
                      {isCurrentMonthDay && (
                        <button
                          onClick={() => handleAddJob(date)}
                          className="opacity-0 hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                          title="Add job"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {/* Jobs for this day */}
                    <div className="px-2 pb-2 space-y-1">
                      {dayJobs.slice(0, 3).map((job) => (
                        <MonthViewJobBar
                          key={`${job.id}-${date.toISOString()}`}
                          job={job}
                          date={date}
                        />
                      ))}
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-gray-500 pl-2">
                          +{dayJobs.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Job Modal */}
      {showAddJobModal && (
        <AddJobModal
          onClose={() => {
            setShowAddJobModal(false);
            setSelectedDate(null);
          }}
          onAdd={async (jobData) => {
            const jobWithDate = {
              ...jobData,
              schedule_date: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
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

export default MonthView;