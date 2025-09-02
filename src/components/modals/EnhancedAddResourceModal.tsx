import React, { useState } from 'react';
import { X, Plus, User, Truck, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import Portal from '../common/Portal';
import { ResourceType } from '../../types';

interface EnhancedAddResourceModalProps {
  onClose: () => void;
}

// Predefined skills and certifications for construction industry
const AVAILABLE_SKILLS = [
  'Heavy Equipment Operation',
  'Paving Operations',
  'Milling Operations',
  'Road Construction',
  'Equipment Maintenance',
  'Safety Protocols',
  'Site Supervision',
  'Quality Control',
  'GPS/Machine Control',
  'Hydraulics',
  'Welding',
  'Concrete Work',
  'Asphalt Work',
  'Drainage Systems',
  'Traffic Control',
];

const AVAILABLE_CERTIFICATIONS = [
  'CDL Class A',
  'CDL Class B', 
  'OSHA 10',
  'OSHA 30',
  'Heavy Equipment Operator',
  'Crane Operator',
  'Forklift Operator',
  'First Aid/CPR',
  'Hazmat',
  'Flagging',
  'Confined Space',
  'Fall Protection',
  'Paving Machine Operator',
  'Milling Machine Operator',
  'Roller Operator',
];

const EnhancedAddResourceModal: React.FC<EnhancedAddResourceModalProps> = ({ onClose }) => {
  const { addResource } = useScheduler();
  
  // Basic resource fields
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('operator');
  const [identifier, setIdentifier] = useState('');
  const [location, setLocation] = useState('');
  const [model, setModel] = useState('');
  const [onSite, setOnSite] = useState(false);
  
  // Enhanced fields for personnel
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [allowedEquipment, setAllowedEquipment] = useState<ResourceType[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [customCertification, setCustomCertification] = useState('');
  
  // Enhanced fields for equipment
  const [requiredCertifications, setRequiredCertifications] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [compatibleAttachments, setCompatibleAttachments] = useState<ResourceType[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'basic' | 'skills' | 'equipment' | 'preview'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedRules, setGeneratedRules] = useState<any[]>([]);

  const personnelTypes: ResourceType[] = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
  const equipmentTypes: ResourceType[] = [
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
  ];

  const isPersonnel = personnelTypes.includes(type);
  const isEquipment = equipmentTypes.includes(type);

  // Generate suggested rules based on resource properties
  const generateSuggestedRules = () => {
    const rules = [];
    
    if (isPersonnel) {
      // Generate attachment rules based on skills and allowed equipment
      allowedEquipment.forEach(equipType => {
        rules.push({
          type: 'magnet_attachment',
          description: `${name} (${type}) can operate ${equipType}`,
          rule: {
            sourceType: type,
            targetType: equipType,
            canAttach: true,
            isRequired: equipType === 'paver' || equipType === 'millingMachine' ? true : false
          }
        });
      });

      // Generate drop rules based on type
      if (type === 'foreman') {
        rules.push({
          type: 'drop_rule',
          description: `${name} can be placed in Foreman row`,
          rule: { rowType: 'Forman', allowedType: type }
        });
      } else {
        rules.push({
          type: 'drop_rule', 
          description: `${name} can be placed in Equipment or Crew rows`,
          rule: { rowTypes: ['Equipment', 'crew'], allowedType: type }
        });
      }
    }

    if (isEquipment) {
      // Generate operator requirements
      requiredCertifications.forEach(cert => {
        rules.push({
          type: 'operator_requirement',
          description: `${name} requires operator with ${cert}`,
          rule: { equipmentType: type, requiredCertification: cert }
        });
      });

      // Generate attachment possibilities
      compatibleAttachments.forEach(attachType => {
        rules.push({
          type: 'magnet_attachment',
          description: `${attachType} can attach to ${name}`,
          rule: {
            sourceType: attachType,
            targetType: type,
            canAttach: true
          }
        });
      });
    }

    setGeneratedRules(rules);
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleCertificationToggle = (cert: string) => {
    setSelectedCertifications(prev => 
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const handleEquipmentToggle = (equipType: ResourceType) => {
    setAllowedEquipment(prev =>
      prev.includes(equipType)
        ? prev.filter(e => e !== equipType)
        : [...prev, equipType]
    );
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const addCustomCertification = () => {
    if (customCertification.trim() && !selectedCertifications.includes(customCertification.trim())) {
      setSelectedCertifications(prev => [...prev, customCertification.trim()]);
      setCustomCertification('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const resourceData = {
        type,
        classType: isPersonnel ? 'employee' : 'equipment',
        name,
        identifier,
        location,
        model,
        onSite,
        // Enhanced fields for personnel
        ...(isPersonnel && {
          skills: selectedSkills,
          certifications: selectedCertifications,
          allowedEquipment
        }),
        // Enhanced fields for equipment  
        ...(isEquipment && {
          requiredCertifications,
          requiredSkills,
          compatibleAttachments
        })
      };

      await addResource(resourceData);
      
      // TODO: Apply generated rules to scheduler context
      // This will be implemented when smart rule generator is ready
      
      onClose();
    } catch (error) {
      console.error('Failed to add resource:', error);
      alert('Failed to add resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderBasicTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resource Type *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ResourceType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <optgroup label="Personnel">
            {personnelTypes.map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, ' $1')}
              </option>
            ))}
          </optgroup>
          <optgroup label="Equipment">
            {equipmentTypes.map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, ' $1')}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isPersonnel ? "Enter person's name" : "Enter equipment name"}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isPersonnel ? 'Employee ID' : 'Unit/Serial Number'}
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isPersonnel ? "e.g., EMP001" : "e.g., UNIT-123"}
        />
      </div>

      {isEquipment && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model/Make
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Caterpillar 320"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isPersonnel ? "Home base or office" : "Storage yard or current site"}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="onSite"
          checked={onSite}
          onChange={(e) => setOnSite(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label htmlFor="onSite" className="ml-2 text-sm text-gray-700">
          Currently on site
        </label>
      </div>
    </div>
  );

  const renderSkillsTab = () => {
    if (!isPersonnel) {
      return (
        <div className="text-center text-gray-500 py-8">
          Skills and certifications are only applicable to personnel resources.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Skills Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Skills
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {AVAILABLE_SKILLS.map(skill => (
              <label
                key={skill}
                className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                  selectedSkills.includes(skill) ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill)}
                  onChange={() => handleSkillToggle(skill)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm">{skill}</span>
              </label>
            ))}
          </div>
          
          {/* Add custom skill */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add custom skill"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="button"
              onClick={addCustomSkill}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Certifications Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Certifications
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {AVAILABLE_CERTIFICATIONS.map(cert => (
              <label
                key={cert}
                className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                  selectedCertifications.includes(cert) ? 'bg-green-50 border-green-300' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCertifications.includes(cert)}
                  onChange={() => handleCertificationToggle(cert)}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded"
                />
                <span className="text-sm">{cert}</span>
              </label>
            ))}
          </div>
          
          {/* Add custom certification */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={customCertification}
              onChange={(e) => setCustomCertification(e.target.value)}
              placeholder="Add custom certification"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="button"
              onClick={addCustomCertification}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEquipmentTab = () => {
    if (!isPersonnel) {
      return (
        <div className="text-center text-gray-500 py-8">
          Equipment assignments are only applicable to personnel resources.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Allowed Equipment Types
            <span className="text-gray-500 text-xs ml-1">(Equipment this person can operate)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {equipmentTypes.map(equipType => (
              <label
                key={equipType}
                className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                  allowedEquipment.includes(equipType) ? 'bg-yellow-50 border-yellow-300' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowedEquipment.includes(equipType)}
                  onChange={() => handleEquipmentToggle(equipType)}
                  className="h-4 w-4 text-yellow-600 border-gray-300 rounded"
                />
                <span className="text-sm">
                  {equipType.charAt(0).toUpperCase() + equipType.slice(1).replace(/([A-Z])/g, ' $1')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Smart suggestions based on certifications */}
        {selectedCertifications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
              <Settings size={16} className="mr-1" />
              Smart Suggestions
            </h4>
            <div className="text-xs text-blue-700">
              Based on selected certifications, consider allowing:
              {selectedCertifications.includes('CDL Class A') && (
                <span className="inline-block bg-blue-100 px-2 py-1 rounded ml-1">Truck</span>
              )}
              {selectedCertifications.includes('Heavy Equipment Operator') && (
                <>
                  <span className="inline-block bg-blue-100 px-2 py-1 rounded ml-1">Excavator</span>
                  <span className="inline-block bg-blue-100 px-2 py-1 rounded ml-1">Dozer</span>
                  <span className="inline-block bg-blue-100 px-2 py-1 rounded ml-1">Payloader</span>
                </>
              )}
              {selectedCertifications.includes('Paving Machine Operator') && (
                <span className="inline-block bg-blue-100 px-2 py-1 rounded ml-1">Paver</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPreviewTab = () => {
    // Generate rules for preview
    React.useEffect(() => {
      generateSuggestedRules();
    }, [selectedSkills, selectedCertifications, allowedEquipment, type, name]);

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Resource Summary</h4>
          <div className="text-sm space-y-1">
            <div><strong>Name:</strong> {name || 'Not specified'}</div>
            <div><strong>Type:</strong> {type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div><strong>ID:</strong> {identifier || 'Not specified'}</div>
            {isPersonnel && (
              <>
                <div><strong>Skills:</strong> {selectedSkills.length > 0 ? selectedSkills.join(', ') : 'None'}</div>
                <div><strong>Certifications:</strong> {selectedCertifications.length > 0 ? selectedCertifications.join(', ') : 'None'}</div>
                <div><strong>Can Operate:</strong> {allowedEquipment.length > 0 ? allowedEquipment.join(', ') : 'None'}</div>
              </>
            )}
          </div>
        </div>

        {generatedRules.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
              <CheckCircle size={16} className="mr-1" />
              Generated Rules ({generatedRules.length})
            </h4>
            <div className="space-y-2">
              {generatedRules.map((rule, index) => (
                <div key={index} className="text-xs bg-white p-2 rounded border border-green-300">
                  <div className="font-medium">{rule.type}</div>
                  <div className="text-gray-600">{rule.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {generatedRules.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-800 flex items-center">
              <AlertTriangle size={16} className="mr-1" />
              No rules will be generated. Add skills, certifications, or equipment assignments to create smart rules.
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <Plus className="mr-2 text-green-600" size={20} />
              <div>
                <h2 className="text-xl font-semibold">Add New Resource</h2>
                <div className="text-sm text-gray-500">Create resource with enhanced properties and auto-generated rules</div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-4">
              {[
                { id: 'basic', label: 'Basic Info', icon: User },
                { id: 'skills', label: 'Skills & Certs', icon: CheckCircle },
                { id: 'equipment', label: 'Equipment', icon: Truck },
                { id: 'preview', label: 'Preview', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'basic' && renderBasicTab()}
              {activeTab === 'skills' && renderSkillsTab()}
              {activeTab === 'equipment' && renderEquipmentTab()}
              {activeTab === 'preview' && renderPreviewTab()}
            </div>

            <div className="p-4 border-t flex justify-between">
              <div className="flex space-x-2">
                {activeTab !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'skills', 'equipment', 'preview'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1] as any);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}
                {activeTab !== 'preview' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'skills', 'equipment', 'preview'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1] as any);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Next
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Resource'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default EnhancedAddResourceModal;