import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Settings, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import { RowType, ResourceType, MagnetInteractionRule, DropRule } from '../../types';
import logger from '../../utils/logger';

interface JobTypeTemplate {
  id: string;
  name: string;
  description: string;
  jobType: 'milling' | 'paving' | 'both' | 'drainage' | 'stripping' | 'hired' | 'other';
  rows: JobRowConfig[];
  magnetRules: MagnetInteractionRule[];
  dropRules: DropRule[];
}

interface JobRowConfig {
  rowType: RowType;
  enabled: boolean;
  allowedTypes: ResourceType[];
  customName?: string;
}

interface JobTypeManagerModalProps {
  onClose: () => void;
}

const STANDARD_JOB_TYPES = [
  { value: 'paving', label: 'Paving', description: 'Asphalt paving operations' },
  { value: 'milling', label: 'Milling', description: 'Asphalt milling and removal' },
  { value: 'both', label: 'Mill & Pave', description: 'Combined milling and paving' },
  { value: 'drainage', label: 'Drainage', description: 'Storm drain and pipe work' },
  { value: 'stripping', label: 'Stripping', description: 'Pavement marking and striping' },
  { value: 'hired', label: 'Hired', description: 'Subcontracted work' },
  { value: 'other', label: 'Other', description: 'Custom job configuration' }
];

const ALL_ROW_TYPES: RowType[] = ['Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'];

const ALL_RESOURCE_TYPES: ResourceType[] = [
  'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
  'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine',
  'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
];

