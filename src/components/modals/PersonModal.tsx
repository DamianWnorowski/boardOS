import React, { useState } from 'react';
import { X, User, FileText, Clock, MapPin, Edit3, Save } from 'lucide-react';
import { Assignment } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import Portal from '../common/Portal';

interface PersonModalProps {
  assignment: Assignment;
  onClose: () => void;
}

const PersonModal: React.FC<PersonModalProps> = ({ assignment, onClose }) => {
  console.log('PersonModal component rendered with assignment:', assignment);
  const { getResourceById, getJobById, updateAssignmentNote, updateResource, toggleResourceOnSite, isWorkingDouble, getResourceDoubleShiftJobs } = useScheduler();
  const [activeTab, setActiveTab] = useState<'stats' | 'note' | 'edit'>('stats');
  const [noteText, setNoteText] = useState(assignment.note || '');
  const [editedResource, setEditedResource] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
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
  
  // Initialize edited resource when resource changes
  React.useEffect(() => {
    if (resource && !editedResource) {
      setEditedResource({ 
        ...resource,
        certifications: resource.certifications || [],
        skills: resource.skills || []
      });
    }
  }, [resource, editedResource]);
  
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
  
  const handleEditChange = (field: string, value: any) => {
    setEditedResource((prev: any) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };
  
  const handleSaveEdit = () => {
    if (editedResource && hasUnsavedChanges) {
      // Ensure certifications and skills are arrays
      const resourceToSave = {
        ...editedResource,
        certifications: Array.isArray(editedResource.certifications) ? editedResource.certifications : [],
        skills: Array.isArray(editedResource.skills) ? editedResource.skills : []
      };
      updateResource(resourceToSave);
      setHasUnsavedChanges(false);
      onClose();
    }
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

  const availableCertifications = [
    { value: 'cdl', label: 'CDL', description: 'Commercial Driver\'s License' },
    { value: 'hazmat', label: 'HAZMAT', description: 'Hazardous Materials' },
    { value: 'osha', label: 'OSHA', description: 'Safety Certification' }
  ];

  const equipmentSkills = [
    { value: 'skidsteer', label: 'Skid Steer' },
    { value: 'paver', label: 'Paver' },
    { value: 'excavator', label: 'Excavator' },
    { value: 'sweeper', label: 'Sweeper' },
    { value: 'millingMachine', label: 'Milling Machine' },
    { value: 'grader', label: 'Grader' },
    { value: 'dozer', label: 'Dozer' },
    { value: 'payloader', label: 'Payloader' },
    { value: 'roller', label: 'Roller' }
  ];

  const handleToggleCertification = (certValue: string) => {
    const currentCerts = editedResource?.certifications || [];
    const updatedCerts = currentCerts.includes(certValue)
      ? currentCerts.filter((cert: string) => cert !== certValue)
      : [...currentCerts, certValue];
    handleEditChange('certifications', updatedCerts);
  };

  const handleToggleSkill = (skillValue: string) => {
    const currentSkills = editedResource?.skills || [];
    const updatedSkills = currentSkills.includes(skillValue)
      ? currentSkills.filter((skill: string) => skill !== skillValue)
      : [...currentSkills, skillValue];
    handleEditChange('skills', updatedSkills);
  };

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
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Edit3 size={16} className="inline mr-1" />
              Edit
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
                
                {/* Personnel Certifications Section */}
                {!isEquipmentOrVehicle && resource.certifications && resource.certifications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {resource.certifications.map((cert: string) => (
                        <span 
                          key={cert}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200"
                        >
                          {cert.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Personnel Equipment Skills Section */}
                {!isEquipmentOrVehicle && resource.skills && resource.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Equipment Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {resource.skills.filter((skill: string) => 
                        ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 
                         'dozer', 'payloader', 'roller', 'tracTruckDriver', '10wTruckDriver', 'heavyVehicleOperation'].includes(skill)
                      ).map((skill: string) => (
                        <span 
                          key={skill}
                          className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200"
                        >
                          {skill === 'millingMachine' ? 'Milling Machine' : 
                           skill === 'tracTruckDriver' ? 'Trac Truck' :
                           skill === '10wTruckDriver' ? '10W Truck' :
                           skill === 'heavyVehicleOperation' ? 'Heavy Vehicle' :
                           skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Personnel Physical Skills Section */}
                {!isEquipmentOrVehicle && resource.skills && resource.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Physical Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {resource.skills.filter((skill: string) => 
                        ['pavingRaker', 'screwman', 'asphaltRaker', 'shoveler', 'groundman', 
                         'materialHandler', 'pipeLayer', 'formSetter', 'concreteFinisher', 'safetySpotter'].includes(skill)
                      ).map((skill: string) => (
                        <span 
                          key={skill}
                          className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full border border-purple-200"
                        >
                          {skill === 'pavingRaker' ? 'Paving Raker' :
                           skill === 'asphaltRaker' ? 'Asphalt Raker' :
                           skill === 'materialHandler' ? 'Material Handler' :
                           skill === 'pipeLayer' ? 'Pipe Layer' :
                           skill === 'formSetter' ? 'Form Setter' :
                           skill === 'concreteFinisher' ? 'Concrete Finisher' :
                           skill === 'safetySpotter' ? 'Safety Spotter' :
                           skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </span>
                      ))}
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
                     {!isEquipmentOrVehicle && resource.location && (
                       <div className="flex justify-between">
                         <span className="text-gray-500">Home Base:</span>
                         <span className="font-medium">{resource.location}</span>
                       </div>
                     )}
                  </div>
                </div>
                
                {/* Current Assignment Information */}
                {assignment.jobId && job && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Assignment</h3>
                    <div className="space-y-2 text-sm bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Job:</span>
                        <span className="font-medium">{job.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Row:</span>
                        <span className="font-medium capitalize">{assignment.row}</span>
                      </div>
                      {assignment.timeSlot && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span className="font-medium">
                            {assignment.timeSlot.isFullDay 
                              ? 'Full Day' 
                              : `${assignment.timeSlot.startTime} - ${assignment.timeSlot.endTime}`
                            }
                          </span>
                        </div>
                      )}
                      {assignment.truckConfig && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Truck Config:</span>
                          <span className="font-medium capitalize">
                            {assignment.truckConfig === 'flowboy' ? 'Flowboy (F/B)' : 'Dump Trailer (D/T)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
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
            
            {activeTab === 'edit' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    Edit {isEquipmentOrVehicle ? 'Equipment' : 'Personnel'} Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editedResource?.name || ''}
                        onChange={(e) => handleEditChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isEquipmentOrVehicle ? 'Unit Number' : 'Identifier'}
                      </label>
                      <input
                        type="text"
                        value={editedResource?.identifier || ''}
                        onChange={(e) => handleEditChange('identifier', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={isEquipmentOrVehicle ? 'e.g., 502, 815' : 'Employee ID'}
                      />
                    </div>
                    
                    {isEquipmentOrVehicle && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model
                          </label>
                          <input
                            type="text"
                            value={editedResource?.model || ''}
                            onChange={(e) => handleEditChange('model', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., AP-1055F, T800"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            VIN
                          </label>
                          <input
                            type="text"
                            value={editedResource?.vin || ''}
                            onChange={(e) => handleEditChange('vin', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Vehicle identification number"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={editedResource?.location || ''}
                            onChange={(e) => handleEditChange('location', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Pine, Lydel, 180"
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Certifications Section - Only for Personnel */}
                    {!isEquipmentOrVehicle && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Certifications
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {availableCertifications.map(cert => {
                            const isSelected = (editedResource?.certifications || []).includes(cert.value);
                            return (
                              <button
                                key={cert.value}
                                type="button"
                                onClick={() => handleToggleCertification(cert.value)}
                                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                  isSelected
                                    ? 'bg-green-500 text-white border-green-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{cert.label}</span>
                                  <span className="ml-2">
                                    {isSelected ? '✓' : '+'}
                                  </span>
                                </div>
                                {cert.description && (
                                  <div className="text-xs opacity-75 mt-1">
                                    {cert.description}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Equipment Skills Section - Only for Personnel */}
                    {!isEquipmentOrVehicle && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Equipment Operation Skills
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                          {equipmentSkills.map(skill => {
                            const isSelected = (editedResource?.skills || []).includes(skill.value);
                            return (
                              <button
                                key={skill.value}
                                type="button"
                                onClick={() => handleToggleSkill(skill.value)}
                                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                  isSelected
                                    ? 'bg-purple-500 text-white border-purple-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{skill.label}</span>
                                  <span className="ml-2">
                                    {isSelected ? '✓' : '+'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={editedResource?.type || ''}
                        onChange={(e) => handleEditChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <optgroup label="Personnel">
                          <option value="operator">Operator</option>
                          <option value="driver">Driver</option>
                          <option value="privateDriver">Private Driver</option>
                          <option value="striper">Striper</option>
                          <option value="foreman">Foreman</option>
                          <option value="laborer">Laborer</option>
                        </optgroup>
                        <optgroup label="Equipment">
                          <option value="skidsteer">Skid Steer</option>
                          <option value="paver">Paver</option>
                          <option value="excavator">Excavator</option>
                          <option value="sweeper">Sweeper</option>
                          <option value="millingMachine">Milling Machine</option>
                          <option value="grader">Grader</option>
                          <option value="dozer">Dozer</option>
                          <option value="payloader">Payloader</option>
                          <option value="roller">Roller</option>
                          <option value="equipment">Equipment</option>
                        </optgroup>
                        <optgroup label="Vehicles">
                          <option value="truck">Truck</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                  
                  {hasUnsavedChanges && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        ⚠️ You have unsaved changes. Click "Save Changes" to apply them.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} className="mr-2" />
                    Save Changes
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