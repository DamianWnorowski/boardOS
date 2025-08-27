import { ResourceType } from './index';
import { getResourceStyle } from '../utils/colorSystem';

export type SelectionMode = 'category' | 'subcategory' | 'magnets';

export interface ResourceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  resourceTypes: ResourceType[];
  hasSubcategories: boolean;
}

export interface EquipmentSubcategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  resourceType: ResourceType;
}

export interface QuickSelectState {
  mode: SelectionMode;
  selectedCategory: ResourceCategory | null;
  selectedSubcategory: EquipmentSubcategory | null;
  selectedIndex: number;
  navigationHistory: SelectionMode[];
}

// Resource categories configuration
export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'equipment',
    name: 'Equipment',
    icon: '🚜',
    description: 'Heavy machinery and construction equipment',
    resourceTypes: ['paver', 'roller', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'skidsteer', 'equipment'],
    hasSubcategories: true
  },
  {
    id: 'operator',
    name: 'Operator',
    icon: '👷',
    description: 'Equipment operators',
    resourceTypes: ['operator'],
    hasSubcategories: false
  },
  {
    id: 'driver',
    name: 'Driver',
    icon: '🚛',
    description: 'Vehicle drivers',
    resourceTypes: ['driver'],
    hasSubcategories: false
  },
  {
    id: 'laborer',
    name: 'Laborer',
    icon: '👷‍♂️',
    description: 'General laborers and groundmen',
    resourceTypes: ['laborer'],
    hasSubcategories: false
  },
  {
    id: 'foreman',
    name: 'Foreman',
    icon: '👨‍💼',
    description: 'Supervisors and foremen',
    resourceTypes: ['foreman'],
    hasSubcategories: false
  },
  {
    id: 'truck',
    name: 'Truck',
    icon: '🚚',
    description: 'Trucks and transport vehicles',
    resourceTypes: ['truck'],
    hasSubcategories: false
  },
  {
    id: 'striper',
    name: 'Striper',
    icon: '🎨',
    description: 'Line striping crew',
    resourceTypes: ['striper'],
    hasSubcategories: false
  },
  {
    id: 'privateDriver',
    name: 'Private Driver',
    icon: '👤',
    description: 'Private vehicle drivers',
    resourceTypes: ['privateDriver'],
    hasSubcategories: false
  }
];

// Equipment subcategories
export const EQUIPMENT_SUBCATEGORIES: EquipmentSubcategory[] = [
  {
    id: 'paver',
    name: 'Paver',
    icon: '🛣️',
    description: 'Asphalt pavers',
    resourceType: 'paver'
  },
  {
    id: 'roller',
    name: 'Roller',
    icon: '🚜',
    description: 'Compaction rollers',
    resourceType: 'roller'
  },
  {
    id: 'excavator',
    name: 'Excavator',
    icon: '🚜',
    description: 'Excavators and diggers',
    resourceType: 'excavator'
  },
  {
    id: 'sweeper',
    name: 'Sweeper',
    icon: '🧹',
    description: 'Street sweepers',
    resourceType: 'sweeper'
  },
  {
    id: 'millingMachine',
    name: 'Milling Machine',
    icon: '⚙️',
    description: 'Asphalt milling machines',
    resourceType: 'millingMachine'
  },
  {
    id: 'grader',
    name: 'Grader',
    icon: '🚜',
    description: 'Motor graders',
    resourceType: 'grader'
  },
  {
    id: 'dozer',
    name: 'Dozer',
    icon: '🚜',
    description: 'Bulldozers',
    resourceType: 'dozer'
  },
  {
    id: 'payloader',
    name: 'Payloader',
    icon: '🚜',
    description: 'Wheel loaders',
    resourceType: 'payloader'
  },
  {
    id: 'skidsteer',
    name: 'Skidsteer',
    icon: '🚜',
    description: 'Skid steer loaders',
    resourceType: 'skidsteer'
  },
  {
    id: 'equipment',
    name: 'Other Equipment',
    icon: '⚙️',
    description: 'General equipment',
    resourceType: 'equipment'
  }
];

// Helper function to get category styling based on resource type
export const getCategoryStyle = (category: ResourceCategory): string => {
  // For categories with multiple resource types, use the first one
  // For equipment, use equipment color
  const representativeType = category.id === 'equipment' ? 'equipment' : category.resourceTypes[0];
  return getResourceStyle(representativeType);
};

// Helper function to get subcategory styling
export const getSubcategoryStyle = (subcategory: EquipmentSubcategory): string => {
  return getResourceStyle(subcategory.resourceType);
};