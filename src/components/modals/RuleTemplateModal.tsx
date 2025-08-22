import React, { useState } from 'react';
import { X, Download, Upload, Save, RefreshCw, Settings } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { MagnetInteractionRule, DropRule } from '../../types';
import { 
  ruleTemplates, 
  dropRuleTemplates, 
  ruleUtils, 
  createMagnetRules,
  createDropRules 
} from '../../utils/ruleCreator';
import Portal from '../common/Portal';

interface RuleTemplateModalProps {
  onClose: () => void;
}

const RuleTemplateModal: React.FC<RuleTemplateModalProps> = ({ onClose }) => {
  const { 
    magnetInteractionRules, 
    dropRules,
    resources,
    updateMagnetInteractionRule,
    updateDropRule
  } = useScheduler();
  
  const [activeTab, setActiveTab] = useState<'templates' | 'import' | 'export'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [exportData, setExportData] = useState<string>('');

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    
    const template = ruleTemplates[selectedTemplate];
    if (template) {
      // Apply magnet interaction rules
      template.rules.forEach(rule => {
        updateMagnetInteractionRule(rule);
      });
      
      // Apply corresponding drop rules if using standard template
      if (selectedTemplate === 'standardConstruction') {
        const standardDropRules = dropRuleTemplates.standard;
        standardDropRules.forEach(dropRule => {
          updateDropRule(dropRule.rowType, dropRule.allowedTypes);
        });
      }
      
      alert(`Applied ${template.name} template successfully!`);
      onClose();
    }
  };

  const handleImportRules = () => {
    try {
      const imported = JSON.parse(importData);
      
      if (imported.magnetRules && Array.isArray(imported.magnetRules)) {
        imported.magnetRules.forEach((rule: MagnetInteractionRule) => {
          updateMagnetInteractionRule(rule);
        });
      }
      
      if (imported.dropRules && Array.isArray(imported.dropRules)) {
        imported.dropRules.forEach((rule: DropRule) => {
          updateDropRule(rule.rowType, rule.allowedTypes);
        });
      }
      
      alert('Rules imported successfully!');
      setImportData('');
      onClose();
    } catch (error) {
      alert('Error importing rules. Please check the JSON format.');
    }
  };

  const handleExportRules = () => {
    const exportObject = {
      magnetRules: magnetInteractionRules,
      dropRules: dropRules,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    setExportData(JSON.stringify(exportObject, null, 2));
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportData).then(() => {
      alert('Rules copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset all rules to default values? This cannot be undone.')) {
      // Apply standard construction template
      const standardRules = ruleTemplates.standardConstruction.rules;
      standardRules.forEach(rule => {
        updateMagnetInteractionRule(rule);
      });
      
      // Apply standard drop rules
      const standardDropRules = dropRuleTemplates.standard;
      standardDropRules.forEach(dropRule => {
        updateDropRule(dropRule.rowType, dropRule.allowedTypes);
      });
      
      alert('Rules reset to default values!');
      onClose();
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Rule Templates & Management</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b">
            {[
              { id: 'templates', label: 'Templates', icon: Save },
              { id: 'import', label: 'Import', icon: Upload },
              { id: 'export', label: 'Export', icon: Download },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pre-built Rule Templates</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose from pre-configured rule sets designed for common construction scenarios:
                  </p>
                  
                  <div className="space-y-3">
                    {Object.entries(ruleTemplates).map(([key, template]) => (
                      <label 
                        key={key}
                        className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="template"
                            value={key}
                            checked={selectedTemplate === key}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                            <div className="text-xs text-gray-500 mt-2">
                              {template.rules.length} interaction rules
                              {template.rules.filter(r => r.isRequired).length > 0 && (
                                <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                  {template.rules.filter(r => r.isRequired).length} required
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div className="flex space-x-2">
                      <button
                        onClick={handleResetToDefaults}
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        Reset to Defaults
                      </button>
                      
                      <button
                        onClick={() => {
                          // Create dynamic rules based on current resources
                          const availableTypes = [...new Set(resources.map(r => r.type))];
                          const dynamicRules = ruleUtils.createJobTypeRules('both', availableTypes);
                          
                          // Apply the dynamic rules
                          dynamicRules.forEach(rule => {
                            updateMagnetInteractionRule(rule);
                          });
                          
                          alert(`Applied ${dynamicRules.length} dynamic rules based on your available resources!`);
                        }}
                        className="flex items-center px-4 py-2 text-purple-600 hover:text-purple-800 border border-purple-300 rounded-md hover:bg-purple-50"
                      >
                        <Settings size={16} className="mr-2" />
                        Auto-Generate Rules
                      </button>
                    </div>
                    
                    <button
                      onClick={handleApplyTemplate}
                      disabled={!selectedTemplate}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply Template
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Import Rules</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Paste JSON data containing magnet interaction rules and drop rules:
                  </p>
                  
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder={`Paste JSON data here, for example:
{
  "magnetRules": [
    {
      "sourceType": "operator",
      "targetType": "paver",
      "canAttach": true,
      "isRequired": true,
      "maxCount": 1
    }
  ],
  "dropRules": [
    {
      "rowType": "Equipment",
      "allowedTypes": ["paver", "operator"]
    }
  ]
}`}
                    rows={15}
                    className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                  />
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleImportRules}
                      disabled={!importData.trim()}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Import Rules
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Export Current Rules</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Export your current rule configuration to save or share with others:
                  </p>
                  
                  <div className="flex space-x-3 mb-4">
                    <button
                      onClick={handleExportRules}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Download size={16} className="mr-2" />
                      Generate Export
                    </button>
                    
                    {exportData && (
                      <button
                        onClick={handleCopyToClipboard}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        <Upload size={16} className="mr-2" />
                        Copy to Clipboard
                      </button>
                    )}
                  </div>
                  
                  {exportData && (
                    <textarea
                      value={exportData}
                      readOnly
                      rows={15}
                      className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm bg-gray-50"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default RuleTemplateModal;