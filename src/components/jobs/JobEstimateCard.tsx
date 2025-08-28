import React from 'react';
import { MapPin, Clock, Calendar, Calculator, ArrowRight } from 'lucide-react';
import { Job } from '../../types';
import { DurationEstimationService } from '../../services/DurationEstimationService';

interface JobEstimateCardProps {
  job: Job;
  showScheduleButton?: boolean;
  showProgressIndicator?: boolean;
  onSchedule?: (job: Job) => void;
  onClick?: (job: Job) => void;
}

const JobEstimateCard: React.FC<JobEstimateCardProps> = ({ 
  job, 
  showScheduleButton,
  showProgressIndicator,
  onSchedule,
  onClick 
}) => {
  const estimate = DurationEstimationService.calculateJobDuration(job);

  const getJobTypeColor = () => {
    switch (job.type) {
      case 'milling': return 'border-blue-200 bg-blue-50';
      case 'paving': return 'border-green-200 bg-green-50';
      case 'both': return 'border-purple-200 bg-purple-50';
      case 'drainage': return 'border-cyan-200 bg-cyan-50';
      case 'stripping': return 'border-amber-200 bg-amber-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getJobTypeIcon = () => {
    switch (job.type) {
      case 'milling': return '⚒️';
      case 'paving': return '🛣️';
      case 'both': return '🔄';
      case 'drainage': return '💧';
      case 'stripping': return '🌱';
      default: return '🚧';
    }
  };

  const formatDuration = () => {
    const parts: string[] = [];
    if (estimate.milling_days) parts.push(`${estimate.milling_days}d mill`);
    if (estimate.paving_days) parts.push(`${estimate.paving_days}d pave`);
    if (estimate.excavation_days) parts.push(`${estimate.excavation_days}d excavation`);
    if (estimate.drainage_days) parts.push(`${estimate.drainage_days}d drainage`);
    if (estimate.concrete_days) parts.push(`${estimate.concrete_days}d concrete`);
    
    if (parts.length === 0) return `${estimate.total_days}d total`;
    if (parts.length === 1) return parts[0];
    return parts.join(', ');
  };

  const getQuantityDisplay = () => {
    const items: string[] = [];
    if (job.estimated_sqyards) {
      items.push(`${job.estimated_sqyards.toLocaleString()} sq yd`);
    }
    if (job.estimated_tons) {
      items.push(`${job.estimated_tons.toLocaleString()} tons`);
    }
    if (job.estimated_cubic_yards) {
      items.push(`${job.estimated_cubic_yards.toLocaleString()} cu yd`);
    }
    if (job.estimated_linear_feet) {
      items.push(`${job.estimated_linear_feet.toLocaleString()} lin ft`);
    }
    return items.join(', ');
  };

  const getProgressInfo = () => {
    if (!showProgressIndicator || !job.actual_start) return null;
    
    const startDate = new Date(job.actual_start);
    const today = new Date();
    const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalEstimatedDays = estimate.total_days;
    const progressPercentage = Math.min((daysElapsed / totalEstimatedDays) * 100, 100);
    
    return {
      daysElapsed,
      totalEstimatedDays,
      progressPercentage,
      isOverdue: daysElapsed > totalEstimatedDays
    };
  };

  const progressInfo = getProgressInfo();

  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md
        ${getJobTypeColor()}
        ${job.finalized ? 'ring-1 ring-green-400' : ''}
      `}
      onClick={() => onClick?.(job)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">{getJobTypeIcon()}</span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {job.name}
            </h4>
            {job.number && (
              <p className="text-xs text-gray-500">#{job.number}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {job.shift === 'night' && (
            <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">
              🌙 Night
            </span>
          )}
          {job.finalized && (
            <span className="text-green-600 text-xs">✓</span>
          )}
        </div>
      </div>

      {/* Duration Estimate */}
      <div className="mb-2">
        <div className="flex items-center text-sm text-gray-700">
          <Clock size={12} className="mr-1" />
          <span className="font-medium">{formatDuration()}</span>
        </div>
        {progressInfo && (
          <div className="mt-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={progressInfo.isOverdue ? 'text-red-600' : 'text-gray-600'}>
                Day {progressInfo.daysElapsed} of {progressInfo.totalEstimatedDays}
              </span>
              <span className={progressInfo.isOverdue ? 'text-red-600' : 'text-gray-600'}>
                {Math.round(progressInfo.progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  progressInfo.isOverdue ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(progressInfo.progressPercentage, 100)}%` }}
              />
            </div>
            {progressInfo.isOverdue && (
              <div className="text-xs text-red-600 mt-1">
                {progressInfo.daysElapsed - progressInfo.totalEstimatedDays} days over estimate
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quantities */}
      {getQuantityDisplay() && (
        <div className="mb-2">
          <div className="flex items-center text-xs text-gray-600">
            <Calculator size={10} className="mr-1" />
            <span>{getQuantityDisplay()}</span>
          </div>
        </div>
      )}

      {/* Location */}
      {job.location && (
        <div className="mb-2">
          <div className="flex items-center text-xs text-gray-600">
            <MapPin size={10} className="mr-1" />
            <span className="truncate">{job.location.address}</span>
          </div>
        </div>
      )}

      {/* Scheduled Date */}
      {job.schedule_date && (
        <div className="mb-2">
          <div className="flex items-center text-xs text-gray-600">
            <Calendar size={10} className="mr-1" />
            <span>
              {new Date(job.schedule_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
              {job.end_date && job.end_date !== job.schedule_date && (
                <>
                  {' - '}
                  {new Date(job.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Job Category */}
      {job.job_category && (
        <div className="mb-2">
          <span className="inline-block text-xs bg-white/70 text-gray-700 px-2 py-0.5 rounded-full border">
            {job.job_category.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Schedule Button */}
      {showScheduleButton && (
        <div className="mt-3 pt-2 border-t border-white/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSchedule?.(job);
            }}
            className="w-full flex items-center justify-center text-xs bg-white/70 hover:bg-white text-gray-700 py-2 rounded border hover:shadow-sm transition-all"
          >
            <Calendar size={12} className="mr-1" />
            <span>Schedule Job</span>
            <ArrowRight size={10} className="ml-1" />
          </button>
        </div>
      )}

      {/* Complexity Indicator */}
      {job.complexity_factor && job.complexity_factor !== 1.0 && (
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-1 py-0.5 rounded ${
            job.complexity_factor > 1 
              ? 'bg-red-100 text-red-600' 
              : 'bg-green-100 text-green-600'
          }`}>
            {job.complexity_factor > 1 ? 'Complex' : 'Simple'}
          </span>
        </div>
      )}
    </div>
  );
};

export default JobEstimateCard;