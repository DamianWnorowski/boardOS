import React, { useState } from 'react';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from './ResourceCard';
import TruckCard from './TruckCard';
import PersonModal from '../modals/PersonModal';
import { Assignment } from '../../types';

interface TruckDriverSectionProps {
  searchTerm: string;
}

const TruckDriverSection: React.FC<TruckDriverSectionProps> = ({ searchTerm }) => {
  const { 
    resources, 
    assignments, 
    assignDriverToTruck, 
    unassignDriverFromTruck,
    getTruckDriver,
    getDriverTruck,
    truckDriverAssignments,
    jobs,
    selectedDate,
    currentView
  } = useScheduler();
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [selectedPersonAssignment, setSelectedPersonAssignment] = useState<Assignment | null>(null);
  
  // Get all trucks and drivers
  const allTrucks = resources.filter(r => r.type === 'truck');
  const allDrivers = resources.filter(r => r.type === 'driver' || r.type === 'privateDriver');
  
  // Get assignments for the current view's date range
  const getAssignmentsForCurrentView = () => {
    if (currentView === 'month') {
      // For month view, show all assignments (global availability)
      return assignments;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (currentView === 'day') {
      // For day view, only show assignments for the selected date
      const dateStr = selectedDate.toISOString().split('T')[0];
      return assignments.filter(assignment => {
        const job = jobs.find(j => j.id === assignment.jobId);
        if (!job) return false;
        
        // If job has no schedule_date, it defaults to today
        const jobDate = job.schedule_date || today;
        return jobDate === dateStr;
      });
    }
    
    if (currentView === 'week') {
      // For week view, show assignments for the current week
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start from Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // End on Saturday
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      return assignments.filter(assignment => {
        const job = jobs.find(j => j.id === assignment.jobId);
        if (!job) return false;
        
        // If job has no schedule_date, it defaults to today
        const jobDate = job.schedule_date || today;
        return jobDate >= weekStartStr && jobDate <= weekEndStr;
      });
    }
    
    return assignments;
  };

  // Get assigned resource IDs for the current view's date range
  const relevantAssignments = getAssignmentsForCurrentView();
  const assignedResourceIds = new Set(relevantAssignments.map(a => a.resourceId));
  
  // Filter by search term
  const filteredTrucks = allTrucks.filter(truck => {
    if (!searchTerm) return true;
    return truck.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           truck.identifier?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  const filteredDrivers = allDrivers.filter(driver => {
    if (!searchTerm) return true;
    return driver.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           driver.identifier?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Categorize trucks
  const categorizeTruck = (truck: any) => {
    const tenWheelUnits = ['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'];
    const tracUnits = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())]; // 49-76
    const unitNumber = truck.identifier || '';
    
    if (tenWheelUnits.includes(unitNumber)) {
      return '10w';
    }
    
    if (tracUnits.includes(unitNumber)) {
      return 'trac';
    }
    
    return null; // Don't show other trucks
  };
  
  const tenWheelTrucks = filteredTrucks.filter(truck => categorizeTruck(truck) === '10w');
  const tracTrucks = filteredTrucks.filter(truck => categorizeTruck(truck) === 'trac');
  
  // Calculate assigned vs total trucks
  const getAssignedCount = (trucks: any[]) => {
    return trucks.filter(truck => assignedResourceIds.has(truck.id)).length;
  };
  
  const tenWheelAssigned = getAssignedCount(tenWheelTrucks);
  const tracAssigned = getAssignedCount(tracTrucks);
  
  // Calculate available counts
  const tenWheelAvailable = tenWheelTrucks.length - tenWheelAssigned;
  const tracAvailable = tracTrucks.length - tracAssigned;
  
  // Get available drivers (not assigned to jobs and not assigned to trucks)
  const availableDrivers = filteredDrivers.map(driver => {
    // Check if this driver is assigned to any truck
    const assignedTruckId = Object.keys(truckDriverAssignments).find(
      truckId => truckDriverAssignments[truckId] === driver.id
    );
    const assignedTruck = assignedTruckId ? allTrucks.find(t => t.id === assignedTruckId) : null;
    
    return {
      ...driver,
      isAssignedToTruck: !!assignedTruckId,
      assignedTruck
    };
  });
  
  // Handle person click for drivers
  const handlePersonClick = (resourceId: string) => {
    // Check if this driver has an assignment
    const assignment = assignments.find(a => a.resourceId === resourceId);
    if (assignment) {
      setSelectedPersonAssignment(assignment);
      setIsPersonModalOpen(true);
    } else {
      // Create a temporary assignment for unassigned drivers
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
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Trucks Section - Side by side layout */}
      <div className="flex space-x-4">
        {/* 10W Trucks - Single Column */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            10W Trucks ({tenWheelAvailable}/{tenWheelTrucks.length})
          </h3>
          <div className="space-y-2">
            {tenWheelTrucks.map(truck => (
              <TruckCard 
                key={truck.id}
                truck={truck}
                driver={getTruckDriver(truck.id)}
                isAssigned={assignedResourceIds.has(truck.id)}
                onAssignDriver={assignDriverToTruck}
                onUnassignDriver={unassignDriverFromTruck}
                availableDrivers={availableDrivers}
              />
            ))}
          </div>
          {tenWheelTrucks.length === 0 && (
            <p className="text-xs text-gray-500 italic">
              No 10W trucks found
            </p>
          )}
        </div>
      
        {/* Trac Trucks - Two Columns */}
        <div className="flex-1 flex-grow-2" style={{ flex: '2' }}>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Trac Trucks ({tracAvailable}/{tracTrucks.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {tracTrucks.map(truck => (
              <TruckCard 
                key={truck.id}
                truck={truck}
                driver={getTruckDriver(truck.id)}
                isAssigned={assignedResourceIds.has(truck.id)}
                onAssignDriver={assignDriverToTruck}
                onUnassignDriver={unassignDriverFromTruck}
                availableDrivers={availableDrivers}
              />
            ))}
          </div>
          {tracTrucks.length === 0 && (
            <p className="text-xs text-gray-500 italic">
              No Trac trucks found
            </p>
          )}
        </div>
      </div>
      
      {/* Available Drivers Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Available Drivers ({availableDrivers.length})
        </h3>
        <div className="grid grid-cols-3 gap-1">
          {availableDrivers.map(driverWithStatus => (
            <div key={driverWithStatus.id} className="flex flex-col">
              <ResourceCard 
                resource={driverWithStatus}
                isDragging={false}
                isDisabled={assignedResourceIds.has(driverWithStatus.id) || driverWithStatus.isAssignedToTruck}
                assignedTruckNumber={driverWithStatus.assignedTruck?.identifier}
                onPersonClick={() => handlePersonClick(driverWithStatus.id)}
              />
            </div>
          ))}
        </div>
        {availableDrivers.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            All drivers are assigned
          </p>
        )}
      </div>
      
      {/* Person Modal */}
      {isPersonModalOpen && selectedPersonAssignment && (
        <PersonModal
          assignment={selectedPersonAssignment}
          onClose={() => {
            setIsPersonModalOpen(false);
            setSelectedPersonAssignment(null);
          }}
        />
      )}
    </div>
  );
};

export default TruckDriverSection;