const JobTypeManagerModal: React.FC<JobTypeManagerModalProps> = ({ onClose }) => {
  const { getZIndex } = useModal();
  const { updateDropRule, updateMagnetInteractionRule, getDropRule, getMagnetInteractionRules } = useScheduler();
  
  const [templates, setTemplates] = useState<JobTypeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTypeTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<JobTypeTemplate | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rows: true,
    magnetRules: false,
    dropRules: false
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load saved templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('jobTypeTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // Create default templates
      setTemplates(createDefaultTemplates());
    }
  }, []);

  const createDefaultTemplates = (): JobTypeTemplate[] => {
    return STANDARD_JOB_TYPES.map(jobType => ({
      id: jobType.value,
      name: jobType.label,
      description: jobType.description,
      jobType: jobType.value as any,
      rows: createDefaultRows(jobType.value),
      magnetRules: createDefaultMagnetRules(jobType.value),
      dropRules: createDefaultDropRules(jobType.value)
    }));
  };

  const createDefaultRows = (jobType: string): JobRowConfig[] => {
    const baseRows: JobRowConfig[] = ALL_ROW_TYPES.map(rowType => ({
      rowType,
      enabled: true,
      allowedTypes: getDefaultAllowedTypes(rowType)
    }));

    // Customize based on job type
    switch (jobType) {
      case 'paving':
        return baseRows;
      case 'milling':
        return baseRows.filter(r => r.rowType !== 'Tack');
      case 'drainage':
        return baseRows.filter(r => !['Tack', 'MPT', 'Sweeper'].includes(r.rowType));
      default:
        return baseRows;
    }
  };

  const getDefaultAllowedTypes = (rowType: RowType): ResourceType[] => {
    switch (rowType) {
      case 'Forman':
        return ['foreman'];
      case 'Equipment':
        return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                'grader', 'dozer', 'payloader', 'roller', 'equipment', 'operator', 'foreman'];
      case 'Sweeper':
        return ['sweeper', 'operator', 'foreman'];
      case 'Tack':
      case 'MPT':
        return ['operator', 'laborer', 'truck', 'foreman'];
      case 'crew':
        return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
      case 'trucks':
        return ['truck', 'driver', 'privateDriver', 'foreman'];
      default:
        return [];
    }
  };

  const createDefaultMagnetRules = (jobType: string): MagnetInteractionRule[] => {
    const rules: MagnetInteractionRule[] = [];
    
    // All equipment needs operators
    ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
     'grader', 'dozer', 'payloader', 'roller', 'equipment'].forEach(equipment => {
      rules.push({
        sourceType: 'operator',
        targetType: equipment as ResourceType,
        canAttach: true,
        isRequired: true,
        maxCount: 1
      });
    });

    // Trucks need drivers
    rules.push({
      sourceType: 'driver',
      targetType: 'truck',
      canAttach: true,
      isRequired: true,
      maxCount: 1
    });

    // Job-specific rules
    if (jobType === 'paving' || jobType === 'both') {
      rules.push({
        sourceType: 'laborer',
        targetType: 'paver',
        canAttach: true,
        isRequired: false,
        maxCount: 2 // Screwmen
      });
    }

    if (jobType === 'milling' || jobType === 'both') {
      rules.push({
        sourceType: 'laborer',
        targetType: 'millingMachine',
        canAttach: true,
        isRequired: false,
        maxCount: 1 // Groundman
      });
    }

    return rules;
  };

  const createDefaultDropRules = (jobType: string): DropRule[] => {
    return ALL_ROW_TYPES.map(rowType => ({
      rowType,
      allowedTypes: getDefaultAllowedTypes(rowType)
    }));
  };

  const handleTemplateSelect = (template: JobTypeTemplate) => {
    setSelectedTemplate(template);
    setEditingTemplate({ ...template });
  };

  const handleCreateTemplate = () => {
    const newTemplate: JobTypeTemplate = {
      id: Date.now().toString(),
      name: 'New Job Type',
      description: 'Custom job configuration',
      jobType: 'other',
      rows: createDefaultRows('other'),
      magnetRules: createDefaultMagnetRules('other'),
      dropRules: createDefaultDropRules('other')
    };
    
    setTemplates([...templates, newTemplate]);
    setSelectedTemplate(newTemplate);
    setEditingTemplate(newTemplate);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    setSaveStatus('saving');
    
    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    );
    
    setTemplates(updatedTemplates);
    localStorage.setItem('jobTypeTemplates', JSON.stringify(updatedTemplates));
    setSelectedTemplate(editingTemplate);
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleApplyTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      // Apply drop rules
      for (const rule of editingTemplate.dropRules) {
        await updateDropRule(rule.rowType, rule.allowedTypes);
      }
      
      // Apply magnet rules
      for (const rule of editingTemplate.magnetRules) {
        await updateMagnetInteractionRule(rule);
      }
      
      logger.info('Job type template applied successfully');
      onClose();
    } catch (error) {
      logger.error('Error applying job type template:', error);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem('jobTypeTemplates', JSON.stringify(updatedTemplates));
    
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
      setEditingTemplate(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRowToggle = (rowType: RowType) => {
    if (!editingTemplate) return;
    
    const updatedRows = editingTemplate.rows.map(row =>
      row.rowType === rowType ? { ...row, enabled: !row.enabled } : row
    );
    
    setEditingTemplate({
      ...editingTemplate,
      rows: updatedRows
    });
  };

  const handleAllowedTypeToggle = (rowType: RowType, resourceType: ResourceType) => {
    if (!editingTemplate) return;
    
    const updatedRows = editingTemplate.rows.map(row => {
      if (row.rowType === rowType) {
        const allowedTypes = row.allowedTypes.includes(resourceType)
          ? row.allowedTypes.filter(t => t !== resourceType)
          : [...row.allowedTypes, resourceType];
        return { ...row, allowedTypes };
      }
      return row;
    });
    
    setEditingTemplate({
      ...editingTemplate,
      rows: updatedRows
    });
    
    // Also update drop rules
    const updatedDropRules = editingTemplate.dropRules.map(rule => {
      if (rule.rowType === rowType) {
        const row = updatedRows.find(r => r.rowType === rowType);
        return { ...rule, allowedTypes: row?.allowedTypes || [] };
      }
      return rule;
    });
    
    setEditingTemplate({
      ...editingTemplate,
      rows: updatedRows,
      dropRules: updatedDropRules
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: getZIndex('job-type-manager') }}>
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Job Type Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-1/3 pr-4 border-r border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Job Types</h3>
              <button
                onClick={handleCreateTemplate}
                className="text-blue-600 hover:text-blue-800"
                title="Create new job type"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto max-h-[70vh]">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded mt-1 inline-block">
                        {template.jobType}
                      </span>
                    </div>
                    {!['paving', 'milling', 'both', 'drainage', 'stripping', 'hired', 'other'].includes(template.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          {editingTemplate && (
            <div className="flex-1 pl-4 overflow-y-auto">
              <div className="mb-4">
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="text-xl font-semibold border-b border-gray-300 focus:border-blue-500 outline-none pb-1 w-full"
                />
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="text-sm text-gray-600 border-b border-gray-200 focus:border-blue-400 outline-none mt-2 w-full"
                  placeholder="Description"
                />
              </div>

              {/* Row Configuration */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('rows')}
                  className="flex items-center justify-between w-full text-left font-semibold mb-3 hover:text-blue-600"
                >
                  <span>Row Configuration</span>
                  {expandedSections.rows ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                
                {expandedSections.rows && (
                  <div className="space-y-3">
                    {editingTemplate.rows.map(row => (
                      <div key={row.rowType} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={() => handleRowToggle(row.rowType)}
                              className="mr-2"
                            />
                            <span className="font-medium">{row.rowType}</span>
                          </label>
                        </div>
                        
                        {row.enabled && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-2">Allowed resource types:</p>
                            <div className="grid grid-cols-4 gap-1">
                              {ALL_RESOURCE_TYPES.map(resourceType => (
                                <label
                                  key={resourceType}
                                  className="flex items-center text-xs hover:bg-gray-50 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={row.allowedTypes.includes(resourceType)}
                                    onChange={() => handleAllowedTypeToggle(row.rowType, resourceType)}
                                    className="mr-1"
                                  />
                                  <span>{resourceType}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Magnet Rules */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('magnetRules')}
                  className="flex items-center justify-between w-full text-left font-semibold mb-3 hover:text-blue-600"
                >
                  <span>Magnet Attachment Rules</span>
                  {expandedSections.magnetRules ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                
                {expandedSections.magnetRules && (
                  <div className="space-y-2">
                    {editingTemplate.magnetRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">
                          {rule.sourceType} → {rule.targetType}
                          {rule.isRequired && <span className="text-red-500 ml-1">*</span>}
                          {rule.maxCount && <span className="text-gray-500 ml-1">(max: {rule.maxCount})</span>}
                        </span>
                        <button
                          onClick={() => {
                            const updatedRules = editingTemplate.magnetRules.filter((_, i) => i !== index);
                            setEditingTemplate({ ...editingTemplate, magnetRules: updatedRules });
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveTemplate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Save size={16} className="mr-2" />
                    Save Template
                  </button>
                  {saveStatus === 'saved' && (
                    <span className="flex items-center text-green-600">
                      <Check size={16} className="mr-1" />
                      Saved
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleApplyTemplate}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Apply to Current Schedule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobTypeManagerModal;