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

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Debug logging for rendering
  console.log('🎨 MobileDragLayer render check:', {
    isDragging,
    itemType,
    hasItem: !!item,
    isSecondShift: item?.isSecondShift,
    currentOffset: !!currentOffset
  });

  // Only show on mobile/touch devices
  if (!isDragging) {
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    console.log('🎨 MobileDragLayer not rendering - not dragging');
    return null;
  }

  // Get drag feedback info
  const getDragFeedbackInfo = () => {
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    console.log('🎨 MobileDragLayer getDragFeedbackInfo called with item:', {
      itemType: item?.type,
      resourceName: item?.resource?.name,
      isSecondShift: item?.isSecondShift
    });
    
    if (!item) {
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      console.log('🎨 MobileDragLayer → Blue: No item');
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    }

    // Handle both resource and assignment drag types
    const resource = item.resource || (item.type === ItemTypes.ASSIGNMENT ? getResourceById(item.assignments?.[0]?.resourceId) : null);
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    console.log('🎨 MobileDragLayer Resource:', resource?.name, 'type:', resource?.type);
    
    if (!resource) {
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      console.log('🎨 MobileDragLayer → Blue: No resource found');
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    }

    // Check current assignments for this resource
    const resourceAssignments = assignments.filter(a => a.resourceId === resource.id);
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    console.log('🎨 MobileDragLayer Resource assignments:', resourceAssignments.length);
    console.log('🎨 MobileDragLayer All resource assignments:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift,
      row: a.row
    })));
    console.log('🎨 MobileDragLayer Assignment details:', resourceAssignments.map(a => ({
      id: a.id,
      jobId: a.jobId,
      jobName: getJobById(a.jobId)?.name,
      shift: getJobById(a.jobId)?.shift
    })));
    
    const assignedJobs = resourceAssignments.map(a => getJobById(a.jobId)).filter(Boolean);
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    console.log('🎨 MobileDragLayer Assigned jobs:', assignedJobs.map(j => ({ name: j?.name, shift: j?.shift })));
    
    const hasDayJob = assignedJobs.some(job => job.shift === 'day');
    const hasNightJob = assignedJobs.some(job => job.shift === 'night');
    const isCurrentlyWorkingDouble = hasDayJob && hasNightJob;
    
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    console.log('🎨 MobileDragLayer Job status:', { 
      hasDayJob, 
      hasNightJob, 
      isCurrentlyWorkingDouble, 
      isSecondShift: item.isSecondShift,
      ctrlDetected: item.isSecondShift === true
    });
    

    // If Ctrl is held, this will be a second assignment
    if (item.isSecondShift === true) {
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      console.log('🎨 MobileDragLayer Ctrl+drag detected, determining color...');
      
      if (isCurrentlyWorkingDouble) {
        // Already working double, adding a third job
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        console.log('🎨 MobileDragLayer → Red: Adding 3rd job');
        return { 
          message: 'Adding 3rd job', 
          color: 'text-red-600', 
          icon: '🔥' 
        };
      } else if (hasNightJob) {
        // Has night job, Ctrl+dragging will add day job → night ↔ day (orange)
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        console.log('🎨 MobileDragLayer → Orange: Has night job, adding day job');
        return { 
          message: 'Creating double shift', 
          color: 'text-orange-600', 
          icon: '🌙' 
        };
      } else if (hasDayJob) {
        // Has day job, Ctrl+dragging will add another day job → day ↔ day (teal)
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        console.log('🎨 MobileDragLayer → Teal: Has day job, adding another day job');
        return { 
          message: 'Adding 2nd day job', 
          color: 'text-teal-600', 
          icon: '☀️' 
        };
      } else {
        // No current jobs, Ctrl+dragging assumes day ↔ day (teal)
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        console.log('🎨 MobileDragLayer → Teal: No jobs, assuming day ↔ day');
        return {
          message: 'Adding 2nd day job', 
          color: 'text-teal-600', 
          icon: '☀️' 
        };
      }
    }

    // Normal drag (not Ctrl+drag)
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    console.log('🎨 MobileDragLayer Normal drag (no Ctrl), isSecondShift:', item.isSecondShift);
    if (resourceAssignments.length === 0) {
      // First assignment
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      console.log('🎨 MobileDragLayer → Blue: First assignment');
      return { message: 'Drag to assign', color: 'text-blue-600', icon: '📋' };
    } else if (isCurrentlyWorkingDouble) {
      // Already working double, moving assignment
      console.log('🎨 MobileDragLayer → Purple: Moving double shift');
      console.log('🎨 MobileDragLayer → Purple: Moving double shift');
      return { message: 'Moving double shift', color: 'text-purple-600', icon: '🔄' };
    } else {
      // Has one job, moving assignment
      console.log('🎨 MobileDragLayer → Blue: Moving assignment');
      console.log('🎨 MobileDragLayer → Blue: Moving assignment');
      return { message: 'Moving assignment', color: 'text-blue-600', icon: '🔄' };
    }
  };

  const renderItem = () => {
    console.log('🎨 MobileDragLayer renderItem called with itemType:', itemType);
    console.log('🎨 MobileDragLayer renderItem called with itemType:', itemType);
    if (!item) return null;

    const feedbackInfo = getDragFeedbackInfo();
    console.log('🎨 MobileDragLayer feedbackInfo:', feedbackInfo);
    console.log('🎨 MobileDragLayer color check:', {
      color: feedbackInfo.color,
      includesRed: feedbackInfo.color.includes('red'),
      includesOrange: feedbackInfo.color.includes('orange'),
      includesTeal: feedbackInfo.color.includes('teal')
    });
    console.log('🎨 MobileDragLayer feedbackInfo:', feedbackInfo);
    console.log('🎨 MobileDragLayer color check:', {
      color: feedbackInfo.color,
      includesRed: feedbackInfo.color.includes('red'),
      includesOrange: feedbackInfo.color.includes('orange'),
      includesTeal: feedbackInfo.color.includes('teal')
    });

    switch (itemType) {
      case ItemTypes.RESOURCE:
        return (
          <div className={`transform scale-110 shadow-2xl border-4 rounded-lg bg-white p-2 ${
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