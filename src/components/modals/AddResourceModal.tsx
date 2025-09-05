import React, { useState } from 'react';
import { X, Plus, User, Truck } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import Portal from '../common/Portal';
import { ResourceType } from '../../types';

interface AddResourceModalProps {
  onClose: () => void;
}

const AddResourceModal: React.FC<AddResourceModalProps> = ({ onClose }) => {
  const { addResource } = useScheduler();
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('operator');
  const [identifier, setIdentifier] = useState('');
  const [location, setLocation] = useState('');
  const [model, setModel] = useState('');
  const [onSite, setOnSite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personnelTypes: ResourceType[] = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
  const equipmentTypes: ResourceType[] = [
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
  ];

  const isPersonnel = personnelTypes.includes(type);
  const isEquipment = equipmentTypes.includes(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      await addResource({
        type,
        classType: isPersonnel ? 'employee' : 'equipment',
        name,
        identifier,
        location,
        model,
        onSite
      });
      onClose();
    } catch (error) {
      console.error('Failed to add resource:', error);
      alert('Failed to add resource. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <Plus className="mr-2 text-green-600" size={20} />
              <h2 className="text-xl font-semibold">Add New Resource</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            {/* Resource Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Personnel">
                  {personnelTypes.map(t => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, ' $1')}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Equipment">
                  {equipmentTypes.map(t => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, ' $1')}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isPersonnel ? 'Name' : 'Equipment Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isPersonnel ? 'John Doe' : 'Unit 123'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Identifier (Unit Number / Employee ID) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isPersonnel ? 'Employee ID (optional)' : 'Unit Number'}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isPersonnel ? 'EMP001' : '123'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Location (Equipment only) */}
            {isEquipment && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Yard A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Model (Equipment only) */}
            {isEquipment && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="CAT 330"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* On Site (Equipment only) */}
            {isEquipment && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={onSite}
                    onChange={(e) => setOnSite(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Currently on site
                  </span>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting || !name}
              >
                {isSubmitting ? 'Adding...' : 'Add Resource'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default AddResourceModal;