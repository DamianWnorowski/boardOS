import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Job, Assignment } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';

interface SendSMSModalProps {
  job: Job;
  onClose: () => void;
}

interface PersonWithMessage {
  assignment: Assignment;
  resource: any;
  message: string;
  sent: boolean;
  sending: boolean;
  error?: string;
}

const SendSMSModal: React.FC<SendSMSModalProps> = ({ job, onClose }) => {
  const { assignments, getResourceById } = useScheduler();
  const { getTruckDriver } = useScheduler();
  const { getZIndex } = useModal();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [people, setPeople] = useState<PersonWithMessage[]>([]);
  const [editingMessage, setEditingMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to determine time indicator color (same logic as AssignmentCard)
  const getTimeIndicatorColor = (resource: any, attachedAssignments: Assignment[] = []) => {
    // For vehicles (trucks/sweepers), check their onSite status
    if ((resource.type === 'truck' || resource.type === 'sweeper') && resource.onSite !== true) {
      return 'blue'; // Blue for offsite vehicles
    }
    
    // For personnel, compare both the person's AND any attached vehicle's onSite status
    if (resource.type !== 'truck' && resource.type !== 'sweeper') {
      // Check if this person is attached to a vehicle
      const attachedVehicleAssignment = attachedAssignments.find(a => {
        const attachedResource = getResourceById(a.resourceId);
        return attachedResource && (attachedResource.type === 'truck' || attachedResource.type === 'sweeper');
      });
      
      if (attachedVehicleAssignment) {
        const attachedVehicle = getResourceById(attachedVehicleAssignment.resourceId);
        // Only check the vehicle's onSite status since personnel don't have onSite
        if (attachedVehicle.onSite !== true) {
          return 'blue'; // Blue because vehicle is offsite
        }
      }
      // Personnel not attached to vehicles always use green (job site time)
    }
    
    return 'green'; // Green for onsite or personnel
  };

  // Initialize people with their messages
  useEffect(() => {
    const jobAssignments = assignments.filter(a => a.jobId === job.id);
    const mainAssignments = jobAssignments.filter(a => !a.attachedTo);
    
    const allPeople: PersonWithMessage[] = [];
    
    mainAssignments.forEach(assignment => {
      const resource = getResourceById(assignment.resourceId);
      if (resource) {
        // Add main assignment if it's a person
        if (!['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
              'roller', 'dozer', 'payloader', 'equipment', 'truck'].includes(resource.type)) {
          allPeople.push({
            assignment,
            resource,
            message: generateMessageForPerson(resource, assignment),
            sent: false,
            sending: false
          });
        }
        
        // If this is a truck assignment, add the truck driver
        if (resource.type === 'truck') {
          const truckDriver = getTruckDriver(resource.id);
          if (truckDriver) {
            // Create a pseudo-assignment for the truck driver
            const driverAssignment: Assignment = {
              ...assignment,
              id: `${assignment.id}-driver`,
              resourceId: truckDriver.id
            };
            
            allPeople.push({
              assignment: driverAssignment,
              resource: truckDriver,
              message: generateMessageForPerson(truckDriver, driverAssignment),
              sent: false,
              sending: false
            });
          }
        }
        
        // Add attached people
        const attachedAssignments = jobAssignments.filter(a => a.attachedTo === assignment.id);
        attachedAssignments.forEach(attachedAssignment => {
          const attachedResource = getResourceById(attachedAssignment.resourceId);
          if (attachedResource && !['truck', 'equipment'].includes(attachedResource.type)) {
            allPeople.push({
              assignment: attachedAssignment,
              resource: attachedResource,
              message: generateMessageForPerson(attachedResource, attachedAssignment),
              sent: false,
              sending: false
            });
          }
        });
      }
    });
    
    setPeople(allPeople);
  }, [job.id, assignments, getResourceById]);

  const generateMessageForPerson = (resource: any, assignment: Assignment) => {
    const cleanName = resource.name.replace(/\([^)]*\)\s*/g, '');
    
    // Get all job assignments to find attachments
    const jobAssignments = assignments.filter(a => a.jobId === job.id);
    
    // Find what this person is attached to or attached assignments if they're main
    let attachedAssignments: Assignment[] = [];
    let isAttachedToTracTruckWithFlowboy = false;
    let isDrivingTracTruckWithFlowboy = false;
    
    if (assignment.attachedTo) {
      // This person is attached to something, get the parent assignment
      const parentAssignment = jobAssignments.find(a => a.id === assignment.attachedTo);
      if (parentAssignment) {
        attachedAssignments = [parentAssignment];
        
        // Check if attached to a trac truck with flowboy configuration
        const parentResource = getResourceById(parentAssignment.resourceId);
        if (parentResource?.type === 'truck') {
          const truckConfigs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
          const config = truckConfigs[parentAssignment.id];
          const tracTruckUnits = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())];
          const unitNumber = parentResource.identifier || '';
          
          if (tracTruckUnits.includes(unitNumber) && config === 'flowboy') {
            isAttachedToTracTruckWithFlowboy = true;
          }
        }
      }
    } else {
      // This person might have things attached to them
      attachedAssignments = jobAssignments.filter(a => a.attachedTo === assignment.id);
      
      // Check if this person is a truck driver driving a trac truck with flowboy
      if (resource.type === 'driver' || resource.type === 'privateDriver') {
        // Check if this driver is assigned to a truck in this job
        const truckAssignment = jobAssignments.find(a => {
          const truckResource = getResourceById(a.resourceId);
          if (truckResource?.type === 'truck') {
            const truckDriver = getTruckDriver(truckResource.id);
            return truckDriver?.id === resource.id;
          }
          return false;
        });
        
        if (truckAssignment) {
          const truckResource = getResourceById(truckAssignment.resourceId);
          if (truckResource) {
            const config = truckAssignment.truckConfig;
            const tracTruckUnits = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())];
            const unitNumber = truckResource.identifier || '';
            
            if (tracTruckUnits.includes(unitNumber) && config === 'flowboy') {
              isDrivingTracTruckWithFlowboy = true;
            }
          }
        }
      }
      
      // Check if this person IS a trac truck with flowboy configuration
      if (resource.type === 'truck') {
        const config = assignment.truckConfig;
        const tracTruckUnits = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())];
        const unitNumber = resource.identifier || '';
        
        if (tracTruckUnits.includes(unitNumber) && config === 'flowboy') {
          isAttachedToTracTruckWithFlowboy = true;
        }
      }
    }
    
    // Get equipment they're assigned to
    let equipment = 'None';
    if (assignment.attachedTo) {
      const parentAssignment = assignments.find(a => a.id === assignment.attachedTo);
      if (parentAssignment) {
        const parentResource = getResourceById(parentAssignment.resourceId);
        if (parentResource) {
          equipment = parentResource.name;
        }
      }
    } else {
      // If they're not attached to equipment, list their role
      equipment = resource.type.charAt(0).toUpperCase() + resource.type.slice(1);
    }
    
    const startTime = assignment.timeSlot?.startTime || job.startTime || '07:00';
    const location = job.location 
      ? `${job.location.address}\nhttps://maps.google.com/?q=${job.location.lat},${job.location.lng}`
      : 'TBD';
    
    // For trac trucks with flowboy, always use "out of the yard" and include plant info
    let timeDescription;
    if (isAttachedToTracTruckWithFlowboy || isDrivingTracTruckWithFlowboy) {
      let plantInfo = '';
      if (job.plants && job.plants.length > 0) {
        plantInfo = ` - Go to ${job.plants.join(' or ')} plant for asphalt`;
      }
      timeDescription = `${startTime} out of the yard${plantInfo}`;
    } else {
      // Use normal color logic for everyone else
      const timeColor = getTimeIndicatorColor(resource, attachedAssignments);
      timeDescription = timeColor === 'blue' ? `${startTime} out of the yard` : `${startTime} on the job`;
    }
    
    let message = `Name: ${cleanName}
Equipment: ${equipment}
Time: ${timeDescription}
Location: ${location}`;
    
    // Add personal note if it exists
    if (assignment.note && assignment.note.trim()) {
      message += `\nNote: ${assignment.note.trim()}`;
    }
    
    return message;
  };

  const handleEditMessage = () => {
    setEditingMessage(people[currentIndex]?.message || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const updatedPeople = [...people];
    updatedPeople[currentIndex].message = editingMessage;
    setPeople(updatedPeople);
    setIsEditing(false);
  };

  const handleSendMessage = async () => {
    const currentPerson = people[currentIndex];
    if (!currentPerson) return;

    // Update sending state
    const updatedPeople = [...people];
    updatedPeople[currentIndex].sending = true;
    setPeople(updatedPeople);

    try {
      const response = await fetch('https://your-backend-url.com/schedule/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentPerson.message,
          recipient: currentPerson.resource.name,
          jobId: job.id,
          assignmentId: currentPerson.assignment.id
        }),
      });

      if (response.ok) {
        updatedPeople[currentIndex].sent = true;
        updatedPeople[currentIndex].sending = false;
        updatedPeople[currentIndex].error = undefined;
        setPeople([...updatedPeople]);
        
        // Move to next person after 1 second
        setTimeout(() => {
          if (currentIndex < people.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
        }, 1000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      updatedPeople[currentIndex].sending = false;
      updatedPeople[currentIndex].error = 'Failed to send message';
      setPeople([...updatedPeople]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsEditing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < people.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsEditing(false);
    }
  };

  const currentPerson = people[currentIndex];
  const totalSent = people.filter(p => p.sent).length;

  if (people.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Send Job Messages</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <div className="p-4 text-center">
            <p>No personnel found for this job.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Send Job Messages</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Person {currentIndex + 1} of {people.length}</span>
            <span>{totalSent} sent</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(totalSent / people.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4">
          {currentPerson && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">
                    {currentPerson.resource.name.replace(/\([^)]*\)\s*/g, '')}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {currentPerson.sent && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Sent ✓
                      </span>
                    )}
                    {currentPerson.error && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Error
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                  Role: {currentPerson.resource.type.charAt(0).toUpperCase() + currentPerson.resource.type.slice(1)}
                </div>

                {/* Message preview/editing */}
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Message Preview:</span>
                    {!isEditing && (
                      <button
                        onClick={handleEditMessage}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <Edit3 size={14} className="mr-1" />
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editingMessage}
                        onChange={(e) => setEditingMessage(e.target.value)}
                        rows={6}
                        className="w-full p-2 border rounded-md text-sm font-mono"
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {currentPerson.message}
                    </pre>
                  )}
                </div>

                {currentPerson.error && (
                  <div className="mt-2 text-red-600 text-sm">
                    Error: {currentPerson.error}
                  </div>
                )}
              </div>

              {/* Navigation and action buttons */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex items-center px-3 py-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === people.length - 1}
                    className="flex items-center px-3 py-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>

                <div className="flex space-x-2">
                  {currentPerson.sent ? (
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm">
                      Message Sent ✓
                    </span>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      disabled={currentPerson.sending || isEditing}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentPerson.sending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Summary when all sent */}
        {totalSent === people.length && (
          <div className="p-4 border-t bg-green-50">
            <div className="text-center">
              <div className="text-green-800 font-medium mb-2">
                All messages sent successfully! ✓
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendSMSModal;