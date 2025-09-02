import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Save, X, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { JobRulesConfigurationManager, JobType, JobConfiguration, RowConfiguration } from '../../utils/jobRulesConfiguration';
import { ResourceType, DropRule, MagnetInteractionRule } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import logger from '../../utils/logger';

interface JobRulesManagerProps {
  onConfigurationChange?: (configurations: Record<JobType, JobConfiguration>) => void;
}

interface EditingRow {
  id: string;
  type: string;
  label: string;
  resourceTypes: ResourceType[];
  maxResources?: number;
  isCollapsed: boolean;
}

interface EditingJobConfig {
  id: string;
  name: string;
  description: string;
  rows: EditingRow[];
  magnetRules: MagnetInteractionRule[];
  dropRules: DropRule[];
  isExpanded: boolean;
}

const JobRulesManager: React.FC<JobRulesManagerProps> = ({ onConfigurationChange }) => {
  const { resources } = useScheduler();
  const [configurations, setConfigurations] = useState<EditingJobConfig[]>([]);
  const [isAddingJobType, setIsAddingJobType] = useState(false);
  const [newJobTypeName, setNewJobTypeName] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const configManager = new JobRulesConfigurationManager();

  const resourceTypeOptions: ResourceType[] = [
    'operator', 'driver', 'foreman', 'laborer', 'striper', 'privateDriver',
    'truck', 'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine',
    'grader', 'dozer', 'payloader', 'roller', 'equipment'
  ];

  const rowTypeOptions = [
    'Forman', 'Equipment', 'Crew', 'Trucks', 'Sweeper', 'Tack', 'MPT',
    'Custom'
  ];

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = () => {
    try {
      const configs = configManager.getAllJobTypes();
      const editingConfigs: EditingJobConfig[] = Object.entries(configs).map(([jobType, config]) => ({
        id: jobType,
        name: jobType,
        description: config.description,
        rows: config.rows.map((row, index) => ({
          id: `${jobType}-row-${index}`,
          type: row.type,
          label: row.label || row.type,
          resourceTypes: row.resourceTypes,
          maxResources: row.maxResources,
          isCollapsed: true
        })),
        magnetRules: config.magnetRules,
        dropRules: config.dropRules,
        isExpanded: false
      }));
      
      setConfigurations(editingConfigs);
    } catch (error) {
      logger.error('Failed to load job configurations:', error);
    }
  };

  const validateConfiguration = (config: EditingJobConfig): string[] => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push('Job type name is required');
    }

    if (config.rows.length === 0) {
      errors.push('At least one row configuration is required');
    }

    config.rows.forEach((row, index) => {
      if (!row.type.trim()) {
        errors.push(`Row ${index + 1}: Type is required`);
      }
      if (row.resourceTypes.length === 0) {
        errors.push(`Row ${index + 1}: At least one resource type is required`);
      }
    });

    return errors;
  };

  const validateAllConfigurations = () => {
    const errors: Record<string, string[]> = {};
    
    configurations.forEach(config => {
      const configErrors = validateConfiguration(config);
      if (configErrors.length > 0) {
        errors[config.id] = configErrors;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddJobType = () => {
    if (!newJobTypeName.trim()) return;

    const newConfig: EditingJobConfig = {
      id: newJobTypeName.toLowerCase().replace(/\s+/g, ''),
      name: newJobTypeName,
      description: `Custom job type: ${newJobTypeName}`,
      rows: [
        {
          id: `${newJobTypeName}-row-0`,
          type: 'Forman',
          label: 'Forman',
          resourceTypes: ['foreman'],
          maxResources: 1,
          isCollapsed: true
        },
        {
          id: `${newJobTypeName}-row-1`,
          type: 'Crew',
          label: 'Crew',
          resourceTypes: ['laborer', 'operator'],
          isCollapsed: true
        }
      ],
      magnetRules: [],
      dropRules: [
        {
          targetRow: 'Forman',
          allowedTypes: ['foreman']
        },
        {
          targetRow: 'Crew',
          allowedTypes: ['laborer', 'operator']
        }
      ],
      isExpanded: true
    };

    setConfigurations([...configurations, newConfig]);
    setNewJobTypeName('');
    setIsAddingJobType(false);
    setSelectedJobType(newConfig.id);
  };

  const handleDeleteJobType = (jobTypeId: string) => {
    if (confirm('Are you sure you want to delete this job type? This action cannot be undone.')) {
      setConfigurations(configurations.filter(config => config.id !== jobTypeId));
      if (selectedJobType === jobTypeId) {
        setSelectedJobType(null);
      }
    }
  };

  const handleDuplicateJobType = (jobTypeId: string) => {
    const config = configurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const newId = `${config.id}_copy_${Date.now()}`;
    const duplicatedConfig: EditingJobConfig = {
      ...config,
      id: newId,
      name: `${config.name} (Copy)`,
      rows: config.rows.map(row => ({
        ...row,
        id: `${newId}-row-${row.id.split('-row-')[1]}`
      })),
      isExpanded: false
    };

    setConfigurations([...configurations, duplicatedConfig]);
  };

  const handleUpdateJobType = (jobTypeId: string, updates: Partial<EditingJobConfig>) => {
    setConfigurations(configs => 
      configs.map(config => 
        config.id === jobTypeId ? { ...config, ...updates } : config
      )
    );
  };

  const handleAddRow = (jobTypeId: string) => {
    const config = configurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const newRow: EditingRow = {
      id: `${jobTypeId}-row-${Date.now()}`,
      type: 'Custom',
      label: 'Custom Row',
      resourceTypes: ['laborer'],
      isCollapsed: false
    };

    const newDropRule: DropRule = {
      targetRow: newRow.type,
      allowedTypes: newRow.resourceTypes
    };

    handleUpdateJobType(jobTypeId, {
      rows: [...config.rows, newRow],
      dropRules: [...config.dropRules, newDropRule]
    });
  };

  const handleUpdateRow = (jobTypeId: string, rowId: string, updates: Partial<EditingRow>) => {
    const config = configurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const updatedRows = config.rows.map(row => 
      row.id === rowId ? { ...row, ...updates } : row
    );

    // Update corresponding drop rule
    const updatedRow = updatedRows.find(r => r.id === rowId);
    if (updatedRow) {
      const updatedDropRules = config.dropRules.map(rule => 
        rule.targetRow === config.rows.find(r => r.id === rowId)?.type
          ? { ...rule, targetRow: updatedRow.type, allowedTypes: updatedRow.resourceTypes }
          : rule
      );

      handleUpdateJobType(jobTypeId, {
        rows: updatedRows,
        dropRules: updatedDropRules
      });
    }
  };

  const handleDeleteRow = (jobTypeId: string, rowId: string) => {
    const config = configurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const rowToDelete = config.rows.find(r => r.id === rowId);
    if (!rowToDelete) return;

    const updatedRows = config.rows.filter(row => row.id !== rowId);
    const updatedDropRules = config.dropRules.filter(rule => rule.targetRow !== rowToDelete.type);

    handleUpdateJobType(jobTypeId, {
      rows: updatedRows,
      dropRules: updatedDropRules
    });
  };

  const handleSave = () => {
    if (!validateAllConfigurations()) {
      alert('Please fix validation errors before saving.');
      return;
    }

    try {
      // Convert editing configurations back to job configurations
      const jobConfigurations: Record<string, JobConfiguration> = {};
      
      configurations.forEach(config => {
        jobConfigurations[config.id] = {
          description: config.description,
          rows: config.rows.map(row => ({
            type: row.type,
            label: row.label,
            resourceTypes: row.resourceTypes,
            maxResources: row.maxResources
          })),
          magnetRules: config.magnetRules,
          dropRules: config.dropRules
        };
      });

      // Save to localStorage for now (in production, this would go to database)
      localStorage.setItem('customJobConfigurations', JSON.stringify(jobConfigurations));
      
      onConfigurationChange?.(jobConfigurations as Record<JobType, JobConfiguration>);
      
      logger.info('Job configurations saved successfully');
      alert('Job configurations saved successfully!');
    } catch (error) {
      logger.error('Failed to save job configurations:', error);
      alert('Failed to save job configurations.');
    }
  };

  const renderRowEditor = (config: EditingJobConfig, row: EditingRow) => (
    <div key={row.id} className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => handleUpdateRow(config.id, row.id, { isCollapsed: !row.isCollapsed })}
          className="flex items-center space-x-2"
        >
          {row.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <span className="font-medium">{row.label}</span>
        </button>
        <button
          onClick={() => handleDeleteRow(config.id, row.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {!row.isCollapsed && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Row Type</label>
              <select
                value={row.type}
                onChange={(e) => handleUpdateRow(config.id, row.id, { type: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                {rowTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Label</label>
              <input
                type="text"
                value={row.label}
                onChange={(e) => handleUpdateRow(config.id, row.id, { label: e.target.value })}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Allowed Resource Types</label>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {resourceTypeOptions.map(type => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={row.resourceTypes.includes(type)}
                    onChange={(e) => {
                      const updatedTypes = e.target.checked
                        ? [...row.resourceTypes, type]
                        : row.resourceTypes.filter(t => t !== type);
                      handleUpdateRow(config.id, row.id, { resourceTypes: updatedTypes });
                    }}
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Resources (optional)</label>
            <input
              type="number"
              min="1"
              value={row.maxResources || ''}
              onChange={(e) => handleUpdateRow(config.id, row.id, { 
                maxResources: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full p-2 border rounded-md"
              placeholder="No limit"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderJobTypeEditor = (config: EditingJobConfig) => (
    <div key={config.id} className="border-2 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => handleUpdateJobType(config.id, { isExpanded: !config.isExpanded })}
          className="flex items-center space-x-2"
        >
          {config.isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <h3 className="text-lg font-semibold capitalize">{config.name}</h3>
        </button>
        <div className="flex items-center space-x-2">
          {validationErrors[config.id] && (
            <div className="text-red-600 flex items-center">
              <AlertCircle size={16} className="mr-1" />
              <span className="text-sm">{validationErrors[config.id].length} error(s)</span>
            </div>
          )}
          <button
            onClick={() => handleDuplicateJobType(config.id)}
            className="text-blue-600 hover:text-blue-800"
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => handleDeleteJobType(config.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {validationErrors[config.id] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-sm text-red-700">
            <div className="font-medium mb-1">Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors[config.id].map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {config.isExpanded && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={config.description}
              onChange={(e) => handleUpdateJobType(config.id, { description: e.target.value })}
              className="w-full p-2 border rounded-md"
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Row Configurations</h4>
              <button
                onClick={() => handleAddRow(config.id)}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={14} className="mr-1" />
                Add Row
              </button>
            </div>
            <div className="space-y-3">
              {config.rows.map(row => renderRowEditor(config, row))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Magnet Rules ({config.magnetRules.length})</h4>
              <div className="bg-purple-50 p-3 rounded-lg text-sm text-purple-700">
                Automatically managed based on row configurations
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Drop Rules ({config.dropRules.length})</h4>
              <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
                Automatically managed based on row configurations
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Job Rules Manager</h2>
          <p className="text-sm text-gray-600">Configure job types and their row requirements</p>
        </div>
        <div className="flex items-center space-x-3">
          {Object.keys(validationErrors).length > 0 && (
            <div className="text-red-600 flex items-center text-sm">
              <AlertCircle size={16} className="mr-1" />
              {Object.keys(validationErrors).length} configuration(s) have errors
            </div>
          )}
          <button
            onClick={() => setIsAddingJobType(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Add Job Type
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      {isAddingJobType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newJobTypeName}
              onChange={(e) => setNewJobTypeName(e.target.value)}
              placeholder="Enter job type name..."
              className="flex-1 p-2 border rounded-md"
              onKeyDown={(e) => e.key === 'Enter' && handleAddJobType()}
            />
            <button
              onClick={handleAddJobType}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingJobType(false);
                setNewJobTypeName('');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {configurations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No job types configured. Add a job type to get started.</p>
          </div>
        ) : (
          configurations.map(config => renderJobTypeEditor(config))
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-2">How Job Rules Work</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Each job type defines which rows are available and what resources can be placed in them</li>
          <li>• Drop rules are automatically generated based on row configurations</li>
          <li>• Magnet rules ensure safety compliance (e.g., equipment requires operators)</li>
          <li>• Custom job types allow you to create specialized workflows</li>
        </ul>
      </div>
    </div>
  );
};

export default JobRulesManager;