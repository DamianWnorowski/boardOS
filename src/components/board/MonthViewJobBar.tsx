import React from 'react';
import { Clock, Users, Calendar } from 'lucide-react';
import { Job } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface MonthViewJobBarProps {
  job: Job & {
    _spanStart?: Date;
    _spanEnd?: Date;
    _isStartDay?: boolean;
    _isEndDay?: boolean;
    _totalSpanDays?: number;
  };
  date: Date;
  onClick?: () => void;
}

const MonthViewJobBar: React.FC<MonthViewJobBarProps> = ({ 
  job, 
  date,
  onClick 
}) => {
  const { assignments, resources } = useScheduler();
  
  // Get job assignments and foreman
  const jobAssignments = assignments.filter(a => a.jobId === job.id);
  const foreman = jobAssignments
    .map(a => resources.find(r => r.id === a.resourceId))
    .find(r => r?.type === 'foreman');

  // Get job type styling
  const getJobTypeColor = () => {
    switch (job.type) {
      case 'milling': 
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'paving': 
        return 'bg-green-100 border-green-300 text-green-800';
      case 'both': 
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'drainage': 
        return 'bg-cyan-100 border-cyan-300 text-cyan-800';
      case 'stripping':
        return 'bg-amber-100 border-amber-300 text-amber-800';
      default: 
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Get phase for current date
  const getCurrentPhase = () => {
    if (!job._spanStart || !job._spanEnd) return null;
    
    const totalDays = job._totalSpanDays || 1;
    const currentDayIndex = Math.floor((date.getTime() - job._spanStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (job.type === 'both' && job.estimated_duration) {
      const millingDays = job.estimated_duration.milling_days || 0;
      if (currentDayIndex < millingDays) {
        return 'Mill';
      } else {
        return 'Pave';
      }
    }
    
    if (job.type === 'drainage' && job.phases && job.phases.length > 0) {
      // Find which phase this date falls into
      for (const phase of job.phases) {
        const phaseStart = new Date(phase.estimated_start);
        const phaseEnd = new Date(phase.estimated_end);
        if (date >= phaseStart && date <= phaseEnd) {
          switch (phase.phase_type) {
            case 'excavation': return 'Excavation';
            case 'drainage': return 'Drainage';
            case 'concrete': return 'Concrete';
            default: return phase.phase_type;
          }
        }
      }
    }
    
    return null;
  };

  const getJobTypeIcon = () => {
    const phase = getCurrentPhase();
    if (phase) return '';
    
    switch (job.type) {
      case 'milling': return '';
      case 'paving': return '';
      case 'both': return '';
      case 'drainage': return '';
      case 'stripping': return '';
      default: return '';
    }
  };

  // Determine if this is a multi-day continuation
  const isMultiDayJob = job._totalSpanDays && job._totalSpanDays > 1;
  const isStartDay = job._isStartDay;
  const isEndDay = job._isEndDay;
  const phase = getCurrentPhase();

  return (
    <div
      onClick={onClick}
      className={`
        relative px-2 py-1 rounded text-xs border cursor-pointer
        hover:shadow-sm transition-all
        ${getJobTypeColor()}
        ${job.shift === 'night' ? 'border-l-4 border-l-red-500' : ''}
        ${job.finalized ? 'ring-1 ring-green-400' : ''}
      `}
      title={`${job.name} ${job.number ? `#${job.number}` : ''}${foreman ? ` - ${foreman.name}` : ''}${job.startTime ? ` - ${job.startTime}` : ''}`}
    >
      {/* Multi-day job indicator */}
      {isMultiDayJob && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-current opacity-60" />
      )}
      
      <div className="flex items-center justify-between space-x-1">
        {/* Job info */}
        <div className="flex items-center space-x-1 min-w-0 flex-1">
          <span className="text-xs">{getJobTypeIcon()}</span>
          <span className="font-medium truncate">
            {isStartDay || !isMultiDayJob ? job.name : ''}
          </span>
          {phase && (
            <span className="text-xs opacity-75">
              {phase}
            </span>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Night shift indicator */}
          {job.shift === 'night' && (
            <span className="text-xs">🌙</span>
          )}
          
          {/* Foreman indicator */}
          {foreman && isStartDay && (
            <div className="flex items-center space-x-0.5">
              <span className="text-xs">👨‍💼</span>
              <span className="text-xs font-medium truncate max-w-12">
                {foreman.name.split(' ')[0]}
              </span>
            </div>
          )}

          {/* Time indicator */}
          {job.startTime && isStartDay && (
            <div className="flex items-center">
              <Clock size={8} />
              <span className="text-xs ml-0.5">{job.startTime}</span>
            </div>
          )}

          {/* Resource count */}
          {jobAssignments.length > 0 && isStartDay && (
            <div className="flex items-center">
              <Users size={8} />
              <span className="text-xs ml-0.5">{jobAssignments.length}</span>
            </div>
          )}

          {/* Duration indicator for multi-day jobs */}
          {isMultiDayJob && isStartDay && (
            <div className="flex items-center">
              <Calendar size={8} />
              <span className="text-xs ml-0.5">{job._totalSpanDays}d</span>
            </div>
          )}

          {/* Finalized indicator */}
          {job.finalized && isStartDay && (
            <span className="text-green-600 text-xs">✓</span>
          )}
        </div>
      </div>

      {/* Progress indicator for in-progress jobs */}
      {job.actual_start && isMultiDayJob && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 opacity-60">
          {/* Could add actual progress calculation here */}
        </div>
      )}
    </div>
  );
};

export default MonthViewJobBar;