import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { ResourceType, RowType } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from '../resources/ResourceCard';
import { logger } from '../../utils/logger';
import Portal from '../common/Portal';

// Extend the assignment interface to include truck configuration
interface TruckConfiguration {
  type: 'flowboy' | 'dump-trailer';
}
interface EquipmentSelectorModalProps {
  jobId: string;
  rowType: RowType;
  equipmentType: ResourceType;
  truckCategory?: string;
  onClose: () => void;
}

const EquipmentSelectorModal: React.FC<EquipmentSelectorModalProps> = ({ 
  jobId, 
  rowType, 
  equipmentType, 
  truckCategory,
  onClose 
}) => {
  const { assignResourceWithTruckConfig, resources, assignments, getJobById, getTruckDriver } = useScheduler();
  const [searchTerm, setSearchTerm] = useState('');
  const [truckConfig, setTruckConfig] = useState<'flowboy' | 'dump-trailer'>('flowboy');
  
  // Helper function to categorize trucks (same as in JobRow)
  const categorizeTruck = (resource: any) => {
    if (!resource || resource.type !== 'truck') return null;
    
    // 10W truck unit numbers (can have tag trailers to tow equipment)
    const tenWheelUnits = ['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'];
    
    // Trac truck unit numbers: 43, 44, 49-76 (ONLY ones that can have flowboy/dump-trailer)
    const tracTruckUnits = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())]; // 49-76
    
    const unitNumber = resource.identifier || '';
    
    // 10W trucks can have tag trailers
    if (tenWheelUnits.includes(unitNumber)) {
      return '10w';
    }
    
    // Only trac trucks can have flowboy/dump-trailer configurations
    if (tracTruckUnits.includes(unitNumber)) {
      return 'trac';
    }
    
    // All other trucks cannot have trailer configurations
    return null;
  };
  
  // Set default truck config based on job type
  useEffect(() => {
    const job = getJobById(jobId);
    
    if (job?.type === 'milling') {
      setTruckConfig('dump-trailer');
    } else {
      setTruckConfig('flowboy');
    }
  }, [jobId, getJobById]);
  
  // Get all equipment of this type and mark which ones are assigned
  const allEquipment = resources.filter(resource => {
    // Must be the right equipment type
    if (resource.type !== equipmentType) return false;
    // If filtering trucks by category
    if (truckCategory && equipmentType === 'truck') {
      const category = categorizeTruck(resource);
      if (truckCategory === 'dump-trailer' || truckCategory === 'flowboy') {
        // Only trac trucks can have flowboy/dump-trailer configurations
        return category === 'trac';
      } else {
        // For 10w (tag trailers) or any other specific category, only show exact matches
        return category === truckCategory;
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           resource.identifier?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    return true;
  });
  
  logger.debug('Filtered equipment count', { count: allEquipment.length });
  
  // Get assigned resource IDs directly from assignments (ignore sidebar filters)
  const assignedResourceIds = new Set(assignments.map(a => a.resourceId));
  const assignedEquipmentIds = new Set(
    allEquipment
      .filter(r => assignedResourceIds.has(r.id))
      .map(r => r.id)
  );
  
  // Group equipment by model for better organization
  const groupedEquipment = allEquipment.reduce((groups, resource) => {
    const model = resource.model || 'Other';
    if (!groups[model]) {
      groups[model] = [];
    }
    groups[model].push(resource);
    return groups;
  }, {} as Record<string, typeof allEquipment>);
  
  // Handle selecting a piece of equipment
  const handleSelectEquipment = (resourceId: string) => {
    // Don't allow selection of assigned equipment
    if (assignedEquipmentIds.has(resourceId)) {
      return;
    }
    
    // For trucks, check if they have a driver assigned
    if (equipmentType === 'truck') {
      const truckDriver = getTruckDriver(resourceId);
      if (!truckDriver) {
        alert('This truck cannot be assigned to a job because it does not have a driver. Please assign a driver to this truck first.');
        return;
      }
    }
    
    // Create the assignment first
    const assignmentId = assignResourceWithTruckConfig(
      resourceId, 
      jobId, 
      rowType, 
      (equipmentType === 'truck' && (truckCategory === 'flowboy' || truckCategory === 'dump-trailer')) 
        ? truckConfig 
        : undefined
    );
    
    logger.debug('Equipment assignment created', { assignmentId, resourceId, truckConfig });
    
    onClose();
  };
  
  // Get a display name for the equipment type
  const getEquipmentTypeLabel = () => {
    if (equipmentType === 'truck' && truckCategory === '10w') {
      return '10W Trucks (Tag Trailers)';
    }
    if (equipmentType === 'truck' && truckCategory === 'dump-trailer') {
      return 'Trac Trucks (Dump Trailers)';
    }
    if (equipmentType === 'truck' && truckCategory === 'flowboy') {
      return 'Trac Trucks (Flowboy Trailers)';
    }
    switch (equipmentType) {
      case 'paver': return 'Pavers';
      case 'roller': return 'Rollers';
      case 'sweeper': return 'Sweepers';
      case 'millingMachine': return 'Milling Machines';
      case 'skidsteer': return 'Skidsteers';
      case 'excavator': return 'Excavators';
      case 'dozer': return 'Dozers';
      case 'payloader': return 'Payloaders';
      case 'truck': return 'Trucks';
      default: return 'Equipment';
    }
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Select {getEquipmentTypeLabel()}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 border-b">
            <div className="relative">
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
            
            {/* Truck Configuration Selector */}
            {equipmentType === 'truck' && (truckCategory === 'flowboy' || truckCategory === 'dump-trailer') && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trac Truck Configuration:
                </label>
                <select
                  value={truckConfig}
                  onChange={(e) => setTruckConfig(e.target.value as 'flowboy' | 'dump-trailer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="flowboy">Flowboy (F/B)</option>
                  <option value="dump-trailer">Dump Trailer (D/T)</option>
                </select>
              </div>
            )}
            
            {equipmentType === 'paver' && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> You can add an operator by dragging one onto the paver. To add a screwman (specialized laborer), click the "+ Screwman" button on the paver card.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {Object.keys(groupedEquipment).length === 0 ? (
              <p className="text-center text-gray-500 my-8">
                No {getEquipmentTypeLabel().toLowerCase()} available
              </p>
            ) : (
              Object.entries(groupedEquipment).map(([model, equipmentList]) => (
                <div key={model} className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{model}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {equipmentList.map(equipment => (
                      <div
                        key={equipment.id}
                        onClick={() => handleSelectEquipment(equipment.id)}
                        className={`transition-transform ${
                          assignedEquipmentIds.has(equipment.id) 
                            ? 'cursor-not-allowed' 
                            : 'cursor-pointer hover:scale-105'
                        }`}
                      >
                        <ResourceCard
                          resource={equipment}
                          isDragging={false}
                          isDisabled={assignedEquipmentIds.has(equipment.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default EquipmentSelectorModal;