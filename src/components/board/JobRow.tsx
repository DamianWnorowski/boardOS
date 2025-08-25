import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { RowType, ItemTypes, DragItem, ResourceType, Assignment } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import { useMobile } from '../../context/MobileContext';
import { useDragContext } from '../../context/DragContext';
import { useModal } from '../../context/ModalContext';
import { getMobileDropTargetOptions } from '../../utils/dndBackend';
import AssignmentCard from '../resources/AssignmentCard';
import { isRowNeededForJobType, isRowTogglable } from '../../utils/jobUtils';
import { X, Check, ChevronRight, ChevronDown, Lock, Info, Settings, Split } from 'lucide-react';
import TemplateCard from '../resources/TemplateCard';
import EquipmentSelectorModal from '../modals/EquipmentSelectorModal';
import TruckConfigModal from '../modals/TruckConfigModal';
import PersonModal from '../modals/PersonModal';
import logger from '../../utils/logger';

// Define equipment types constant
const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                       'roller', 'dozer', 'payloader', 'equipment'];

interface JobRowProps {
  jobId: string;
  rowType: RowType;
  label: string;
}

const JobRow: React.FC<JobRowProps> = ({ jobId, rowType, label }) => {
  const { 
    getResourcesByAssignment, 
    assignResource,
    assignResourceWithTruckConfig,
    moveAssignmentGroup,
    getJobById,
    getAssignmentById,
    getResourceById,
    isRowEnabled,
    toggleRowEnabled,
    getTruckDriver,
    canDropOnRow,
    getDropRule,
    getJobRowConfig
  } = useScheduler();
  
  const { isMobile, touchEnabled } = useMobile();
  
  // Get job object
  const job = getJobById(jobId);
  
  // Get assignments for this job and row type
  const assignments = getResourcesByAssignment(jobId, rowType);
  
  const { dragState } = useDragContext();
  const { openModal, closeModal, getZIndex } = useModal();
  
  // Test drop target
  const [{ isTestOver }, testDrop] = useDrop({
    accept: [ItemTypes.RESOURCE],
    drop: (item) => {
      console.log('🟢 TEST DROP TARGET WORKED!', item);
      return { test: true };
    },
    collect: (monitor) => ({
      isTestOver: monitor.isOver(),
    }),
  });
  
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<ResourceType | null>(null);
  const [selectedTruckCategory, setSelectedTruckCategory] = useState<string | undefined>(undefined);
  const [pendingTruckDrop, setPendingTruckDrop] = useState<{ resourceId: string; jobId: string; rowType: RowType; position: number } | null>(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [selectedPersonAssignment, setSelectedPersonAssignment] = useState<Assignment | null>(null);
  
  // State for truck count limits
  const [flowboyLimit, setFlowboyLimit] = useState(() => {
    const saved = localStorage.getItem(`truck-limits-${jobId}`);
    return saved ? JSON.parse(saved).flowboy || 5 : 5;
  });
  const [dumpTrailerLimit, setDumpTrailerLimit] = useState(() => {
    const saved = localStorage.getItem(`truck-limits-${jobId}`);
    return saved ? JSON.parse(saved).dumpTrailer || 6 : 6;
  });
  const [tenWheelLimit, setTenWheelLimit] = useState(() => {
    const saved = localStorage.getItem(`truck-limits-${jobId}`);
    return saved ? JSON.parse(saved).tenWheel || 2 : 2;
  });
  
  // Save limits to localStorage whenever they change
  // Don't allow drops on finalized jobs
  const isJobFinalized = job?.finalized || false;
  
  // Check if this row type is needed for the current job type
  const isNeeded = job ? isRowNeededForJobType(rowType, job.type) : true;
  
  // Check if this row is enabled (can be manually toggled) - only for explicitly toggleable rows
  const canBeToggled = isRowTogglable(rowType);
  const isEnabled = isRowEnabled(jobId, rowType);
  
  // The row is active if it's needed OR manually enabled (only for toggleable rows)
  const isActive = isNeeded ? (canBeToggled ? isEnabled : true) : (canBeToggled ? isEnabled : false);
  
  // Get job-specific row configuration
  const rowConfig = getJobRowConfig(jobId, rowType);
  const isSplit = rowConfig?.isSplit || false;
  
  // Row is empty if there are no assignments
  const isEmpty = assignments.length === 0;
  
  // Determine if we should show row in condensed mode - condense if not needed, not enabled, and empty
  const shouldCondense = !isNeeded && !isEnabled && isEmpty;
  
  // Filter out assignments that are attached to other assignments
  const filteredAssignments = assignments.filter(assignment => {
    return !assignment.attachedTo;
  });
  
  // Helper function to determine sort priority for resources
  const getSortPriority = (assignment: Assignment): number => {
    const resource = getResourceById(assignment.resourceId);
    if (!resource) return 999; // Unknown resources go last
    
    // Check if this assignment has attachments (attached magnets get highest priority)
    if (assignment.attachments && assignment.attachments.length > 0) {
      return 0; // Attached magnets first
    }
    
    // Equipment types get priority 1
    const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 
                            'dozer', 'payloader', 'roller', 'equipment', 'truck'];
    if (equipmentTypes.includes(resource.type)) {
      return 1; // Unattached equipment second
    }
    
    // Operators get priority 2
    if (resource.type === 'operator') {
      return 2; // Unattached operators third
    }
    
    // All other personnel get priority 3
    return 3; // Other personnel fourth
  };
  
  // Sort assignments by priority, then by position
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const priorityA = getSortPriority(a);
    const priorityB = getSortPriority(b);
    
    // If priorities are different, sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If priorities are the same, sort by position
    return (a.position || 0) - (b.position || 0);
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.RESOURCE, ItemTypes.ASSIGNMENT],
    drop: (item: DragItem, monitor: DropTargetMonitor) => {
      try {
          itemType: item.type,
          resourceType: item.resource?.type,
          resourceName: item.resource?.name,
          targetRowType: rowType
        });
        
        // Check if this drop was already handled by a nested component
        if ((item as any)._handled) {
          logger.debug('Drop already handled by nested component, skipping');
          return { jobId, rowType, alreadyHandled: true };
        }
        
        // Give assignment cards priority - check if drop was handled
        const nestedDropResult = monitor.getDropResult() as { handled?: boolean } | null;
        if (nestedDropResult?.handled) {
          logger.debug('Drop already handled by nested target, skipping JobRow handling');
          return nestedDropResult;
        }
        
        if (item.type === ItemTypes.RESOURCE) {
          // Always check if this resource is already assigned to this job (prevent duplicates within same job)
          const existingJobAssignment = assignments.find(a => 
            a.resourceId === item.resource.id && 
            a.jobId === jobId &&
            !a.attachedTo
          );
          
          if (existingJobAssignment) {
            logger.debug('Resource already assigned to this job, preventing duplicate');
            return { jobId, rowType, assignmentId: existingJobAssignment.id, duplicate: true };
          }
          
          let position = assignments.length;
          logger.debug('About to call assignResource with:', {
            resourceId: item.resource.id,
            jobId,
            rowType,
            position
          });
          
          // Mark as handled to prevent duplicate processing
          (item as any)._handled = true;
          
          const assignmentId = assignResourceWithTruckConfig(item.resource.id, jobId, rowType, undefined, position, item.isSecondShift);
          logger.debug('Assignment created:', assignmentId);
          return { jobId, rowType, assignmentId };
        }
        
        if (item.type === ItemTypes.ASSIGNMENT) {
          // For second shift (Ctrl+drag), create a new assignment instead of moving existing
          if (item.isSecondShift) {
            logger.debug('Second shift assignment - creating new assignment for resource');
            (item as any)._handled = true;
            const position = assignments.length;
            const assignmentId = assignResourceWithTruckConfig(item.resource.id, jobId, rowType, undefined, position, item.isSecondShift);
            logger.debug('Second shift assignment created:', assignmentId);
            return { jobId, rowType, assignmentId, isSecondShift: true, keepOriginal: true };
          } else {
            logger.debug('Moving assignment group');
            (item as any)._handled = true;
            const assignmentIds = item.assignments.map(a => a.id);
            const newAssignmentId = moveAssignmentGroup(item.assignments, jobId, rowType);
            logger.debug('Assignment group moved:', newAssignmentId);
            return { jobId, rowType, assignmentId: newAssignmentId };
          }
        }
        
        logger.debug('No handler for item type:', item.type);
        return { jobId, rowType };

      } catch (error) {
        logger.error('Error in main drop function:', error);
        return undefined;
      }
    },
    canDrop: (item: DragItem) => {
      logger.debug('JobRow canDrop check', { 
        rowType, 
        itemType: item.type, 
        resourceType: item.resource?.type,
        isActive, 
        isJobFinalized,
        isSecondShift: item.isSecondShift 
      });
      
      // If row is not active or job is finalized, don't allow drops
      if (!isActive || isJobFinalized) {
        logger.debug('Drop rejected: row not active or job finalized', {
          isActive,
          isJobFinalized
        });
        return false;
      }
      
      // Check drop rules for this row type
      if (item.type === ItemTypes.RESOURCE) {
        if (!canDropOnRow(item.resource.type, rowType)) {
          logger.debug('Drop rejected: resource type not allowed in this row', {
            resourceType: item.resource.type,
            rowType,
            allowedTypes: getDropRule(rowType)
          });
          return false;
        }
      }
      
      // For second shift (Ctrl+drag), allow drops regardless of current assignment
      if (item.isSecondShift) {
        logger.debug('Second shift drop allowed');
        return true;
      }
      
      // Legacy equipment type restrictions (now handled by drop rules above)
      if (item.type === ItemTypes.RESOURCE) {
        const isEquipment = equipmentTypes.includes(item.resource.type);
        
        // Check if truck has a driver assigned before allowing drop
        if (item.resource.type === 'truck' && rowType === 'trucks') {
          const truckDriver = getTruckDriver(item.resource.id);
          if (!truckDriver) {
            logger.debug('Drop rejected: truck without driver');
            return false; // Don't allow trucks without drivers
          }
        }
      }
      
      if (rowType === 'crew') {
        const newAssignments = [...assignments];
        const index = item.assignmentId ? newAssignments.findIndex(a => a.id === item.assignmentId) : -1;
        
        if (index >= 0) {
          newAssignments.splice(index, 1);
        }
        
        return true;
      }
      
      logger.debug('Drop allowed by default');
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Add test drop target just for debugging
  useEffect(() => {
    logger.debug('JobRow useEffect - Drop target monitor states:', { 
      rowType, 
      isOver, 
      canDrop,
      isTestOver 
    });
  }, [rowType, isOver, canDrop, isTestOver]);
  
  // Handle toggling the row on/off
  const handleToggleRow = () => {
    if (canBeToggled && !isJobFinalized) {
      toggleRowEnabled(jobId, rowType);
    }
  };
  
  // Handle opening equipment selector
  const handleOpenEquipmentSelector = (equipmentType: ResourceType, truckCategory?: string) => {
    setSelectedEquipmentType(equipmentType);
    setSelectedTruckCategory(truckCategory);
  };
  
  // Close equipment selector modal
  const handleCloseSelector = () => {
    setSelectedEquipmentType(null);
    setSelectedTruckCategory(undefined);
  };
  
  // Handle truck configuration selection
  const handleTruckConfigSelect = (config: 'flowboy' | 'dump-trailer') => {
    if (!pendingTruckDrop) return;
    
    logger.debug('handleTruckConfigSelect called with config:', config, 'for truck:', pendingTruckDrop.resourceId);
   
    // Create the assignment
    const assignmentId = assignResource(
      pendingTruckDrop.resourceId, 
      pendingTruckDrop.jobId, 
      pendingTruckDrop.rowType, 
      pendingTruckDrop.position
    );
    
    logger.debug('Assignment created with ID:', assignmentId);
   
    // Store the configuration
    const truckConfigs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
    truckConfigs[assignmentId] = config;
    localStorage.setItem('truck-configurations', JSON.stringify(truckConfigs));
    
    logger.debug('Stored truck config:', config, 'for assignment:', assignmentId);
    logger.debug('All truck configs:', truckConfigs);
   
    setPendingTruckDrop(null);
  };
  
  // Handle truck config modal close
  const handleTruckConfigClose = () => {
    setPendingTruckDrop(null);
  };
  
  // Handle opening person modal
  const handleOpenPersonModal = (assignment: Assignment) => {
    logger.debug('JobRow openPersonModal called with assignment:', assignment);
    logger.debug('Setting modal state - assignment ID:', assignment.id);
    setSelectedPersonAssignment(assignment);
    setIsPersonModalOpen(true);
    logger.debug('Modal state set - isPersonModalOpen should be true');
  };
  
  const handleClosePersonModal = () => {
    logger.debug('Closing person modal');
    setIsPersonModalOpen(false);
    setSelectedPersonAssignment(null);
  };
  
  // Check if a specific equipment type is already assigned
  const hasEquipmentType = (type: ResourceType): boolean => {
    return assignments.some(assignment => {
      const resource = getResourceById(assignment.resourceId);
      return resource?.type === type;
    });
  };
  
  // Get template cards to display based on row type and job type
  const getTemplateCards = () => {
    // Only show templates for active rows
    if (!isActive) return [];
    
    // Skip crew rows for now
    if (rowType === 'crew') return [];
    
    const templates = [];
    
    // For Equipment row in paving jobs
    if (rowType === 'Equipment' && job?.type === 'paving') {
      // Always show paver template if none exists
      if (!hasEquipmentType('paver')) {
        templates.push({ type: 'paver' as ResourceType, label: 'Paver' });
      }
      
      // Show roller template only if there are fewer than 2 rollers
      const rollerCount = assignments.filter(assignment => {
        const resource = getResourceById(assignment.resourceId);
        return resource?.type === 'roller';
      }).length;
      
      if (rollerCount < 2) {
        templates.push({ type: 'roller' as ResourceType, label: 'Roller' });
      }
    }
    
    // For Equipment row in milling jobs
    if (rowType === 'Equipment' && job?.type === 'milling') {
      if (!hasEquipmentType('millingMachine')) {
        templates.push({ type: 'millingMachine' as ResourceType, label: 'Milling Machine' });
      }
      
      // Show skid steer template only if there are fewer than 2 skidsteers
      const skidsteerCount = assignments.filter(assignment => {
        const resource = getResourceById(assignment.resourceId);
        return resource?.type === 'skidsteer';
      }).length;
      
      if (skidsteerCount < 2) {
        templates.push({ type: 'skidsteer' as ResourceType, label: 'Skid Steer' });
      }
    }
    
    // For Equipment row in both (milling & paving) jobs
    if (rowType === 'Equipment' && job?.type === 'both') {
      // Show milling machine template if none exists
      if (!hasEquipmentType('millingMachine')) {
        templates.push({ type: 'millingMachine' as ResourceType, label: 'Milling Machine' });
      }
      
      // Show skid steer template only if there are fewer than 2 (needed for milling)
      const skidsteerCount = assignments.filter(assignment => {
        const resource = getResourceById(assignment.resourceId);
        return resource?.type === 'skidsteer';
      }).length;
      
      if (skidsteerCount < 2) {
        templates.push({ type: 'skidsteer' as ResourceType, label: 'Skid Steer' });
      }
      
      // Show paver template if none exists
      if (!hasEquipmentType('paver')) {
        templates.push({ type: 'paver' as ResourceType, label: 'Paver' });
      }
      
      // Show roller template only if there are fewer than 2 rollers
      const rollerCount = assignments.filter(assignment => {
        const resource = getResourceById(assignment.resourceId);
        return resource?.type === 'roller';
      }).length;
      
      if (rollerCount < 2) {
        templates.push({ type: 'roller' as ResourceType, label: 'Roller' });
      }
    }
    
    // For Sweeper row when empty, show sweeper template
    if (rowType === 'Sweeper' && !hasEquipmentType('sweeper')) {
      templates.push({ type: 'sweeper' as ResourceType, label: 'Sweeper' });
    }
    
    
    return templates;
  };
  
  // Helper function to categorize trucks
  const categorizeTruck = (resource: any) => {
    if (!resource || resource.type !== 'truck') return null;
    
    // Specific list of 10W truck unit numbers
    const tenWheelUnits = ['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'];
    
    const unitNumber = resource.identifier || '';
    
    // Check if this truck is a 10W based on the specific unit number list
    if (tenWheelUnits.includes(unitNumber)) {
      return '10w';
    }
    
    // All other trucks can be used as either dump trailers or flowboys (they're interchangeable)
    return 'regular-truck';
  };
  
  // Special handling for trucks row
  if (rowType === 'trucks') {
    // Categorize truck assignments
    const trailerAssignments = sortedAssignments.filter(assignment => {
      const resource = getResourceById(assignment.resourceId);
      const category = categorizeTruck(resource);
      return category === 'regular-truck';
    });
    
    const tenWheelAssignments = sortedAssignments.filter(assignment => {
      const resource = getResourceById(assignment.resourceId);
      const category = categorizeTruck(resource);
      return category === '10w';
    });
    
    // Separate trailer assignments by configuration
    const flowboyAssignments = trailerAssignments.filter(assignment => {
      const truckConfigs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
      const config = truckConfigs[assignment.id];
      return config === 'flowboy';
    });
    
    const dumpTrailerAssignments = trailerAssignments.filter(assignment => {
      const truckConfigs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
      const config = truckConfigs[assignment.id];
      return config === 'dump-trailer';
    });
    
    // Determine what sections to show based on job type and assignments
    const shouldShowFlowboy = job?.type === 'paving' || job?.type === 'both' || flowboyAssignments.length > 0;
    const shouldShowDumpTrailer = job?.type === 'milling' || job?.type === 'both' || dumpTrailerAssignments.length > 0;
    const shouldShowGenericAddButton = !shouldShowFlowboy && !shouldShowDumpTrailer && job?.type !== 'paving' && job?.type !== 'milling' && job?.type !== 'both';
    
    const templateCards = getTemplateCards();
    
    return (
      <div className="p-2 border-b border-gray-200 min-h-[60px] transition-colors relative">
        {/* Main drop target */}
        <div
          ref={drop}
          className={`w-full h-full ${
            isOver && canDrop ? 'bg-blue-100' : isOver ? 'bg-red-100' : ''
          }`}
        >
        <div className="w-full flex justify-between items-center mb-1">
          <div className="flex items-center">
            <span className={`text-xs font-medium ${isActive ? 'text-gray-500' : 'text-gray-400'} ${!isActive ? 'line-through' : ''}`}>
              {label}
            </span>
            
            {/* Drop rules indicator */}
            <div className="group relative">
              <Info size={12} className="ml-1 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                Allowed: {getDropRule(rowType).map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ') || 'None'}
              </div>
            </div>
            
            {isJobFinalized && (
              <Lock size={12} className="ml-2 text-green-600" title="Job is finalized" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Toggle button for rows that can be toggled */}
            {canBeToggled && !isJobFinalized && (
              <button 
                onClick={handleToggleRow}
                className={`p-0.5 rounded-sm ${isEnabled ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}
                title={isEnabled ? "Disable row" : "Enable row"}
              >
                {isEnabled ? <Check size={14} /> : <X size={14} />}
              </button>
            )}
            
            {/* Status indicators */}
            {isNeeded && !isEnabled && canBeToggled && (
              <span className="text-xs text-red-500 italic px-1.5 py-0.5 bg-red-50 rounded">
                Disabled
              </span>
            )}
            
            {!isNeeded && isEnabled && canBeToggled && (
              <span className="text-xs text-blue-600 italic px-1.5 py-0.5 bg-blue-50 rounded">
                Manually enabled
              </span>
            )}
            
            {/* Assignment count */}
            <span className="text-xs text-gray-400">
              {assignments.length ? `${assignments.length} assigned` : ''}
            </span>
          </div>
        </div>
        
        {/* Two-column layout for trucks */}
        <div className="flex space-x-4">
          {/* Left column: Flowboy and Dump Trailer sections */}
          <div className="flex-1 space-y-4">
            {/* Flowboy Trucks section - show for paving, both, or if has assignments */}
            {shouldShowFlowboy && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-700">Flowboy</span>
                    <select
                      value={flowboyLimit}
                      onChange={(e) => setFlowboyLimit(Number(e.target.value))}
                      className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium border-none appearance-none cursor-pointer hover:bg-blue-200 transition-colors"
                      disabled={isJobFinalized}
                    >
                      {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{flowboyAssignments.length} / {num}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col space-y-1 min-h-[40px] border-l-2 border-blue-200 pl-2">
                  <AnimatePresence>
                    {flowboyAssignments.map(assignment => (
                      <motion.div
                        key={assignment.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <AssignmentCard assignment={assignment} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Add flowboy button */}
                  {isActive && flowboyAssignments.length < flowboyLimit && (
                    <div className="flex">
                      <TemplateCard
                        equipmentType="truck"
                        label="Add Flowboy"
                        onClick={() => handleOpenEquipmentSelector('truck', 'flowboy')}
                        isCompact={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Dump Trailer Trucks section - show for milling, both, or if has assignments */}
            {shouldShowDumpTrailer && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-700">Dump Trailer</span>
                    <select
                      value={dumpTrailerLimit}
                      onChange={(e) => setDumpTrailerLimit(Number(e.target.value))}
                      className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium border-none appearance-none cursor-pointer hover:bg-orange-200 transition-colors"
                      disabled={isJobFinalized}
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{dumpTrailerAssignments.length} / {num}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col space-y-1 min-h-[40px] border-l-2 border-orange-200 pl-2">
                  <AnimatePresence>
                    {dumpTrailerAssignments.map(assignment => (
                      <motion.div
                        key={assignment.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <AssignmentCard assignment={assignment} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Add dump trailer button */}
                  {isActive && dumpTrailerAssignments.length < dumpTrailerLimit && (
                    <div className="flex">
                      <TemplateCard
                        equipmentType="truck"
                        label="Add Dump Trailer"
                        onClick={() => handleOpenEquipmentSelector('truck', 'dump-trailer')}
                        isCompact={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Generic Add Truck button for other job types */}
            {shouldShowGenericAddButton && isActive && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-700">Trucks</span>
                    <select
                      value={flowboyLimit}
                      onChange={(e) => setFlowboyLimit(Number(e.target.value))}
                      className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium border-none appearance-none cursor-pointer hover:bg-gray-200 transition-colors"
                      disabled={isJobFinalized}
                    >
                      {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{trailerAssignments.length} / {num}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col space-y-1 min-h-[40px] border-l-2 border-gray-200 pl-2">
                  <AnimatePresence>
                    {trailerAssignments.map(assignment => (
                      <motion.div
                        key={assignment.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <AssignmentCard assignment={assignment} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Add generic truck button */}
                  {trailerAssignments.length < flowboyLimit && (
                    <div className="flex">
                      <TemplateCard
                        equipmentType="truck"
                        label="Add Truck"
                        onClick={() => handleOpenEquipmentSelector('truck')}
                        isCompact={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right column: 10W trucks section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-700">10W Trucks</span>
                <select
                  value={tenWheelLimit}
                  onChange={(e) => setTenWheelLimit(Number(e.target.value))}
                  className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium border-none appearance-none cursor-pointer hover:bg-green-200 transition-colors"
                  disabled={isJobFinalized}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{tenWheelAssignments.length} / {num}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col space-y-1 min-h-[40px] border-l-2 border-green-200 pl-2">
              <AnimatePresence>
                {tenWheelAssignments.map(assignment => (
                  <motion.div
                    key={assignment.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <AssignmentCard assignment={assignment} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Add 10W truck button */}
              {isActive && tenWheelAssignments.length < tenWheelLimit && (
                <div className="flex">
                  <TemplateCard
                    equipmentType="truck"
                    label="10W Truck"
                    onClick={() => handleOpenEquipmentSelector('truck', '10w')}
                    isCompact={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Equipment selector modal */}
        {selectedEquipmentType && (
          <EquipmentSelectorModal
            jobId={jobId}
            rowType={rowType}
            equipmentType={selectedEquipmentType}
            truckCategory={selectedTruckCategory}
            onClose={handleCloseSelector}
          />
        )}
        
        {/* Truck configuration modal */}
        {pendingTruckDrop && (
          <TruckConfigModal
            onSelect={handleTruckConfigSelect}
            onClose={handleTruckConfigClose}
          />
        )}
        
        {/* Person Modal */}
        {isPersonModalOpen && selectedPersonAssignment && (
          <PersonModal
            assignment={selectedPersonAssignment}
            onClose={handleClosePersonModal}
          />
        )}
        </div>
      </div>
    );
  }
  
  const templateCards = getTemplateCards();
  
  return (
    <div className={`border-b border-gray-200 transition-colors duration-200 relative ${
      !isActive ? 'p-1 min-h-[24px]' : 'p-2 min-h-[60px]'
    }`}>
      {/* Main drop target */}
      <div
        ref={drop}
        className={`w-full ${
          isOver && canDrop ? 'bg-blue-100' : isOver ? 'bg-red-100' : ''
        }`}
      >
      <div className={`w-full flex justify-between items-center ${!isActive ? 'mb-0' : 'mb-1'}`}>
        <div className="flex items-center">
          <span className={`${!isActive ? 'text-[10px]' : 'text-xs'} font-medium ${isActive ? 'text-gray-500' : 'text-gray-400'} ${!isActive ? 'line-through' : ''}`}>
            {label}
          </span>
          
          {/* Drop rules indicator - only show when active */}
          {isActive && (
            <div className="group relative">
              <Info size={12} className="ml-1 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                Allowed: {getDropRule(rowType).map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ') || 'None'}
              </div>
            </div>
          )}
          
          {isJobFinalized && (
            <Lock size={!isActive ? 10 : 12} className="ml-2 text-green-600" title="Job is finalized" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Toggle button for rows that can be toggled */}
          {canBeToggled && !isJobFinalized && (
            <button 
              onClick={handleToggleRow}
              className={`${!isActive ? 'p-0.5' : 'p-0.5'} rounded-sm ${isEnabled ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}
              title={isEnabled ? "Disable row" : "Enable row"}
            >
              {isEnabled ? <Check size={!isActive ? 10 : 14} /> : <X size={!isActive ? 10 : 14} />}
            </button>
          )}
          
          {/* Status indicators */}
          {isNeeded && !isEnabled && canBeToggled && (
            <span className={`${!isActive ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'} text-red-500 italic bg-red-50 rounded`}>
              Disabled
            </span>
          )}
          
          {!isNeeded && isEnabled && canBeToggled && (
            <span className={`${!isActive ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'} text-blue-600 italic bg-blue-50 rounded`}>
              Manually enabled
            </span>
          )}
          
          {/* Assignment count */}
          <span className={`${!isActive ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
            {assignments.length ? `${assignments.length} assigned` : ''}
          </span>
        </div>
      </div>
      
      {/* Display assignments - hide when inactive to minimize space */}
      {isActive && (
        <div className="space-y-2">
        {/* Actual assignments - vertical for crew, horizontal for others with operators on right */}
        <div className={rowType === 'crew' ? 'flex flex-col space-y-2' : isSplit ? 'flex justify-between items-stretch' : 'flex flex-col space-y-2'}>
          {/* For split rows: Left side for equipment/vehicles, right side for personnel */}
          {isSplit ? (
            <>
              {/* Left side: Equipment/Vehicles only */}
              <div className="flex flex-col gap-2 min-w-[120px] flex-shrink-0">
                {isSplit && rowConfig?.boxes[0] && (
                  <div className="text-xs font-medium text-gray-600 mb-1 bg-gray-100 px-2 py-1 rounded">
                    {rowConfig.boxes[0].name}
                  </div>
                )}
                <AnimatePresence>
                  {sortedAssignments
                    .filter(assignment => {
                      const resourceA = getResourceById(assignment.resourceId);
                      if (!resourceA) return false;
                      
                      // For split rows, use box rules
                      if (isSplit && rowConfig?.boxes[0]) {
                        return rowConfig.boxes[0].allowedTypes.includes(resourceA.type);
                      }
                      
                      return false;
                    })
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map(assignment => (
                      <motion.div
                        key={assignment.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="inline-block"
                      >
                        <AssignmentCard 
                          assignment={assignment}
                          onOpenPersonModal={handleOpenPersonModal}
                        />
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
              
              {/* Right side: Personnel only */}
              <div className="flex flex-col gap-2 min-w-[120px] flex-shrink-0 justify-start">
                {isSplit && rowConfig?.boxes[1] && (
                  <div className="text-xs font-medium text-gray-600 mb-1 bg-gray-100 px-2 py-1 rounded">
                    {rowConfig.boxes[1].name}
                  </div>
                )}
                <AnimatePresence>
                  {sortedAssignments
                    .filter(assignment => {
                      const resourceA = getResourceById(assignment.resourceId);
                      if (!resourceA) return false;
                      
                      // For split rows, use box rules
                      if (isSplit && rowConfig?.boxes[1]) {
                        return rowConfig.boxes[1].allowedTypes.includes(resourceA.type);
                      }
                      
                      return false;
                    })
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map(assignment => (
                      <motion.div
                        key={assignment.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="inline-block"
                      >
                        <AssignmentCard 
                          assignment={assignment}
                          onOpenPersonModal={handleOpenPersonModal}
                        />
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Vertical layout for all non-split rows */
            <AnimatePresence>
              {sortedAssignments.map(assignment => (
                <motion.div
                  key={assignment.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="block"
                >
                  <AssignmentCard 
                    assignment={assignment}
                    onOpenPersonModal={handleOpenPersonModal}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {/* Template cards underneath assignments */}
        {isActive && !isJobFinalized && templateCards.length > 0 && (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {templateCards.map((template) => (
                <motion.div
                  key={`template-${template.type}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <TemplateCard
                    equipmentType={template.type}
                    label={template.label}
                    onClick={() => handleOpenEquipmentSelector(template.type)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </div>
      )}
      
      {/* Equipment selector modal */}
      {selectedEquipmentType && (
        <EquipmentSelectorModal
          jobId={jobId}
          rowType={rowType}
          equipmentType={selectedEquipmentType}
          truckCategory={selectedTruckCategory}
          onClose={handleCloseSelector}
        />
      )}
      
      {/* Truck configuration modal */}
      {pendingTruckDrop && (
        <TruckConfigModal
          onSelect={handleTruckConfigSelect}
          onClose={handleTruckConfigClose}
        />
      )}
      
      {/* Person Modal */}
      {isPersonModalOpen && selectedPersonAssignment && (
        <PersonModal
          assignment={selectedPersonAssignment}
          onClose={handleClosePersonModal}
        />
      )}
      </div>
    </div>
  );
};

export default JobRow;