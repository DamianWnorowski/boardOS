import React, { useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { ItemTypes } from '../../types';
import MagnetCard from '../magnets/MagnetCard';
import { Magnet, MagnetStatus } from '../../classes/Magnet';
import { useScheduler } from '../../context/SchedulerContext';

interface DraggableQuickSelectCardProps {
  magnet: Magnet;
  onDragStart: () => void;
  isSelected?: boolean;
  selectedIndex?: number;
}

const DraggableQuickSelectCard: React.FC<DraggableQuickSelectCardProps> = ({ 
  magnet, 
  onDragStart,
  isSelected = false,
  selectedIndex
}) => {
  const { assignments } = useScheduler();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  // Get actual assignments for this magnet from scheduler context
  const magnetAssignments = assignments.filter(a => a.resourceId === magnet.resourceId);
  const actualAssignmentCount = magnetAssignments.length;
  
  // Use scheduler assignments instead of magnet.assignments
  const isAssigned = actualAssignmentCount > 0;
  const hasMultipleAssignments = actualAssignmentCount > 1;
  
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.RESOURCE,
    item: (monitor) => {
      // Use the state-based shift detection which is more reliable for testing
      onDragStart();
      return {
        type: ItemTypes.RESOURCE,
        id: magnet.id,
        isSecondShift: isShiftPressed,
        resource: {
          id: magnet.resourceId,
          type: magnet.type,
          name: magnet.name
        }
      };
    },
    collect: (monitor) => {
      const dragging = monitor.isDragging();
      if (dragging) {
        }
      return {
        isDragging: dragging
      };
    },
    canDrag: () => {
      // Use date-aware availability check instead of global status
      const canDrag = magnet.isAvailableOnDate(selectedDate, jobs);
      return canDrag;
    }
  }), [magnet, onDragStart, isShiftPressed, isAssigned]);

  // Track shift key state for more reliable shift detection across browsers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Use empty image for preview since we'll use a custom drag layer
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div
      ref={drag}
      className={`relative cursor-move ${isDragging ? 'opacity-50' : 'opacity-100'} ${
        isSelected ? 'ring-2 ring-blue-400 ring-opacity-75 rounded-lg' : ''
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={`Drag ${magnet.name} to assign to a job`}
      onMouseDown={(e) => {
        // Update shift state based on actual mouse event (more reliable than keyboard events)
        if (e.shiftKey !== isShiftPressed) {
          setIsShiftPressed(e.shiftKey);
          }
        // Prevent default browser behavior when shift is held (text selection, etc.)
        if (e.shiftKey) {
          e.preventDefault();
          }
      }}
      onMouseMove={(e) => {
        }}
      onDragStart={(e) => {
        }}
    >
      {isSelected && selectedIndex !== undefined && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
          ✓
        </div>
      )}
      
      {/* Show assignment status indicators */}
      {isAssigned && (
        <div className="absolute -top-1 -right-1 z-20 flex gap-1">
          {hasMultipleAssignments ? (
            <div className="bg-orange-500 text-white px-1 py-0.5 rounded text-[8px] font-bold shadow-md border border-white">
              MULTI
            </div>
          ) : (
            <div className="bg-green-500 text-white px-1 py-0.5 rounded text-[8px] font-bold shadow-md border border-white">
              ASSIGNED
            </div>
          )}
        </div>
      )}
      
      {/* Show shift+drag instruction for assigned magnets */}
      {isAssigned && (
        <div className="absolute -bottom-2 left-0 right-0 text-[8px] text-center bg-black bg-opacity-75 text-white px-1 rounded">
          Shift+Drag for 2nd job
        </div>
      )}
      
      <MagnetCard magnetId={magnet.id} disableDrag={true} />
    </div>
  );
};

export default DraggableQuickSelectCard;