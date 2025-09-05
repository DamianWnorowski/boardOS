import React, { useState } from 'react';
import { X, Check, User, Settings, Truck, Plus } from 'lucide-react';
import Portal from '../common/Portal';
import { ResourceType } from '../../types';

interface ResourceTypeSelectorModalProps {
  onClose: () => void;
  onSelectTypes: (types: ResourceType[]) => void;
  title: string;
  currentTypes: ResourceType[];
  excludeTypes?: ResourceType[];
}

const ResourceTypeSelectorModal: React.FC<ResourceTypeSelectorModalProps> = ({
  onClose,
  onSelectTypes,
  title,
  currentTypes,
  excludeTypes = []
}) => {
  const [selectedTypes, setSelectedTypes] = useState<ResourceType[]>([]);

  const resourceCategories = {
    Personnel: {
      icon: <User size={16} />,
      color: 'bg-blue-50 border-blue-200',
      types: ['foreman', 'operator', 'driver', 'striper', 'laborer', 'privateDriver'] as ResourceType[]
    },
    Equipment: {
      icon: <Settings size={16} />,
      color: 'bg-yellow-50 border-yellow-200',
      types: ['paver', 'roller', 'excavator', 'skidsteer', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'equipment'] as ResourceType[]
    },
    Vehicles: {
      icon: <Truck size={16} />,
      color: 'bg-green-50 border-green-200',
      types: ['truck'] as ResourceType[]
    }
  };

  const getResourceTypeDisplay = (type: ResourceType) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const isTypeSelected = (type: ResourceType) => {
    return selectedTypes.includes(type);
  };

  const isTypeAlreadyAdded = (type: ResourceType) => {
    return currentTypes.includes(type);
  };

  const isTypeExcluded = (type: ResourceType) => {
    return excludeTypes.includes(type);
  };

  const toggleType = (type: ResourceType) => {
    if (isTypeAlreadyAdded(type) || isTypeExcluded(type)) return;
    
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSelectAll = (categoryTypes: ResourceType[]) => {
    const availableTypes = categoryTypes.filter(type => 
      !isTypeAlreadyAdded(type) && !isTypeExcluded(type)
    );
    
    const allSelected = availableTypes.every(type => selectedTypes.includes(type));
    
    if (allSelected) {
      // Deselect all from this category
      setSelectedTypes(prev => prev.filter(type => !availableTypes.includes(type)));
    } else {
      // Select all available from this category
      setSelectedTypes(prev => [...prev, ...availableTypes.filter(type => !prev.includes(type))]);
    }
  };

  const handleApply = () => {
    onSelectTypes(selectedTypes);
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
        <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center">
              <Plus size={24} className="text-blue-600 mr-3" />
              <h2 className="text-xl font-bold">{title}</h2>
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
            <div className="space-y-6">
              {Object.entries(resourceCategories).map(([categoryName, category]) => (
                <div key={categoryName}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {category.icon}
                      <h3 className="font-medium text-gray-800 ml-2">{categoryName}</h3>
                    </div>
                    <button
                      onClick={() => handleSelectAll(category.types)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                  </div>
                  
                  <div className={`border-2 rounded-lg p-4 ${category.color}`}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {category.types.map(type => {
                        const selected = isTypeSelected(type);
                        const alreadyAdded = isTypeAlreadyAdded(type);
                        const excluded = isTypeExcluded(type);
                        const disabled = alreadyAdded || excluded;

                        return (
                          <button
                            key={type}
                            onClick={() => toggleType(type)}
                            disabled={disabled}
                            className={`
                              p-2 rounded-md border-2 text-sm font-medium transition-all flex items-center justify-between
                              ${selected && !disabled 
                                ? 'bg-blue-500 text-white border-blue-600' 
                                : disabled
                                  ? alreadyAdded 
                                    ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                          >
                            <span>{getResourceTypeDisplay(type)}</span>
                            {selected && !disabled && <Check size={14} />}
                            {alreadyAdded && <span className="text-xs">Added</span>}
                            {excluded && <span className="text-xs">N/A</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTypes.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Selected Types ({selectedTypes.length}):</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTypes.map(type => (
                    <span 
                      key={type}
                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded-md flex items-center"
                    >
                      {getResourceTypeDisplay(type)}
                      <button
                        onClick={() => toggleType(type)}
                        className="ml-1 hover:bg-blue-600 rounded"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={selectedTypes.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add Selected Types ({selectedTypes.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ResourceTypeSelectorModal;