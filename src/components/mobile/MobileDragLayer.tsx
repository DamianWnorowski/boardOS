import React from 'react';
import { useDragLayer } from 'react-dnd';
import { getDragLayerStyles } from '../../utils/dndBackend';
import { useDragContext } from '../../context/DragContext';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from '../resources/ResourceCard';
import { ItemTypes } from '../../types';
import { useMobile } from '../../context/MobileContext';

const MobileDragLayer: React.FC = () => {
  const { isMobile, touchEnabled } = useMobile();
  const { dragState } = useDragContext();
  const { assignments, getJobById, getResourceById } = useScheduler();
  
  const {
    itemType,
    isDragging,
    item,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset(),
  }));

  // Only show on mobile/touch devices
  if (!touchEnabled && !isMobile) {
    return null;
  }

  // Get drag feedback info
  const getDragFeedbackInfo = () => {
    if (!item || item.type !== ItemTypes.RESOURCE) {
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    }

    const resource = item.resource;
    if (!resource) {
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    }

    // Check current assignments for this resource
    const resourceAssignments = assignments.filter(a => a.resourceId === resource.id);
    const assignedJobs = resourceAssignments.map(a => getJobById(a.jobId)).filter(Boolean);
    
    const hasDayJob = assignedJobs.some(job => job.shift === 'day');
    const hasNightJob = assignedJobs.some(job => job.shift === 'night');
    const isCurrentlyWorkingDouble = hasDayJob && hasNightJob;

    // If Ctrl is held, this will be a second assignment
    if (dragState.isCtrlHeld || item.isSecondShift) {
      if (isCurrentlyWorkingDouble) {
        // Already working double, adding a third job
        return { 
          message: 'Adding 3rd job', 
          color: 'text-red-600', 
          icon: '🔥' 
        };
      } else if (hasDayJob) {
        // Day job to another job - use teal for day-to-day assignments
        return { 
          message: 'Adding 2nd day job', 
          color: 'text-teal-600', 
          icon: '☀️' 
        };
      } else if (hasNightJob) {
        // Has night job, adding another job
        return { 
          message: 'Creating double shift', 
          color: 'text-purple-600', 
          icon: '🌙' 
        };
      } else {
        // No current jobs, creating second assignment with Ctrl held
        return { 
          message: 'Adding 2nd job', 
          color: 'text-teal-600', 
          icon: '📋' 
        };
      }
    }

    // Normal drag (not Ctrl+drag)
    if (resourceAssignments.length === 0) {
      // First assignment
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    } else if (isCurrentlyWorkingDouble) {
      // Already working double, moving assignment
      return { message: 'Moving double shift', color: 'text-purple-600', icon: '🔄' };
    } else {
      // Has one job, moving assignment
      return { message: 'Moving assignment', color: 'text-blue-600', icon: '🔄' };
    }
  };

  const renderItem = () => {
    if (!item) return null;

    const feedbackInfo = getDragFeedbackInfo();

    switch (itemType) {
      case ItemTypes.RESOURCE:
        return (
          <div className={`transform scale-110 shadow-2xl border-2 rounded-lg bg-white p-2 ${
            feedbackInfo.color.includes('red') ? 'border-red-400' :
            feedbackInfo.color.includes('orange') ? 'border-orange-400' :
            feedbackInfo.color.includes('purple') ? 'border-purple-400' : 'border-blue-400'
          }`}>
            <ResourceCard 
              resource={item.resource} 
              isDragging={true}
              isCompact={false}
            />
            <div className={`text-xs text-center mt-2 font-medium ${feedbackInfo.color} flex items-center justify-center space-x-1`}>
              <span className="text-base">{feedbackInfo.icon}</span>
              <span>{feedbackInfo.message}</span>
            </div>
          </div>
        );
      case ItemTypes.ASSIGNMENT:
        return (
          <div className="transform scale-110 shadow-2xl border-2 border-green-400 rounded-lg bg-white p-2">
            <ResourceCard 
              resource={item.resource} 
              isDragging={true}
              isCompact={false}
            />
            <div className="text-xs text-center mt-2 text-green-600 font-medium flex items-center justify-center space-x-1">
              <span className="text-base">🔄</span>
              <span>Moving assignment</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isDragging) {
    return null;
  }

  return (
    <div style={getDragLayerStyles(isDragging, currentOffset)}>
      {renderItem()}
    </div>
  );
};

export default MobileDragLayer;