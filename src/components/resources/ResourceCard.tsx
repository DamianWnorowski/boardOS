import React from 'react';
import { useDrag } from 'react-dnd';
import { StickyNote } from 'lucide-react';
import { logger } from '../../utils/logger';
import { Resource, ItemTypes } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import { useMobile } from '../../context/MobileContext';
import { useDragContext } from '../../context/DragContext';
import { getMobileDragSourceOptions } from '../../utils/dndBackend';
import { getResourceStyle, getResourceBorder, getShiftStatusBorder } from '../../utils/colorSystem';
import { getCompleteBorderStyle } from '../../utils/colorSystem';

interface ResourceCardProps {
  resource: Resource;
  isDragging: boolean;
  isMain?: boolean;
  isAttached?: boolean;
  isCompact?: boolean;
  isDisabled?: boolean;
  assignmentId?: string; // Add assignment ID prop
  assignedTruckNumber?: string; // Add assigned truck number prop
  onPersonClick?: () => void; // Add click handler for personnel
  hasNote?: boolean; // Add prop to indicate if assignment has a note
  showDoubleShift?: boolean; // Add prop to show double shift indicator
}

const ResourceCard: React.FC<ResourceCardProps> = ({ 
  resource, 
  isDragging, 
  isMain = false,
  isAttached = false,
  isCompact = false,
  isDisabled = false,
  assignmentId,
  assignedTruckNumber,
  onPersonClick,
  hasNote = false,
  showDoubleShift = false
}) => {
  const { getTruckDriver, assignments, getJobById } = useScheduler();
  const { isMobile, touchEnabled } = useMobile();
  const { getIsCtrlHeld } = useDragContext();
  
  // Function to determine truck type based on unit number
  const getTruckType = (unitNumber: string) => {
    const num = unitNumber;
    
    // Attenuator trucks
    if (['124', '125', '126', '127', '128', '160', '162'].includes(num)) {
      return 'Attenuator';
    }
    
    // Crew trucks  
    if (['12', '15', '25', '35', '45'].includes(num)) {
      return 'Crew Truck';
    }
    
    // Compressor trucks
    if (['120', '130', '140'].includes(num)) {
      return 'Compressor';
    }
    
    // Concrete trucks
    if (['161', '164'].includes(num)) {
      return 'Concrete';
    }
    
    // Trac trucks
    if (num === '43' || num === '44' || (parseInt(num) >= 49 && parseInt(num) <= 76)) {
      return 'Trac';
    }
    
    // All others
    return 'TBD';
  };
  
  // Determine if we're in a normal view (in the resource pool) or a compact view (attached)
  const isResourcePool = !isMain && !isAttached;
  
  const isEquipmentOrVehicle = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 
                                'dozer', 'payloader', 'roller', 'equipment', 'truck'].includes(resource.type);
  
  const [{ opacity, isDragging: dragIsDragging }, drag] = useDrag({
    type: ItemTypes.RESOURCE,
    item: (monitor) => {
     logger.debug('🚀 ResourceCard drag STARTED for:', resource.name, resource.type);
      const isCtrlHeld = getIsCtrlHeld();
      
      const dragItem = { 
        type: ItemTypes.RESOURCE,
        id: resource.id,
        resource,
        isSecondShift: isCtrlHeld,
        _handled: false // Add tracking flag
      };
      
      // Store drag item globally for visual feedback
      (window as any).currentDragItem = dragItem;
      
     logger.debug('🚀 ResourceCard created drag item:', dragItem);
      
      return dragItem;
    },
    options: touchEnabled ? getMobileDragSourceOptions() : undefined,
   end: (item, monitor) => {
     logger.debug('🚀 ResourceCard drag END for:', resource.name, 'didDrop:', monitor.didDrop(), 'dropResult:', monitor.getDropResult());
     // Reset the handled flag for next drag
     if (item) {
       (item as any)._handled = false;
     }
   },
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.4 : 1,
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isDisabled || (window.event as any)?.ctrlKey, // Allow dragging even if assigned when Ctrl is held
  });
  
  // Add visual feedback when Ctrl is held
  const [isCtrlHeld, setIsCtrlHeld] = React.useState(false);
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlHeld(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlHeld(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  const isEquipment = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                       'roller', 'dozer', 'payloader', 'equipment'].includes(resource.type);
  
  // Get truck configuration if this is a truck
  const getTruckConfiguration = () => {
    if (resource.type !== 'truck') return null;
    
    // Check if this is a 10W truck - they don't have F/B or D/T configurations
    const tenWheelUnits = ['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'];
    const unitNumber = resource.identifier || '';
    if (tenWheelUnits.includes(unitNumber)) {
      return null; // 10W trucks don't have configurations
    }
    
    // If we have an assignment ID, get the specific config for this assignment
    if (assignmentId) {
      const truckConfigs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
      const config = truckConfigs[assignmentId];
      return config || null;
    }
    
    // If no assignment ID (resource pool), return null
    return null;
  };
  
  // Get the truck configuration
  const truckConfig = getTruckConfiguration();
 
  // Check if this truck type can have configurations
  const canHaveTrailerConfig = () => {
    if (resource.type !== 'truck') return false;
    
    // Only trac trucks can have flowboy/dump-trailer configurations
    const tracTruckUnits = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())]; // 49-76
    const unitNumber = resource.identifier || '';
    
    return tracTruckUnits.includes(unitNumber);
  };
  
  // Only return config if truck can have trailer configurations
  const finalTruckConfig = canHaveTrailerConfig() ? truckConfig : null;
  
  // Clean up invalid configurations from localStorage
  if (resource.type === 'truck' && assignmentId && truckConfig && !canHaveTrailerConfig()) {
    logger.debug('🧹 Cleaning invalid truck config for non-trac truck:', resource.identifier);
  }
  
  // Handle click for personnel
  const handleClick = (e: React.MouseEvent) => {
    // Handle clicks for any resource when onPersonClick is provided and not disabled
    // This includes personnel AND trucks (for adding notes to assignments)
    if (onPersonClick && !isDisabled) {
      e.stopPropagation();
      e.preventDefault();
      logger.debug('ResourceCard clicked, calling onPersonClick for:', resource.name);
      onPersonClick();
    }
  };
  
  // Debug log for truck display
  if (resource.type === 'truck' && assignmentId) {
    logger.debug(`ResourceCard rendering truck ${resource.identifier} with assignmentId ${assignmentId} and config:`, finalTruckConfig);
  }
  
  // Get assigned driver for trucks
  const assignedDriver = resource.type === 'truck' ? getTruckDriver(resource.id) : null;
  
  // Clean driver name
  const cleanDriverName = (name: string) => {
    return name.replace(/\([^)]*\)\s*/g, '');
  };
  
  const getCardStyle = () => {
    return isDisabled ? 'bg-gray-300 text-gray-500' : getResourceStyle(resource.type);
  };
  
  // Get border styling with shift status
  const getBorderStyling = () => {
    if (isDisabled) return 'border border-gray-400';
    
    // Check if this resource is working shifts
    const resourceAssignments = assignments?.filter(a => a.resourceId === resource.id) || [];
    const assignedJobs = resourceAssignments.map(a => getJobById(a.jobId)).filter(Boolean);
    const hasNightJob = assignedJobs.some(job => job.shift === 'night');
    const hasDayJob = assignedJobs.some(job => job.shift === 'day');
    const hasMultipleDayJobs = assignedJobs.filter(job => job.shift === 'day').length > 1;
    
    return getCompleteBorderStyle(resource.type, hasMultipleDayJobs, hasNightJob, hasDayJob);
  };
  
  // Add specific styling based on the card's role in the attachment group
  const attachmentStyle = () => {
    if (isMain) {
      return 'rounded-md shadow-md';
    } else if (isAttached) {
      return 'rounded-md shadow-sm';
    }
    return 'rounded-md shadow-sm';
  };
  
  // Clean parenthetical names like "(Monte) Alexander Sabo" to just "Alexander Sabo"
  const cleanName = (name: string) => {
    return name.replace(/\([^)]*\)\s*/g, '');
  };
  
  // Parse name into components for display (max 2 lines)
  const parseNameForDisplay = (fullName: string) => {
    const cleanedName = cleanName(fullName).trim();
    const nameParts = cleanedName.split(' ');
    
    // For names with 2 or fewer parts, use standard first/last split
    if (nameParts.length <= 2) {
      return { 
        line1: nameParts[0] || '', 
        line2: nameParts[1] || ''
      };
    }
    
    // For names with more than 2 parts, put first name on line 1, rest on line 2
    return {
      line1: nameParts[0],
      line2: nameParts.slice(1).join(' ')
    };
  };
  
  const { line1, line2 } = parseNameForDisplay(resource.name);
  
  // Width style - using fixed width rather than full width
  const widthStyle = isMobile ? 'w-20' : 'w-24'; // Smaller on mobile
  const compactStyle = isCompact ? 'scale-90 origin-left' : '';
  
  // Extract model and number for equipment display
  const parseEquipmentName = () => {
    if (!isEquipment && resource.type !== 'truck') return { model: "", number: "" };
    
    // For trucks, handle the display with configuration
    if (resource.type === 'truck') {
      // Get unit number for truck type determination
      const unitNumber = resource.identifier || '';
      const truckType = getTruckType(unitNumber);
      
      return { 
        model: `#${unitNumber}`, 
        number: truckType 
      };
    }
    
    const match = resource.name.match(/^(.+)\s+#(.+)$/);
    if (match) {
      return { model: match[1], number: match[2] };
    }
    return { model: resource.name, number: "" };
  };
  
  const { model, number } = parseEquipmentName();
  
  const isPersonnel = !isEquipment && resource.type !== 'truck';
  
  // Resource pool view
  if (isResourcePool) {
    // Resource pool card with consistent height for both personnel and equipment
    return (
      <div 
        ref={drag}
        style={{ opacity }}
        className={`relative px-1 py-0.5 transition-all duration-200 ${getCardStyle()} ${getBorderStyling()} ${resource.type === 'foreman' ? 'font-semibold' : ''} ${attachmentStyle()} ${isMobile ? 'h-12' : 'h-10'} flex flex-col justify-center ${widthStyle} ${compactStyle} ${
          isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-move'
        } ${!isDisabled && onPersonClick && !isMobile ? 'hover:ring-2 hover:ring-blue-400' : ''} ${isMobile ? 'touch-manipulation active:scale-95' : ''} ${
          isPersonnel && !isDisabled && onPersonClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''
        }`}
        onClick={handleClick}
        onDragStart={(e) => {
          // Store Ctrl key state globally for drag operations
          // Also store the current drag item for visual feedback with enhanced context
          (window as any).currentDragItem = {
            resource,
            isSecondShift: getIsCtrlHeld(),
            dragStartTime: Date.now(),
            sourceLocation: 'resource-pool'
          };
        }}
      >
        {(isEquipment || resource.type === 'truck') ? (
          <>
            <div className={`text-xs font-medium text-center truncate ${resource.type === 'truck' ? 'text-white' : ''}`} 
                 title={resource.type === 'truck' ? `Config: ${finalTruckConfig || 'none'}` : undefined}>
              {resource.type === 'truck' ? 
                `#${resource.identifier || ''}${finalTruckConfig === 'flowboy' ? ' F/B' : finalTruckConfig === 'dump-trailer' ? ' D/T' : ''}` : 
                model}
            </div>
            {resource.type !== 'truck' && (
              <div className={`text-[9px] text-center font-bold`}>
                {number ? `#${number}` : ''}
              </div>
            )}
            {/* Show assigned driver for trucks */}
            {resource.type === 'truck' && assignedDriver && (
              <div className="text-[9px] text-center text-gray-300 truncate">
                {cleanName(assignedDriver.name)}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs font-medium text-center truncate">
              {line1}
            </div>
            {line2 && (
              <div className="text-[7px] text-center opacity-80 truncate">
                {line2}
              </div>
            )}
            {assignedTruckNumber ? (
              <div className="text-[6px] text-center text-red-600 font-semibold truncate">
                Assigned #{assignedTruckNumber}
              </div>
            ) : (!line2 && resource.identifier) ? (
              <div className="text-[9px] text-center opacity-80 truncate">
                {resource.identifier}
              </div>
            ) : null}
          </>
        )}
        
        {/* On-site indicator for vehicles */}
        {(resource.type === 'truck' || resource.type === 'sweeper') && resource.onSite === true && (
          <div className="absolute bottom-0.5 right-0.5 bg-green-600 text-white text-[8px] font-bold px-1 py-0.5 rounded z-40">
            O.S
          </div>
        )}
        
        {/* Note indicator */}
        {hasNote && (
          <StickyNote 
            size={16} 
            className="absolute -bottom-1 -right-1 text-yellow-600 bg-yellow-100 rounded-full p-0.5 shadow-md border border-yellow-300 z-40" 
          />
        )}
        
        {/* Double shift indicator */}
        {showDoubleShift && (
          <div className="absolute -top-1 -left-1 bg-purple-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow-md z-40">
            2X
          </div>
        )}
        
        {/* Off-site warning indicator */}
        {(dragIsDragging || !isResourcePool) && ['skidsteer', 'paver', 'excavator', 'millingMachine', 'roller', 'dozer', 'payloader', 'equipment'].includes(resource.type) && resource.onSite !== true && (
          <div 
            className="absolute -top-2 -left-2 bg-orange-500 text-white p-0.5 rounded-full shadow-md z-40"
            title={`Needs to be moved from ${resource.location || 'current location'}`}
          >
            <span className="text-[10px] font-bold">⚠</span>
          </div>
        )}
      </div>
    );
  }
  
  // Assignment view - keep same height as resource pool for consistency
  return (
    <div 
      ref={isMain || isAttached ? null : drag}
      style={{ opacity }}
      className={`relative px-1 py-0.5 transition-all duration-200 ${getCardStyle()} ${getBorderStyling()} ${resource.type === 'foreman' ? 'font-semibold' : ''} ${attachmentStyle()} ${isMobile ? 'h-12' : 'h-10'} flex flex-col justify-center ${widthStyle} ${compactStyle} ${
        isDisabled ? 'cursor-not-allowed opacity-60' : (isMain || isAttached ? 'cursor-default' : 'cursor-move')
      } ${!isDisabled && onPersonClick && !isMobile ? 'hover:ring-2 hover:ring-blue-400' : ''} ${isMobile ? 'touch-manipulation active:scale-95' : ''} ${
        isPersonnel && !isDisabled && onPersonClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''
      }`}
      onClick={handleClick}
      onDragStart={(e) => {
        // Store Ctrl key state globally for drag operations
        (window as any).dragCtrlKey = e.ctrlKey;
        // Also store the current drag item for visual feedback
        (window as any).currentDragItem = {
          resource,
          isSecondShift: e.ctrlKey
        };
      }}
    >
      {resource.type === 'truck' ? (
        <>
          <div className="text-[9px] font-medium text-center truncate text-white" title={`Truck config: ${finalTruckConfig || 'none'}`}>
            #{resource.identifier || ''}{finalTruckConfig === 'flowboy' ? ' F/B' : finalTruckConfig === 'dump-trailer' ? ' D/T' : ''}
          </div>
          {assignedDriver && (
            <div className="text-[9px] text-center text-gray-300 truncate">
              {cleanDriverName(assignedDriver.name)}
            </div>
          )}
        </>
      ) : (isEquipment ? (
        <>
          <div className="text-xs font-medium text-center truncate">
            {model}
          </div>
          <div className="text-[9px] text-center font-bold">
            {number ? `#${number}` : ''}
          </div>
        </>
      ) : (
        <>
          <div className="text-xs font-medium text-center truncate">
            {line1}
          </div>
          {line2 && (
            <div className="text-[9px] text-center opacity-80 truncate">
              {line2}
            </div>
          )}
          {!line2 && resource.identifier && (
            <div className="text-[9px] text-center opacity-80 truncate">
              {resource.identifier}
            </div>
          )}
        </>
      ))}
      
      {/* On-site indicator for vehicles */}
      {(resource.type === 'truck' || resource.type === 'sweeper') && resource.onSite === true && (
        <div className="absolute bottom-0.5 right-0.5 bg-green-600 text-white text-[8px] font-bold px-1 py-0.5 rounded z-40">
          O.S
        </div>
      )}
      
      {/* Note indicator */}
      {hasNote && (
        <StickyNote 
          size={16} 
          className="absolute -bottom-1 -right-1 text-yellow-600 bg-yellow-100 rounded-full p-0.5 shadow-md border border-yellow-300 z-40" 
        />
      )}
      
      {/* Off-site warning indicator */}
      {(dragIsDragging || !isResourcePool) && isEquipment && resource.onSite !== true && (
        <div 
          className="absolute -top-2 -left-2 bg-orange-500 text-white p-0.5 rounded-full shadow-md z-40"
          title={`Needs to be moved from ${resource.location || 'current location'}`}
        >
          <span className="text-[10px] font-bold">⚠</span>
        </div>
      )}
    </div>
  );
};

export default ResourceCard;