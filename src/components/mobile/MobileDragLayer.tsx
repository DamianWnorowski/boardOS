import React from 'react';
import { useDragLayer } from 'react-dnd';
import { getDragLayerStyles } from '../../utils/dndBackend';
import { useDragContext } from '../../context/DragContext';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from '../resources/ResourceCard';
import { ItemTypes } from '../../types';
import { useMobile } from '../../context/MobileContext';
import logger from '../../utils/logger';

const MobileDragLayer: React.FC = () => {
  const { isMobile, touchEnabled } = useMobile();
  const { dragState, hoveredJobId } = useDragContext();
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

  // Debug logging for rendering
  logger.debug('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Only show on mobile/touch devices
  if (!isDragging) {
    logger.debug('🎨 MobileDragLayer not rendering - not dragging');
    return null;
  }

  // Get drag feedback info
  const getDragFeedbackInfo = () => {
    logger.debug('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    if (!item) {
      logger.debug('🎨 MobileDragLayer → Blue: No item');
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    }

    // Handle both resource and assignment drag types
    const resource = item.resource || (item.type === ItemTypes.ASSIGNMENT ? getResourceById(item.assignments?.[0]?.resourceId) : null);
    logger.debug('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    if (!resource) {
      logger.debug('🎨 MobileDragLayer → Blue: No resource found');
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    }

    // Check current assignments for this resource
    const resourceAssignments = assignments.filter(a => a.resourceId === resource.id);
    logger.debug('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    logger.debug('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    
    const assignedJobs = resourceAssignments.map(a => getJobById(a.jobId)).filter(Boolean);
    logger.debug('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    
    const hasDayJob = assignedJobs.some(job => job.shift === 'day');
    const hasNightJob = assignedJobs.some(job => job.shift === 'night');
    const isCurrentlyWorkingDouble = hasDayJob && hasNightJob;
    
    // Get the job being hovered over
    const hoveredJob = hoveredJobId ? getJobById(hoveredJobId) : null;
    logger.debug('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    

    // If Ctrl is held, this will be a second assignment
    if (item.isSecondShift === true) {
      // Use hovered job to determine the actual target shift
      if (hoveredJob) {
        if (isCurrentlyWorkingDouble) {
          // Already working double, adding a third job
          return { 
            message: 'Adding 3rd job', 
            color: 'text-red-600', 
            icon: '🔥' 
          };
        } else if (hasDayJob && hoveredJob.shift === 'night') {
          // Has day job, hovering over night job → creating double shift
          return { 
            message: 'Creating double shift', 
            color: 'text-orange-600', 
            icon: '☀️🌙' 
          };
        } else if (hasNightJob && hoveredJob.shift === 'day') {
          // Has night job, hovering over day job → creating double shift
          return { 
            message: 'Creating double shift', 
            color: 'text-orange-600', 
            icon: '🌙☀️' 
          };
        } else if (hasDayJob && hoveredJob.shift === 'day') {
          // Has day job, hovering over another day job → 2nd day location
          return { 
            message: '2nd day shift location', 
            color: 'text-teal-600', 
            icon: '☀️➕' 
          };
        } else if (hasNightJob && hoveredJob.shift === 'night') {
          // Has night job, hovering over another night job → 2nd night location
          return { 
            message: '2nd night shift location', 
            color: 'text-teal-600', 
            icon: '🌙➕' 
          };
        } else {
          // No current jobs, first assignment
          return {
            message: 'Drag to assign', 
            color: 'text-blue-600', 
            icon: '📋' 
          };
        }
      } else {
        // No hover target, use generic logic
      logger.debug('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      
      if (isCurrentlyWorkingDouble) {
        // Already working double, adding a third job
        logger.debug('🎨 MobileDragLayer → Red: Adding 3rd job');
        return { 
          message: 'Adding 3rd job', 
          color: 'text-red-600', 
          icon: '🔥' 
        };
      } else if (hasNightJob && !hasDayJob) {
        // Has only night job, Ctrl+dragging will create double shift (orange)
        logger.debug('🎨 MobileDragLayer → Orange: Has night job, creating double shift');
        return {
          message: 'Creating double shift', 
          color: 'text-orange-600', 
          icon: '🌙☀️'
        };
      } else if (hasDayJob && !hasNightJob) {
        // Has only day job, Ctrl+dragging will create double shift (orange)
        logger.debug('🎨 MobileDragLayer → Orange: Has day job, creating double shift');
        return {
          message: 'Creating double shift', 
          color: 'text-orange-600', 
          icon: '☀️🌙'
        };
      } else {
        // No current jobs, Ctrl+dragging for first assignment
        logger.debug('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        return {
          message: 'Drag to assign', 
          color: 'text-blue-600', 
          icon: '📋' 
        };
      }
      }
    }

    // Normal drag (not Ctrl+drag)
    logger.debug('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    if (resourceAssignments.length === 0) {
      // First assignment
      logger.debug('🎨 MobileDragLayer → Blue: First assignment');
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    } else if (isCurrentlyWorkingDouble) {
      // Already working double, moving assignment
      logger.debug('🎨 MobileDragLayer → Purple: Moving double shift');
      return { message: 'Moving double shift', color: 'text-purple-600', icon: '🔄' };
    } else {
      // Has one job, moving assignment
      logger.debug('🎨 MobileDragLayer → Blue: Moving assignment');
      return { message: 'Moving assignment', color: 'text-blue-600', icon: '🔄' };
    }
  };

  const renderItem = () => {
    logger.debug('🎨 MobileDragLayer renderItem called with itemType:', itemType);
    if (!item) return null;

    const feedbackInfo = getDragFeedbackInfo();
   const borderColorClass = feedbackInfo.color.includes('red') ? 'border-red-400' :
     feedbackInfo.color.includes('orange') ? 'border-orange-400' :
     feedbackInfo.color.includes('purple') ? 'border-purple-400' :
     feedbackInfo.color.includes('teal') ? 'border-teal-400' : 'border-blue-400';
      
    logger.debug('🎨 MobileDragLayer feedbackInfo:', feedbackInfo);

    switch (itemType) {
      case ItemTypes.RESOURCE:
        return (
          <div className={`transform scale-110 shadow-2xl border-4 rounded-lg bg-white p-2 ${borderColorClass}`}>
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
          <div className={`transform scale-110 shadow-2xl border-4 rounded-lg bg-white p-2 ${borderColorClass}`}>
            <ResourceCard 
              resource={item.resource} 
              isDragging={true}
              isCompact={false}
            />
            <div className={`text-xs text-center mt-2 font-medium flex items-center justify-center space-x-1 ${feedbackInfo.color}`}>
              <span className="text-base">{feedbackInfo.icon}</span>
              <span>{feedbackInfo.message}</span>
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