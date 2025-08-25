import { ResourceType } from '../types';

/**
 * Centralized color system for all resource types
 * This eliminates duplicates and provides a single source of truth
 */

export interface ResourceColors {
  background: string;
  text: string;
  border: string;
}

/**
 * Master color definitions for all resource types
 */
export const RESOURCE_COLORS: Record<ResourceType, ResourceColors> = {
  // Personnel
  operator: {
    background: 'bg-white',
    text: 'text-black',
    border: 'border-gray-400'
  },
  driver: {
    background: 'bg-green-500',
    text: 'text-black',
    border: 'border-green-700'
  },
  privateDriver: {
    background: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-700'
  },
  laborer: {
    background: 'bg-white',
    text: 'text-green-600',
    border: 'border-green-600'
  },
  striper: {
    background: 'bg-white',
    text: 'text-blue-600',
    border: 'border-blue-600'
  },
  foreman: {
    background: 'bg-orange-500',
    text: 'text-black',
    border: 'border-orange-700'
  },
  
  // Vehicles
  truck: {
    background: 'bg-black',
    text: 'text-white',
    border: 'border-gray-300'
  },
  
  // Equipment (all yellow with black text)
  skidsteer: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  paver: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  excavator: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  sweeper: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  millingMachine: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  grader: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  dozer: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  payloader: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  roller: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  },
  equipment: {
    background: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-600'
  }
};

/**
 * Shift status border colors
 */
export const SHIFT_STATUS_BORDERS = {
  doubleShift: 'border-2 border-red-500',            // Red for day + night
  multipleDayJobs: 'border-2 border-teal-500',       // Teal for 2+ day jobs  
  nightShiftOnly: 'border-2 border-orange-500'       // Orange for night only
};

/**
 * Helper functions to get consistent colors
 */
export const getResourceColors = (resourceType: ResourceType): ResourceColors => {
  return RESOURCE_COLORS[resourceType] || {
    background: 'bg-gray-200',
    text: 'text-gray-800',
    border: 'border-gray-400'
  };
};

/**
 * Get combined style classes for a resource
 */
export const getResourceStyle = (resourceType: ResourceType): string => {
  const colors = getResourceColors(resourceType);
  return `${colors.background} ${colors.text}`;
};

/**
 * Get base border style for a resource
 */
export const getResourceBorder = (resourceType: ResourceType): string => {
  const colors = getResourceColors(resourceType);
  return `border ${colors.border}`;
};

/**
 * Get shift status border override
 */
export const getShiftStatusBorder = (
  hasDayJob: boolean,
  hasNightJob: boolean,
  hasMultipleDayJobs: boolean,
  hasMultipleNightJobs: boolean
): string => {
  // Red border for double shift (working both day and night)
  if (hasDayJob && hasNightJob) {
    return SHIFT_STATUS_BORDERS.doubleShift;
  }
  
  // Teal border for multiple day jobs only
  if (hasMultipleDayJobs) {
    return SHIFT_STATUS_BORDERS.multipleDayJobs;
  }
  
  // Orange border for night shift only
  if (hasNightJob && !hasDayJob) {
    return SHIFT_STATUS_BORDERS.nightShiftOnly;
  }
  
  // Return empty string for normal border (single day job or unassigned)
  return '';
};

/**
 * Get complete border style with shift status override
 * This prevents border color conflicts by returning only one border class
 */
export const getCompleteBorderStyle = (
  resourceType: ResourceType,
  hasDayJob: boolean,
  hasNightJob: boolean,
  hasMultipleDayJobs: boolean,
  hasMultipleNightJobs: boolean
): string => {
  // Check for shift status border first
  const shiftBorder = getShiftStatusBorder(hasDayJob, hasNightJob, hasMultipleDayJobs, hasMultipleNightJobs);
  if (shiftBorder) return shiftBorder;
  
  // Use standard resource border if no shift override
  return getResourceBorder(resourceType);
};

/**
 * Legacy compatibility functions for SchedulerContext
 */
export const getLegacyResourceColors = () => {
  const legacyFormat: Record<ResourceType, { color: string; borderColor: string }> = {} as any;
  
  Object.entries(RESOURCE_COLORS).forEach(([type, colors]) => {
    legacyFormat[type as ResourceType] = {
      color: colors.background,
      borderColor: colors.border
    };
  });
  
  return legacyFormat;
};