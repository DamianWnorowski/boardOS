import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Resource, ItemTypes, DragItem } from '../../types';

interface TruckCardProps {
  truck: Resource;
  driver?: Resource;
  isAssigned: boolean;
  onAssignDriver: (truckId: string, driverId: string) => void;
  onUnassignDriver: (truckId: string) => void;
  availableDrivers: Resource[];
}

const TruckCard: React.FC<TruckCardProps> = ({
  truck,
  driver,
  isAssigned,
  onAssignDriver,
  onUnassignDriver,
  availableDrivers
}) => {
  const [showDriverSelector, setShowDriverSelector] = useState(false);
  
  // Handle drop functionality for drivers
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.RESOURCE,
    canDrop: (item: DragItem) => {
      // Only allow dropping drivers and only if truck doesn't have a driver
      return (item.resource.type === 'driver' || item.resource.type === 'privateDriver') && 
             !driver && !isAssigned;
    },
    drop: (item: DragItem) => {
      if (item.resource.type === 'driver' || item.resource.type === 'privateDriver') {
        onAssignDriver(truck.id, item.resource.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  
  const [{ opacity }, drag] = useDrag({
    type: ItemTypes.RESOURCE,
    item: { 
      type: ItemTypes.RESOURCE,
      id: truck.id,
      resource: truck,
    },
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.4 : 1,
    }),
    canDrag: !isAssigned,
  });
  
  // Parse truck name and number
  const parseEquipmentName = () => {
    const match = truck.name.match(/^(.+)\s+#(.+)$/);
    if (match) {
      return { model: `#${match[2]}`, number: getTruckType(match[2]) };
    }
    return { model: `#${truck.identifier || ''}`, number: getTruckType(truck.identifier || '') };
  };
  
  // Function to determine truck type based on unit number
  const getTruckType = (unitNumber: string) => {
    const num = unitNumber;
    
    // 10W trucks
    if (['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'].includes(num)) {
      return '10W';
    }
    
    // Trac trucks
    if (num === '43' || num === '44' || (parseInt(num) >= 49 && parseInt(num) <= 76)) {
      return 'Trac';
    }
    
    return 'TBD';
  };
  
  const { model, number } = parseEquipmentName();
  
  // Clean driver name
  const cleanDriverName = (name: string) => {
    return name.replace(/\([^)]*\)\s*/g, '').trim();
  };
  
  // Parse driver name into first and last name
  const parseDriverName = (name: string) => {
    const cleanName = cleanDriverName(name);
    const nameParts = cleanName.split(' ');
    
    if (nameParts.length === 0) return { firstName: '', lastName: '' };
    if (nameParts.length === 1) return { firstName: nameParts[0], lastName: '' };
    
    // First name is the first part, last name is everything else
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    return { firstName, lastName };
  };
  
  const handleAssignDriver = (driverId: string) => {
    onAssignDriver(truck.id, driverId);
    setShowDriverSelector(false);
  };
  
  const handleUnassignDriver = () => {
    onUnassignDriver(truck.id);
  };
  
  return (
    <div 
      ref={(node) => drag(drop(node))}
      style={{ opacity }}
      data-testid={`truck-card-${truck.id}`}
      data-truck-id={truck.id}
      data-truck-type={getTruckType(truck.identifier || '')}
      data-has-driver={!!driver}
      data-assigned={isAssigned}
      className={`relative transition-all duration-200 ${
        isAssigned ? 'opacity-60' : 'cursor-move'
      } bg-black text-white border border-gray-300 rounded-md shadow-sm ${
        isOver && canDrop ? 'ring-2 ring-2-blue-400' : ''
      }`}
    >
      {/* Main truck display */}
      <div className="p-2">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {driver ? (
              <>
                <div className="text-xs font-medium truncate">
                  {model}
                </div>
                <div className="text-[9px] text-center text-gray-300 truncate">
                  {parseDriverName(driver.name).firstName}
                </div>
                <div className="text-[9px] text-center text-gray-300 truncate">
                  {parseDriverName(driver.name).lastName}
                </div>
              </>
            ) : (
              <div className="text-xs font-medium truncate">
                {model}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {/* Unassign driver button */}
            {driver && !isAssigned && (
              <button
                onClick={handleUnassignDriver}
                className="p-1 text-red-400 hover:text-red-300 rounded text-xs"
                title="Remove driver"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Driver selector dropdown */}
        {showDriverSelector && availableDrivers.length > 0 && (
          <div className="mt-2 border-t border-gray-600 pt-2">
            <div className="text-[9px] text-gray-300 mb-1">Select Driver:</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {availableDrivers.map(availableDriver => (
                <button
                  key={availableDriver.id}
                  onClick={() => handleAssignDriver(availableDriver.id)}
                  className="block w-full text-left text-[9px] text-gray-200 hover:text-white hover:bg-gray-800 px-1 py-0.5 rounded truncate"
                >
                  {cleanDriverName(availableDriver.name)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Assignment overlay */}
      {isAssigned && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-20 rounded-md flex items-center justify-center">
          <span className="text-[8px] text-gray-300 font-medium">ASSIGNED</span>
        </div>
      )}
    </div>
  );
};

export default TruckCard;