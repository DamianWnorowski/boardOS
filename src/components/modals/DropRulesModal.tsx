import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import { RowType, ResourceType } from '../../types';
import { rowTypeLabels } from '../../data/mockData';
import Portal from '../common/Portal';

interface DropRulesModalProps {
  onClose: () => void;
}

const allResourceTypes: ResourceType[] = [
  'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
  'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader',
  'dozer', 'payloader', 'roller', 'equipment', 'truck'
];

const resourceTypeLabels: Record<ResourceType, string> = {
  operator: 'Operator',
  driver: 'Driver',
  privateDriver: 'Private Driver',
  striper: 'Striper',
  foreman: 'Foreman',
  laborer: 'Laborer',
  skidsteer: 'Skid Steer',
  paver: 'Paver',
  excavator: 'Excavator',
  sweeper: 'Sweeper',
  millingMachine: 'Milling Machine',
  grader: 'Grader',
  dozer: 'Dozer',
  payloader: 'Payloader',
  roller: 'Roller',
  equipment: 'Equipment',
  truck: 'Truck'
};

const DropRulesModal: React.FC<DropRulesModalProps> = ({ onClose }) => {
  const { getZIndex } = useModal();
  const { dropRules, updateDropRule, getDropRule } = useScheduler();
  const [selectedRowType, setSelectedRowType] = useState<RowType | null>(null);
  const [currentDropRules, setCurrentDropRules] = useState(dropRules);

  const handleToggleResourceType = (rowType: RowType, resourceType: ResourceType) => {
    const currentAllowed = getDropRule(rowType);
    const isCurrentlyAllowed = currentAllowed.includes(resourceType);
    
    const newAllowed = isCurrentlyAllowed
      ? currentAllowed.filter(type => type !== resourceType)
      : [...currentAllowed, resourceType];
    
    setCurrentDropRules(prevRules => {
      const existingIndex = prevRules.findIndex(r => r.rowType === rowType);
      
      if (existingIndex !== -1) {
        const updatedRules = [...prevRules];
        updatedRules[existingIndex] = { rowType, allowedTypes: newAllowed };
        return updatedRules;
      } else {
        return [...prevRules, { rowType, allowedTypes: newAllowed }];
      }
    });
  };

  const handleSave = () => {
    currentDropRules.forEach(rule => updateDropRule(rule.rowType, rule.allowedTypes));
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getCurrentAllowedTypes = (rowType: RowType): ResourceType[] => {
    const rule = currentDropRules.find(r => r.rowType === rowType);
    return rule?.allowedTypes || [];
  };

  const rowTypes: RowType[] = ['Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'];

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        style={{ zIndex: getZIndex('drop-rules') }}
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <Target className="mr-2 text-green-600" size={24} />
              <h2 className="text-xl font-semibold">Drop Rules Configuration</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Row Type Selector */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <div className="p-4 border-b">
                <h3 className="text-sm font-medium text-gray-700">Job Row Types</h3>
                <p className="text-xs text-gray-500 mt-1">Select a row to configure drop rules</p>
              </div>
              <div className="overflow-y-auto max-h-full">
                {rowTypes.map(rowType => {
                  const allowedCount = getCurrentAllowedTypes(rowType).length;
                  return (
                    <button
                      key={rowType}
                      onClick={() => setSelectedRowType(rowType)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                        selectedRowType === rowType ? 'bg-blue-100 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{rowTypeLabels[rowType]}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {allowedCount} resource types allowed
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rules Configuration */}
            <div className="flex-1 overflow-y-auto">
              {selectedRowType ? (
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {rowTypeLabels[selectedRowType]} Row - Allowed Resource Types
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select which resource types can be dropped into the {rowTypeLabels[selectedRowType]} row:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {allResourceTypes.map(resourceType => {
                      const isAllowed = getCurrentAllowedTypes(selectedRowType).includes(resourceType);
                      
                      return (
                        <label 
                          key={resourceType} 
                          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isAllowed ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => handleToggleResourceType(selectedRowType, resourceType)}
                            className="h-4 w-4 text-green-600 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{resourceTypeLabels[resourceType]}</div>
                            <div className="text-xs text-gray-500">
                              {resourceType === 'operator' && 'Can operate equipment'}
                              {resourceType === 'driver' && 'Can drive trucks'}
                              {resourceType === 'laborer' && 'General labor tasks'}
                              {resourceType === 'foreman' && 'Supervises crew'}
                              {resourceType === 'truck' && 'Transportation vehicle'}
                              {resourceType === 'paver' && 'Asphalt laying equipment'}
                              {resourceType === 'roller' && 'Compaction equipment'}
                              {resourceType === 'sweeper' && 'Cleaning equipment'}
                              {resourceType === 'millingMachine' && 'Road milling equipment'}
                              {(!['operator', 'driver', 'laborer', 'foreman', 'truck', 'paver', 'roller', 'sweeper', 'millingMachine'].includes(resourceType)) && 'Construction resource'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={() => {
                        rowTypes.forEach(rt => {
                          if (rt === selectedRowType) {
                            setCurrentDropRules(prev => {
                              const existingIndex = prev.findIndex(r => r.rowType === rt);
                              if (existingIndex !== -1) {
                                const updated = [...prev];
                                updated[existingIndex] = { rowType: rt, allowedTypes: [...allResourceTypes] };
                                return updated;
                              } else {
                                return [...prev, { rowType: rt, allowedTypes: [...allResourceTypes] }];
                              }
                            });
                          }
                        });
                      }}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      Allow All
                    </button>
                    <button
                      onClick={() => {
                        rowTypes.forEach(rt => {
                          if (rt === selectedRowType) {
                            setCurrentDropRules(prev => {
                              const existingIndex = prev.findIndex(r => r.rowType === rt);
                              if (existingIndex !== -1) {
                                const updated = [...prev];
                                updated[existingIndex] = { rowType: rt, allowedTypes: [] };
                                return updated;
                              } else {
                                return [...prev, { rowType: rt, allowedTypes: [] }];
                              }
                            });
                          }
                        });
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      Deny All
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Target size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a Row Type</p>
                    <p className="text-sm">Choose a job row from the left to configure its drop rules</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Save Drop Rules
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DropRulesModal;