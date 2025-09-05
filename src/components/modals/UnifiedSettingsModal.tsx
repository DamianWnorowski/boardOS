import React, { useState } from 'react';
import { 
  X, Settings as SettingsIcon, Users, Briefcase, Magnet, Target, 
  Plus, Download, Upload, Zap, Eye, BarChart3, AlertTriangle
} from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import Portal from '../common/Portal';
import UnifiedRulesTable from '../settings/UnifiedRulesTable';
import EnhancedAddResourceModal from './EnhancedAddResourceModal';
import { SmartRuleGenerator } from '../../utils/smartRuleGenerator';

interface UnifiedSettingsModalProps {
  onClose: () => void;
  initialTab?: SettingsTab;
}

type SettingsTab = 'overview' | 'rules' | 'resources' | 'automation' | 'analytics';

const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = ({ 
  onClose, 
  initialTab = 'overview' 
}) => {
  const { getZIndex } = useModal();
  const { 
    resources, 
    magnetInteractionRules, 
    dropRules,
    jobs
  } = useScheduler();
  const { openModal } = useModal();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [showAddResource, setShowAddResource] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: BarChart3, 
      description: 'System status and quick insights' 
    },
    { 
      id: 'rules', 
      label: 'Rules Management', 
      icon: Target, 
      description: 'All rules in one unified view' 
    },
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: Users, 
      description: 'Personnel and equipment management' 
    },
    { 
      id: 'automation', 
      label: 'Smart Rules', 
      icon: Zap, 
      description: 'AI-powered rule generation' 
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      description: 'Usage patterns and optimization' 
    }
  ];

  // Analyze current system state
  React.useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'automation') {
      const analysis = SmartRuleGenerator.analyzeExistingRules(magnetInteractionRules, dropRules);
      const suggestions = SmartRuleGenerator.generateStandardConstructionRules();
      
      setAnalysisData({
        ...analysis,
        totalRules: magnetInteractionRules.length + dropRules.length,
        totalResources: resources.length,
        suggestions: suggestions.slice(0, 5) // Top 5 suggestions
      });
    }
  }, [activeTab, magnetInteractionRules, dropRules, resources]);

  const handleAddResource = () => {
    setShowAddResource(true);
  };

  const handleExportSettings = () => {
    const settings = {
      magnetRules: magnetInteractionRules,
      dropRules: dropRules,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `boardos-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const renderOverviewTab = () => (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Rules</p>
              <p className="text-2xl font-bold text-blue-800">
                {analysisData?.totalRules || 0}
              </p>
            </div>
            <Target className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Resources</p>
              <p className="text-2xl font-bold text-green-800">
                {analysisData?.totalResources || 0}
              </p>
            </div>
            <Users className="text-green-600" size={24} />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Coverage</p>
              <p className="text-2xl font-bold text-purple-800">
                {Math.round(analysisData?.coverage || 0)}%
              </p>
            </div>
            <Eye className="text-purple-600" size={24} />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Issues</p>
              <p className="text-2xl font-bold text-red-800">
                {analysisData?.conflicts?.length || 0}
              </p>
            </div>
            <AlertTriangle className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
          <div className="space-y-2">
            <button
              onClick={handleAddResource}
              className="w-full flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Add New Resource
            </button>
            <button
              onClick={() => setActiveTab('automation')}
              className="w-full flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Zap size={16} className="mr-2" />
              Generate Smart Rules
            </button>
            <button
              onClick={handleExportSettings}
              className="w-full flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={16} className="mr-2" />
              Export Settings
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>System initialized with {magnetInteractionRules.length} magnet rules</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>{resources.length} resources configured</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <span>{dropRules.length} drop rules active</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      {analysisData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">System Health</h4>
          
          {analysisData.conflicts?.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="text-red-800 font-medium mb-2">⚠️ Rule Conflicts Detected</h5>
              <ul className="text-sm text-red-700 space-y-1">
                {analysisData.conflicts.slice(0, 3).map((conflict: string, index: number) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
              <button
                onClick={() => setActiveTab('rules')}
                className="mt-2 text-red-700 underline text-sm hover:text-red-800"
              >
                View all conflicts →
              </button>
            </div>
          )}

          {analysisData.suggestions?.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-blue-800 font-medium mb-2">💡 Optimization Suggestions</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                {analysisData.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
              <button
                onClick={() => setActiveTab('automation')}
                className="mt-2 text-blue-700 underline text-sm hover:text-blue-800"
              >
                Generate smart rules →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderRulesTab = () => (
    <div className="h-full">
      <UnifiedRulesTable
        onAddRule={() => {
          // Future: Open rule creation modal
          console.log('Add rule clicked');
        }}
        onEditRule={(rule) => {
          // Future: Open rule edit modal
          console.log('Edit rule clicked', rule);
        }}
        onDeleteRule={(ruleId) => {
          // Future: Confirm and delete rule
          console.log('Delete rule clicked', ruleId);
        }}
      />
    </div>
  );

  const renderResourcesTab = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold">Resource Management</h4>
          <p className="text-sm text-gray-600">Add and manage personnel and equipment</p>
        </div>
        <button
          onClick={handleAddResource}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Add Resource
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium mb-3">Personnel ({resources.filter(r => r.classType === 'employee').length})</h5>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {resources
              .filter(r => r.classType === 'employee')
              .slice(0, 10)
              .map(resource => (
                <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-xs text-gray-500">{resource.type}</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Edit
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium mb-3">Equipment ({resources.filter(r => r.classType === 'equipment').length})</h5>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {resources
              .filter(r => r.classType === 'equipment')
              .slice(0, 10)
              .map(resource => (
                <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-xs text-gray-500">{resource.type}</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Edit
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAutomationTab = () => (
    <div className="p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-2">Smart Rule Generation</h4>
        <p className="text-sm text-gray-600">
          AI-powered analysis of your resources to automatically generate optimal rules
        </p>
      </div>

      {analysisData?.suggestions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h5 className="text-blue-800 font-medium mb-4">Recommended Rules</h5>
          <div className="space-y-3">
            {analysisData.suggestions.map((suggestion: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded border border-blue-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{suggestion.description}</div>
                    <div className="text-xs text-gray-600 mt-1">{suggestion.reasoning}</div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        suggestion.category === 'safety' ? 'bg-red-100 text-red-700' :
                        suggestion.category === 'business' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {suggestion.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round((suggestion.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 ml-4">
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium mb-3">Automation Options</h5>
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Auto-generate safety rules</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Auto-generate efficiency rules</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Auto-apply high-confidence rules</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Notify of rule conflicts</span>
            </label>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium mb-3">Generation Stats</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Rules analyzed:</span>
              <span>{analysisData?.totalRules || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Conflicts found:</span>
              <span className="text-red-600">{analysisData?.conflicts?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Suggestions made:</span>
              <span className="text-blue-600">{analysisData?.suggestions?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Coverage score:</span>
              <span className="text-green-600">{Math.round(analysisData?.coverage || 0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="p-6">
      <h4 className="text-lg font-semibold mb-6">System Analytics</h4>
      <div className="text-center text-gray-500 py-12">
        <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Analytics Coming Soon</p>
        <p className="text-sm">Detailed insights into rule usage and system performance</p>
      </div>
    </div>
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        style={{ zIndex: getZIndex('unified-settings') }}
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex items-center">
              <SettingsIcon className="mr-3 text-gray-700" size={28} />
              <div>
                <h2 className="text-2xl font-bold">Unified Settings</h2>
                <p className="text-sm text-gray-600">Complete system configuration and management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-gray-50 p-4 border-r border-gray-200">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-start space-x-3 ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <tab.icon size={20} className="mt-0.5" />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs opacity-75 mt-0.5">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'rules' && renderRulesTab()}
              {activeTab === 'resources' && renderResourcesTab()}
              {activeTab === 'automation' && renderAutomationTab()}
              {activeTab === 'analytics' && renderAnalyticsTab()}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Add Resource Modal */}
      {showAddResource && (
        <EnhancedAddResourceModal
          onClose={() => setShowAddResource(false)}
        />
      )}
    </Portal>
  );
};

export default UnifiedSettingsModal;