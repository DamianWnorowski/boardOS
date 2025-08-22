import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { Job } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import { useMobile } from '../../context/MobileContext';
import { useJobData } from '../../hooks/useOptimizedScheduler';

interface MobileJobCardProps {
  job: Job;
  onEdit: () => void;
  onAssignResources: () => void;
}

const MobileJobCard: React.FC<MobileJobCardProps> = ({ 
  job, 
  onEdit, 
  onAssignResources 
}) => {
  const { isMobile } = useMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const { assignments, resources } = useJobData(job.id);

  if (!isMobile) return null;

  const getJobTypeColor = () => {
    switch (job.type) {
      case 'milling': return 'text-blue-600 bg-blue-50';
      case 'paving': return 'text-green-600 bg-green-50';
      case 'both': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getJobTypeLabel = () => {
    switch (job.type) {
      case 'milling': return 'Milling';
      case 'paving': return 'Paving';
      case 'both': return 'Mill/Pave';
      case 'drainage': return 'Drainage';
      case 'stripping': return 'Stripping';
      case 'hired': return 'Hired';
      default: return 'Other';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-4">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {job.name}
            </h3>
            {job.number && (
              <p className="text-sm text-gray-500 mt-1">
                Job #{job.number}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor()}`}>
              {getJobTypeLabel()}
            </span>
            {job.shift === 'night' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                🌙 Night
              </span>
            )}
            {isExpanded ? 
              <ChevronUp size={20} className="text-gray-400" /> : 
              <ChevronDown size={20} className="text-gray-400" />
            }
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {job.location && (
              <div className="flex items-center">
                <MapPin size={16} className="mr-1" />
                <span className="truncate max-w-32">
                  {job.location.address.split(',')[0]}
                </span>
              </div>
            )}
            {job.startTime && (
              <div className="flex items-center">
                <Clock size={16} className="mr-1" />
                <span>{job.startTime}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {assignments.length} assigned
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-4">
            {/* Job Details */}
            {job.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                <p className="text-sm text-gray-600">{job.notes}</p>
              </div>
            )}

            {/* Plants Info for Paving Jobs */}
            {(job.type === 'paving' || job.type === 'both') && job.plants && job.plants.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Plants</h4>
                <div className="flex flex-wrap gap-2">
                  {job.plants.map(plant => (
                    <span 
                      key={plant}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {plant}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Resources Summary */}
            {assignments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Assigned Resources ({assignments.length})
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {resources.slice(0, 6).map(resource => (
                    <div 
                      key={resource.id}
                      className="flex items-center p-2 bg-gray-50 rounded"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {resource.name.replace(/\([^)]*\)\s*/g, '')}
                      </span>
                    </div>
                  ))}
                  {resources.length > 6 && (
                    <div className="flex items-center justify-center p-2 bg-gray-100 rounded text-gray-500">
                      +{resources.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignResources();
                }}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Manage Resources
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
              >
                Edit Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileJobCard;