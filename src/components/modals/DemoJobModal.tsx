import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, Trash2, ChevronDown, ChevronUp, Split } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { RowType, ResourceType, JobRowConfig, JobRowBox } from '../../types';
import { rowTypeLabels } from '../../data/mockData';
import Portal from '../common/Portal';

interface JobTypeConfigModalProps {
  onClose: () => void;
}

type JobType = 'milling' | 'paving' | 'both' | 'drainage' | 'stripping' | 'hired' | 'other';

const jobTypeLabels: Record<JobType, string> = {
  milling: 'Milling Jobs',
  paving: 'Paving Jobs', 
  both: 'Milling & Paving Jobs',
  drainage: 'Drainage Jobs',
  stripping: 'Stripping Jobs',
  hired: 'Hired Jobs',
  other: 'Other Jobs'
};

// Helper functions to distribute resource types uniquely across boxes
const getLeftBoxTypes = (rowType: RowType): ResourceType[] => {
  switch (rowType) {
    case 'Forman':
      return ['foreman'];
    case 'Equipment':
      return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    case 'Sweeper':
      return ['sweeper'];
    case 'Tack':
      return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    case 'MPT':
      return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    case 'crew':
      return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    case 'trucks':
      return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    default:
      return ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
  }
};

const getCenterBoxTypes = (rowType: RowType): ResourceType[] => {
  switch (rowType) {
    case 'Forman':
      return ['truck'];
    case 'Equipment':
      return ['truck'];
    case 'Sweeper':
      return ['truck'];
    case 'Tack':
      return ['truck'];
    case 'MPT':
      return ['truck'];
    case 'crew':
      return ['truck'];
    case 'trucks':
      return ['truck'];
    default:
      return ['truck'];
  }
};

const getRightBoxTypes = (rowType: RowType): ResourceType[] => {
  switch (rowType) {
    case 'Forman':
      return ['operator', 'driver', 'striper', 'laborer', 'privateDriver'];
    case 'Equipment':
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    case 'Sweeper':
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    case 'Tack':
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    case 'MPT':
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    case 'crew':
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    case 'trucks':
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    default:
      return ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
  }
};

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

// Default configurations for each job type
const getDefaultJobTypeConfig = (jobType: JobType, rowType: RowType): JobRowConfig => {
  const baseConfig: JobRowConfig = {
    jobId: `template-${jobType}`,
    rowType,
    isSplit: true,
    boxes: []
  };

  // Default 3 boxes with unique resource types for magnet alignment within each row
  baseConfig.boxes = [
    {
      id: `${jobType}-${rowType}-left`,
      name: 'Left',
      allowedTypes: getLeftBoxTypes(rowType),
      maxCount: 10,
      attachmentRules: []
    },
    {
      id: `${jobType}-${rowType}-center`,
      name: 'Center',
      allowedTypes: getCenterBoxTypes(rowType),
      maxCount: 10,
      attachmentRules: []
    },
    {
      id: `${jobType}-${rowType}-right`,
      name: 'Right',
      allowedTypes: getRightBoxTypes(rowType),
      maxCount: 10,
      attachmentRules: []
    }
  ];

  return baseConfig;
};

interface BoxConfigProps {
  box: JobRowBox;
  boxPath: string;
  depth: number;
  onUpdateBox: (updates: Partial<JobRowBox>) => void;
  onSplitBox: () => void;
  onUnsplitBox: () => void;
  onRemoveBox: () => void;
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
};

