import React, { useState } from 'react';
import { X, Plus, Zap, User, Truck, Settings } from 'lucide-react';
import Portal from '../common/Portal';
import { ResourceType } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface QuickAddResourceModalProps {
  onClose: () => void;
  requiredResourceType: ResourceType;
  jobTypeName?: string;
  rowName?: string;
}

const QuickAddResourceModal: React.FC<QuickAddResourceModalProps> = ({ 
  onClose, 
  requiredResourceType,
  jobTypeName,
  rowName
}) => {
  const { addResource } = useScheduler();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [truckCategory, setTruckCategory] = useState<'10w' | 'trac' | 'other'>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personnelTypes: ResourceType[] = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
  const equipmentTypes: ResourceType[] = [
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
  ];

  const isPersonnel = personnelTypes.includes(requiredResourceType);
  const isEquipment = equipmentTypes.includes(requiredResourceType);

  const getResourceIcon = () => {
    if (requiredResourceType === 'truck') return <Truck size={24} />;
    if (isEquipment) return <Settings size={24} />;
    return <User size={24} />;
  };

  const getResourceTypeDisplay = (type: ResourceType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const generateDefaultName = () => {
    const typeDisplay = getResourceTypeDisplay(requiredResourceType);
    const timestamp = new Date().toLocaleDateString();
    return `New ${typeDisplay} - ${timestamp}`;
  };

  const generateDefaultIdentifier = () => {
    if (requiredResourceType === 'truck') {
      // Generate identifiers based on truck category
      if (truckCategory === '10w') {
        const validIds = ['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'];
        const availableIds = validIds; // In real implementation, check which are not in use
        return availableIds[Math.floor(Math.random() * availableIds.length)];
      } else if (truckCategory === 'trac') {
        const validIds = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())]; // 49-76
        const availableIds = validIds; // In real implementation, check which are not in use
        return availableIds[Math.floor(Math.random() * availableIds.length)];
      } else {
        // For other trucks, generate a test identifier that goes to "Other" category
        return `T${Math.floor(Math.random() * 999) + 1}`;
      }
    }
    
    const prefix = requiredResourceType.substring(0, 3).toUpperCase();
    const number = Math.floor(Math.random() * 999) + 1;
    return `${prefix}${number.toString().padStart(3, '0')}`;
  };

  const handleQuickFill = () => {
    setName(generateDefaultName());
    setIdentifier(generateDefaultIdentifier());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      let model = '';
      if (requiredResourceType === 'truck') {
        model = truckCategory === '10w' ? '10W' : truckCategory === 'trac' ? 'Trac' : 'Other';
      }

      await addResource({
        type: requiredResourceType,
        classType: isPersonnel ? 'employee' : 'equipment',
        name,
        identifier: identifier || generateDefaultIdentifier(),
        location: 'Yard',
        model,
        onSite: false
      });
      onClose();
    } catch (error) {
      console.error('Failed to add resource:', error);
      alert('Failed to add resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-md max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center">
              <Zap size={24} className="text-blue-600 mr-3" />
              <h2 className="text-xl font-bold">Quick Add Resource</h2>
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
            {/* Context Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                {getResourceIcon()}
                <div className="ml-3">
                  <h3 className="font-medium text-blue-800">
                    Adding {getResourceTypeDisplay(requiredResourceType)}
                  </h3>
                  {jobTypeName && rowName && (
                    <p className="text-sm text-blue-600">
                      Required for: {jobTypeName} → {rowName}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-blue-700">
                This resource type is required for the job configuration. 
                You can customize details or use quick fill for faster setup.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Resource Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${requiredResourceType} name`}
                  required
                />
              </div>

              {/* Truck Category Selection (only for trucks) */}
              {requiredResourceType === 'truck' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Truck Category *
                  </label>
                  <select
                    value={truckCategory}
                    onChange={(e) => setTruckCategory(e.target.value as '10w' | 'trac' | 'other')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10w">10W Trucks (389-399)</option>
                    <option value="trac">Trac Trucks (43-44, 49-76)</option>
                    <option value="other">Other Trucks</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the truck category to generate appropriate identifiers
                  </p>
                </div>
              )}

              {/* Identifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Identifier
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={requiredResourceType === 'truck' ? 
                    `Auto-generated for ${truckCategory.toUpperCase()} trucks` : 
                    "Auto-generated if empty"
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {requiredResourceType === 'truck' 
                    ? `Truck number/identifier for ${truckCategory.toUpperCase()} category`
                    : "Unique identifier (e.g., license plate, equipment number)"
                  }
                </p>
              </div>

              {/* Quick Fill Button */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Quick Fill</h4>
                    <p className="text-xs text-gray-600">Generate default values</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    Auto Fill
                  </button>
                </div>
              </div>

              {/* Resource Type Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Resource Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Type: {getResourceTypeDisplay(requiredResourceType)}</p>
                  <p>• Category: {isPersonnel ? 'Personnel' : 'Equipment/Vehicle'}</p>
                  {requiredResourceType === 'truck' && (
                    <p>• Truck Category: {truckCategory.toUpperCase()}</p>
                  )}
                  <p>• Location: Yard (default)</p>
                  <p>• Status: Off Site (can be changed later)</p>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !name}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Add {getResourceTypeDisplay(requiredResourceType)}
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

export default QuickAddResourceModal;