import React, { useState } from 'react';
import { X, User, FileText, Clock, MapPin } from 'lucide-react';
import { Assignment } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import Portal from '../common/Portal';

interface PersonModalProps {
  assignment: Assignment;
  onClose: () => void;
}

const PersonModal: React.FC<PersonModalProps> = ({ assignment, onClose }) => {
  console.log('PersonModal component rendered with assignment:', assignment);
  const { getResourceById, getJobById, updateAssignmentNote, toggleResourceOnSite, isWorkingDouble, getResourceDoubleShiftJobs } = useScheduler();
  const [activeTab, setActiveTab] = useState<'stats' | 'note'>('stats');
  const [noteText, setNoteText] = useState(assignment.note || '');
  
  console.log('PersonModal - assignment.resourceId:', assignment.resourceId);
  console.log('PersonModal - getResourceById function type:', typeof getResourceById);
  
  const resource = getResourceById(assignment.resourceId);
  console.log('PersonModal - resource found:', resource);
  
  if (!resource) {
    console.warn('No resource found in PersonModal, closing');
    onClose();
    return null;
  }
  
  const job = assignment.jobId ? getJobById(assignment.jobId) : null;
  const workingDouble = resource ? isWorkingDouble(resource.id) : false;
  const doubleShiftJobs = resource ? getResourceDoubleShiftJobs(resource.id) : { dayJob: undefined, nightJob: undefined };
  
  console.log('PersonModal rendering', { resourceName: resource?.name, assignmentId: assignment.id });
  
  if (!resource) {
    console.warn('No resource found in PersonModal - assignment.resourceId:', assignment.resourceId);
    console.warn('Available resource IDs:', getResourceById ? 'getResourceById available' : 'getResourceById not available');
    onClose();
    return null;
  }
  
  const handleToggleOnSite = () => {
    if (!resource) return;
    
    logger.debug('PersonModal handleToggleOnSite called', {
      resourceName: resource.name,
      currentOnSite: resource.onSite,
      willToggleTo: !resource.onSite
    });
    
    // Toggle the resource onsite status
    toggleResourceOnSite(resource.id);
  };
  
  const handleSaveNote = () => {
    updateAssignmentNote(assignment.id, noteText);
    onClose();
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Clean parenthetical names like "(Monte) Alexander Sabo" to just "Alexander Sabo"
  const cleanName = (name: string) => {
    return name.replace(/\([^)]*\)\s*/g, '');
  };
  
  // Check if this is equipment/vehicle that needs location tracking
  const isEquipmentOrVehicle = resource && (
    ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 
     'dozer', 'payloader', 'roller', 'equipment', 'truck'].includes(resource.type)
  );

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <User className="mr-2 text-blue-600" size={20} />
              <h2 className="text-xl font-semibold">{cleanName(resource.name)}</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={16} className="inline mr-1" />
              {isEquipmentOrVehicle ? 'Equipment Info' : 'Stats'}
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'note'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={16} className="inline mr-1" />
              Note
            </button>
          </div>
          
          <div className="p-4">
            {activeTab === 'stats' && (
              <div className="space-y-4">
                {/* Equipment/Vehicle Location Section */}
                {isEquipmentOrVehicle && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Location & Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Current Location:</span>
                        <span className="font-medium">{resource.location || 'Unknown'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">On Site:</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleToggleOnSite}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              resource.onSite 
                                ? 'bg-green-600' 
                                : 'bg-red-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                resource.onSite ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${
                            resource.onSite ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {resource.onSite ? 'On Site' : 'Off Site'}
                          </span>
                        </div>
                      </div>
                      
                      {resource.onSite !== true && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex items-start">
                            <div className="text-yellow-600 mr-2">⚠️</div>
                            <div>
                              <p className="text-sm font-medium text-yellow-800">Equipment Needs to be Moved</p>
                              <p className="text-xs text-yellow-700 mt-1">
                                This {resource.type} is currently at {resource.location || 'unknown location'} and needs to be transported to the job site before work can begin.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {resource.vin && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">VIN:</span>
                          <span className="font-mono text-sm">{resource.vin}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {isEquipmentOrVehicle ? 'Equipment Details' : 'Personal Information'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{cleanName(resource.name)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{isEquipmentOrVehicle ? 'Type:' : 'Role:'}</span>
                      <span className="font-medium capitalize">
                        {resource.type === 'millingMachine' ? 'Milling Machine' : resource.type}
                      </span>
                    </div>
                    {resource.identifier && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{isEquipmentOrVehicle ? 'Unit #:' : 'ID:'}</span>
                        <span className="font-medium">{resource.identifier}</span>
                      </div>
                    )}
                    {resource.model && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Model:</span>
                        <span className="font-medium">{resource.model}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Shift Information</h3>
                  <div className="space-y-2 text-sm">
                    {workingDouble ? (
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
                          <span className="font-medium text-purple-800">Working Double Shift</span>
                        </div>
                        <div className="text-sm space-y-1">
                          {doubleShiftJobs.dayJob && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">☀️ Day Job:</span>
                              <span className="font-medium">{doubleShiftJobs.dayJob.name}</span>
                            </div>
                          )}
                          {doubleShiftJobs.nightJob && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">🌙 Night Job:</span>
                              <span className="font-medium">{doubleShiftJobs.nightJob.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Shift:</span>
                        <span className={`font-medium ${job?.shift === 'night' ? 'text-red-600' : 'text-blue-600'}`}>
                          {job?.shift === 'night' ? '🌙 Night' : '☀️ Day'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {assignment.note && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Note</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">{assignment.note}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'note' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Add Note for {cleanName(resource.name)}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    This note will be visible on the job board and associated with this person's assignment{job ? ` to ${job.name}` : ''}.
                  </p>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter your note here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PersonModal;