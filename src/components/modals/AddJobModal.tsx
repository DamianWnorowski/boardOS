import React, { useState, useEffect } from 'react';
import { X, MapPin, Info } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { Job } from '../../types';
import { JobRulesConfigurationManager, JobType } from '../../utils/jobRulesConfiguration';
import LocationSelector from './LocationSelector';

interface AddJobModalProps {
  onClose: () => void;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ onClose }) => {
  const { addJob, addJobRowConfig } = useScheduler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newJob, setNewJob] = useState<Omit<Job, 'id'>>({
    name: '',
    type: 'paving', 
    shift: 'day',
    notes: '',
    startTime: '07:00',
    plants: [],
    location: undefined
  });
  const [competitorPlant, setCompetitorPlant] = useState('');
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [jobTypeDescription, setJobTypeDescription] = useState('');
  const [expectedRows, setExpectedRows] = useState<string[]>([]);
  
  // JobRulesConfigurationManager only has static methods, no need to instantiate
  
  // Update job type info when job type changes
  useEffect(() => {
    updateJobTypeInfo(newJob.type);
  }, [newJob.type]);

  const updateJobTypeInfo = (jobType: string) => {
    const config = JobRulesConfigurationManager.getConfiguration(jobType);
    if (config) {
      setJobTypeDescription(config.description);
      setExpectedRows(config.defaultRows.map(row => row.customName || row.rowType));
    } else {
      setJobTypeDescription('');
      setExpectedRows([]);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewJob(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePlantChange = (plantName: string, checked: boolean) => {
    setNewJob(prev => ({
      ...prev,
      plants: checked 
        ? [...(prev.plants || []), plantName]
        : (prev.plants || []).filter(p => p !== plantName)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      // Add competitor plant to plants array if specified
      const finalPlants = [...(newJob.plants || [])];
      if (competitorPlant.trim()) {
        finalPlants.push(competitorPlant.trim());
      }
      
      // Create the job first
      const createdJob = await addJob({
        ...newJob,
        plants: finalPlants
      });
      
      // Apply job type defaults for row configuration
      const config = JobRulesConfigurationManager.getConfiguration(newJob.type);
      if (config && createdJob?.id) {
        // Add default row configurations based on job type
        for (const rowConfig of config.defaultRows) {
          if (rowConfig.enabled) {
            await addJobRowConfig({
              jobId: createdJob.id,
              type: rowConfig.rowType,
              label: rowConfig.customName || rowConfig.rowType,
              maxResources: rowConfig.maxCount,
              resourceTypes: rowConfig.allowedResources
            });
          }
        }
        
        console.log(`Applied ${config.defaultRows.length} default rows for ${newJob.type} job`);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating job:', error);
      // Error handling is done in the context, just show user feedback here if needed
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    setNewJob(prev => ({ ...prev, location }));
    setShowLocationSelector(false);
  };
  
  const handleRemoveLocation = () => {
    setNewJob(prev => ({ ...prev, location: undefined }));
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Add New Job</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Job Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={newJob.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            
            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700">
                Job Number
              </label>
              <input
                type="text"
                id="number"
                name="number"
                value={newJob.number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="e.g., 24-1067-24"
              />
            </div>
            
            <div>
              <label htmlFor="shift" className="block text-sm font-medium text-gray-700">
                Shift
              </label>
              <select
                id="shift"
                name="shift"
                value={newJob.shift}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                <option value="day">Day Shift</option>
                <option value="night">Night Shift</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Job Type
              </label>
              <select
                id="type"
                name="type"
                value={newJob.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                <option value="paving">Paving</option>
                <option value="milling">Milling</option>
                <option value="millingAndPaving">Milling & Paving</option>
                <option value="drainage">Drainage</option>
                <option value="concrete">Concrete</option>
                <option value="excavation">Excavation</option>
                <option value="stripping">Stripping</option>
                <option value="hired">Hired</option>
                <option value="other">Other</option>
              </select>
              
              {/* Job type description and expected rows */}
              {jobTypeDescription && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <Info size={16} className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-800 mb-2">{jobTypeDescription}</p>
                      {expectedRows.length > 0 && (
                        <div>
                          <span className="text-blue-700 font-medium">Expected rows:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {expectedRows.map((row, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {row}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Plant Selection for Paving Jobs */}
            {(newJob.type === 'paving' || newJob.type === 'millingAndPaving') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asphalt Plants
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select which plants the trucks will pull asphalt from
                </p>
                <div className="space-y-2">
                  {['Lydel', 'East Island'].map((plant) => (
                    <label key={plant} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(newJob.plants || []).includes(plant)}
                        onChange={(e) => handlePlantChange(plant, e.target.checked)}
                        className="rounded text-blue-600 mr-2"
                      />
                      <span className="text-sm">{plant}</span>
                    </label>
                  ))}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={competitorPlant.trim() !== ''}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setCompetitorPlant('');
                        }
                      }}
                      className="rounded text-blue-600 mr-2"
                    />
                    <input
                      type="text"
                      placeholder="Competitor plant name..."
                      value={competitorPlant}
                      onChange={(e) => setCompetitorPlant(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Default Start Time
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={newJob.startTime || '07:00'}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be the default start time for all crew members assigned to this job, but can be changed individually.
              </p>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={newJob.notes}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Location
            </label>
            {newJob.location ? (
              <div className="mt-1 flex items-center justify-between p-2 border rounded-md bg-gray-50">
                <div className="flex items-center">
                  <MapPin size={16} className="text-green-600 mr-2" />
                  <span className="text-sm">{newJob.location.address}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowLocationSelector(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLocation}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLocationSelector(true)}
                className="mt-1 w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors flex items-center justify-center"
              >
                <MapPin size={16} className="mr-2" />
                Select Location
              </button>
            )}
          </div>
          
          <div className="mt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                'Add Job'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {showLocationSelector && (
        <LocationSelector
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationSelector(false)}
        />
      )}
    </div>
  );
};

export default AddJobModal;