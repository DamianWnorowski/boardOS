import React, { useState } from 'react';
import { X, Briefcase, Magnet, Target, Plus, Users, Settings as SettingsIcon } from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import JobTypeManagerModal from './JobTypeManagerModal';
import MagnetInteractionRulesModal from './MagnetInteractionRulesModal';
import DropRulesModal from './DropRulesModal';
import AddResourceModal from './AddResourceModal';

interface SettingsModalProps {
  onClose: () => void;
}

type TabType = 'jobTypes' | 'magnetRules' | 'dropRules' | 'resources';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { getZIndex } = useModal();
  const [activeTab, setActiveTab] = useState<TabType>('jobTypes');
  const [showAddResource, setShowAddResource] = useState(false);

  const tabs = [
    { id: 'jobTypes', label: 'Job Types', icon: Briefcase, description: 'Configure job types and row layouts' },
    { id: 'magnetRules', label: 'Magnet Rules', icon: Magnet, description: 'Set attachment requirements' },
    { id: 'dropRules', label: 'Drop Rules', icon: Target, description: 'Define where resources can be placed' },
    { id: 'resources', label: 'Resources', icon: Users, description: 'Manage personnel and equipment' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: getZIndex('settings') }}>
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center">
            <SettingsIcon className="mr-3 text-gray-700" size={28} />
            <div>
              <h2 className="text-2xl font-bold">Schedule Settings</h2>
              <p className="text-sm text-gray-600">Configure job types, rules, and resources</p>
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
                  onClick={() => setActiveTab(tab.id as TabType)}
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

            {/* Quick Actions */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
              <button
                onClick={() => setShowAddResource(true)}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Add Resource
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'jobTypes' && (
              <div className="h-full">
                <JobTypeManagerContent />
              </div>
            )}
            
            {activeTab === 'magnetRules' && (
              <div className="h-full">
                <MagnetRulesContent />
              </div>
            )}
            
            {activeTab === 'dropRules' && (
              <div className="h-full">
                <DropRulesContent />
              </div>
            )}
            
            {activeTab === 'resources' && (
              <div className="h-full p-6">
                <ResourcesContent />
              </div>
            )}
          </div>
        </div>

        {/* Add Resource Modal */}
        {showAddResource && (
          <AddResourceModal
            onClose={() => setShowAddResource(false)}
          />
        )}
      </div>
    </div>
  );
};

// Job Type Manager Content (embedded version)
const JobTypeManagerContent: React.FC = () => {
  return (
    <div className="h-full p-6 overflow-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Job Type Configuration</h3>
        <p className="text-gray-600">
          Create and manage job type templates with predefined row configurations, 
          magnet rules, and drop zones for different construction operations.
        </p>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Tip:</strong> Job type templates automatically configure your schedule board 
          with the appropriate rows and rules for specific operations like paving, milling, or drainage work.
        </p>
      </div>

      {/* Embedded job type manager functionality */}
      <iframe 
        src="#job-type-manager" 
        className="w-full h-full border-0"
        title="Job Type Manager"
      />
    </div>
  );
};

// Magnet Rules Content (embedded version)
const MagnetRulesContent: React.FC = () => {
  return (
    <div className="h-full p-6 overflow-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Magnet Attachment Rules</h3>
        <p className="text-gray-600">
          Define which resources can attach to equipment and vehicles. 
          For example, operators attaching to pavers or drivers to trucks.
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> When you drag an operator onto equipment, 
          they automatically attach if the magnet rule allows it. Required attachments 
          show warnings when missing.
        </p>
      </div>

      {/* Embedded magnet rules functionality */}
      <div className="space-y-4">
        {/* This would contain the actual magnet rules UI */}
      </div>
    </div>
  );
};

// Drop Rules Content (embedded version)
const DropRulesContent: React.FC = () => {
  return (
    <div className="h-full p-6 overflow-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Drop Zone Rules</h3>
        <p className="text-gray-600">
          Control which types of resources can be placed in each row. 
          This ensures proper organization of your schedule.
        </p>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          <strong>Example:</strong> The Equipment row only accepts equipment and operators, 
          while the Crew row accepts all personnel types.
        </p>
      </div>

      {/* Embedded drop rules functionality */}
      <div className="space-y-4">
        {/* This would contain the actual drop rules UI */}
      </div>
    </div>
  );
};

// Resources Content
const ResourcesContent: React.FC = () => {
  return (
    <div className="">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Resource Management</h3>
        <p className="text-gray-600">
          Add, edit, and manage your personnel and equipment inventory.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <Users className="mr-2" size={20} />
            Personnel
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Operators</p>
            <p>• Drivers</p>
            <p>• Laborers</p>
            <p>• Foremen</p>
            <p>• Stripers</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <Briefcase className="mr-2" size={20} />
            Equipment
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Pavers</p>
            <p>• Milling Machines</p>
            <p>• Rollers</p>
            <p>• Trucks</p>
            <p>• Skidsteers</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Pro Tip:</strong> Set up operator equipment permissions to control 
          which operators can operate specific equipment types.
        </p>
      </div>
    </div>
  );
};

export default SettingsModal;