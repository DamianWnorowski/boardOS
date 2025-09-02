import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { Assignment, ItemTypes, DragItem, ResourceType } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import { useMobile } from '../../context/MobileContext';
import { useDragContext } from '../../context/DragContext';
import { getMobileDragSourceOptions, getMobileDropTargetOptions } from '../../utils/dndBackend';
import ResourceCard from './ResourceCard';
import ScrewmanSelectorModal from '../modals/ScrewmanSelectorModal';
import OperatorSelectorModal from '../modals/OperatorSelectorModal';
import TimeSlotModal from '../modals/TimeSlotModal';
import PersonModal from '../modals/PersonModal';
import { Clock, AlertCircle, Edit2, StickyNote } from 'lucide-react';
import { logger } from '../../utils/logger';
import { safeLocalStorage } from '../../utils/localStorageUtils';

// Helper function to get consistent time indicator colors
const getTimeIndicatorColor = (resource: any, attachedAssignments: Assignment[] = [], getResourceById: any = null) => {
  // For vehicles (trucks/sweepers), check their onSite status
  if ((resource.type === 'truck' || resource.type === 'sweeper') && resource.onSite !== true) {
    return 'bg-blue-500 hover:bg-blue-600'; // Blue for offsite vehicles
  }
  
  // For personnel, compare both the person's AND any attached vehicle's onSite status
  if (resource.type !== 'truck' && resource.type !== 'sweeper' && getResourceById && attachedAssignments) {
    // Check if this person is attached to a vehicle
    const attachedVehicleAssignment = attachedAssignments.find(a => {
      const attachedResource = getResourceById(a.resourceId);
      return attachedResource && (attachedResource.type === 'truck' || attachedResource.type === 'sweeper');
    });
    
    if (attachedVehicleAssignment) {
      const attachedVehicle = getResourceById(attachedVehicleAssignment.resourceId);
      // Only check the vehicle's onSite status since personnel don't have onSite
      if (attachedVehicle.onSite !== true) {
        return 'bg-blue-500 hover:bg-blue-600'; // Blue because vehicle is offsite
      }
    }
    // Personnel not attached to vehicles always use green (job site time)
  }
  
  return 'bg-green-500 hover:bg-green-600'; // Green for onsite or personnel
};

interface AttachedResourcesGroupProps {
  assignment: Assignment;
  attachedAssignments: Assignment[];
  onDoubleClick: () => void;
  onOpenPersonModal?: (assignment: Assignment) => void;
}

