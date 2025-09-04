import React, { useState } from 'react';
import { Filter, Search, Plus, Settings, Target } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import ResourceCard from '../resources/ResourceCard';
import TruckDriverSection from '../resources/TruckDriverSection';
import PersonModal from '../modals/PersonModal';
import { Assignment } from '../../types';
import { ResourceType } from '../../types';
import ErrorBoundary from '../common/ErrorBoundary';
import logger from '../../utils/logger';

const ResourceTypeFilter: React.FC = () => {
  const { filteredResourceType, setFilteredResourceType } = useScheduler();
  
  const resourceTypes = [
    { value: 'laborer', label: 'Laborers' },
    { value: 'foreman', label: 'Foremen' },
    { value: 'operator', label: 'Operators' },
    { value: 'truck', label: 'Trucks' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'skidsteer', label: 'Skidsteers' },
    { value: 'paver', label: 'Pavers' },
    { value: 'excavator', label: 'Excavators' },
    { value: 'sweeper', label: 'Sweepers' },
    { value: 'millingMachine', label: 'Milling Machines' },
    { value: 'roller', label: 'Rollers' },
    { value: 'dozer', label: 'Dozers' },
    { value: 'payloader', label: 'Payloaders' }
  ];
  
  return (
    <div className="flex flex-wrap gap-1 my-2">
      <button
        onClick={() => setFilteredResourceType(null)}
        className={`px-2 py-1 text-xs rounded-full ${
          filteredResourceType === null 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
      >
        All
      </button>
      
      {resourceTypes.map(type => (
        <button
          key={type.value}
          onClick={() => setFilteredResourceType(type.value)}
          className={`px-2 py-1 text-xs rounded-full ${
            filteredResourceType === type.value 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { getAvailableResources, searchTerm, setSearchTerm, resources, getAssignmentByResource, filteredResourceType, setFilteredResourceType, getResourceById, assignments, isWorkingDouble, jobs, selectedDate, currentView } = useScheduler();
  const { openModal, closeModal, getZIndex } = useModal();
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [activeTab, setActiveTab] = useState<'resources' | 'trucks'>('resources');
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [selectedPersonAssignment, setSelectedPersonAssignment] = useState<Assignment | null>(null);
  const [newResource, setNewResource] = useState({
    type: 'laborer' as ResourceType,
    name: '',
    identifier: ''
  });
  
  // Get all resources and mark which ones are assigned
  const allResources = resources.filter(resource => {
    // Apply search filter
    if (searchTerm && !resource.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !resource.identifier?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Apply type filter
    if (filteredResourceType && resource.type !== filteredResourceType) {
      return false;
    }
    
    return true;
  });
  
  // Get truly available resources (not assigned in current view's date range)
  // The getAvailableResources function now handles date filtering internally
  const unassignedResources = getAvailableResources();
  
  // Separate equipment and non-equipment resources from unassigned resources
  const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                       'roller', 'dozer', 'payloader', 'equipment'];
  
  const equipmentResources = unassignedResources.filter(resource => 
    equipmentTypes.includes(resource.type)
  );
  
  const personnelResources = unassignedResources.filter(resource => 
    !equipmentTypes.includes(resource.type)
  );
  
  const handleAddResource = () => {
    setIsAddingResource(true);
  };
  
  // Function to handle new resource submission would go here
  
  // Handle person click from resource pool
  const handlePersonClick = (resourceId: string) => {
    // Check if this person has an assignment
    const assignment = assignments.find(a => a.resourceId === resourceId);
    if (assignment) {
      setSelectedPersonAssignment(assignment);
      setIsPersonModalOpen(true);
      openModal('sidebar-person');
    } else {
      // Create a temporary assignment for unassigned personnel
      const tempAssignment: Assignment = {
        id: `temp-${resourceId}`,
        resourceId,
        jobId: '',
        row: 'crew',
        timeSlot: {
          startTime: '07:00',
          endTime: '15:30',
          isFullDay: true
        }
      };
      setSelectedPersonAssignment(tempAssignment);
      setIsPersonModalOpen(true);
      openModal('sidebar-person');
    }
  };
  
  return (
    <ErrorBoundary>
      <aside className="w-80 bg-white/95 border-r border-slate-200 flex flex-col h-full overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-2">Resource Pool</h2>
          
          {/* Tab Navigation */}
          <div className="flex border-b mb-3">
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resources
            </button>
            <button
              onClick={() => setActiveTab('trucks')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trucks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Trucks & Drivers
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
          
          {activeTab === 'resources' && (
            <>
              <div className="flex items-center mt-3">
                <Filter size={16} className="mr-2 text-gray-600" />
                <span className="text-sm text-gray-600">Filter by:</span>
              </div>
              
              <ResourceTypeFilter />
            </>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <ErrorBoundary>
            {activeTab === 'resources' ? (
              unassignedResources.length === 0 ? (
                <p className="text-center text-gray-500 mt-4">
                  No unassigned resources available with current filters
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Personnel section - 3 columns (same as equipment) */}
                  {personnelResources.length > 0 && (
                    <div className="grid grid-cols-3 gap-1">
                      {personnelResources.map(resource => (
                        <ResourceCard 
                          key={resource.id}
                          resource={resource}
                          isDragging={false}
                          isDisabled={false}
                          onPersonClick={() => handlePersonClick(resource.id)}
                          showDoubleShift={isWorkingDouble && isWorkingDouble(resource.id)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Equipment section - 3 columns */}
                  {equipmentResources.length > 0 && (
                    <div className="grid grid-cols-3 gap-1">
                      {equipmentResources.map(resource => (
                        <ResourceCard 
                          key={resource.id}
                          resource={resource}
                          isDragging={false}
                          isDisabled={false}
                          onPersonClick={() => handlePersonClick(resource.id)}
                          showDoubleShift={isWorkingDouble && isWorkingDouble(resource.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <TruckDriverSection searchTerm={searchTerm} />
            )}
          </ErrorBoundary>
        </div>
        
        <div className="p-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-2 text-center">
            💡 Hold <kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Ctrl</kbd> + drag to assign to 2nd shift
          </div>
          <div className="space-y-2">
            <button
              onClick={handleAddResource}
              className="flex items-center justify-center w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} className="mr-1" />
              <span>Add Resource</span>
            </button>
            
            <button
              onClick={() => openModal('master-settings')}
              className="flex items-center justify-center w-full py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <Settings size={16} className="mr-2" />
              <span>Settings</span>
            </button>
          </div>
        </div>
        
        {/* Person Modal */}
        {isPersonModalOpen && selectedPersonAssignment && (
          <PersonModal
            assignment={selectedPersonAssignment}
            onClose={() => {
              setIsPersonModalOpen(false);
              setSelectedPersonAssignment(null);
              closeModal('sidebar-person');
            }}
          />
        )}
        
      </aside>
    </ErrorBoundary>
  );
};

export default Sidebar;