import React from 'react';
import { X } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from '../resources/ResourceCard';
import { ResourceType } from '../../types';
import Portal from '../common/Portal';

interface OperatorSelectorModalProps {
  assignmentId: string;  // The ID of the equipment assignment to attach the operator to
  onClose: () => void;
}

const OperatorSelectorModal: React.FC<OperatorSelectorModalProps> = ({ 
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
  
  // Get the equipment assignment
  const equipmentAssignment = getAssignmentById(assignmentId);
  
  if (!equipmentAssignment) {
    onClose();
    return null;
  }
  
  const targetResource = getResourceById(equipmentAssignment.resourceId);
  const targetResourceType = targetResource?.type;
  
  if (!targetResourceType) {
    onClose();
    return null;
  }
  
  // Get all operators and check their assignment status
  const allOperators = resources.filter(resource => 
    resource.type === 'operator'
  );
  
  // Check assignment status for each operator
  const operatorsWithStatus = allOperators.map(operator => {
    const assignment = assignments.find(a => a.resourceId === operator.id);
    const assignedJob = assignment ? getJobById(assignment.jobId) : null;
    
    // Check if this operator can attach to the target equipment based on rules
    const rule = getMagnetInteractionRule(operator.type, targetResourceType);
    const canAttachToTarget = rule?.canAttach || false;

    // Check if target equipment has reached max count for operators
    const currentOperatorCountOnTarget = (equipmentAssignment.attachments || [])
      .map(id => getResourceById(getAssignmentById(id)?.resourceId!)?.type)
      .filter(attachedType => attachedType === 'operator')
      .length;
    const maxOperatorsAllowed = getMaxAttachmentsForType(operator.type, targetResourceType);
    const targetHasCapacity = maxOperatorsAllowed === 0 || currentOperatorCountOnTarget < maxOperatorsAllowed;
    
    return {
      ...operator,
      isAssigned: !!assignment,
      assignedJobName: assignedJob?.name,
      canBeSelected: canAttachToTarget && targetHasCapacity && !assignment
    };
  });
  
  // Handle selecting an operator
  const handleSelectOperator = (resourceId: string) => {
    const operator = operatorsWithStatus.find(op => op.id === resourceId);
    if (!operator?.canBeSelected) {
      return;
    }
    
    // Create assignment already attached to the equipment
    const newAssignmentId = assignResourceWithAttachment(resourceId, assignmentId);
    
    if (newAssignmentId) {
      onClose();
    } else {
      console.error('Failed to create operator assignment');
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 relative">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Select Operator</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Select an operator for this equipment:
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              {operatorsWithStatus.length === 0 ? (
                <p className="col-span-3 text-center text-gray-500 my-4">
                  No operators found.
                </p>
              ) : (
                operatorsWithStatus.map(operator => (
                  <div
                    key={operator.id}
                    onClick={() => handleSelectOperator(operator.id)}
                    className={`transition-transform ${
                      operator.isAssigned 
                        ? 'cursor-not-allowed opacity-60' 
                        : !operator.canBeSelected 
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:scale-105'
                    }`}
                    title={!operator.canBeSelected ? (operator.isAssigned ? `Assigned to: ${operator.assignedJobName}` : 'Cannot attach to this equipment type or max count reached') : undefined}
                  >
                    <ResourceCard
                      resource={operator}
                      isDisabled={!operator.canBeSelected}
                      isDragging={false}
                    />
                    {operator.isAssigned && (
                      <div className="text-xs text-center text-red-600 mt-1 font-medium">
                        Assigned to {operator.assignedJobName}
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

export default OperatorSelectorModal;