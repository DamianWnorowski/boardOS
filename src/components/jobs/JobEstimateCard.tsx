import React from 'react';
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
      case 'milling': return 'bg-blue-100 border-blue-300';
      case 'paving': return 'bg-green-100 border-green-300';
      case 'both': return 'bg-purple-100 border-purple-300';
      case 'drainage': return 'bg-cyan-100 border-cyan-300';
      case 'stripping': return 'bg-amber-100 border-amber-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  // Build phase breakdown string showing all phases with durations
  const getPhaseBreakdown = () => {
    const phases = [];
    if (estimate.milling_days && estimate.milling_days > 0) {
      phases.push(`${estimate.milling_days} ${estimate.milling_days === 1 ? 'day' : 'days'} mill`);
    }
    if (estimate.paving_days && estimate.paving_days > 0) {
      phases.push(`${estimate.paving_days} ${estimate.paving_days === 1 ? 'day' : 'days'} pave`);
    }
    if (estimate.excavation_days && estimate.excavation_days > 0) {
      phases.push(`${estimate.excavation_days} ${estimate.excavation_days === 1 ? 'day' : 'days'} excav`);
    }
    if (estimate.drainage_days && estimate.drainage_days > 0) {
      phases.push(`${estimate.drainage_days} ${estimate.drainage_days === 1 ? 'day' : 'days'} drain`);
    }
    if (estimate.concrete_days && estimate.concrete_days > 0) {
      phases.push(`${estimate.concrete_days} ${estimate.concrete_days === 1 ? 'day' : 'days'} concrete`);
    }
    
    // Only show breakdown if there are multiple phases or if total doesn't match phases
    return phases.length > 1 ? phases.join(' • ') : null;
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow ${getJobTypeColor()}`}
      onClick={() => onClick?.(job)}
    >
      {/* Job Name */}
      <div className="text-base font-semibold text-gray-900 mb-2">
        {job.name}
      </div>
      
      {/* Job Info */}
      <div className="text-sm text-gray-600 space-y-1">
        {job.number && <div className="text-gray-500">#{job.number}</div>}
        <div className="font-bold text-gray-800">
          {estimate.total_days} {estimate.total_days === 1 ? 'day' : 'days'} total
        </div>
        {getPhaseBreakdown() && (
          <div className="text-xs text-gray-600">
            {getPhaseBreakdown()}
          </div>
        )}
        {job.shift === 'night' && <div className="text-red-600 font-bold">Night Shift</div>}
      </div>
    </div>
  );
};

export default JobEstimateCard;