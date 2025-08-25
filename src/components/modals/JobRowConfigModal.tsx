import React, { useState } from 'react';
import { X, Settings, Split, Plus, Trash2, Link, Unlink, ChevronDown, ChevronUp } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { RowType, ResourceType, JobRowConfig, JobRowBox, BoxAttachmentRule } from '../../types';
import Portal from '../common/Portal';

interface JobRowConfigModalProps {
  jobId: string;
  rowType: RowType;
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

interface BoxConfigProps {
  box: JobRowBox;
  boxPath: number[];
  depth: number;
  onUpdateBox: (path: number[], updates: Partial<JobRowBox>) => void;
  onSplitBox: (path: number[]) => void;
  onUnsplitBox: (path: number[]) => void;
  onRemoveBox: (path: number[]) => void;
  canRemove: boolean;
}

const BoxConfig: React.FC<BoxConfigProps> = ({ 
  box, 
  boxPath, 
  depth,
  onUpdateBox, 
  onSplitBox, 
  onUnsplitBox, 
  onRemoveBox,
  canRemove 
}) => {
  const [showRules, setShowRules] = useState(false);
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  console.log(`Rendering BoxConfig for ${box.name} (ID: ${box.id}) at depth ${depth}`);
  console.log(`  box.isSplit: ${box.isSplit}`);
  console.log(`  box.subBoxes: ${box.subBoxes ? box.subBoxes.length : 'none'}`);

  const handleUpdateAllowedTypes = (resourceType: ResourceType, allowed: boolean) => {
    const newAllowedTypes = allowed 
      ? [...box.allowedTypes, resourceType]
      : box.allowedTypes.filter(type => type !== resourceType);
    
    onUpdateBox(boxPath, { allowedTypes: newAllowedTypes });
  };

  const handleUpdateAttachmentRule = (
    sourceType: ResourceType,
    targetType: ResourceType,
    field: keyof BoxAttachmentRule,
    value: any
  ) => {
    const existingRuleIndex = (box.attachmentRules || []).findIndex(
      r => r.sourceType === sourceType && r.targetType === targetType
    );

    const newRule: BoxAttachmentRule = {
      sourceType,
      targetType,
      canAttach: false,
      isAutoAttach: false,
      priority: 1,
      ...(box.attachmentRules?.[existingRuleIndex] || {}),
      [field]: value
    };

    const updatedRules = [...(box.attachmentRules || [])];
    if (existingRuleIndex !== -1) {
      updatedRules[existingRuleIndex] = newRule;
    } else {
      updatedRules.push(newRule);
    }

    onUpdateBox(boxPath, { attachmentRules: updatedRules });
  };

  const getAttachmentRule = (sourceType: ResourceType, targetType: ResourceType) => {
    return box.attachmentRules?.find(r => r.sourceType === sourceType && r.targetType === targetType);
  };

  const indentClass = `ml-${Math.min(depth * 4, 16)}`;

  return (
    <div className={`${indentClass} border border-gray-200 rounded-lg bg-gray-50`}>
      <div className="p-4">
        {/* Box Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                {depth === 0 ? 'Main Box' : `Sub-box ${boxPath[boxPath.length - 1] + 1}`}:
              </span>
              <input
                type="text"
                value={box.name}
                onChange={(e) => onUpdateBox(boxPath, { name: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md font-medium bg-white"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {canRemove && (
              <button
                onClick={() => onRemoveBox(boxPath)}
                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                title="Remove this box"
              >
                <Trash2 size={16} />
              </button>
            )}
            <label className="text-sm text-gray-700">Max:</label>
            <input
              type="number"
              value={box.maxCount || 0}
              onChange={(e) => onUpdateBox(boxPath, { maxCount: parseInt(e.target.value) || 0 })}
              min="0"
              max="50"
              className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center bg-white"
            />
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Split/Unsplit Controls */}
            <div className="mb-4 p-3 bg-white border border-gray-200 rounded-md">
              {!box.isSplit ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Split this box into sub-boxes</span>
                  <button
                    onClick={() => onSplitBox(boxPath)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    <Split size={14} className="mr-1" />
                    Split Box
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This box is split into sub-boxes</span>
                  <button
                    onClick={() => onUnsplitBox(boxPath)}
                    className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  >
                    <X size={14} className="mr-1" />
                    Unsplit
                  </button>
                </div>
              )}
            </div>

            {/* Sub-boxes (if split) */}
            {box.isSplit && box.subBoxes && box.subBoxes.length > 0 && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Sub-boxes</h4>
                  <button
                    onClick={() => {
                      const newSubBox: JobRowBox = {
                        id: `${box.id}-sub${box.subBoxes!.length + 1}`,
                        name: `Sub-box ${box.subBoxes!.length + 1}`,
                        allowedTypes: [], // Default to empty, user can configure
                        isSplit: false, // Explicitly not split initially
                        subBoxes: [], // Explicitly empty sub-boxes
                        maxCount: 5,
                        attachmentRules: []
                      };
                      onUpdateBox(boxPath, { 
                        subBoxes: [...(box.subBoxes || []), newSubBox] 
                      });
                    }}
                    className="flex items-center px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                  >
                    <Plus size={12} className="mr-1" />
                    Add Sub-box
                  </button>
                </div>
                
                {box.subBoxes.map((subBox, subIndex) => (
                  <BoxConfig
                    key={subBox.id}
                    box={subBox}
                    boxPath={[...boxPath, subIndex]}
                    depth={depth + 1}
                    onUpdateBox={(path, updates) => {
                      const newSubBoxes = [...box.subBoxes!];
                      newSubBoxes[subIndex] = { ...newSubBoxes[subIndex], ...updates };
                      onUpdateBox(boxPath, { subBoxes: newSubBoxes });
                    }}
                   onSplitBox={onSplitBox}
                   onUnsplitBox={onUnsplitBox}
                    onRemoveBox={(path) => {
                      const newSubBoxes = box.subBoxes!.filter((_, index) => index !== subIndex);
                      onUpdateBox(boxPath, { subBoxes: newSubBoxes });
                    }}
                    canRemove={box.subBoxes.length > 1}
                  />
                ))}
              </div>
            )}

            {/* Only show resource types and rules if box is not split */}
            {!box.isSplit && (
              <>
                {/* Allowed Resource Types */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Allowed Resource Types</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {allResourceTypes.map(resourceType => {
                      const isAllowed = box.allowedTypes.includes(resourceType);
                      
                      return (
                        <label 
                          key={resourceType} 
                          className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                            isAllowed ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={(e) => handleUpdateAllowedTypes(resourceType, e.target.checked)}
                            className="h-4 w-4 text-green-600 border-gray-300 rounded"
                          />
                          <span className="text-xs">{resourceTypeLabels[resourceType]}</span>
                        </label>
                      );
                    })}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => {
                        allResourceTypes.forEach(type => {
                          if (!box.allowedTypes.includes(type)) {
                            handleUpdateAllowedTypes(type, true);
                          }
                        });
                      }}
                      className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        box.allowedTypes.forEach(type => {
                          handleUpdateAllowedTypes(type, false);
                        });
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                    >
                      None
                    </button>
                    <button
                      onClick={() => {
                        const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'];
                        equipmentTypes.forEach(type => {
                          if (!box.allowedTypes.includes(type)) {
                            handleUpdateAllowedTypes(type, true);
                          }
                        });
                      }}
                      className="px-2 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-xs"
                    >
                      Equipment
                    </button>
                    <button
                      onClick={() => {
                        const personnelTypes = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
                        personnelTypes.forEach(type => {
                          if (!box.allowedTypes.includes(type)) {
                            handleUpdateAllowedTypes(type, true);
                          }
                        });
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                    >
                      Personnel
                    </button>
                  </div>
                </div>

                {/* Attachment Rules */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-blue-900">
                      Attachment Rules for {box.name}
                    </h5>
                    <button
                      onClick={() => setShowRules(!showRules)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <Link size={14} className="mr-1" />
                      {showRules ? 'Hide Rules' : 'Edit Rules'}
                    </button>
                  </div>
                  
                  {showRules && (
                    <div className="space-y-2">
                      <p className="text-xs text-blue-700 mb-3">
                        Configure which resource types can automatically attach when dropped together in this box:
                      </p>
                      
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                        {box.allowedTypes.map(sourceType => 
                          box.allowedTypes.map(targetType => {
                            if (sourceType === targetType) return null;
                            
                            const rule = getAttachmentRule(sourceType, targetType);
                            const canAttach = rule?.canAttach || false;
                            const isAutoAttach = rule?.isAutoAttach || false;
                            const priority = rule?.priority || 1;
                            
                            return (
                              <div 
                                key={`${sourceType}-${targetType}`}
                                className="flex items-center justify-between p-2 bg-white border rounded"
                              >
                                <span className="text-xs">
                                  <strong>{resourceTypeLabels[sourceType]}</strong> → {resourceTypeLabels[targetType]}
                                </span>
                                
                                <div className="flex items-center space-x-2">
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="checkbox"
                                      checked={canAttach}
                                      onChange={(e) => 
                                        handleUpdateAttachmentRule(sourceType, targetType, 'canAttach', e.target.checked)
                                      }
                                      className="h-3 w-3 text-blue-600"
                                    />
                                    <span className="text-xs">Attach</span>
                                  </label>
                                  
                                  {canAttach && (
                                    <>
                                      <label className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          checked={isAutoAttach}
                                          onChange={(e) => 
                                            handleUpdateAttachmentRule(sourceType, targetType, 'isAutoAttach', e.target.checked)
                                          }
                                          className="h-3 w-3 text-green-600"
                                        />
                                        <span className="text-xs">Auto</span>
                                      </label>
                                      <input
                                        type="number"
                                        value={priority}
                                        onChange={(e) => 
                                          handleUpdateAttachmentRule(sourceType, targetType, 'priority', parseInt(e.target.value) || 1)
                                        }
                                        min="1"
                                        max="10"
                                        className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                                        title="Priority (1-10)"
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ).filter(Boolean)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Box Actions */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-300">
              <div className="text-xs text-gray-500">
                {box.isSplit ? `${box.subBoxes?.length || 0} sub-boxes` : `${box.allowedTypes.length} types allowed`}
              </div>
              
              {!box.isSplit && (
                <button
                  onClick={() => onSplitBox(boxPath)}
                  className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                >
                  <Split size={12} className="mr-1" />
                  Split This Box
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

};

const JobRowConfigModal: React.FC<JobRowConfigModalProps> = ({ 
  jobId, 
  rowType, 
  onClose 
}) => {
  const { 
    getJobRowConfig, 
    updateJobRowConfig, 
    getJobById
  } = useScheduler();
  
  // Debug logging
  React.useEffect(() => {
    logger.debug('🔧 JobRowConfigModal mounted for:', { jobId, rowType });
    logger.debug('🔧 Existing config:', getJobRowConfig(jobId, rowType));
  }, [jobId, rowType]);

  const job = getJobById(jobId);
  const existingConfig = getJobRowConfig(jobId, rowType);
  const [config, setConfig] = useState<JobRowConfig>(existingConfig || {
    jobId,
    rowType,
    isSplit: false,
    boxes: []
  });
  
  // Debug config changes
  React.useEffect(() => {
    logger.debug('🔧 Config state changed:', {
      isSplit: config.isSplit,
      boxCount: config.boxes.length,
      boxes: config.boxes.map(box => ({
        id: box.id,
        name: box.name,
        allowedTypes: box.allowedTypes,
        isSplit: box.isSplit,
        subBoxCount: box.subBoxes?.length || 0
      }))
    });
  }, [config]);

  const [box1Name, setBox1Name] = useState('Equipment');
  const [box2Name, setBox2Name] = useState('Personnel');

  const handleSplitRow = () => {
    logger.debug('🔧 handleSplitRow called with names:', { box1Name, box2Name });
    const newConfig: JobRowConfig = {
      jobId,
      rowType,
      isSplit: true,
      boxes: [
        {
          id: `${jobId}-${rowType}-box1`,
          name: box1Name,
          allowedTypes: ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'],
          maxCount: 10,
          attachmentRules: []
        },
        {
          id: `${jobId}-${rowType}-box2`,
          name: box2Name,
          allowedTypes: ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'],
          maxCount: 10,
          attachmentRules: []
        }
      ]
    };
    
    logger.debug('🔧 Setting new config:', newConfig);
    setConfig(newConfig);
  };

  const handleUnsplitRow = () => {
    logger.debug('🔧 handleUnsplitRow called');
    const newConfig: JobRowConfig = {
      jobId,
      rowType,
      isSplit: false,
      boxes: []
    };
    
    logger.debug('🔧 Setting unsplit config:', newConfig);
    setConfig(newConfig);
  };

  const handleAddBox = () => {
    logger.debug('🔧 handleAddBox called, current boxes:', config.boxes.length);
    const newBox: JobRowBox = {
      id: `${jobId}-${rowType}-box${config.boxes.length + 1}`,
      name: `Box ${config.boxes.length + 1}`,
      allowedTypes: [],
      isSplit: false, // Explicitly not split initially
      subBoxes: [], // Explicitly empty sub-boxes
      maxCount: 5,
      attachmentRules: []
    };

    logger.debug('🔧 Adding new box:', newBox);
    setConfig(prev => ({
      ...prev,
      boxes: [...prev.boxes, newBox]
    }));
  };

  const handleUpdateBox = (path: number[], updates: Partial<JobRowBox>) => {
    logger.debug('🔧 handleUpdateBox called:', { path, updates });
    setConfig(prev => {
      const newConfig = structuredClone(prev); // Deep clone to avoid mutation issues
      logger.debug('🔧 Original config before update:', newConfig);
      
      // Navigate to the box using the path
      let targetBox = newConfig.boxes[path[0]];
      logger.debug('🔧 Target box at path[0]:', targetBox);
      
      // Navigate through sub-boxes if path is deeper
      for (let i = 1; i < path.length; i++) {
          logger.error('🔧 Invalid path - sub-box not found:', { path, currentIndex: i });
        logger.debug(`🔧 Navigating to sub-box at path[${i}]:`, path[i]);
        if (!targetBox.subBoxes || !targetBox.subBoxes[path[i]]) return prev;
        targetBox = targetBox.subBoxes[path[i]];
        logger.debug('🔧 Found sub-box:', targetBox);
      }
      
      // Update the target box
      logger.debug('🔧 Applying updates to target box:', { before: targetBox, updates });
      Object.assign(targetBox, updates);
      logger.debug('🔧 Target box after updates:', targetBox);
      
      logger.debug('🔧 Final config after update:', newConfig);
      return newConfig;
    });
  };

  const handleSplitBox = (path: number[]) => {
    logger.debug('🔧 handleSplitBox called for path:', path);
    // Generate unique IDs for sub-boxes
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    const newSubBoxes: JobRowBox[] = [
      {
        id: `box-${timestamp}-${randomId}-1`,
        name: 'Left',
        allowedTypes: [], // Default to empty, user can configure
        isSplit: false, // Explicitly not split initially
        subBoxes: [], // Explicitly empty sub-boxes
        maxCount: 3,
        attachmentRules: []
      },
      {
        id: `box-${timestamp}-${randomId}-2`,
        name: 'Right',
        allowedTypes: [], // Default to empty, user can configure
        isSplit: false, // Explicitly not split initially
        subBoxes: [], // Explicitly empty sub-boxes
        maxCount: 3,
        attachmentRules: []
      }
    ];

    logger.debug('🔧 Creating sub-boxes:', newSubBoxes);
    handleUpdateBox(path, { 
      isSplit: true, 
      subBoxes: newSubBoxes 
    });
  };

  const handleUnsplitBox = (path: number[]) => {
    logger.debug('🔧 handleUnsplitBox called for path:', path);
    handleUpdateBox(path, { 
      isSplit: false, 
      subBoxes: [] 
    });
  };

  const handleRemoveBox = (path: number[]) => {
    logger.debug('🔧 handleRemoveBox called for path:', path);
    if (path.length === 1) {
      // Removing a top-level box
      setConfig(prev => ({
        ...prev,
        boxes: prev.boxes.filter((_, index) => index !== path[0])
      }));
    } else {
      // Removing a sub-box - this would be handled by the parent BoxConfig
      // The parent will update its subBoxes array
      logger.debug('🔧 Sub-box removal will be handled by parent BoxConfig');
    }
  };

  const handleSave = () => {
    logger.debug('🔧 handleSave called with config:', config);
    updateJobRowConfig(config);
    onClose();
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <Settings className="mr-2 text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-semibold">Configure {rowType} Row</h2>
                <p className="text-sm text-gray-600">{job?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Initial Split Controls */}
              {!config.isSplit ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Row Layout</h3>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      This row currently uses a single layout. You can split it into two separate boxes with different rules.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Left Box Name
                        </label>
                        <input
                          type="text"
                          value={box1Name}
                          onChange={(e) => setBox1Name(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Equipment"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Right Box Name
                        </label>
                        <input
                          type="text"
                          value={box2Name}
                          onChange={(e) => setBox2Name(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Personnel"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSplitRow}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Split size={16} className="mr-2" />
                      Split Row into Two Boxes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Row Layout</h3>
                      <p className="text-sm text-gray-600">This row is split into boxes</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddBox}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Box
                      </button>
                      <button
                        onClick={handleUnsplitRow}
                        className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                      >
                        <X size={16} className="mr-1" />
                        Unsplit Row
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Box Configuration */}
              {config.isSplit && config.boxes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Box Configuration</h3>
                  
                  {config.boxes.map((box, boxIndex) => (
                    <BoxConfig
                      key={box.id}
                      box={box}
                      boxPath={[boxIndex]}
                      depth={0}
                      onUpdateBox={handleUpdateBox}
                      onSplitBox={handleSplitBox}
                      onUnsplitBox={handleUnsplitBox}
                      onRemoveBox={handleRemoveBox}
                      canRemove={config.boxes.length > 1}
                    />
                  ))}
                </div>
              )}

              {/* Preview Section */}
              {config.boxes.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Row Preview</h4>
                  <p className="text-sm text-gray-600 mb-4">This is how the row will appear in the job interface:</p>
                  
                  <div className="bg-white rounded-lg border-2 border-blue-300 p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      📋 {rowType} Row Layout 
                      {config.isSplit ? ` (${config.boxes.length} boxes)` : ' (Single layout)'}
                    </div>
                    
                    {!config.isSplit && config.boxes.length === 0 && (
                      <div className="min-h-[60px] bg-gray-100 border-2 border-dashed border-gray-300 rounded p-4 flex items-center justify-center">
                        <span className="text-sm text-gray-500">
                          Standard single-row layout - all resource types allowed
                        </span>
                      </div>
                    )}
                    
                    {config.isSplit && (
                      <div className="flex space-x-4">
                        {config.boxes.map((box, index) => (
                          <div key={box.id} className="flex-1">
                            <div className="text-xs font-medium text-gray-600 mb-2 bg-blue-100 px-2 py-1 rounded flex items-center justify-between">
                              <span>📦 {box.name}</span>
                              <span className="text-xs bg-blue-200 text-blue-800 px-1 py-0.5 rounded">
                                Max: {box.maxCount || 0}
                              </span>
                            </div>
                            
                            {box.isSplit && box.subBoxes && box.subBoxes.length > 0 ? (
                              <div className="space-y-2">
                                {box.subBoxes.map((subBox, subIndex) => (
                                  <div key={subBox.id} className="border border-purple-200 rounded bg-purple-50 p-2">
                                    <div className="text-xs font-medium text-purple-800 mb-1 flex items-center justify-between">
                                      <span>📋 {subBox.name}</span>
                                      <span className="text-xs bg-purple-200 text-purple-700 px-1 py-0.5 rounded">
                                        {subBox.allowedTypes.length} types
                                      </span>
                                    </div>
                                    <div className="min-h-[40px] bg-white border border-purple-200 rounded p-2 flex flex-wrap gap-1">
                                      {subBox.allowedTypes.length > 0 ? (
                                        subBox.allowedTypes.slice(0, 3).map(type => (
                                          <span key={type} className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs">
                                            {resourceTypeLabels[type]}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">No types selected</span>
                                      )}
                                      {subBox.allowedTypes.length > 3 && (
                                        <span className="text-xs text-purple-600">
                                          +{subBox.allowedTypes.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="min-h-[60px] bg-white border-2 border-dashed border-gray-300 rounded p-3 flex flex-wrap gap-1 content-start">
                                {box.allowedTypes.length > 0 ? (
                                  box.allowedTypes.slice(0, 4).map(type => (
                                    <span key={type} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                      {resourceTypeLabels[type]}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No resource types selected</span>
                                )}
                                {box.allowedTypes.length > 4 && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    +{box.allowedTypes.length - 4} more types
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {config.boxes.map((box, index) => (
                        <div key={box.id} className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50">
                          <div className="text-sm font-semibold text-blue-900 mb-3 flex items-center justify-between">
                            <span>📦 {box.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                Max: {box.maxCount || 0}
                              </span>
                              {box.isSplit && (
                                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                                  {box.subBoxes?.length || 0} sub-boxes
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {box.isSplit ? (
                            <div className="ml-3 space-y-2">
                              <div className="text-xs font-medium text-gray-700 mb-2">Sub-boxes:</div>
                              {box.subBoxes?.map((subBox, subIndex) => (
                                <div key={subBox.id} className="border border-purple-200 rounded-lg p-2 bg-purple-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-purple-900">
                                      📋 {subBox.name}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs bg-purple-200 text-purple-800 px-1 py-0.5 rounded">
                                        Max: {subBox.maxCount || 0}
                                      </span>
                                      {subBox.isSplit && (
                                        <span className="text-xs bg-orange-200 text-orange-800 px-1 py-0.5 rounded">
                                          {subBox.subBoxes?.length || 0} nested
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {subBox.isSplit ? (
                                    <div className="ml-2 space-y-1">
                                      <div className="text-xs font-medium text-gray-600">Nested sub-boxes:</div>
                                      {subBox.subBoxes?.map((nestedBox, nestedIndex) => (
                                        <div key={nestedBox.id} className="border border-orange-200 rounded p-1 bg-orange-50">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-orange-900">
                                              📄 {nestedBox.name}
                                            </span>
                                            <span className="text-xs bg-orange-200 text-orange-800 px-1 py-0.5 rounded">
                                              {nestedBox.allowedTypes.length} types
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {nestedBox.allowedTypes.map(type => (
                                              <span key={type} className="bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-xs">
                                                {resourceTypeLabels[type]}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {subBox.allowedTypes.length > 0 ? (
                                        subBox.allowedTypes.map(type => (
                                          <span key={type} className="bg-purple-200 text-purple-800 px-1 py-0.5 rounded text-xs">
                                            {resourceTypeLabels[type]}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-500 italic">No resource types configured</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {box.allowedTypes.length > 0 ? (
                                box.allowedTypes.map(type => (
                                  <span key={type} className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                    {resourceTypeLabels[type]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500 italic">No resource types configured</span>
                              )}
                            </div>
                          )}
                          
                          {/* Attachment rules summary for unsplit boxes */}
                          {!box.isSplit && box.attachmentRules && box.attachmentRules.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-xs font-medium text-gray-600 mb-1">Attachment Rules:</div>
                              <div className="space-y-1">
                                {box.attachmentRules.filter(rule => rule.canAttach).map(rule => (
                                  <div key={`${rule.sourceType}-${rule.targetType}`} className="text-xs text-gray-600">
                                    <span className="font-medium">{resourceTypeLabels[rule.sourceType]}</span> → {resourceTypeLabels[rule.targetType]}
                                    {rule.isAutoAttach && <span className="text-green-600 ml-1">(Auto)</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default JobRowConfigModal;