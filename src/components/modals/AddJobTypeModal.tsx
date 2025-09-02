import React, { useState } from 'react';
import { X, Plus, Briefcase, Save } from 'lucide-react';
import Portal from '../common/Portal';
import { ResourceType, RowType } from '../../types';
import { JobTypeConfiguration, JobRowConfiguration } from '../../utils/jobRulesConfiguration';

interface AddJobTypeModalProps {
  onClose: () => void;
  onSave: (jobType: JobTypeConfiguration) => void;
}

interface NewRowConfig {
  rowType: RowType;
  enabled: boolean;
  required: boolean;
  allowedResources: ResourceType[];
  requiredResources: ResourceType[];
  maxCount?: number;
  description: string;
  customName?: string;
}

const AddJobTypeModal: React.FC<AddJobTypeModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏗️');
  const [rows, setRows] = useState<NewRowConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableResourceTypes: ResourceType[] = [
    'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
  ];

  const availableRowTypes: RowType[] = [
    'Forman', 'Equipment', 'crew', 'trucks', 'Tack', 'MPT', 'Sweeper'
  ];

  const commonIcons = ['🏗️', '🛣️', '🚜', '🚛', '⚡', '🔧', '🏠', '🌉'];

  const addRow = () => {
    const newRow: NewRowConfig = {
      rowType: 'crew',
      enabled: true,
      required: false,
      allowedResources: [],
      requiredResources: [],
      description: '',
      customName: ''
    };
    setRows([...rows, newRow]);
  };

  const updateRow = (index: number, updates: Partial<NewRowConfig>) => {
    const updatedRows = rows.map((row, i) => 
      i === index ? { ...row, ...updates } : row
    );
    setRows(updatedRows);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const toggleResourceType = (rowIndex: number, resourceType: ResourceType, isAllowed: boolean) => {
    const row = rows[rowIndex];
    if (isAllowed) {
      const allowedResources = row.allowedResources.includes(resourceType) 
        ? row.allowedResources.filter(r => r !== resourceType)
        : [...row.allowedResources, resourceType];
      updateRow(rowIndex, { allowedResources });
    } else {
      const requiredResources = row.requiredResources.includes(resourceType)
        ? row.requiredResources.filter(r => r !== resourceType)
        : [...row.requiredResources, resourceType];
      updateRow(rowIndex, { requiredResources });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;

    setIsSubmitting(true);
    try {
      const jobTypeId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Convert rows to proper JobRowConfiguration format
      const defaultRows: JobRowConfiguration[] = rows.map(row => ({
        rowType: row.rowType,
        enabled: row.enabled,
        required: row.required,
        allowedResources: row.allowedResources,
        requiredResources: row.requiredResources,
        maxCount: row.maxCount,
        description: row.description,
        customName: row.customName || undefined
      }));

      // No need to generate dropRules anymore - allowedResources in defaultRows is sufficient
      const newJobType: JobTypeConfiguration = {
        id: jobTypeId,
        name,
        description,
        type: 'custom',
        icon,
        defaultRows,
        dropRules: [], // Keep empty for backward compatibility
        isCustom: true
      };

      onSave(newJobType);
      onClose();
    } catch (error) {
      console.error('Failed to create job type:', error);
      alert('Failed to create job type. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center">
              <Briefcase size={24} className="text-blue-600 mr-3" />
              <h2 className="text-xl font-bold">Add Custom Job Type</h2>
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
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Custom Paving"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="flex space-x-2">
                    {commonIcons.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-10 h-10 text-lg rounded-md border-2 ${
                          icon === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-16 px-2 py-2 text-center border border-gray-300 rounded-md"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe what this job type is used for..."
                  required
                />
              </div>

              {/* Row Configurations */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Row Configuration</h3>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Row
                  </button>
                </div>

                <div className="space-y-4">
                  {rows.map((row, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Row {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Row Type
                          </label>
                          <select
                            value={row.rowType}
                            onChange={(e) => updateRow(index, { rowType: e.target.value as RowType })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {availableRowTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={row.customName || ''}
                            onChange={(e) => updateRow(index, { customName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Override row name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Resources
                          </label>
                          <input
                            type="number"
                            value={row.maxCount || ''}
                            onChange={(e) => updateRow(index, { maxCount: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            min="1"
                            placeholder="Unlimited"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(index, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Describe this row's purpose"
                        />
                      </div>

                      <div className="mt-4 flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                            className="mr-2"
                          />
                          Enabled
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={row.required}
                            onChange={(e) => updateRow(index, { required: e.target.checked })}
                            className="mr-2"
                          />
                          Required
                        </label>
                      </div>

                      {/* Resource Selection */}
                      <div className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Allowed Resources
                            </label>
                            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                              {availableResourceTypes.map(resourceType => (
                                <label key={resourceType} className="flex items-center py-1">
                                  <input
                                    type="checkbox"
                                    checked={row.allowedResources.includes(resourceType)}
                                    onChange={() => toggleResourceType(index, resourceType, true)}
                                    className="mr-2"
                                  />
                                  <span className="text-sm capitalize">{resourceType}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Required Resources
                            </label>
                            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                              {row.allowedResources.map(resourceType => (
                                <label key={resourceType} className="flex items-center py-1">
                                  <input
                                    type="checkbox"
                                    checked={row.requiredResources.includes(resourceType)}
                                    onChange={() => toggleResourceType(index, resourceType, false)}
                                    className="mr-2"
                                  />
                                  <span className="text-sm capitalize">{resourceType}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {rows.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No rows configured yet. Click "Add Row" to get started.</p>
                    </div>
                  )}
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
                disabled={isSubmitting || !name || !description}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Create Job Type
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

export default AddJobTypeModal;