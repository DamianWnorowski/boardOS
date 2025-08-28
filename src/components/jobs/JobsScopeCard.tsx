import React from 'react';
import { MapPin, Clock, Users, Calendar } from 'lucide-react';
import { Job } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface JobsScopeCardProps {
  job: Job;
  onEdit: () => void;
  onClick?: () => void;
}

const JobsScopeCard: React.FC<JobsScopeCardProps> = ({ 
  job, 
  onEdit,
  onClick 
}) => {
  const { assignments, resources } = useScheduler();
  
  const jobAssignments = assignments.filter(a => a.jobId === job.id);
  const assignedResources = jobAssignments.map(a => 
    resources.find(r => r.id === a.resourceId)
  ).filter(Boolean);
  
  const foreman = assignedResources.find(r => r?.type === 'foreman');
  
  const getJobTypeIcon = () => {
    switch (job.type) {
      case 'milling': return '⚒️';
      case 'paving': return '🛣️';
      case 'drainage': return '💧';
      case 'stripping': return '🌱';
      case 'both': return '🔄';
      default: return '🚧';
    }
  };

  const getJobTypeColor = () => {
    switch (job.type) {
      case 'milling': return 'bg-blue-50 border-blue-200';
      case 'paving': return 'bg-green-50 border-green-200';
      case 'drainage': return 'bg-cyan-50 border-cyan-200';
      case 'stripping': return 'bg-amber-50 border-amber-200';
      case 'both': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getJobTypeColor()}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getJobTypeIcon()}</span>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
              {job.name}
            </h4>
            {job.number && (
              <p className="text-xs text-gray-500">#{job.number}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {job.shift === 'night' && (
            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
              🌙 Night
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-gray-600 text-xs px-1"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Key Info */}
      <div className="space-y-1 mb-2">
        {job.location && (
          <div className="flex items-center text-xs text-gray-600">
            <MapPin size={10} className="mr-1 flex-shrink-0" />
            <span className="truncate">{job.location.address}</span>
          </div>
        )}
        
        {job.schedule_date && (
          <div className="flex items-center text-xs text-gray-600">
            <Calendar size={10} className="mr-1 flex-shrink-0" />
            <span>{new Date(job.schedule_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}</span>
          </div>
        )}

        {job.startTime && (
          <div className="flex items-center text-xs text-gray-600">
            <Clock size={10} className="mr-1 flex-shrink-0" />
            <span>{job.startTime}</span>
          </div>
        )}
      </div>

      {/* Foreman */}
      {foreman && (
        <div className="mb-2">
          <div className="flex items-center text-xs font-medium text-orange-700">
            <span className="mr-1">📋</span>
            <span>{foreman.name.split(' ')[0]}</span>
          </div>
        </div>
      )}

      {/* Resource Summary */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center text-gray-600">
          <Users size={10} className="mr-1" />
          <span>{jobAssignments.length} assigned</span>
        </div>
        
        {job.finalized && (
          <span className="text-green-600 font-medium">✓ Final</span>
        )}
      </div>

      {/* Plants for paving jobs */}
      {(job.type === 'paving' || job.type === 'both') && job.plants && job.plants.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex flex-wrap gap-1">
            {job.plants.slice(0, 2).map(plant => (
              <span 
                key={plant}
                className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {plant}
              </span>
            ))}
            {job.plants.length > 2 && (
              <span className="text-xs text-gray-500">+{job.plants.length - 2}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsScopeCard;