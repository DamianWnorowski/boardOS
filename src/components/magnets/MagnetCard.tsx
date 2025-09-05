import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../types';
import { MagnetStatus, magnetManager } from '../../classes/Magnet';
import { useMagnet } from '../../hooks/useMagnet';
import { Clock } from 'lucide-react';

interface MagnetCardProps {
  magnetId: string;
  isMain?: boolean;
  isAttached?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  showAttachControls?: boolean;
  disableDrag?: boolean; // Disable the drag functionality on this card
}

const MagnetCard: React.FC<MagnetCardProps> = ({
  magnetId,
  isMain = false,
  isAttached = false,
  isCompact = false,
  onClick,
  onDoubleClick,
  showAttachControls = false,
  disableDrag = false
}) => {
  const {
    magnet,
    startDrag,
    endDrag
  } = useMagnet(magnetId);

  const [{ opacity }, drag] = useDrag(() => ({
    type: ItemTypes.RESOURCE,
    item: () => {
      startDrag();
      return magnet ? {
        type: ItemTypes.RESOURCE,
        id: magnet.id,
        resource: {
          id: magnet.resourceId,
          type: magnet.type,
          name: magnet.name
        }
      } : { type: ItemTypes.RESOURCE };
    },
    end: () => {
      endDrag();
    },
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.4 : 1,
    }),
    canDrag: () => {
      const canDrag = !!magnet && !isAttached && !disableDrag;
      return canDrag;
    }
  }), [magnet, startDrag, endDrag, isAttached, disableDrag]);

  const cardRef = useRef<HTMLDivElement>(null);

  if (!magnet) return null;

  // Get display name or equipment info based on type
  const isEquipment = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine',
                       'roller', 'dozer', 'payloader', 'equipment'].includes(magnet.type);

  let displayText: {line1: string, line2: string};
  let modelNumber: {model: string, number: string} = {model: '', number: ''};

  if (isEquipment) {
    modelNumber = magnet.getEquipmentDisplayInfo();
    displayText = {
      line1: modelNumber.model,
      line2: modelNumber.number ? `#${modelNumber.number}` : ''
    };
  } else {
    displayText = magnet.getDisplayName();
  }

  // Format time from time slot if available
  const formatTime = (time: string) => {
    // Simple 24h to 12h conversion
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Determine which magnet's schedule to reference
  const parentMagnet = magnet.attachedToId
    ? magnetManager.getMagnet(magnet.attachedToId)
    : undefined; // when attached, this is the vehicle magnet
  
  // Attached crew members should always use parent's schedule if parent exists and has assignments
  const timeSourceMagnet = (isAttached && parentMagnet && parentMagnet.assignments.length > 0) 
    ? parentMagnet 
    : magnet;

  // Get time slot info if assigned to multiple jobs
  // Attached crew members display the parent vehicle's time slot when available

  const hasTimeSlot = timeSourceMagnet.assignments.length > 0 &&
                     timeSourceMagnet.assignments[0].timeSlot &&
                     !timeSourceMagnet.assignments[0].timeSlot.isFullDay;

  const timeSlot = hasTimeSlot ? timeSourceMagnet.assignments[0].timeSlot : null; // use parent's slot for attached crew

  const isMultiAssigned =
    timeSourceMagnet.status === MagnetStatus.MultiAssigned; // multi-assignment also inherited from parent

  // Determine the color of the time indicator.
  // Crew magnets attached to vehicles should reflect the vehicle's on-site status
  const timeIndicatorColor =
    ((timeSourceMagnet.type === 'truck' || timeSourceMagnet.type === 'sweeper') &&
      (timeSourceMagnet as any).onSite !== true)
      ? 'bg-blue-500'
      : 'bg-green-500';

  
  // Width style - using fixed width rather than full width
  const widthStyle = isEquipment ? 'w-28' : 'w-24';
  const compactStyle = isCompact ? 'scale-90 origin-left' : '';
  
  // If in resource pool (not attached or main)
  if (!isMain && !isAttached) {
    return (
      <div 
        ref={(node) => {
          if (node) {
            if (!disableDrag) {
              drag(node);
            }
            cardRef.current = node;
          }
        }}
        style={{ opacity }}
        className={`px-1 py-0.5 transition-all duration-200 ${magnet.color} ${magnet.borderColor} rounded-md shadow-sm hover:shadow cursor-move h-10 flex flex-col justify-center ${widthStyle}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {isEquipment ? (
          <>
            <div className="text-xs font-medium text-center truncate">
              {displayText.line1}
            </div>
            {displayText.line2 && (
              <div className="text-[9px] text-center font-bold">
                {displayText.line2}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs font-medium text-center truncate">
              {displayText.line1}
            </div>
            {displayText.line2 && (
              <div className="text-[9px] text-center truncate">
                {displayText.line2}
              </div>
            )}
            {!displayText.line2 && magnet.identifier && (
              <div className="text-[9px] text-center opacity-80 truncate">
                {magnet.identifier}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  // Compact view for assigned/attached magnets
  return (
    <div 
        ref={isMain || isAttached ? null : (node) => {
          if (node) {
            if (!disableDrag) {
              drag(node);
            }
            cardRef.current = node;
          }
        }}
      style={{ opacity }}
      className={`p-0.5 transition-all duration-200 relative ${magnet.color} ${magnet.borderColor} rounded-md ${isMain ? 'shadow-md' : 'shadow-sm'} ${widthStyle} ${compactStyle} h-8 flex flex-col justify-center`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {isEquipment ? (
        <>
          <div className="text-[9px] font-medium text-center truncate">
            {displayText.line1}
          </div>
          {displayText.line2 && (
            <div className="text-[7px] text-center font-bold">
              {displayText.line2}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-[9px] font-medium text-center truncate">
            {displayText.line1}
          </div>
          {displayText.line2 && (
            <div className="text-[7px] text-center opacity-80 truncate">
              {displayText.line2}
            </div>
          )}
          {!displayText.line2 && magnet.identifier && (
            <div className="text-[7px] text-center opacity-80 truncate">
              {magnet.identifier}
            </div>
          )}
        </>
      )}
      
      {/* Show multi-job indicator */}
      {isMultiAssigned && !isEquipment && (
        <div 
          className="absolute -top-1 -right-1 bg-orange-500 text-white p-0.5 rounded-full cursor-pointer shadow-md z-40"
          title="Assigned to multiple jobs - click to manage schedule"
        >
          <Clock size={12} />
        </div>
      )}
      
      {/* Show time slot if available */}
      {timeSlot && (
        <div
          className={`absolute -top-1 -right-1 ${timeIndicatorColor} text-white px-1 py-0.5 rounded-sm text-[8px] shadow-sm z-40`}
          title="Click to edit time schedule"
        >
          {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
        </div>
      )}
      
      {/* Show attachment controls if needed */}
      {showAttachControls && magnet.requiredAttachments.length > 0 && (
        <div className="flex flex-col -ml-1 mt-1">
          {magnet.type === 'paver' && (
            <div 
              className="flex bg-green-500 text-white text-[8px] rounded-full h-4 w-16 px-1 items-center justify-center cursor-pointer shadow-sm z-20 hover:bg-green-600 border border-white"
            >
              + Screwman
            </div>
          )}
          
          {['paver', 'roller', 'excavator', 'sweeper', 'millingMachine', 
            'dozer', 'payloader', 'skidsteer'].includes(magnet.type) && (
            <div 
              className="flex bg-blue-500 text-white text-[8px] rounded-full h-4 w-14 px-1 items-center justify-center cursor-pointer shadow-sm z-20 hover:bg-blue-600 mb-px border border-white"
            >
              + Operator
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MagnetCard;