import React, { useState } from 'react';
import { X, Magnet, Save, ArrowRight } from 'lucide-react';
import Portal from '../common/Portal';
import { ResourceType } from '../../types';
import { MagnetInteractionRule } from '../../types';

interface AddAttachmentRuleModalProps {
  onClose: () => void;
  onSave: (rule: MagnetInteractionRule) => void;
  existingRules: MagnetInteractionRule[];
}

const AddAttachmentRuleModal: React.FC<AddAttachmentRuleModalProps> = ({ 
  onClose, 
  onSave, 
  existingRules 
}) => {
  const [sourceType, setSourceType] = useState<ResourceType>('operator');
  const [targetType, setTargetType] = useState<ResourceType>('paver');
  const [isRequired, setIsRequired] = useState(false);
  const [maxCount, setMaxCount] = useState<number | undefined>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resourceTypes: ResourceType[] = [
    'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
  ];

  const personnelTypes: ResourceType[] = [
    'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'
  ];

  const equipmentTypes: ResourceType[] = [
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
  ];

  // Check if rule already exists
  const ruleExists = existingRules.some(rule => 
    rule.sourceType === sourceType && rule.targetType === targetType
  );

  const getResourceTypeCategory = (type: ResourceType) => {
    if (personnelTypes.includes(type)) return 'Personnel';
    if (equipmentTypes.includes(type)) return 'Equipment/Vehicles';
    return 'Other';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ruleExists) return;

    setIsSubmitting(true);
    try {
      const newRule: MagnetInteractionRule = {
        sourceType,
        targetType,
        canAttach: true,
        isRequired,
        maxCount: maxCount || undefined
      };

      onSave(newRule);
      onClose();
    } catch (error) {
      console.error('Failed to create attachment rule:', error);
      alert('Failed to create attachment rule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderResourceSelect = (
    value: ResourceType, 
    onChange: (type: ResourceType) => void,
    label: string,
    disabled: boolean = false
  ) => {
    const groupedTypes = {
      'Personnel': personnelTypes,
      'Equipment/Vehicles': equipmentTypes
    };

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ResourceType)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          {Object.entries(groupedTypes).map(([category, types]) => (
            <optgroup key={category} label={category}>
              {types.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Category: {getResourceTypeCategory(value)}
        </p>
      </div>
    );
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center">
              <Magnet size={24} className="text-purple-600 mr-3" />
              <h2 className="text-xl font-bold">Add Attachment Rule</h2>
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
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Rule Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Rule Preview</h3>
                <div className="flex items-center justify-center text-blue-700">
                  <span className="font-medium capitalize">{sourceType}</span>
                  <ArrowRight className="mx-3" size={20} />
                  <span className="font-medium capitalize">{targetType}</span>
                </div>
                <p className="text-center text-sm text-blue-600 mt-2">
                  {sourceType} can {isRequired ? 'MUST' : 'optionally'} attach to {targetType}
                  {maxCount ? ` (max ${maxCount})` : ' (unlimited)'}
                </p>
              </div>

              {ruleExists && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                    <p className="text-red-800 text-sm font-medium">
                      A rule for this combination already exists
                    </p>
                  </div>
                </div>
              )}

              {/* Source and Target Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderResourceSelect(sourceType, setSourceType, 'Source Resource Type (What attaches)')}
                {renderResourceSelect(targetType, setTargetType, 'Target Resource Type (What it attaches to)')}
              </div>

              {/* Rule Configuration */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-800">Rule Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-medium">Required Attachment</span>
                        <p className="text-xs text-gray-500">
                          {isRequired 
                            ? 'This attachment is mandatory for safety/operational compliance' 
                            : 'This attachment is optional'
                          }
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Count
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={maxCount || ''}
                        onChange={(e) => setMaxCount(e.target.value ? parseInt(e.target.value) : undefined)}
                        min="1"
                        max="10"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="∞"
                      />
                      <span className="text-sm text-gray-600">
                        {maxCount ? `Max ${maxCount} ${sourceType}(s)` : 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Examples and Guidelines */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Common Attachment Rules</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• <strong>Required:</strong> operator → equipment (safety compliance)</p>
                  <p>• <strong>Required:</strong> driver → truck (operational requirement)</p>
                  <p>• <strong>Optional:</strong> laborer → paver (additional support)</p>
                  <p>• <strong>Optional:</strong> striper → equipment (specialized tasks)</p>
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
                disabled={isSubmitting || ruleExists}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Create Rule
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

export default AddAttachmentRuleModal;