import React from 'react';
import { motion } from 'framer-motion';
import { useDrag, useDrop } from 'react-dnd';
import { Magnet } from '../../classes/Magnet';
import { ItemTypes } from '../../types';
import MagnetCard from './MagnetCard';

interface MagnetGroupProps {
  primaryMagnetId: string;
  attachedMagnetIds: string[];
  onDoubleClick?: () => void;
}

const MagnetGroup: React.FC<MagnetGroupProps> = ({ 
  primaryMagnetId, 
  attachedMagnetIds,
  onDoubleClick
}) => {
  // Drag functionality for the entire group
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.RESOURCE,
    item: { 
      type: ItemTypes.RESOURCE, 
      id: primaryMagnetId,
      attachedIds: attachedMagnetIds
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // Define equipment types for grouping logic
  const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                          'roller', 'dozer', 'payloader', 'equipment'];
  
  return (
    <motion.div 
      ref={drag}
      className="relative cursor-move group rounded-md transition-all duration-200 inline-block"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-start">
        {/* Main magnet */}
        <MagnetCard
          magnetId={primaryMagnetId}
          isMain={true}
          showAttachControls={false}
        />
        
        {/* Attached magnets */}
        {attachedMagnetIds.length > 0 && (
          <div className="flex flex-col gap-1 -ml-1">
            {attachedMagnetIds.map(id => (
              <MagnetCard
                key={id}
                magnetId={id}
                isAttached={true}
                isCompact={false}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Count indicator */}
      {attachedMagnetIds.length > 0 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center shadow-sm z-30 text-[9px]">
          {attachedMagnetIds.length + 1}
        </div>
      )}
    </motion.div>
  );
};

export default MagnetGroup;