const AttachedResourcesGroup: React.FC<AttachedResourcesGroupProps> = ({ 
  assignment, 
  attachedAssignments,
  onDoubleClick,
  onOpenPersonModal
}) => {
  const { getResourceById, getJobById, updateTimeSlot } = useScheduler();
  
  // Get job to get default start time
  const job = getJobById(assignment.jobId);
  const defaultStartTime = assignment.timeSlot?.startTime || job?.startTime || '07:00';
  
  const [customTime, setCustomTime] = useState<string>(defaultStartTime);
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  
  logger.debug('🎨 AttachedResourcesGroup rendering:', {
    mainResource: assignment.resourceId,
    attachedCount: attachedAssignments.length,
    attachedIds: attachedAssignments.map(a => a.id)
  });
  
  // Update custom time when assignment time slot changes
  useEffect(() => {
    const newTime = assignment.timeSlot?.startTime || job?.startTime || '07:00';
    setCustomTime(newTime);
  }, [assignment.timeSlot?.startTime, job?.startTime]);
  
  // Generate time options in 15-minute increments
  const timeOptions = [];
  for (let i = 0; i < 32; i++) { // 8:00 to 15:45 in 15-minute increments
    const totalMinutes = 8 * 60 + i * 15; // Start from 8:00 AM
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;
    timeOptions.push(timeString);
  }
  
  // Define equipment types
  const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                          'roller', 'dozer', 'payloader', 'equipment'];
  
  // Get all resources 
  const mainResource = getResourceById(assignment.resourceId)!;
  const allAssignments = [
    { assignment, resource: mainResource },
    ...attachedAssignments.map(a => ({ 
      assignment: a, 
      resource: getResourceById(a.resourceId)! 
    }))
  ];
  
  // For trucks, display all attachments horizontally
  if (mainResource.type === 'truck') {
    logger.debug('🚛 Rendering truck group with attachments:', attachedAssignments.length);
    return (
      <div 
        className="cursor-move group relative"
        onDoubleClick={onDoubleClick}
      >
        <div className="flex items-center space-x-0">
          {/* Main truck */}
          <ResourceCard
            resource={mainResource}
            isDragging={false}
            isMain={true}
            isAttached={false}
            isCompact={false}
            assignmentId={assignment.id}
            onPersonClick={() => onOpenPersonModal && onOpenPersonModal(assignment)}
          />
          
          {/* Attached drivers/laborers horizontally */}
          {attachedAssignments.map((attachedAssignment, index) => {
            const attachedResource = getResourceById(attachedAssignment.resourceId);
            return attachedResource ? (
              <div key={attachedAssignment.id} className="-ml-2">
                <ResourceCard
                  resource={attachedResource}
                  isDragging={false}
                  isMain={false}
                  isAttached={true}
                  isCompact={false}
                  assignmentId={attachedAssignment.id}
                  hasNote={!!attachedAssignment.note}
                  onPersonClick={() => onOpenPersonModal && onOpenPersonModal(attachedAssignment)}
                />
              </div>
            ) : null;
          })}
        </div>
        
        {/* Count indicator */}
        {/* Yard departure time indicator for truck with crew - positioned where count used to be */}
        {attachedAssignments.length > 0 && (
          <div 
            className={`absolute -top-2 -right-2 text-white text-xs px-2 py-0.5 rounded-full flex items-center justify-center shadow-sm z-30 cursor-pointer ${getTimeIndicatorColor(mainResource, attachedAssignments, getResourceById)}`}
            title={`${mainResource.onSite !== true ? 'Time out of yard' : 'Time on job'} - click to edit`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTime(true);
            }}
          >
            {isEditingTime ? (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                onBlur={() => {
                  setIsEditingTime(false);
                  // Update the assignment time slot
                  updateTimeSlot(assignment.id, {
                    startTime: customTime,
                    endTime: '15:30',
                    isFullDay: false
                  });
                  // Update attached assignments too
                  attachedAssignments.forEach(a => {
                    updateTimeSlot(a.id, {
                      startTime: customTime,
                      endTime: '15:30',
                      isFullDay: false
                    });
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTime(false);
                    updateTimeSlot(assignment.id, {
                      startTime: customTime,
                      endTime: '15:30',
                      isFullDay: false
                    });
                    attachedAssignments.forEach(a => {
                      updateTimeSlot(a.id, {
                        startTime: customTime,
                        endTime: '15:30',
                        isFullDay: false
                      });
                    });
                  }
                }}
                className="bg-transparent text-white text-[10px] font-medium border-none outline-none w-12 text-center"
                autoFocus
              />
            ) : (
              <span 
                className="text-[10px] font-medium"
              >
                {customTime}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // For laborers with attached trucks, display laborer on left, truck on right
  if (mainResource.type === 'laborer' && attachedAssignments.some(a => {
    const attachedResource = getResourceById(a.resourceId);
    return attachedResource?.type === 'truck';
  })) {
    return (
      <div 
        className="cursor-move group relative"
        onDoubleClick={onDoubleClick}
      >
        <div className="flex items-center space-x-0">
          {/* Main laborer on the left */}
          <ResourceCard
            resource={mainResource}
            isDragging={false}
            isMain={true}
            isAttached={false}
            isCompact={false}
            assignmentId={assignment.id}
            onPersonClick={() => onOpenPersonModal && onOpenPersonModal(assignment)}
            hasNote={!!assignment.note}
          />
          
          {/* Attached truck(s) on the right */}
          {attachedAssignments.map((attachedAssignment, index) => {
            const attachedResource = getResourceById(attachedAssignment.resourceId);
            return attachedResource ? (
              <div key={attachedAssignment.id} className="-ml-2">
                <ResourceCard
                  resource={attachedResource}
                  isDragging={false}
                  isMain={false}
                  isAttached={true}
                  isCompact={false}
                  assignmentId={attachedAssignment.id}
                  onPersonClick={() => onOpenPersonModal && onOpenPersonModal(attachedAssignment)}
                  hasNote={!!attachedAssignment.note}
                />
              </div>
            ) : null;
          })}
        </div>
        
        {/* Time indicator on the person (laborer) when using a truck */}
        {attachedAssignments.length > 0 && (
          <div 
            className={`absolute -top-2 -right-2 text-white text-xs px-2 py-0.5 rounded-full flex items-center justify-center shadow-sm z-30 cursor-pointer ${getTimeIndicatorColor(mainResource, attachedAssignments, getResourceById)}`}
            title={`${mainResource.onSite !== true ? 'time out of yard' : 'time on job'} (person will use truck) - click to edit`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTime(true);
            }}
          >
            {isEditingTime ? (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                onBlur={() => {
                  setIsEditingTime(false);
                  updateTimeSlot(assignment.id, {
                    startTime: customTime,
                    endTime: '15:30',
                    isFullDay: false
                  });
                  attachedAssignments.forEach(a => {
                    updateTimeSlot(a.id, {
                      startTime: customTime,
                      endTime: '15:30',
                      isFullDay: false
                    });
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTime(false);
                    updateTimeSlot(assignment.id, {
                      startTime: customTime,
                      endTime: '15:30',
                      isFullDay: false
                    });
                    attachedAssignments.forEach(a => {
                      updateTimeSlot(a.id, {
                        startTime: customTime,
                        endTime: '15:30',
                        isFullDay: false
                      });
                    });
                  }
                }}
                className="bg-transparent text-white text-[10px] font-medium border-none outline-none w-12 text-center"
                autoFocus
              />
            ) : (
              <span 
                className="text-[10px] font-medium"
              >
                {customTime}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // For other equipment, use the original vertical layout
  // Split resources into equipment and personnel
  const equipment = allAssignments.filter(item => 
    item.resource && equipmentTypes.includes(item.resource.type)
  );
  
  // Get personnel and sort by type (operators first, then laborers)
  const personnel = allAssignments
    .filter(item => item.resource && !equipmentTypes.includes(item.resource.type))
    .sort((a, b) => {
      // Operators should be on top
      if (a.resource.type === 'operator' && b.resource.type !== 'operator') return -1;
      if (a.resource.type !== 'operator' && b.resource.type === 'operator') return 1;
      return 0;
    });

  return (
    <div 
      className="cursor-move group relative"
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-start space-x-0">
        {/* Equipment first */}
        {equipment.map((item, index) => (
          <div 
            key={item.assignment.id}
            className={index > 0 ? "-ml-2" : ""}
          >
            <ResourceCard
              resource={item.resource}
              isDragging={false}
              isMain={index === 0}
              isAttached={index > 0}
              isCompact={false}
              assignmentId={item.assignment.id}
              onPersonClick={() => onOpenPersonModal && onOpenPersonModal(assignment)}
              hasNote={!!item.assignment.note}
            />
          </div>
        ))}
        
        {/* Personnel stacked vertically next to equipment */}
        {personnel.length > 0 && (
          <div className="flex flex-col gap-1 -ml-2 justify-start">
            {personnel.map((item, index) => (
              <div 
                key={item.assignment.id}
                className="relative"
              >
                <ResourceCard
                  resource={item.resource}
                  isDragging={false}
                  isMain={false}
                  isAttached={true}
                  isCompact={true}
                  assignmentId={item.assignment.id}
                  onPersonClick={() => onOpenPersonModal && onOpenPersonModal(item.assignment)}
                  hasNote={!!item.assignment.note}
                />
                
                {/* Individual time indicator for each personnel */}
                <div 
                  className={`absolute -top-2 -right-2 text-white text-xs px-2 py-0.5 rounded-full flex items-center justify-center shadow-sm z-30 cursor-pointer ${getTimeIndicatorColor(item.resource, [], getResourceById)}`}
                  title={`Click to edit time on job`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Edit this person's individual time
                    const currentTime = item.assignment.timeSlot?.startTime || job?.startTime || '07:00';
                    const newTime = prompt('Enter new start time (HH:MM):', currentTime);
                    if (newTime && newTime.match(/^\d{2}:\d{2}$/)) {
                      updateTimeSlot(item.assignment.id, {
                        startTime: newTime,
                        endTime: '15:30',
                        isFullDay: false
                      });
                    }
                  }}
                >
                  <span className="text-[10px] font-medium">
                    {item.assignment.timeSlot?.startTime || job?.startTime || '07:00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Time indicator */}
      <div 
        className={`absolute -top-2 -right-2 text-white text-xs px-2 py-0.5 rounded-full flex items-center justify-center shadow-sm z-30 cursor-pointer ${getTimeIndicatorColor(mainResource, attachedAssignments, getResourceById)}`}
        title={`Click to edit ${mainResource.type === 'truck' || mainResource.type === 'sweeper' ? mainResource.onSite !== true ? 'time out of yard' : 'time on job' : 'time on job'}`}
      >
        {isEditingTime ? (
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            onBlur={() => setIsEditingTime(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingTime(false);
              }
            }}
            className="bg-transparent text-white text-[10px] font-medium border-none outline-none w-12 text-center"
            autoFocus
          />
        ) : (
          <span 
            className="text-[10px] font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTime(true);
            }}
            title={`${mainResource.type === 'truck' || mainResource.type === 'sweeper' ? !mainResource.onSite ? 'Time out of yard' : 'Time on job' : 'Time on job'}`}
          >
            {customTime}
          </span>
        )}
      </div>
      
    </div>
  );
};

interface AssignmentCardProps {
  assignment: Assignment;
  onOpenPersonModal?: (assignment: Assignment) => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onOpenPersonModal }) => {
  const { 
    getResourceById,
    removeAssignment,
    assignResourceWithAttachment,
    getAttachedAssignments,
    attachResources,
    detachResources,
    resources,
    assignments,
    getResourcesByAssignment,
    getAssignmentById,
    hasMultipleJobAssignments,
    getResourceOtherAssignments,
    assignResource,
    updateTimeSlot,
    getJobById,
    isWorkingDouble,
    getMagnetInteractionRule,
    getRequiredAttachmentsForType,
    getMaxAttachmentsForType,
    canMagnetAttachTo
  } = useScheduler();
  
  const resource = getResourceById(assignment.resourceId);
  const attachedAssignments = getAttachedAssignments(assignment.id);
  const job = getJobById(assignment.jobId);
  
  const { dragState, setCurrentDragItem, getIsCtrlHeld } = useDragContext();
  
  const [isScrewmanModalOpen, setIsScrewmanModalOpen] = useState(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isGroundmanModalOpen, setIsGroundmanModalOpen] = useState(false);
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [customTime, setCustomTime] = useState<string>(assignment.timeSlot?.startTime || job?.startTime || '07:00');
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [isDroppingItem, setIsDroppingItem] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Generate time options in 15-minute increments
  const timeOptions = [];
  for (let i = 0; i < 32; i++) { // 8:00 to 15:45 in 15-minute increments
    const totalMinutes = 8 * 60 + i * 15; // Start from 8:00 AM
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;
    timeOptions.push(timeString);
  }
  
  // Calculate total group size including main magnet
  const totalGroupSize = attachedAssignments.length + 1;
  
  // Update customTime when assignment changes
  useEffect(() => {
    setCustomTime(assignment.timeSlot?.startTime || job?.startTime || '07:00');
  }, [assignment.timeSlot?.startTime, job?.startTime]);
  
  if (!resource) return null;

  // Equipment types definition
  const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                       'roller', 'dozer', 'payloader', 'equipment'];
  
  // Check if this is equipment
  const isEquipment = equipmentTypes.includes(resource.type);
  
  // Function to manually add a screwman to a paver
  const openScrewmanModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (resource.type === 'paver') {
      setIsScrewmanModalOpen(true);
    }
  };
  
  // Function to manually add an operator to equipment
  const openOperatorModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (['paver', 'roller', 'excavator', 'sweeper', 'millingMachine', 
         'dozer', 'payloader', 'skidsteer'].includes(resource.type)) {
      // Prevent event from triggering parent handlers
      e.preventDefault();
      setIsOperatorModalOpen(true);
    }
  };
  
  // Function to manually add a groundman to milling machine
  const openGroundmanModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (resource.type === 'millingMachine') {
      e.preventDefault();
      setIsGroundmanModalOpen(true);
    }
  };
  
  // Function to open time slot modal
  const openTimeSlotModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Time slots not needed since resources are unique
    // setIsTimeSlotModalOpen(true);
  };
  
  // Function to open person modal
  const assignmentExists = (resourceId: string, jobId: string, rowType: string) => {
    return getAssignmentsByResource(resourceId).some(a => 
      a.jobId === jobId && a.row === rowType
    );
  };
  
  // Helper to get assignments by resource
  const getAssignmentsByResource = (resourceId: string) => {
    return getResourcesByAssignment('', '').filter(a => 
      a.resourceId === resourceId
    );
  };

  // Check compatibility for attaching resources
  const isCompatibleAttachment = (itemResource: any) => {
    // Use the dynamic rules from context
    return canMagnetAttachTo(itemResource.type, resource.type);
  };
  
  const [{ isDragging, isSecondShift }, drag] = useDrag({
    type: ItemTypes.ASSIGNMENT,
    item: (monitor) => {
      const isCtrlHeld = getIsCtrlHeld();
      const resource = getResourceById(assignment.resourceId);
      const dragItem = { 
        type: ItemTypes.ASSIGNMENT, 
        assignments: [assignment, ...attachedAssignments],
        primaryAssignment: assignment,
        resource,
        assignmentId: assignment.id,
        jobId: assignment.jobId,
        row: assignment.row,
        isSecondShift: isCtrlHeld,
        dragStartTime: Date.now(),
        sourceLocation: 'assignment-card'
      };
      
      setCurrentDragItem(dragItem);
      return dragItem;
    },
    collect: (monitor) => {
      const item = monitor.getItem();
      const isDragging = monitor.isDragging();
      const isSecondShift = item?.isSecondShift || false;
      
      return {
        isDragging,
        isSecondShift
      };
    },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult() as { 
        jobId?: string; 
        rowType?: string; 
        attached?: boolean;
        isSecondShift?: boolean;
        keepOriginal?: boolean;
      } | null;
      
      // If dropped outside a valid target and not attached to another resource, remove assignment
      // BUT don't remove if this was a successful second shift operation
      if (!dropResult && monitor.didDrop() === false) {
        // Remove this assignment and all attached assignments
        removeAssignment(assignment.id);
        attachedAssignments.forEach(a => removeAssignment(a.id));
      } else if (dropResult && (dropResult.isSecondShift || dropResult.keepOriginal)) {
        // For successful second shift drops, don't remove the original assignment
        }
    },
    canDrag: () => {
      // Don't allow dragging while a modal is open
      return !isScrewmanModalOpen && !isOperatorModalOpen && !isTimeSlotModalOpen;
    }
  }, [assignment, attachedAssignments, resource, setCurrentDragItem, removeAssignment, isScrewmanModalOpen, isOperatorModalOpen, isTimeSlotModalOpen]);
  
  // Handle dropping of other resources onto this one for attaching
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.RESOURCE, ItemTypes.ASSIGNMENT],
    canDrop: (item: DragItem) => {
      // For resources from the pool, only allow drops if this is a compatible attachment
      if (item.type === ItemTypes.RESOURCE) {
        const rule = getMagnetInteractionRule(item.resource.type, resource.type);
        if (!rule?.canAttach) return false;

        // Check equipment permissions for operators
        if (item.resource.type === 'operator') {
          const allowedEquipment = item.resource.allowedEquipment;
          if (allowedEquipment && allowedEquipment.length > 0) {
            if (!allowedEquipment.includes(resource.type)) {
              return false; // Operator not authorized for this equipment
            }
          }
        }

        // Check maxCount
        const currentCountOfSourceType = attachedAssignments
          .map(a => getResourceById(a.resourceId)?.type)
          .filter(attachedType => attachedType === item.resource.type)
          .length;

        if (rule.maxCount !== undefined && currentCountOfSourceType >= rule.maxCount) {
          return false;
        }
        return true;
      }
      
      // For assignments, only allow if same job/row
      if (item.type === ItemTypes.ASSIGNMENT && item.assignmentId !== assignment.id) {
        const sameLocation = item.jobId === assignment.jobId && item.row === assignment.row;
        if (!sameLocation) return false;

        const itemAssignment = getAssignmentById(item.assignmentId!);
        if (itemAssignment) {
          const itemResource = getResourceById(itemAssignment.resourceId);
          if (itemResource) {
            const rule = getMagnetInteractionRule(itemResource.type, resource.type);
            if (!rule?.canAttach) return false;

            // Check equipment permissions for operators
            if (itemResource.type === 'operator') {
              const allowedEquipment = itemResource.allowedEquipment;
              if (allowedEquipment && allowedEquipment.length > 0) {
                if (!allowedEquipment.includes(resource.type)) {
                  return false; // Operator not authorized for this equipment
                }
              }
            }

            const currentCountOfSourceType = attachedAssignments
              .map(a => getResourceById(a.resourceId)?.type)
              .filter(attachedType => attachedType === itemResource.type)
              .length;

            if (rule.maxCount !== undefined && currentCountOfSourceType >= rule.maxCount) {
              return false;
            }
            return true;
          }
        }
        return false;
      }
      
      return false;
    },
    drop: (item: DragItem) => {
      setIsDroppingItem(true);
      
      // Prevent handling the same drop event multiple times
      if ((item as any)._handled) {
        return undefined;
      }
      
      if (item.type === ItemTypes.ASSIGNMENT && item.assignmentId !== assignment.id) {
        // Only attach if they're in the same job/row, otherwise it's handled by JobRow
        if (item.jobId === assignment.jobId && item.row === assignment.row) {
          logger.debug('🔗 Attaching assignment to assignment:', {
            sourceId: item.assignmentId,
            targetId: assignment.id
          });
          (item as any)._handled = true;
          attachResources(assignment.id, item.assignmentId!).then(() => {
            // Reset dropping state after a delay
            setTimeout(() => setIsDroppingItem(false), 300);
          });
          return { 
            jobId: assignment.jobId, 
            rowType: assignment.row, 
            attached: true,
            handled: true
          };
        }
      } else if (item.type === ItemTypes.RESOURCE) {
        // For drag/drop of resources from pool, attach if compatible
        const rule = getMagnetInteractionRule(item.resource.type, resource.type);
        // Check if resource is already assigned to this job/row
        const existingAssignment = assignments.find(a => 
          a.resourceId === item.resource.id && 
          a.jobId === assignment.jobId && 
          a.row === assignment.row &&
          !a.attachedTo
        );
        
        if (existingAssignment) {
          logger.debug('🔗 Resource already has assignment in this job/row, attaching existing assignment');
          (item as any)._handled = true;
          attachResources(assignment.id, existingAssignment.id).then(() => {
            setTimeout(() => setIsDroppingItem(false), 300);
          });
          return { 
            jobId: assignment.jobId, 
            rowType: assignment.row, 
            attached: true,
            handled: true
          };
        }
        
        if (rule?.canAttach) {
          // Create assignment already attached to this assignment  
          logger.debug('🔗 Creating attached assignment for resource:', item.resource.name);
          (item as any)._handled = true;
          assignResourceWithAttachment(item.resource.id, assignment.id).then(attachedAssignmentId => {
            if (attachedAssignmentId) {
              // Successfully attached
              logger.debug('✅ Successfully attached resource to assignment:', {
                resourceId: item.resource.id,
                parentAssignmentId: assignment.id,
                newAssignmentId: attachedAssignmentId
              });
            }
            // Reset dropping state after a delay
            setTimeout(() => setIsDroppingItem(false), 300);
          }).catch(err => {
            console.error('❌ Drop handler: Error attaching resource:', err);
            logger.error('Error attaching resource:', err);
          });
          // Return early to prevent JobRow from handling
          return { 
            jobId: assignment.jobId, 
            rowType: assignment.row, 
            attached: true,
            handled: true
          };
        }
        // If not compatible, don't do anything - let JobRow handle the drop
      }
      
      // Reset dropping state after a delay
      setTimeout(() => setIsDroppingItem(false), 300);
      
      return undefined; // Don't handle if not attached
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }, [assignment, attachedAssignments, assignments, getAssignmentById, getResourceById, getMagnetInteractionRule, assignResourceWithAttachment, attachResources, removeAssignment, safeLocalStorage]);

  // Clean up drop state when component unmounts or item changes
  useEffect(() => {
    return () => {
      setIsDroppingItem(false);
    };
  }, [assignment.id]);
  
  // Function to handle double click for removing
  const handleDoubleClick = () => {
    if (attachedAssignments.length > 0) {
      if (confirm('Detach all resources from the group?')) {
        // Remove all attached assignments completely
        attachedAssignments.forEach(a => removeAssignment(a.id));
      }
    } else if (confirm('Remove this resource from the job?')) {
      removeAssignment(assignment.id);
    }
  };
  
  // Check if we need to show the "Add screwman" option
  const shouldShowAddScrewman = () => {
    const rule = getMagnetInteractionRule('laborer', resource.type);
    
    // Debug logging for screwman button
    const currentLaborerCount = attachedAssignments
      .map(a => getResourceById(a.resourceId)?.type)
      .filter(attachedType => attachedType === 'laborer')
      .length;
    
    logger.debug('🔧 Screwman button check:', {
      resourceType: resource.type,
      resourceName: resource.name,
      rule: rule,
      currentLaborerCount,
      attachedAssignments: attachedAssignments.map(a => ({
        id: a.id,
        resourceId: a.resourceId,
        resourceType: getResourceById(a.resourceId)?.type,
        resourceName: getResourceById(a.resourceId)?.name
      })),
      shouldShow: rule?.canAttach && currentLaborerCount < (rule.maxCount || 0)
    });
    
    if (!rule?.canAttach) return false;
    
    return currentLaborerCount < (rule.maxCount || 0);
  };
  
  // Check if we need to show the "Add groundman" option
  const shouldShowAddGroundman = () => {
    const rule = getMagnetInteractionRule('laborer', resource.type);
    if (!rule?.canAttach || resource.type !== 'millingMachine') return false;
    
    const currentLaborerCount = attachedAssignments
      .map(a => getResourceById(a.resourceId)?.type)
      .filter(attachedType => attachedType === 'laborer')
      .length;
    
    return currentLaborerCount < (rule.maxCount || 0);
  };
  
  // Check if we need to show the "Add operator" option
  const shouldShowAddOperator = () => {
    const rule = getMagnetInteractionRule('operator', resource.type);
    if (!rule?.canAttach) return false;
    
    const currentOperatorCount = attachedAssignments
      .map(a => getResourceById(a.resourceId)?.type)
      .filter(attachedType => attachedType === 'operator')
      .length;
    
    return currentOperatorCount < (rule.maxCount || 0);
  };
  
  // Check if equipment has an operator (for time indicator logic)
  const hasOperator = () => {
    const requiredOperators = getRequiredAttachmentsForType(resource.type).includes('operator');
    if (!requiredOperators) return true; // If no operator is required, consider it "has operator"
    
    const allRelatedAssignments = [assignment, ...attachedAssignments];
    return allRelatedAssignments.some(a => {
      const assignmentResource = getResourceById(a.resourceId);
      return assignmentResource?.type === 'operator';
    });
  };

  // Check if there are any equipment permission violations
  const hasPermissionViolation = () => {
    if (resource.type === 'operator') {
      // Check if this operator has permissions for any equipment they're attached to
      const parentEquipment = getResourceById(assignment.attachedTo || '');
      if (parentEquipment) {
        const allowedEquipment = resource.allowedEquipment;
        if (allowedEquipment && allowedEquipment.length > 0) {
          return !allowedEquipment.includes(parentEquipment.type);
        }
      }
    } else {
      // Check if this equipment has operators without proper permissions
      const operatorAssignments = attachedAssignments.filter(a => {
        const operatorResource = getResourceById(a.resourceId);
        return operatorResource?.type === 'operator';
      });
      
      return operatorAssignments.some(operatorAssignment => {
        const operatorResource = getResourceById(operatorAssignment.resourceId);
        if (operatorResource) {
          const allowedEquipment = operatorResource.allowedEquipment;
          if (allowedEquipment && allowedEquipment.length > 0) {
            return !allowedEquipment.includes(resource.type);
          }
        }
        return false;
      });
    }
    return false;
  };
  
  // Highlight style for when dragging over
  const hoverStyle = isOver ? (canDrop ? 'ring-2 ring-blue-400' : 'ring-2 ring-red-400') : '';
  const dropAnimation = isDroppingItem ? 'scale-110' : '';

  // Check if resource has multiple job assignments for styling
  const multiJobStyle = hasMultipleJobAssignments(resource.id) ? 'ring-2 ring-teal-400' : '';
  
  // Check if resource is working double shift
  const workingDouble = isWorkingDouble(resource.id);
  
  // Combine drag and drop refs
  const combinedRef = (el: HTMLDivElement | null) => {
    drag(el);
    drop(el);
    cardRef.current = el;
  };
  
  // If this assignment has attached resources, render as a group
  if (attachedAssignments.length > 0) {
    logger.debug('Rendering attached group for:', resource.name, 'mainResource.onSite:', resource.onSite);
    logger.debug('Attached assignments:', attachedAssignments.map(a => ({
      id: a.id,
      resourceId: a.resourceId,
      resourceName: getResourceById(a.resourceId)?.name
    })));
    
    return (
      <>
        <motion.div 
          ref={combinedRef}
          className={`relative ${hoverStyle} ${dropAnimation} ${multiJobStyle} rounded-md cursor-move transition-all duration-200 inline-block group`}
          style={{ opacity: isDragging && !isSecondShift ? 0.4 : 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <AttachedResourcesGroup
            assignment={assignment}
            attachedAssignments={attachedAssignments}
            onDoubleClick={handleDoubleClick}
            onOpenPersonModal={onOpenPersonModal}
          />
          
          {/* Operator button for equipment that doesn't have one yet */}
          {shouldShowAddOperator() && (
            <div className="flex justify-center mt-1 w-full">
              <div 
                onClick={openOperatorModal}
                className="flex bg-blue-500 text-white text-[8px] rounded-full h-4 w-14 px-1 items-center justify-center cursor-pointer shadow-sm hover:bg-blue-600 border border-white relative"
              >
                + Operator
              </div>
            </div>
          )}
          
          {/* Screwman button on its own row underneath the group */}
          {shouldShowAddScrewman() && (
            <div className="flex justify-center mt-1 w-full">
              <div 
                onClick={openScrewmanModal}
                className="flex bg-green-500 text-white text-[8px] rounded-full h-4 w-16 px-1 items-center justify-center cursor-pointer shadow-sm hover:bg-green-600 border border-white relative"
              >
                + Screwman
              </div>
            </div>
          )}
          
          {/* Groundman button for milling machines */}
          {shouldShowAddGroundman() && (
            <div className="flex justify-center mt-1 w-full">
              <div 
                onClick={openGroundmanModal}
                className="flex bg-purple-500 text-white text-[8px] rounded-full h-4 w-16 px-1 items-center justify-center cursor-pointer shadow-sm hover:bg-purple-600 border border-white relative"
              >
                + Groundman
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Screwman selector modal */}
        {isScrewmanModalOpen && (
          <ScrewmanSelectorModal
            assignmentId={assignment.id}
            onClose={() => setIsScrewmanModalOpen(false)}
          />
        )}
        
        {/* Operator selector modal */}
        {isOperatorModalOpen && (
          <OperatorSelectorModal
            assignmentId={assignment.id}
            onClose={() => setIsOperatorModalOpen(false)}
          />
        )}
        
        {/* Groundman selector modal */}
        {isGroundmanModalOpen && (
          <ScrewmanSelectorModal
            assignmentId={assignment.id}
            onClose={() => setIsGroundmanModalOpen(false)}
          />
        )}
      </>
    );
  }
  
  // For single equipment, add ability to add operator/screwman with improved positioning
  logger.debug('Rendering single equipment', {
    resourceName: resource.name,
    onSite: resource.onSite,
    type: resource.type
  });
  
  return (
    <>
      <motion.div 
        ref={combinedRef}
        className={`relative ${hoverStyle} ${dropAnimation} ${multiJobStyle} rounded-md cursor-move transition-all duration-200 inline-block group`}
        style={{ opacity: isDragging && !isSecondShift ? 0.4 : 1 }}
        onDoubleClick={handleDoubleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={isDroppingItem ? { scale: [1, 1.1, 1] } : {}}
        data-resource-id={resource.id}
      >
        <div className="flex items-center">
          <ResourceCard 
            resource={resource} 
            isDragging={isDragging}
            isCompact={false} // Never use compact mode for main cards
            isMain={true}
            assignmentId={assignment.id}
            onPersonClick={() => onOpenPersonModal && onOpenPersonModal(assignment)}
            hasNote={!!assignment.note}
            showDoubleShift={workingDouble}
          />
          
          {/* Add buttons next to the resource card */}
          <div className="flex flex-col gap-1 -ml-1">
            {/* Operator button for equipment that doesn't have one yet */}
            {shouldShowAddOperator() && (
              <div 
                onClick={openOperatorModal}
                className="flex bg-blue-500 text-white text-[8px] rounded-full h-4 w-14 px-1 items-center justify-center cursor-pointer shadow-sm hover:bg-blue-600 border border-white"
              >
                + Operator
              </div>
            )}
            
            {/* Screwman button for pavers */}
            {shouldShowAddScrewman() && (
              <div 
                onClick={openScrewmanModal}
                className="flex bg-green-500 text-white text-[8px] rounded-full h-4 w-16 px-1 items-center justify-center cursor-pointer shadow-sm hover:bg-green-600 border border-white"
              >
                + Screwman
              </div>
            )}
          </div>
        </div>
        
        {/* Time indicator - only show if equipment has operator or doesn't need one */}
        {hasOperator() && (
          <div 
            className={`absolute -top-2 -right-2 text-white text-xs rounded-full flex items-center justify-center shadow-sm z-30 ${getTimeIndicatorColor(resource, [], getResourceById)}`}
            title={`Click to edit ${(resource.type === 'truck' || resource.type === 'sweeper') && resource.onSite === false ? 'time out of yard' : 'time on job'}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTime(true);
            }}
          >
            {isEditingTime ? (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                onBlur={() => {
                  setIsEditingTime(false);
                  updateTimeSlot(assignment.id, {
                    startTime: customTime,
                    endTime: '15:30',
                    isFullDay: false
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTime(false);
                    updateTimeSlot(assignment.id, {
                      startTime: customTime,
                      endTime: '15:30',
                      isFullDay: false
                    });
                  }
                }}
                className="bg-transparent text-white text-[10px] font-medium border-none outline-none w-12 text-center"
                autoFocus
              />
            ) : (
              <span 
                className="text-[10px] font-medium cursor-pointer px-2 py-0.5 rounded-full"
                title={`Click to edit ${(resource.type === 'truck' || resource.type === 'sweeper') && resource.onSite !== true ? 'time out of yard' : 'time on job'}`}
              >
                {customTime}
              </span>
            )}
          </div>
        )}
        
        {/* Permission warning indicator */}
        {hasPermissionViolation() && (
          <div 
            className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center shadow-sm z-30"
            title={resource.type === 'operator' ? 
              `${resource.name} is not authorized to operate this equipment type` : 
              `This ${resource.type} has operators without proper permissions`
            }
          >
            ⚠️
          </div>
        )}
      </motion.div>
      
      {/* Screwman selector modal */}
      {isScrewmanModalOpen && (
        <ScrewmanSelectorModal
          assignmentId={assignment.id}
          onClose={() => setIsScrewmanModalOpen(false)}
        />
      )}
      
      {/* Operator selector modal */}
      {isOperatorModalOpen && (
        <OperatorSelectorModal
          assignmentId={assignment.id}
          onClose={() => setIsOperatorModalOpen(false)}
        />
      )}
      
      {/* Groundman selector modal */}
      {isGroundmanModalOpen && (
        <ScrewmanSelectorModal
          assignmentId={assignment.id}
          onClose={() => setIsGroundmanModalOpen(false)}
        />
      )}
    </>
  );
};

export default React.memo(AssignmentCard, (prevProps, nextProps) => {
  // Re-render if assignment data changes
  return (
    prevProps.assignment.id === nextProps.assignment.id &&
    prevProps.assignment.resourceId === nextProps.assignment.resourceId &&
    prevProps.assignment.note === nextProps.assignment.note &&
    prevProps.assignment.timeSlot?.startTime === nextProps.assignment.timeSlot?.startTime
  );
});