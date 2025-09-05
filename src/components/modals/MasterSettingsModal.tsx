import React, { useState, useEffect } from 'react';
import { X, Settings, Target, Magnet, Briefcase, Users, Plus, Download, Upload, Check, AlertTriangle, Info } from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import { useScheduler } from '../../context/SchedulerContext';
import { Resource, ResourceType } from '../../types';
import { JobRulesConfigurationManager, JobTypeConfiguration, GLOBAL_MAGNET_RULES } from '../../utils/jobRulesConfiguration';
import { DropRule, MagnetInteractionRule } from '../../types';
import AddJobTypeModal from './AddJobTypeModal';
import AddAttachmentRuleModal from './AddAttachmentRuleModal';
import AddResourceModal from './AddResourceModal';
import ResourceDeleteConfirmModal from './ResourceDeleteConfirmModal';
import QuickAddResourceModal from './QuickAddResourceModal';
import ResourceTypeSelectorModal from './ResourceTypeSelectorModal';
import logger from '../../utils/logger';

interface MasterSettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'overview' | 'jobRules' | 'compatibility' | 'resources';

interface SystemHealth {
  jobRules: number;
  compatibilityRules: number;
  resources: number;
  issues: string[];
}

const MasterSettingsModal: React.FC<MasterSettingsModalProps> = ({ onClose }) => {
  const { getZIndex } = useModal();
  const { 
    resources = [], 
    dropRules = [], 
    magnetRules = [], 
    jobs = [], 
    assignments = [] 
  } = useScheduler();
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [jobConfigurations, setJobConfigurations] = useState<JobTypeConfiguration[]>([]);
  const [customJobTypes, setCustomJobTypes] = useState<string[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<string>('paving');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddJobTypeModal, setShowAddJobTypeModal] = useState(false);
  const [showAddAttachmentModal, setShowAddAttachmentModal] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showDeleteResourceModal, setShowDeleteResourceModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddResourceType, setQuickAddResourceType] = useState<ResourceType | null>(null);
  const [quickAddContext, setQuickAddContext] = useState<{jobTypeName: string, rowName: string} | null>(null);
  const [globalAttachmentRules, setGlobalAttachmentRules] = useState<MagnetInteractionRule[]>(GLOBAL_MAGNET_RULES);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    jobRules: 0,
    compatibilityRules: 0,
    resources: 0,
    issues: []
  });
  
  // Resource type selector modal state
  const [showResourceTypeSelectorModal, setShowResourceTypeSelectorModal] = useState(false);
  const [resourceTypeSelectorConfig, setResourceTypeSelectorConfig] = useState<{
    title: string;
    currentTypes: ResourceType[];
    excludeTypes?: ResourceType[];
    onSelect: (types: ResourceType[]) => void;
  } | null>(null);
  
  // Editing state for job configurations
  const [editingJobConfig, setEditingJobConfig] = useState<JobTypeConfiguration | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // JobRulesConfigurationManager only has static methods, no need to instantiate

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    updateSystemHealth();
  }, [resources, dropRules, magnetRules, jobs, jobConfigurations]);

  const loadConfigurations = async () => {
    try {
      setIsLoading(true);
      const defaultConfigs = JobRulesConfigurationManager.getAllConfigurations();
      
      // Load saved job configurations from localStorage (both custom and modified default ones)
      const savedAllConfigs = localStorage.getItem('allJobConfigurations');
      const savedCustomConfigs = localStorage.getItem('customJobConfigurations');
      
      let finalConfigs = defaultConfigs;
      
      if (savedAllConfigs) {
        // Use the complete saved configurations (includes all modifications)
        const allSavedConfigs = JSON.parse(savedAllConfigs);
        finalConfigs = allSavedConfigs;
        logger.info('Loaded saved job configurations:', allSavedConfigs.length);
      } else if (savedCustomConfigs) {
        // Fallback: merge default with custom for backward compatibility
        const customConfigs = JSON.parse(savedCustomConfigs);
        finalConfigs = [...defaultConfigs, ...customConfigs];
        logger.info('Loaded custom job configurations:', customConfigs.length);
      }
      
      // Migrate old configs that have separate dropRules - merge into allowedResources
      finalConfigs = finalConfigs.map(config => {
        if (config.dropRules && config.dropRules.length > 0) {
          const migratedRows = config.defaultRows.map(row => {
            const matchingDropRule = config.dropRules.find(rule => rule.rowType === row.rowType);
            if (matchingDropRule && matchingDropRule.allowedTypes) {
              // Merge dropRule allowedTypes with existing allowedResources
              const combinedAllowed = [...new Set([...row.allowedResources, ...matchingDropRule.allowedTypes])];
              return { ...row, allowedResources: combinedAllowed };
            }
            return row;
          });
          
          // Return config without dropRules (they're now integrated into rows)
          const { dropRules, ...configWithoutDropRules } = config;
          return { ...configWithoutDropRules, defaultRows: migratedRows };
        }
        return config;
      });
      
      setJobConfigurations(finalConfigs);
      
      // Load any custom job types from localStorage or database
      const savedCustomTypes = localStorage.getItem('customJobTypes');
      if (savedCustomTypes) {
        setCustomJobTypes(JSON.parse(savedCustomTypes));
      }
      
      // Load saved attachment rules from localStorage
      const savedAttachmentRules = localStorage.getItem('globalAttachmentRules');
      if (savedAttachmentRules) {
        const customRules = JSON.parse(savedAttachmentRules);
        setGlobalAttachmentRules([...GLOBAL_MAGNET_RULES, ...customRules]);
      }
    } catch (error) {
      logger.error('Failed to load job configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSystemHealth = () => {
    const issues: string[] = [];
    let jobRulesCount = 0;

    // Count job rules from configurations
    jobConfigurations.forEach(config => {
      jobRulesCount += config.defaultRows?.length || 0;
      // No longer counting dropRules since they're consolidated into row configurations
    });

    // Check for common issues
    if (!resources || resources.length === 0) {
      issues.push('No resources configured');
    }

    // Use global compatibility rules
    if (globalAttachmentRules.length === 0) {
      issues.push('No compatibility rules configured');
    }

    // Check for orphaned assignments
    if (resources && jobs) {
      const resourceIds = new Set(resources.map(r => r.id));
      
      // Check for job configurations without proper resources
      const jobsNeedingResources = jobs.filter(job => {
        // Check if job has any assignments
        const jobAssignments = (assignments || []).filter(a => a.jobId === job.id);
        return jobAssignments.length === 0 && job.status === 'active';
      });
      
      if (jobsNeedingResources.length > 0) {
        issues.push(`${jobsNeedingResources.length} active jobs without resource assignments`);
      }
      
      // Check for missing required resource types
      const missingResourceTypes: string[] = [];
      jobConfigurations.forEach(config => {
        config.defaultRows.forEach(row => {
          if (row.required && row.requiredResources.length > 0) {
            row.requiredResources.forEach(requiredType => {
              const hasResource = resources.some(r => r.type === requiredType);
              if (!hasResource && !missingResourceTypes.includes(requiredType)) {
                missingResourceTypes.push(requiredType);
              }
            });
          }
        });
      });
      
      if (missingResourceTypes.length > 0) {
        issues.push(`Missing required resource types: ${missingResourceTypes.join(', ')}`);
      }
    }


    setSystemHealth({
      jobRules: jobRulesCount,
      compatibilityRules: globalAttachmentRules.length,
      resources: resources?.length || 0,
      issues
    });
  };

  const handleExportSettings = () => {
    const exportData = {
      jobConfigurations,
      customJobTypes,
      magnetRules,
      dropRules,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boardos-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.jobConfigurations) {
          setJobConfigurations(importData.jobConfigurations);
        }
        
        if (importData.customJobTypes) {
          setCustomJobTypes(importData.customJobTypes);
          localStorage.setItem('customJobTypes', JSON.stringify(importData.customJobTypes));
        }

        logger.info('Settings imported successfully');
      } catch (error) {
        logger.error('Failed to import settings:', error);
        alert('Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveJobType = (newJobType: JobTypeConfiguration) => {
    try {
      // Add to local configurations
      setJobConfigurations(prev => [...prev, newJobType]);
      
      // Add to custom job types list
      const updatedCustomTypes = [...customJobTypes, newJobType.id];
      setCustomJobTypes(updatedCustomTypes);
      
      // Save to localStorage
      localStorage.setItem('customJobTypes', JSON.stringify(updatedCustomTypes));
      
      // Save job configuration to localStorage (temporary - should be database)
      const existingConfigs = localStorage.getItem('jobConfigurations');
      const configs = existingConfigs ? JSON.parse(existingConfigs) : [];
      configs.push(newJobType);
      localStorage.setItem('jobConfigurations', JSON.stringify(configs));
      
      logger.info('Custom job type saved successfully:', newJobType.name);
      
      // Select the newly created job type
      setSelectedJobType(newJobType.id);
      
    } catch (error) {
      logger.error('Failed to save job type:', error);
      alert('Failed to save job type. Please try again.');
    }
  };

  const handleSaveAttachmentRule = (newRule: MagnetInteractionRule) => {
    try {
      // Add to local state
      setGlobalAttachmentRules(prev => [...prev, newRule]);
      
      // Save to localStorage (temporary - should be database)
      const savedRules = localStorage.getItem('globalAttachmentRules');
      const existingRules = savedRules ? JSON.parse(savedRules) : [];
      const updatedRules = [...existingRules, newRule];
      localStorage.setItem('globalAttachmentRules', JSON.stringify(updatedRules));
      
      logger.info('Attachment rule saved successfully:', `${newRule.sourceType} → ${newRule.targetType}`);
      
    } catch (error) {
      logger.error('Failed to save attachment rule:', error);
      alert('Failed to save attachment rule. Please try again.');
    }
  };

  const handleDeleteResource = (resource: Resource) => {
    setResourceToDelete(resource);
    setShowDeleteResourceModal(true);
  };

  const confirmDeleteResource = async () => {
    if (!resourceToDelete) return;
    
    try {
      const { deleteResource } = useScheduler();
      if (deleteResource) {
        await deleteResource(resourceToDelete.id);
      } else {
        console.warn('No deleteResource method available in SchedulerContext');
        // For now, just log the action - actual deletion would need to be implemented
        console.log('Would delete resource:', resourceToDelete);
      }
      
      logger.info('Resource deleted successfully:', resourceToDelete.name);
      
    } catch (error) {
      logger.error('Failed to delete resource:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleQuickAddResource = (resourceType: ResourceType, jobTypeName: string, rowName: string) => {
    setQuickAddResourceType(resourceType);
    setQuickAddContext({ jobTypeName, rowName });
    setShowQuickAddModal(true);
  };

  // Job configuration editing handlers
  const openResourceTypeSelector = (config: {
    title: string;
    currentTypes: ResourceType[];
    excludeTypes?: ResourceType[];
    onSelect: (types: ResourceType[]) => void;
  }) => {
    setResourceTypeSelectorConfig(config);
    setShowResourceTypeSelectorModal(true);
  };

  const handleAddAllowedResources = (jobTypeId: string, rowIndex: number) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const row = config.defaultRows[rowIndex];
    openResourceTypeSelector({
      title: `Add Allowed Resource Types - ${row.customName || row.rowType}`,
      currentTypes: row.allowedResources,
      onSelect: (newTypes) => {
        const updatedConfig = {
          ...config,
          defaultRows: config.defaultRows.map((r, i) => 
            i === rowIndex 
              ? { ...r, allowedResources: [...r.allowedResources, ...newTypes] }
              : r
          )
        };
        updateJobConfiguration(updatedConfig);
      }
    });
  };

  const handleAddRequiredResources = (jobTypeId: string, rowIndex: number) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const row = config.defaultRows[rowIndex];
    openResourceTypeSelector({
      title: `Add Required Resource Types - ${row.customName || row.rowType}`,
      currentTypes: row.requiredResources,
      excludeTypes: [], // Only allow selection from allowed types
      onSelect: (newTypes) => {
        // Validate that required types are subset of allowed types
        const validTypes = newTypes.filter(type => row.allowedResources.includes(type));
        if (validTypes.length !== newTypes.length) {
          alert('Required resource types must be selected from allowed resource types first.');
          return;
        }

        const updatedConfig = {
          ...config,
          defaultRows: config.defaultRows.map((r, i) => 
            i === rowIndex 
              ? { ...r, requiredResources: [...r.requiredResources, ...validTypes] }
              : r
          )
        };
        updateJobConfiguration(updatedConfig);
      }
    });
  };

  const handleRemoveAllowedResource = (jobTypeId: string, rowIndex: number, resourceType: ResourceType) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const row = config.defaultRows[rowIndex];
    
    // Check if this type is required - if so, remove from required too
    const newRequiredResources = row.requiredResources.filter(type => type !== resourceType);
    
    const updatedConfig = {
      ...config,
      defaultRows: config.defaultRows.map((r, i) => 
        i === rowIndex 
          ? { 
              ...r, 
              allowedResources: r.allowedResources.filter(type => type !== resourceType),
              requiredResources: newRequiredResources
            }
          : r
      )
    };
    updateJobConfiguration(updatedConfig);
  };

  const handleRemoveRequiredResource = (jobTypeId: string, rowIndex: number, resourceType: ResourceType) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const updatedConfig = {
      ...config,
      defaultRows: config.defaultRows.map((r, i) => 
        i === rowIndex 
          ? { ...r, requiredResources: r.requiredResources.filter(type => type !== resourceType) }
          : r
      )
    };
    updateJobConfiguration(updatedConfig);
  };

  const handleToggleRowEnabled = (jobTypeId: string, rowIndex: number) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const updatedConfig = {
      ...config,
      defaultRows: config.defaultRows.map((r, i) => 
        i === rowIndex 
          ? { ...r, enabled: !r.enabled }
          : r
      )
    };
    updateJobConfiguration(updatedConfig);
  };

  const handleToggleRowRequired = (jobTypeId: string, rowIndex: number) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const updatedConfig = {
      ...config,
      defaultRows: config.defaultRows.map((r, i) => 
        i === rowIndex 
          ? { ...r, required: !r.required }
          : r
      )
    };
    updateJobConfiguration(updatedConfig);
  };

  const handleUpdateMaxCount = (jobTypeId: string, rowIndex: number, maxCount: number | undefined) => {
    const config = jobConfigurations.find(c => c.id === jobTypeId);
    if (!config) return;

    const updatedConfig = {
      ...config,
      defaultRows: config.defaultRows.map((r, i) => 
        i === rowIndex 
          ? { ...r, maxCount: maxCount || undefined }
          : r
      )
    };
    updateJobConfiguration(updatedConfig);
  };

  const updateJobConfiguration = (config: JobTypeConfiguration) => {
    setJobConfigurations(prev => 
      prev.map(c => c.id === config.id ? config : c)
    );
    setHasUnsavedChanges(true);
  };

  const saveJobConfiguration = async () => {
    try {
      // Save ALL job configurations (both default and custom, including modifications)
      localStorage.setItem('allJobConfigurations', JSON.stringify(jobConfigurations));
      
      // Also maintain backward compatibility by saving customs separately
      const customConfigs = jobConfigurations.filter(c => c.isCustom);
      localStorage.setItem('customJobConfigurations', JSON.stringify(customConfigs));
      
      setHasUnsavedChanges(false);
      logger.info('Job configurations saved successfully', {
        total: jobConfigurations.length,
        custom: customConfigs.length
      });
      
      // Show success feedback
      alert('Job configurations saved successfully!');
    } catch (error) {
      logger.error('Failed to save job configurations:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all job configurations to default? This will lose all your customizations.')) {
      return;
    }

    try {
      // Clear saved configurations
      localStorage.removeItem('allJobConfigurations');
      localStorage.removeItem('customJobConfigurations');
      
      // Reload default configurations
      const defaultConfigs = JobRulesConfigurationManager.getAllConfigurations();
      setJobConfigurations(defaultConfigs);
      setHasUnsavedChanges(false);
      
      logger.info('Job configurations reset to defaults');
      alert('Job configurations have been reset to defaults.');
    } catch (error) {
      logger.error('Failed to reset configurations:', error);
      alert('Failed to reset configurations. Please try again.');
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <Briefcase className="text-blue-600" size={24} />
            <span className="text-2xl font-bold text-blue-700">{systemHealth.jobRules}</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">Job Rules</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <Magnet className="text-purple-600" size={24} />
            <span className="text-2xl font-bold text-purple-700">{systemHealth.compatibilityRules}</span>
          </div>
          <p className="text-sm text-purple-600 mt-1">Attachment Rules</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <Users className="text-orange-600" size={24} />
            <span className="text-2xl font-bold text-orange-700">{systemHealth.resources}</span>
          </div>
          <p className="text-sm text-orange-600 mt-1">Resources</p>
        </div>
      </div>

      {systemHealth.issues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="text-yellow-600 mr-2" size={20} />
            <h3 className="font-semibold text-yellow-800">System Issues</h3>
          </div>
          <ul className="space-y-1">
            {systemHealth.issues.map((issue, index) => (
              <li key={index} className="text-sm text-yellow-700 flex items-center">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center">
          <Settings className="mr-2" size={18} />
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportSettings}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Export Settings
          </button>
          
          <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
            <Upload size={16} className="mr-2" />
            Import Settings
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setActiveTab('jobRules')}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Configure Job Types
          </button>
        </div>
      </div>
    </div>
  );

  const renderJobRulesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Job Type Configurations</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={resetToDefaults}
            className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            title="Reset all configurations to defaults"
          >
            <AlertTriangle size={14} className="mr-1" />
            Reset to Defaults
          </button>
          <button 
            onClick={() => setShowAddJobTypeModal(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Add Custom Job Type
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobConfigurations.map((config) => (
          <div
            key={config.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedJobType === config.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedJobType(config.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{config.name}</h4>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {config.defaultRows.length} rows
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{config.description}</p>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{config.dropRules.length} drop rules</span>
              <span>{config.defaultRows.filter(r => r.enabled).length} active rows</span>
            </div>
          </div>
        ))}
      </div>

      {selectedJobType && (
        (() => {
          const selectedConfig = jobConfigurations.find(c => c.id === selectedJobType);
          return selectedConfig && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-4">
                {selectedConfig.name} Configuration
              </h4>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-medium">Row Configuration</h5>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Customizable per job type
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedConfig.defaultRows.map((row, index) => (
                      <div key={index} className={`border-2 rounded-lg p-4 ${row.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-300'}`}>
                        {/* Row Header with Controls */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="font-medium text-lg">{row.customName || row.rowType}</div>
                              <div className="flex items-center space-x-2">
                                <label className="flex items-center text-sm">
                                  <input
                                    type="checkbox"
                                    checked={row.enabled}
                                    onChange={() => handleToggleRowEnabled(selectedConfig.id, index)}
                                    className="mr-1"
                                  />
                                  Enabled
                                </label>
                                <label className="flex items-center text-sm">
                                  <input
                                    type="checkbox"
                                    checked={row.required}
                                    onChange={() => handleToggleRowRequired(selectedConfig.id, index)}
                                    className="mr-1"
                                  />
                                  Required
                                </label>
                              </div>
                            </div>
                            {row.description && (
                              <div className="text-sm text-gray-600 mt-1">{row.description}</div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="text-sm">
                              <label className="text-gray-600">Max Count:</label>
                              <input
                                type="number"
                                value={row.maxCount || ''}
                                onChange={(e) => handleUpdateMaxCount(selectedConfig.id, index, e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-16 ml-1 px-2 py-1 border border-gray-300 rounded text-center"
                                min="1"
                                placeholder="∞"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Allowed Resources Section */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-700">Allowed Resource Types</span>
                            <button
                              onClick={() => handleAddAllowedResources(selectedConfig.id, index)}
                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded flex items-center"
                            >
                              <Plus size={12} className="mr-1" />
                              Add Types
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border border-gray-200 rounded bg-white">
                            {row.allowedResources.length === 0 ? (
                              <span className="text-gray-400 text-sm">No resource types allowed</span>
                            ) : (
                              row.allowedResources.map(resourceType => (
                                <span 
                                  key={resourceType}
                                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {resourceType}
                                  <button
                                    onClick={() => handleRemoveAllowedResource(selectedConfig.id, index, resourceType)}
                                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Required Resources Section */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-700">Required Resource Types</span>
                            <button
                              onClick={() => handleAddRequiredResources(selectedConfig.id, index)}
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center"
                              disabled={row.allowedResources.length === 0}
                            >
                              <Plus size={12} className="mr-1" />
                              Add Required
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border border-gray-200 rounded bg-white">
                            {row.requiredResources.length === 0 ? (
                              <span className="text-gray-400 text-sm">No required resource types</span>
                            ) : (
                              row.requiredResources.map(resourceType => (
                                <span 
                                  key={resourceType}
                                  className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                                >
                                  {resourceType}
                                  <button
                                    onClick={() => handleRemoveRequiredResource(selectedConfig.id, index, resourceType)}
                                    className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                          {row.allowedResources.length === 0 && (
                            <div className="text-xs text-amber-600 mt-1 flex items-center">
                              <AlertTriangle size={12} className="mr-1" />
                              Add allowed resource types first
                            </div>
                          )}
                        </div>

                        {/* Row Status Summary */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-xs">
                            {row.enabled ? (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Enabled</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">⏸ Disabled</span>
                            )}
                            {row.required && (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded">⚠ Required</span>
                            )}
                            {row.maxCount && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Max: {row.maxCount}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.allowedResources.length} allowed, {row.requiredResources.length} required
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Save Changes Button */}
                  {hasUnsavedChanges && (
                    <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-amber-800">
                          <AlertTriangle size={18} className="mr-2" />
                          <div>
                            <div className="font-medium text-sm">Unsaved Changes</div>
                            <div className="text-xs text-amber-600">Changes to {selectedJobType} configuration need to be saved.</div>
                          </div>
                        </div>
                        <button
                          onClick={saveJobConfiguration}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-medium text-sm flex items-center shadow-sm transition-colors"
                        >
                          <Check size={16} className="mr-1" />
                          Save All Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );

  const renderCompatibilityTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Global Attachment Rules</h3>
          <p className="text-sm text-gray-600">Universal rules defining which resources can attach to other resources</p>
        </div>
        <button 
          onClick={() => setShowAddAttachmentModal(true)}
          className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add Attachment Rule
        </button>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center mb-2">
          <Magnet size={18} className="text-purple-600 mr-2" />
          <span className="text-sm font-medium text-purple-800">About Global Attachment Rules</span>
        </div>
        <p className="text-sm text-purple-700">
          These rules define which resource types can be magnetically attached to others via drag-and-drop.
          For example, operators can attach to equipment, drivers can attach to trucks, etc.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Magnet size={16} className="text-purple-600 mr-2" />
            Global Attachment Rules ({globalAttachmentRules.length})
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-600">
              These rules define which resources can be magnetically attached to others (drag-and-drop attachments).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {globalAttachmentRules.map((rule, index) => (
              <div key={index} className={`border-2 rounded-lg p-3 ${
                rule.isRequired 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className={`font-medium ${
                    rule.isRequired ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    {rule.sourceType} → {rule.targetType}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    rule.isRequired 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {rule.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                  </span>
                </div>
                <div className={`text-sm ${
                  rule.isRequired ? 'text-red-700' : 'text-blue-700'
                }`}>
                  Max: {rule.maxCount || 'Unlimited'}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Global Attachment Rules</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• These rules control drag-and-drop magnet attachment behavior</p>
          <p>• Define which resource types can attach to other resource types</p>
          <p>• Required attachments ensure safety and operational compliance</p>
          <p>• Apply universally across all job types</p>
          <p>• Changes affect all existing and new jobs immediately</p>
        </div>
      </div>
    </div>
  );


  const renderResourcesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resource Management</h3>
        <button 
          onClick={() => setShowAddResourceModal(true)}
          className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add Resource
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Personnel</h4>
          <div className="text-2xl font-bold text-blue-700">
            {(resources || []).filter(r => !['truck', 'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'roller', 'dozer', 'payloader', 'equipment'].includes(r.type)).length}
          </div>
          <p className="text-xs text-blue-600">Active personnel</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Equipment</h4>
          <div className="text-2xl font-bold text-yellow-700">
            {(resources || []).filter(r => ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'roller', 'dozer', 'payloader', 'equipment'].includes(r.type)).length}
          </div>
          <p className="text-xs text-yellow-600">Active equipment</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Trucks</h4>
          <div className="text-2xl font-bold text-green-700">
            {(resources || []).filter(r => r.type === 'truck').length}
          </div>
          <p className="text-xs text-green-600">Active trucks</p>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(resources || []).map(resource => (
            <div key={resource.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{resource.name}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {resource.type} - {resource.identifier}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteResource(resource)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete resource"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'jobRules', label: 'Job Rules', icon: Briefcase },
    { id: 'compatibility', label: 'Global Attachment Rules', icon: Magnet },
    { id: 'resources', label: 'Resources', icon: Users }
  ];

  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        style={{ zIndex: getZIndex('master-settings') }}
      >
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: getZIndex('master-settings') }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div className="flex items-center">
            <Settings size={28} className="text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-800">Master Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r bg-gray-50 p-6">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon size={20} className="mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'jobRules' && renderJobRulesTab()}
            {activeTab === 'compatibility' && renderCompatibilityTab()}
            {activeTab === 'resources' && renderResourcesTab()}
          </div>
        </div>

        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              {systemHealth.issues.length === 0 ? (
                <span className="flex items-center text-green-600 font-medium">
                  <Check size={18} className="mr-2" />
                  All systems operational
                </span>
              ) : (
                <span className="flex items-center text-yellow-600 font-medium">
                  <AlertTriangle size={18} className="mr-2" />
                  {systemHealth.issues.length} issue(s) detected
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExportSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Download size={16} className="mr-2" />
                Export
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Job Type Modal */}
      {showAddJobTypeModal && (
        <AddJobTypeModal
          onClose={() => setShowAddJobTypeModal(false)}
          onSave={handleSaveJobType}
        />
      )}
      
      {/* Add Attachment Rule Modal */}
      {showAddAttachmentModal && (
        <AddAttachmentRuleModal
          onClose={() => setShowAddAttachmentModal(false)}
          onSave={handleSaveAttachmentRule}
          existingRules={globalAttachmentRules}
        />
      )}
      
      {/* Add Resource Modal */}
      {showAddResourceModal && (
        <AddResourceModal
          onClose={() => setShowAddResourceModal(false)}
        />
      )}
      
      {/* Delete Resource Confirmation Modal */}
      {showDeleteResourceModal && resourceToDelete && (
        <ResourceDeleteConfirmModal
          resource={resourceToDelete}
          onClose={() => {
            setShowDeleteResourceModal(false);
            setResourceToDelete(null);
          }}
          onConfirm={confirmDeleteResource}
        />
      )}
      
      {/* Quick Add Resource Modal */}
      {showQuickAddModal && quickAddResourceType && (
        <QuickAddResourceModal
          requiredResourceType={quickAddResourceType}
          jobTypeName={quickAddContext?.jobTypeName}
          rowName={quickAddContext?.rowName}
          onClose={() => {
            setShowQuickAddModal(false);
            setQuickAddResourceType(null);
            setQuickAddContext(null);
          }}
        />
      )}

      {/* Resource Type Selector Modal */}
      {showResourceTypeSelectorModal && resourceTypeSelectorConfig && (
        <ResourceTypeSelectorModal
          title={resourceTypeSelectorConfig.title}
          currentTypes={resourceTypeSelectorConfig.currentTypes}
          excludeTypes={resourceTypeSelectorConfig.excludeTypes}
          onSelectTypes={resourceTypeSelectorConfig.onSelect}
          onClose={() => {
            setShowResourceTypeSelectorModal(false);
            setResourceTypeSelectorConfig(null);
          }}
        />
      )}
    </div>
  );
};

export default MasterSettingsModal;