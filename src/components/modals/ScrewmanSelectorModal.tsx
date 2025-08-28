import React from 'react';
import { X } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from '../resources/ResourceCard';
import { ResourceType } from '../../types';
import Portal from '../common/Portal';

interface ScrewmanSelectorModalProps {
  assignmentId: string;  // The ID of the paver assignment to attach the screwman to
  onClose: () => void;
}

const ScrewmanSelectorModal: React.FC<ScrewmanSelectorModalProps> = ({ 
  assignmentId, 
  onClose 
}) => {
  const { 
    resources, 
    getAssignmentById, 
    assignResourceWithAttachment, 
    assignments, 
    getJobById,
    getResourceById,
    getMagnetInteractionRule,
    getMaxAttachmentsForType
  } = useScheduler();
  
  // Get the paver assignment
  const paverAssignment = getAssignmentById(assignmentId);
  const targetResource = paverAssignment ? getResourceById(paverAssignment.resourceId) : null;
  const targetResourceType = targetResource?.type;
  
  // Handle missing data in useEffect to avoid state updates during render
  React.useEffect(() => {
    if (!paverAssignment || !targetResourceType) {
      onClose();
    }
  }, [paverAssignment, targetResourceType, onClose]);
  
  if (!paverAssignment || !targetResourceType) {
    return null;
  }
  
  // Define the screwmen names (as specified)
  const screwmenNames = [
    "(Sam) Eddy Samuel Ruano De Paz",
    "(Jose Manuel) Jose Manuel Torres-Salmeron",
    "Sergio Ramirez"
  ];
  
  // Get all specified screwmen and check their assignment status
  const allScrewmen = resources.filter(resource => 
    resource.type === 'laborer' && 
    screwmenNames.some(name => 
      resource.name.includes(name.replace(/\([^)]*\) ?/g, ''))
    )
  );
  
  // Check assignment status for each screwman
  const screwmenWithStatus = allScrewmen.map(screwman => {
    const assignment = assignments.find(a => a.resourceId === screwman.id);
    const assignedJob = assignment ? getJobById(assignment.jobId) : null;
    
    // Check if this screwman can attach to the target equipment based on rules
    const rule = getMagnetInteractionRule(screwman.type, targetResourceType);
    const canAttachToTarget = rule?.canAttach || false;

    // Check if target equipment has reached max count for laborers (screwmen)
    const currentLaborerCountOnTarget = (paverAssignment.attachments || [])
      .map(id => getResourceById(getAssignmentById(id)?.resourceId!)?.type)
      .filter(attachedType => attachedType === 'laborer')
      .length;
    const maxLaborersAllowed = getMaxAttachmentsForType(screwman.type, targetResourceType);
    const targetHasCapacity = maxLaborersAllowed === 0 || currentLaborerCountOnTarget < maxLaborersAllowed;
    
    return {
      ...screwman,
      isAssigned: !!assignment,
      assignedJobName: assignedJob?.name,
      canBeSelected: canAttachToTarget && targetHasCapacity && !assignment
    };
  });
  
  // Handle selecting a screwman
  const handleSelectScrewman = (resourceId: string) => {
    const screwman = screwmenWithStatus.find(s => s.id === resourceId);
    if (!screwman?.canBeSelected) {
      return;
    }
    
    // Create assignment already attached to the paver
    const newAssignmentId = assignResourceWithAttachment(resourceId, assignmentId);
    
    if (newAssignmentId) {
      onClose();
    } else {
      console.error('Failed to create screwman assignment');
    }
  };
  
  // Handle backdrop click
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Select Screwman</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Select a specialized laborer with screwman skills:
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {screwmenWithStatus.length === 0 ? (
                <p className="col-span-2 text-center text-gray-500 my-4">
                  No screwmen found.
                </p>
              ) : (
                screwmenWithStatus.map(screwman => (
                  <div
                    key={screwman.id}
                    onClick={() => handleSelectScrewman(screwman.id)}
                    className={`transition-transform ${
                      !screwman.canBeSelected
                        ? 'cursor-not-allowed opacity-60' 
                        : 'cursor-pointer hover:scale-105'
                    }`}
                    title={!screwman.canBeSelected ? (screwman.isAssigned ? `Assigned to: ${screwman.assignedJobName}` : 'Cannot attach to this equipment type or max count reached') : undefined}
                  >
                    <ResourceCard
                      resource={screwman}
                      isDragging={false}
                      isDisabled={!screwman.canBeSelected}
                    />
                    {screwman.isAssigned && (
                      <div className="text-xs text-center text-red-600 mt-1 font-medium">
                        Assigned to {screwman.assignedJobName}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
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

export default ScrewmanSelectorModal;