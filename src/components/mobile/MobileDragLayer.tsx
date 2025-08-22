import React from 'react';
import { useDragLayer } from 'react-dnd';
import { getDragLayerStyles } from '../../utils/dndBackend';
import { useDragContext } from '../../context/DragContext';
import ResourceCard from '../resources/ResourceCard';
import { ItemTypes } from '../../types';
import { useMobile } from '../../context/MobileContext';

const MobileDragLayer: React.FC = () => {
  const { isMobile, touchEnabled } = useMobile();
  const { dragState } = useDragContext();
  
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

  const renderItem = () => {
    if (!item) return null;

    switch (itemType) {
      case ItemTypes.RESOURCE:
        return (
          <div className={`transform scale-110 shadow-2xl border-2 rounded-lg bg-white p-1 ${
            dragState.isCtrlHeld ? 'border-purple-400' : 'border-blue-400'
          }`}>
            <ResourceCard 
              resource={item.resource} 
              isDragging={true}
              isCompact={false}
            />
            <div className={`text-xs text-center mt-1 font-medium ${
              dragState.isCtrlHeld ? 'text-purple-600' : 'text-blue-600'
            }`}>
              {dragState.isCtrlHeld ? 'Creating 2nd shift' : 'Drag to assign'}
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
            <div className="text-xs text-center mt-1 text-green-600 font-medium">
              Moving assignment
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