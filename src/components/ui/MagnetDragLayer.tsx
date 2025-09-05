import React from 'react';
import { useDragLayer } from 'react-dnd';
import { ItemTypes } from '../../types';
import MagnetCard from '../magnets/MagnetCard';
import { magnetManager, MagnetStatus } from '../../classes/Magnet';

const MagnetDragLayer: React.FC = () => {
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

  // Only render when dragging a resource
  if (!isDragging || itemType !== ItemTypes.RESOURCE || !currentOffset || !item?.resource) {
    return null;
  }

  // Find the actual magnet by ID to get the real magnet data
  const magnet = magnetManager.getMagnet(item.id);
  if (!magnet) {
    return null;
  }

  const { x, y } = currentOffset;
  const transform = `translate(${x}px, ${y}px)`;
  
  // Check if magnet is already assigned using status enum
  const isAssigned = magnet.status === MagnetStatus.Assigned || magnet.status === MagnetStatus.MultiAssigned;
  const hasMultipleAssignments = magnet.status === MagnetStatus.MultiAssigned;
  
  // Determine drag feedback based on shift key and assignment status
  let dragMessage = '';
  let borderColor = 'border-blue-400';
  
  if (item.isSecondShift) {
    if (isAssigned) {
      dragMessage = hasMultipleAssignments ? 'Adding 3rd job' : 'Adding 2nd job';
      borderColor = hasMultipleAssignments ? 'border-red-500' : 'border-orange-500';
    } else {
      dragMessage = 'Creating 2nd shift';
      borderColor = 'border-purple-500';
    }
  } else {
    if (isAssigned) {
      dragMessage = hasMultipleAssignments ? 'Moving multiple jobs' : 'Moving assignment';
      borderColor = 'border-green-500';
    } else {
      dragMessage = 'Assigning to job';
      borderColor = 'border-blue-400';
    }
  }

  return (
    <div
      data-testid="magnet-drag-layer"
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        left: 0,
        top: 0,
        transform,
        WebkitTransform: transform,
        opacity: 0.9,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        scale: '1.1', // Slightly larger to show it's being dragged
      }}
    >
      {/* Render the actual MagnetCard being dragged with border indicator */}
      <div className={`pointer-events-none border-4 rounded-lg bg-white ${borderColor} shadow-xl`}>
        <MagnetCard 
          magnetId={magnet.id} 
          disableDrag={true}
          isCompact={false}
        />
        
        {/* Show drag action message */}
        <div className="bg-black bg-opacity-80 text-white text-xs px-2 py-1 text-center font-medium">
          {dragMessage}
          {item.isSecondShift && (
            <div className="text-[10px] opacity-75">
              Shift+Drag detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MagnetDragLayer;