import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, Users, Calendar } from 'lucide-react';
import Portal from '../common/Portal';
import { Resource, Assignment, Job } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface ResourceDeleteConfirmModalProps {
  resource: Resource;
  onClose: () => void;
  onConfirm: () => void;
}

const ResourceDeleteConfirmModal: React.FC<ResourceDeleteConfirmModalProps> = ({ 
  resource, 
  onClose, 
  onConfirm 
}) => {
  const { assignments, jobs, getAssignmentByResource } = useScheduler();
  const [isDeleting, setIsDeleting] = useState(false);
  const [resourceAssignments, setResourceAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    // Find all assignments for this resource
    const resourceAssignments = assignments.filter(assignment => assignment.resourceId === resource.id);
    setResourceAssignments(resourceAssignments);
  }, [assignments, resource.id]);

  const getJobsForResource = () => {
    return resourceAssignments.map(assignment => {
      const job = jobs.find(j => j.id === assignment.jobId);
      return job;
    }).filter(Boolean) as Job[];
  };

  const resourceJobs = getJobsForResource();
  const hasActiveAssignments = resourceAssignments.length > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert('Failed to delete resource. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getResourceIcon = () => {
    const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'roller', 'dozer', 'payloader', 'equipment'];
    if (resource.type === 'truck') return '🚛';
    if (equipmentTypes.includes(resource.type)) return '🚜';
    return '👤';
  };

  const getResourceTypeDisplay = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center">
              <AlertTriangle size={24} className="text-red-600 mr-3" />
              <h2 className="text-xl font-bold text-red-800">Delete Resource</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Resource Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">{getResourceIcon()}</span>
                <div>
                  <h3 className="font-semibold text-lg">{resource.name}</h3>
                  <p className="text-gray-600">
                    {getResourceTypeDisplay(resource.type)} - {resource.identifier}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Location: {resource.location || 'Not specified'}</p>
                {resource.model && <p>Model: {resource.model}</p>}
                <p>Status: {resource.onSite ? 'On Site' : 'Off Site'}</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertTriangle className="text-red-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-medium text-red-800 mb-2">
                    Are you sure you want to delete this resource?
                  </h4>
                  <p className="text-red-700 text-sm">
                    This action cannot be undone. The resource will be permanently removed from the system.
                  </p>
                </div>
              </div>
            </div>

            {/* Active Assignments Warning */}
            {hasActiveAssignments && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <Calendar className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Active Assignments Found
                    </h4>
                    <p className="text-yellow-700 text-sm mb-3">
                      This resource has {resourceAssignments.length} active assignment(s) that will also be deleted:
                    </p>
                    <div className="space-y-2">
                      {resourceJobs.slice(0, 3).map((job, index) => (
                        <div key={job.id} className="bg-yellow-100 rounded p-2 text-sm">
                          <div className="font-medium text-yellow-800">{job.name}</div>
                          <div className="text-yellow-600">
                            {job.schedule_date || 'No date set'}
                          </div>
                        </div>
                      ))}
                      {resourceJobs.length > 3 && (
                        <div className="text-xs text-yellow-600">
                          ...and {resourceJobs.length - 3} more assignment(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Impact Warning */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Deletion Impact</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Resource will be removed from all job assignments</p>
                <p>• Historical data will be preserved for reporting</p>
                <p>• Any truck-driver relationships will be cleared</p>
                <p>• Magnet attachments will be removed</p>
                {hasActiveAssignments && (
                  <p className="text-yellow-700 font-medium">
                    • {resourceAssignments.length} active assignment(s) will be deleted
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    {hasActiveAssignments ? 'Delete Resource & Assignments' : 'Delete Resource'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ResourceDeleteConfirmModal;