const JobTypeConfigModal: React.FC<JobTypeConfigModalProps> = ({ onClose }) => {
  const [selectedJobType, setSelectedJobType] = useState<JobType>('paving');
  const [selectedRow, setSelectedRow] = useState<RowType>('Equipment');
  const [jobTypeConfigs, setJobTypeConfigs] = useState<Record<JobType, Record<RowType, JobRowConfig>>>({});
  const [quickAddMagnets, setQuickAddMagnets] = useState<Record<JobType, Record<RowType, Record<ResourceType, number>>>>({});

  const jobTypes: JobType[] = ['milling', 'paving', 'both', 'drainage', 'stripping', 'hired', 'other'];
  const rowTypes: RowType[] = ['Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'];

  // Initialize with default configurations
  useEffect(() => {
    const configs: Record<JobType, Record<RowType, JobRowConfig>> = {};
    
    jobTypes.forEach(jobType => {
      configs[jobType] = {};
      rowTypes.forEach(rowType => {
        configs[jobType][rowType] = getDefaultJobTypeConfig(jobType, rowType);
      });
    });
    
    setJobTypeConfigs(configs);
    // Initialize quick add magnets
    const quickAdd: Record<JobType, Record<RowType, Record<ResourceType, number>>> = {};
    jobTypes.forEach(jobType => {
      quickAdd[jobType] = {};
      rowTypes.forEach(rowType => {
        quickAdd[jobType][rowType] = {};
      });
    });
    setQuickAddMagnets(quickAdd);
  }, []);

  const getCurrentRowConfig = (): JobRowConfig | null => {
    return jobTypeConfigs[selectedJobType]?.[selectedRow] || null;
  };

  const updateCurrentRowConfig = (updates: Partial<JobRowConfig>) => {
    setJobTypeConfigs(prev => {
      const newConfigs = structuredClone(prev);
      
      if (!newConfigs[selectedJobType]) {
        newConfigs[selectedJobType] = {};
      }
      
      if (!newConfigs[selectedJobType][selectedRow]) {
        newConfigs[selectedJobType][selectedRow] = getDefaultJobTypeConfig(selectedJobType, selectedRow);
      }
      
      newConfigs[selectedJobType][selectedRow] = {
        ...newConfigs[selectedJobType][selectedRow],
        ...updates
      };
      
      return newConfigs;
    });
  };

  const handleAddBox = () => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    const newBox: JobRowBox = {
      id: `${selectedJobType}-${selectedRow}-box${currentConfig.boxes.length + 1}`,
      name: `Box ${currentConfig.boxes.length + 1}`,
      allowedTypes: [],
      maxCount: 5,
      attachmentRules: []
    };

    updateCurrentRowConfig({
      boxes: [...currentConfig.boxes, newBox]
    });
  };

  const handleSplitRow = () => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    // Create a duplicate of the current row structure
    const newSubRowBoxes: JobRowBox[] = currentConfig.boxes.map(box => ({
      id: `${selectedJobType}-${selectedRow}-subrow${((currentConfig as any).subRows?.length || 0) + 1}-${box.name.toLowerCase().replace(/\s+/g, '')}`,
      name: box.name,
      allowedTypes: [...box.allowedTypes],
      maxCount: box.maxCount,
      attachmentRules: [...(box.attachmentRules || [])],
      isSplit: box.isSplit,
      subBoxes: box.subBoxes ? [...box.subBoxes] : undefined
    }));

    updateCurrentRowConfig({
      subRows: [
        ...((currentConfig as any).subRows || []),
        {
          id: `${selectedJobType}-${selectedRow}-subrow${((currentConfig as any).subRows?.length || 0) + 1}`,
          name: 'Equipment',
          allowedTypes: ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'],
          boxes: newSubRowBoxes
        }
      ]
    });
  };

  const handleSplitBox = () => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    // Split all boxes in ALL rows (main row + sub-rows) into sub-boxes
    const updatedBoxes = currentConfig.boxes.map(box => {
      if (box.isSplit && box.subBoxes) {
        // If already split, split the sub-boxes further
        return {
          ...box,
          subBoxes: box.subBoxes.map(subBox => ({
            ...subBox,
            isSplit: true,
            subBoxes: [
              {
                id: `${subBox.id}-left`,
                name: `${subBox.name} Left`,
                allowedTypes: [...subBox.allowedTypes],
                maxCount: Math.ceil((subBox.maxCount || 5) / 2),
                attachmentRules: [...(subBox.attachmentRules || [])]
              },
              {
                id: `${subBox.id}-right`,
                name: `${subBox.name} Right`,
                allowedTypes: [...subBox.allowedTypes],
                maxCount: Math.floor((subBox.maxCount || 5) / 2),
                attachmentRules: [...(subBox.attachmentRules || [])]
              }
            ]
          }))
        };
      } else {
        // Split the main box
        return {
          ...box,
          isSplit: true,
          subBoxes: [
            {
              id: `${box.id}-left`,
              name: `${box.name} Left`,
              allowedTypes: [...box.allowedTypes],
              maxCount: Math.ceil((box.maxCount || 5) / 2),
              attachmentRules: [...(box.attachmentRules || [])]
            },
            {
              id: `${box.id}-right`,
              name: `${box.name} Right`,
              allowedTypes: [...box.allowedTypes],
              maxCount: Math.floor((box.maxCount || 5) / 2),
              attachmentRules: [...(box.attachmentRules || [])]
            }
          ]
        };
      }
    });

    updateCurrentRowConfig({
      boxes: updatedBoxes
    });

    // Also split all boxes in sub-rows if they exist
    if ((currentConfig as any).subRows) {
      const updatedSubRows = (currentConfig as any).subRows.map((subRow: any) => ({
        ...subRow,
        boxes: subRow.boxes.map((box: JobRowBox) => {
          if (box.isSplit && box.subBoxes) {
            // Split existing sub-boxes further
            return {
              ...box,
              subBoxes: box.subBoxes.map(subBox => ({
                ...subBox,
                isSplit: true,
                subBoxes: [
                  {
                    id: `${subBox.id}-left`,
                    name: `${subBox.name} Left`,
                    allowedTypes: [...subBox.allowedTypes],
                    maxCount: Math.ceil((subBox.maxCount || 5) / 2),
                    attachmentRules: [...(subBox.attachmentRules || [])]
                  },
                  {
                    id: `${subBox.id}-right`,
                    name: `${subBox.name} Right`,
                    allowedTypes: [...subBox.allowedTypes],
                    maxCount: Math.floor((subBox.maxCount || 5) / 2),
                    attachmentRules: [...(subBox.attachmentRules || [])]
                  }
                ]
              }))
            };
          } else {
            // Split the box
            return {
              ...box,
              isSplit: true,
              subBoxes: [
                {
                  id: `${box.id}-left`,
                  name: `${box.name} Left`,
                  allowedTypes: [...box.allowedTypes],
                  maxCount: Math.ceil((box.maxCount || 5) / 2),
                  attachmentRules: [...(box.attachmentRules || [])]
                },
                {
                  id: `${box.id}-right`,
                  name: `${box.name} Right`,
                  allowedTypes: [...box.allowedTypes],
                  maxCount: Math.floor((box.maxCount || 5) / 2),
                  attachmentRules: [...(box.attachmentRules || [])]
                }
              ]
            };
          }
        })
      }));

      updateCurrentRowConfig({
        boxes: updatedBoxes,
        subRows: updatedSubRows
      });
    }
  };

  const handleUnsplitRow = () => {
    updateCurrentRowConfig(getDefaultJobTypeConfig(selectedJobType, selectedRow));
  };

  const handleUpdateBox = (boxIndex: number, updates: Partial<JobRowBox>) => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    const updatedBoxes = [...currentConfig.boxes];
    updatedBoxes[boxIndex] = { ...updatedBoxes[boxIndex], ...updates };

    updateCurrentRowConfig({
      boxes: updatedBoxes
    });
  };

  const handleRemoveBox = (boxIndex: number) => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    updateCurrentRowConfig({
      boxes: currentConfig.boxes.filter((_, index) => index !== boxIndex)
    });
  };

  const handleUpdateResourceTypes = (boxIndex: number, resourceType: ResourceType, allowed: boolean) => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    const box = currentConfig.boxes[boxIndex];
    if (!box) return;

    if (allowed) {
      // When checking, remove this resource type from all other boxes in the row
      const updatedBoxes = currentConfig.boxes.map((otherBox, otherIndex) => {
        if (otherIndex === boxIndex) {
          // Add to current box
          return {
            ...otherBox,
            allowedTypes: [...otherBox.allowedTypes, resourceType]
          };
        } else {
          // Remove from other boxes
          return {
            ...otherBox,
            allowedTypes: otherBox.allowedTypes.filter(type => type !== resourceType)
          };
        }
      });
      
      updateCurrentRowConfig({ boxes: updatedBoxes });
    } else {
      // When unchecking, just remove from current box
      const newAllowedTypes = box.allowedTypes.filter(type => type !== resourceType);
      handleUpdateBox(boxIndex, { allowedTypes: newAllowedTypes });
    }
  };

  const handleUpdateSubBoxResourceTypes = (boxIndex: number, subBoxIndex: number, resourceType: ResourceType, allowed: boolean) => {
    const currentConfig = getCurrentRowConfig();
    if (!currentConfig) return;

    const box = currentConfig.boxes[boxIndex];
    if (!box || !box.subBoxes) return;

    if (allowed) {
      // When checking, remove this resource type from all other sub-boxes in the same box
      // AND from all other boxes and their sub-boxes in the row
      const updatedBoxes = currentConfig.boxes.map((otherBox, otherBoxIndex) => {
        if (otherBoxIndex === boxIndex) {
          // Current box - update sub-boxes
          const updatedSubBoxes = box.subBoxes!.map((otherSubBox, otherSubIndex) => {
            if (otherSubIndex === subBoxIndex) {
              // Add to current sub-box
              return {
                ...otherSubBox,
                allowedTypes: [...otherSubBox.allowedTypes, resourceType]
              };
            } else {
              // Remove from other sub-boxes
              return {
                ...otherSubBox,
                allowedTypes: otherSubBox.allowedTypes.filter(type => type !== resourceType)
              };
            }
          });
          
          return {
            ...otherBox,
            subBoxes: updatedSubBoxes,
            // Also remove from main box allowed types
            allowedTypes: otherBox.allowedTypes.filter(type => type !== resourceType)
          };
        } else {
          // Other boxes - remove from main box and all sub-boxes
          const cleanedBox = {
            ...otherBox,
            allowedTypes: otherBox.allowedTypes.filter(type => type !== resourceType)
          };
          
          if (otherBox.subBoxes) {
            cleanedBox.subBoxes = otherBox.subBoxes.map(subBox => ({
              ...subBox,
              allowedTypes: subBox.allowedTypes.filter(type => type !== resourceType)
            }));
          }
          
          return cleanedBox;
        }
      });
      
      updateCurrentRowConfig({ boxes: updatedBoxes });
    } else {
      // When unchecking, just remove from current sub-box
      const updatedSubBoxes = [...box.subBoxes];
      const subBox = updatedSubBoxes[subBoxIndex];
      const newAllowedTypes = subBox.allowedTypes.filter(type => type !== resourceType);

      updatedSubBoxes[subBoxIndex] = { ...subBox, allowedTypes: newAllowedTypes };

      handleUpdateBox(boxIndex, { subBoxes: updatedSubBoxes });
    }
  };

  const handleSave = () => {
    // For now, just save to localStorage since this is a template system
    localStorage.setItem('job-type-configs', JSON.stringify(jobTypeConfigs));
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const currentRowConfig = getCurrentRowConfig();

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center">
              <Settings className="mr-2 text-purple-600" size={24} />
              <h2 className="text-xl font-semibold">Job Type Configuration Templates</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Job Type Selector */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <div className="p-4 border-b">
                <h3 className="text-sm font-medium text-gray-700">Job Types</h3>
                <p className="text-xs text-gray-500 mt-1">Configure templates for each job type</p>
              </div>
              <div className="overflow-y-auto max-h-full">
                {jobTypes.map(jobType => (
                  <button
                    key={jobType}
                    onClick={() => setSelectedJobType(jobType)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                      selectedJobType === jobType ? 'bg-purple-100 border-r-2 border-purple-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{jobTypeLabels[jobType]}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">
                      {jobType} template
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Row Type Selector */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <div className="p-4 border-b">
                <h3 className="text-sm font-medium text-gray-700">Row Types</h3>
                <p className="text-xs text-gray-500 mt-1">Choose a row to configure</p>
              </div>
              <div className="overflow-y-auto max-h-full">
                {rowTypes.map(rowType => {
                  const configExists = jobTypeConfigs[selectedJobType]?.[rowType];
                  const boxCount = configExists?.boxes?.length || 0;
                  return (
                    <button
                      key={rowType}
                      onClick={() => setSelectedRow(rowType)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                        selectedRow === rowType ? 'bg-blue-100 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{rowTypeLabels[rowType]}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {boxCount > 0 ? `${boxCount} boxes` : 'Default layout'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configuration Panel */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {jobTypeLabels[selectedJobType]} - {rowTypeLabels[selectedRow]} Row
                </h3>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Magnet Alignment Configuration</h4>
                  <p className="text-xs text-blue-700">
                    Configure how magnets are positioned and organized within the {rowTypeLabels[selectedRow]} row. 
                    Boxes are used for visual alignment and grouping of magnets within the same row.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Row Actions */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Row Actions</h4>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddBox}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Plus size={16} className="mr-2" />
                        Add Box
                      </button>
                      
                      <button
                        onClick={handleSplitRow}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <ChevronDown size={16} className="mr-2" />
                        Split Row
                      </button>
                      
                      <button
                        onClick={handleSplitBox}
                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                      >
                        <Split size={16} className="mr-2" />
                        Split All Boxes
                      </button>
                      
                      <button
                        onClick={handleUnsplitRow}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        <X size={16} className="mr-2" />
                        Reset Row
                      </button>
                    </div>
                  </div>

                  {/* Main Row Boxes */}
                  {currentRowConfig && currentRowConfig.boxes && currentRowConfig.boxes.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Main Row Configuration</h4>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {currentRowConfig.boxes.map((box, boxIndex) => (
                          <div key={box.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                            <div className="flex items-center justify-between mb-3">
                              <input
                                type="text"
                                value={box.name}
                                onChange={(e) => handleUpdateBox(boxIndex, { name: e.target.value })}
                                className="px-3 py-1 border border-blue-300 rounded-md font-medium bg-white"
                              />
                              <div className="flex items-center space-x-3">
                                <label className="text-sm text-blue-700">Max:</label>
                                <input
                                  type="number"
                                  value={box.maxCount || 0}
                                  onChange={(e) => handleUpdateBox(boxIndex, { maxCount: parseInt(e.target.value) || 0 })}
                                  min="0"
                                  max="50"
                                  className="w-16 px-2 py-1 border border-blue-300 rounded-md text-center bg-white"
                                />
                                {currentRowConfig.boxes.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveBox(boxIndex)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    title="Remove this box"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Sub-boxes */}
                            {box.isSplit && box.subBoxes && box.subBoxes.length > 0 && (
                              <div className="mb-4 ml-4 space-y-2">
                                <h5 className="text-sm font-medium text-blue-800">Sub-boxes:</h5>
                                {box.subBoxes.map((subBox, subIndex) => (
                                  <div key={subBox.id} className="border border-purple-200 rounded p-3 bg-purple-50">
                                    <div className="flex items-center justify-between mb-2">
                                      <input
                                        type="text"
                                        value={subBox.name}
                                        onChange={(e) => {
                                          const updatedSubBoxes = [...(box.subBoxes || [])];
                                          updatedSubBoxes[subIndex] = { ...updatedSubBoxes[subIndex], name: e.target.value };
                                          handleUpdateBox(boxIndex, { subBoxes: updatedSubBoxes });
                                        }}
                                        className="px-2 py-1 border border-purple-300 rounded text-sm bg-white"
                                      />
                                      <div className="flex items-center space-x-2">
                                        <label className="text-xs text-purple-700">Max:</label>
                                        <input
                                          type="number"
                                          value={subBox.maxCount || 0}
                                          onChange={(e) => {
                                            const updatedSubBoxes = [...(box.subBoxes || [])];
                                            updatedSubBoxes[subIndex] = { ...updatedSubBoxes[subIndex], maxCount: parseInt(e.target.value) || 0 };
                                            handleUpdateBox(boxIndex, { subBoxes: updatedSubBoxes });
                                          }}
                                          min="0"
                                          max="20"
                                          className="w-12 px-1 py-0.5 border border-purple-300 rounded text-xs text-center bg-white"
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Sub-box resource types */}
                                    <div className="grid grid-cols-4 gap-1">
                                      {allResourceTypes.map(resourceType => {
                                        const isAllowed = subBox.allowedTypes.includes(resourceType);
                                        return (
                                          <label 
                                            key={resourceType} 
                                            className={`flex items-center space-x-1 p-1 border rounded cursor-pointer text-xs ${
                                              isAllowed ? 'border-purple-300 bg-purple-100' : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isAllowed}
                                              onChange={(e) => handleUpdateSubBoxResourceTypes(boxIndex, subIndex, resourceType, e.target.checked)}
                                              className="h-3 w-3"
                                            />
                                            <span className="text-xs">{resourceTypeLabels[resourceType]}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Resource Types Configuration */}
                            {(!box.isSplit || !box.subBoxes?.length) && (
                              <div className="grid grid-cols-4 gap-2">
                                {allResourceTypes.map(resourceType => {
                                  const isAllowed = box.allowedTypes.includes(resourceType);
                                  
                                  return (
                                    <label 
                                      className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                                        isAllowed ? 'border-blue-300 bg-blue-100' : 'border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAllowed}
                                        onChange={(e) => handleUpdateResourceTypes(boxIndex, resourceType, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                      />
                                      <span className="text-xs">{resourceTypeLabels[resourceType]}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-rows */}
                  {(currentRowConfig as any)?.subRows && (currentRowConfig as any).subRows.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Sub-rows</h4>
                      
                      {(currentRowConfig as any).subRows.map((subRow: any, subRowIndex: number) => (
                        <div key={subRow.id} className="mb-4 border border-green-200 rounded-lg p-3 bg-green-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-green-900">Sub-row {subRowIndex + 1}</h5>
                            <button
                              onClick={() => {
                                const updatedSubRows = [...((currentRowConfig as any).subRows || [])];
                                updatedSubRows.splice(subRowIndex, 1);
                                updateCurrentRowConfig({ subRows: updatedSubRows });
                              }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Remove this sub-row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {subRow.boxes.map((subBox: JobRowBox, subBoxIndex: number) => (
                              <div key={subBox.id} className="border border-gray-200 rounded p-3 bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <input
                                    type="text"
                                    value={subBox.name}
                                    onChange={(e) => {
                                      const updatedSubRows = [...((currentRowConfig as any).subRows || [])];
                                      updatedSubRows[subRowIndex].boxes[subBoxIndex] = { 
                                        ...updatedSubRows[subRowIndex].boxes[subBoxIndex], 
                                        name: e.target.value 
                                      };
                                      updateCurrentRowConfig({ subRows: updatedSubRows });
                                    }}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-700">Max:</label>
                                    <input
                                      type="number"
                                      value={subBox.maxCount || 0}
                                      onChange={(e) => {
                                        const updatedSubRows = [...((currentRowConfig as any).subRows || [])];
                                        updatedSubRows[subRowIndex].boxes[subBoxIndex] = { 
                                          ...updatedSubRows[subRowIndex].boxes[subBoxIndex], 
                                          maxCount: parseInt(e.target.value) || 0 
                                        };
                                        updateCurrentRowConfig({ subRows: updatedSubRows });
                                      }}
                                      min="0"
                                      max="20"
                                      className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-1">
                                  {allResourceTypes.map(resourceType => {
                                    const isAllowed = subBox.allowedTypes.includes(resourceType);
                                    return (
                                      <label 
                                        key={resourceType} 
                                        className={`flex items-center space-x-1 p-1 border rounded cursor-pointer text-xs ${isAllowed ? 'border-green-300 bg-green-100' : 'border-gray-200 hover:bg-gray-50'}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isAllowed}
                                          onChange={(e) => {
                                            const updatedSubRows = [...((currentRowConfig as any).subRows || [])];
                                            const newAllowedTypes = e.target.checked 
                                              ? [...subBox.allowedTypes, resourceType]
                                              : subBox.allowedTypes.filter(type => type !== resourceType);
                                            updatedSubRows[subRowIndex].boxes[subBoxIndex] = { 
                                              ...updatedSubRows[subRowIndex].boxes[subBoxIndex], 
                                              allowedTypes: newAllowedTypes 
                                            };
                                            updateCurrentRowConfig({ subRows: updatedSubRows });
                                          }}
                                          className="h-3 w-3"
                                        />
                                        <span className="text-xs">{resourceTypeLabels[resourceType]}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Section */}
                  {currentRowConfig && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Layout Preview</h4>
                      <p className="text-sm text-gray-600 mb-4">This is how {jobTypeLabels[selectedJobType]} jobs will look:</p>
                      
                      <div className="bg-white rounded-lg border-2 border-purple-300 p-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">
                          📋 {rowTypeLabels[selectedRow]} Row - Magnet Alignment
                        </div>
                        
                        {/* Main row */}
                        <div className="flex space-x-2 mb-4">
                          {currentRowConfig.boxes.map((box, index) => (
                            <div key={box.id} className="flex-1 border border-blue-300 rounded p-2 bg-blue-50">
                              <div className="text-xs font-medium text-blue-800 mb-1 flex items-center justify-between">
                                <span>📍 {box.name}</span>
                                <span className="bg-blue-200 text-blue-700 px-1 py-0.5 rounded text-xs">
                                  Max: {box.maxCount}
                                </span>
                              </div>
                              
                              {box.isSplit && box.subBoxes ? (
                                <div className="space-y-1">
                                  {box.subBoxes.map(subBox => (
                                    <div key={subBox.id} className="border border-purple-200 rounded p-1 bg-purple-50">
                                      <div className="text-xs font-medium text-purple-800">{subBox.name}</div>
                                      <div className="flex flex-wrap gap-0.5 mt-1">
                                        {subBox.allowedTypes.slice(0, 3).map(type => (
                                          <button 
                                            key={type} 
                                            className="bg-purple-200 hover:bg-purple-300 text-purple-700 px-1 py-0.5 rounded text-xs cursor-pointer transition-colors"
                                            onClick={() => {
                                              const current = quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0;
                                              setQuickAddMagnets(prev => ({
                                                ...prev,
                                                [selectedJobType]: {
                                                  ...prev[selectedJobType],
                                                  [selectedRow]: {
                                                    ...prev[selectedJobType]?.[selectedRow],
                                                    [type]: current === 0 ? 1 : 0
                                                  }
                                                }
                                              }));
                                            }}
                                            title={`Click to ${(quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0) === 0 ? 'enable' : 'disable'} quick add for ${resourceTypeLabels[type]}`}
                                          >
                                            {resourceTypeLabels[type]}
                                            {(quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0) > 0 && (
                                              <span className="ml-1 bg-purple-600 text-white px-1 py-0.5 rounded-full text-xs">
                                                {quickAddMagnets[selectedJobType][selectedRow][type]}
                                              </span>
                                            )}
                                          </button>
                                        ))}
                                        {subBox.allowedTypes.length > 3 && (
                                          <span className="text-xs text-purple-600">+{subBox.allowedTypes.length - 3}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {box.allowedTypes.slice(0, 4).map(type => (
                                    <button 
                                      key={type} 
                                      className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-1 py-0.5 rounded text-xs cursor-pointer transition-colors"
                                      onClick={() => {
                                        const current = quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0;
                                        setQuickAddMagnets(prev => ({
                                          ...prev,
                                          [selectedJobType]: {
                                            ...prev[selectedJobType],
                                            [selectedRow]: {
                                              ...prev[selectedJobType]?.[selectedRow],
                                              [type]: current === 0 ? 1 : 0
                                            }
                                          }
                                        }));
                                      }}
                                      title={`Click to ${(quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0) === 0 ? 'enable' : 'disable'} quick add for ${resourceTypeLabels[type]}`}
                                    >
                                      {resourceTypeLabels[type]}
                                      {(quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0) > 0 && (
                                        <span className="ml-1 bg-blue-600 text-white px-1 py-0.5 rounded-full text-xs">
                                          {quickAddMagnets[selectedJobType][selectedRow][type]}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                  {box.allowedTypes.length > 4 && (
                                    <span className="text-xs text-blue-600">+{box.allowedTypes.length - 4}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Sub-rows */}
                        {(currentRowConfig as any).subRows && (currentRowConfig as any).subRows.map((subRow: any, subRowIndex: number) => (
                          <div key={subRow.id} className="border-t border-gray-300 pt-2 mt-2">
                            <div className="text-xs font-medium text-gray-600 mb-2">Row {subRowIndex + 2}</div>
                            <div className="flex space-x-2">
                              {subRow.boxes.map((subBox: JobRowBox) => (
                                <div key={subBox.id} className="flex-1 border border-green-300 rounded p-2 bg-green-50">
                                  <div className="text-xs font-medium text-green-800 mb-1">📍 {subBox.name}</div>
                                  <div className="flex flex-wrap gap-0.5">
                                    {subBox.allowedTypes.slice(0, 3).map(type => (
                                      <button 
                                        key={type} 
                                        className="bg-green-200 hover:bg-green-300 text-green-700 px-1 py-0.5 rounded text-xs cursor-pointer transition-colors"
                                        onClick={() => {
                                          const current = quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0;
                                          setQuickAddMagnets(prev => ({
                                            ...prev,
                                            [selectedJobType]: {
                                              ...prev[selectedJobType],
                                              [selectedRow]: {
                                                ...prev[selectedJobType]?.[selectedRow],
                                                [type]: current === 0 ? 1 : 0
                                              }
                                            }
                                          }));
                                        }}
                                        title={`Click to ${(quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0) === 0 ? 'enable' : 'disable'} quick add for ${resourceTypeLabels[type]}`}
                                      >
                                        {resourceTypeLabels[type]}
                                        {(quickAddMagnets[selectedJobType]?.[selectedRow]?.[type] || 0) > 0 && (
                                          <span className="ml-1 bg-green-600 text-white px-1 py-0.5 rounded-full text-xs">
                                            {quickAddMagnets[selectedJobType][selectedRow][type]}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                    {subBox.allowedTypes.length > 3 && (
                                      <span className="text-xs text-green-600">+{subBox.allowedTypes.length - 3}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Save Templates
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default JobTypeConfigModal;