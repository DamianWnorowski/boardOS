import React, { useState } from 'react';
import { X, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { ResourceType, MagnetInteractionRule } from '../../types';
import { RuleValidator } from '../../utils/ruleValidator';
import Portal from '../common/Portal';

interface MagnetInteractionRulesModalProps {
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

const MagnetInteractionRulesModal: React.FC<MagnetInteractionRulesModalProps> = ({ onClose }) => {
  const { magnetInteractionRules, updateMagnetInteractionRule } = useScheduler();
  const [currentRules, setCurrentRules] = useState<MagnetInteractionRule[]>(magnetInteractionRules);
  const [selectedSourceType, setSelectedSourceType] = useState<ResourceType | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Get validation results
  const validationResult = RuleValidator.validateMagnetRules(currentRules);

  const handleRuleChange = (
    sourceType: ResourceType,
    targetType: ResourceType,
    field: keyof MagnetInteractionRule,
    value: any
  ) => {
    setCurrentRules(prevRules => {
      const existingRuleIndex = prevRules.findIndex(
        r => r.sourceType === sourceType && r.targetType === targetType
      );

      const newRule: MagnetInteractionRule = {
        sourceType,
        targetType,
        canAttach: false,
        isRequired: false,
        maxCount: 0,
        ...prevRules[existingRuleIndex],
        [field]: value
      };

      if (existingRuleIndex !== -1) {
        const updatedRules = [...prevRules];
        updatedRules[existingRuleIndex] = newRule;
        return updatedRules;
      } else {
        return [...prevRules, newRule];
      }
    });
  };

  const handleSave = () => {
    currentRules.forEach(rule => updateMagnetInteractionRule(rule));
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getRuleForPair = (sourceType: ResourceType, targetType: ResourceType) => {
    return currentRules.find(r => r.sourceType === sourceType && r.targetType === targetType);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <Settings className="mr-2 text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-semibold">Magnet Interaction Rules</h2>
                <div className="flex items-center space-x-2 mt-1">
                  {validationResult.isValid ? (
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle size={16} className="mr-1" />
                      <span>All rules valid</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 text-sm">
                      <AlertTriangle size={16} className="mr-1" />
                      <span>{validationResult.errors.length} errors</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowValidation(!showValidation)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {showValidation ? 'Hide' : 'Show'} Validation
                  </button>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Validation Panel */}
          {showValidation && (
            <div className="border-b border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Rule Validation</h3>
              
              {validationResult.errors.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
                  <ul className="space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600 flex items-start">
                        <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-yellow-700 mb-2">Warnings:</h4>
                  <ul className="space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-600 flex items-start">
                        <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions:</h4>
                  <ul className="space-y-1">
                    {validationResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-blue-600 flex items-start">
                        <CheckCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-1 overflow-hidden">
            {/* Source Type Selector */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <div className="p-4 border-b">
                <h3 className="text-sm font-medium text-gray-700">Source Types</h3>
                <p className="text-xs text-gray-500 mt-1">Select what can attach to others</p>
              </div>
              <div className="overflow-y-auto max-h-full">
                {allResourceTypes.map(sourceType => (
                  <button
                    key={sourceType}
                    onClick={() => setSelectedSourceType(sourceType)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                      selectedSourceType === sourceType ? 'bg-blue-100 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{resourceTypeLabels[sourceType]}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {currentRules.filter(r => r.sourceType === sourceType && r.canAttach).length} attachments
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rules Table */}
            <div className="flex-1 overflow-y-auto">
              {selectedSourceType ? (
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {resourceTypeLabels[selectedSourceType]} Attachment Rules
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure what a {resourceTypeLabels[selectedSourceType].toLowerCase()} can attach to:
                  </p>

                  <div className="space-y-3">
                    {allResourceTypes.map(targetType => {
                      const rule = getRuleForPair(selectedSourceType, targetType);
                      const canAttach = rule?.canAttach || false;
                      const isRequired = rule?.isRequired || false;
                      const maxCount = rule?.maxCount || 0;

                      return (
                        <div 
                          key={targetType} 
                          className={`border rounded-lg p-4 ${canAttach ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={canAttach}
                                onChange={e =>
                                  handleRuleChange(selectedSourceType, targetType, 'canAttach', e.target.checked)
                                }
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                              <div>
                                <div className="font-medium text-sm">{resourceTypeLabels[targetType]}</div>
                                <div className="text-xs text-gray-500">
                                  Can {resourceTypeLabels[selectedSourceType].toLowerCase()} attach to {resourceTypeLabels[targetType].toLowerCase()}?
                                </div>
                              </div>
                            </div>
                            
                            {canAttach && (
                              <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isRequired}
                                    onChange={e =>
                                      handleRuleChange(selectedSourceType, targetType, 'isRequired', e.target.checked)
                                    }
                                    className="h-4 w-4 text-red-600 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">Required</span>
                                </label>
                                
                                <div className="flex items-center space-x-2">
                                  <label className="text-sm text-gray-700">Max:</label>
                                  <input
                                    type="number"
                                    value={maxCount}
                                    onChange={e =>
                                      handleRuleChange(selectedSourceType, targetType, 'maxCount', parseInt(e.target.value) || 0)
                                    }
                                    min="0"
                                    max="10"
                                    className="w-16 p-1 border border-gray-300 rounded-md text-sm text-center"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {isRequired && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                              ⚠️ This attachment is required - {resourceTypeLabels[targetType].toLowerCase()} must have a {resourceTypeLabels[selectedSourceType].toLowerCase()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Settings size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a Source Type</p>
                    <p className="text-sm">Choose a resource type from the left to configure its attachment rules</p>
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
              Save Rules
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default MagnetInteractionRulesModal;