// Color system utility functions for the scheduler application

// Removed unused Resource import

// Resource type color mappings
const resourceColors = {
  operator: 'bg-white text-black',
  driver: 'bg-green-500 text-black', 
  striper: 'bg-blue-500 text-white',
  foreman: 'bg-orange-500 text-black',
  laborer: 'bg-white text-green-600',
  privateDriver: 'bg-indigo-500 text-white',
  skidsteer: 'bg-yellow-500 text-black',
  paver: 'bg-yellow-500 text-black',
  excavator: 'bg-yellow-500 text-black',
  sweeper: 'bg-yellow-500 text-black',
  millingMachine: 'bg-yellow-500 text-black',
  grader: 'bg-yellow-500 text-black',
  dozer: 'bg-yellow-500 text-black',
  payloader: 'bg-yellow-500 text-black',
  roller: 'bg-yellow-500 text-black',
  equipment: 'bg-yellow-500 text-black',
  truck: 'bg-black text-white'
};

// Resource type border mappings
const resourceBorders = {
  operator: 'border-gray-300',
  driver: 'border-green-700',
  striper: 'border-blue-700', 
  foreman: 'border-orange-700',
  laborer: 'border-green-500',
  privateDriver: 'border-indigo-700',
  skidsteer: 'border-yellow-700',
  paver: 'border-yellow-700',
  excavator: 'border-yellow-700',
  sweeper: 'border-yellow-700',
  millingMachine: 'border-yellow-700',
  grader: 'border-yellow-700',
  dozer: 'border-yellow-700',
  payloader: 'border-yellow-700',
  roller: 'border-yellow-700',
  equipment: 'border-yellow-700',
  truck: 'border-gray-700'
};

/**
 * Get the background and text color classes for a resource type
 */
export function getResourceStyle(resourceType: string): string {
  return resourceColors[resourceType as keyof typeof resourceColors] || 'bg-gray-100 text-gray-800';
}

/**
 * Get the border color class for a resource type
 */
export function getResourceBorder(resourceType: string): string {
  return resourceBorders[resourceType as keyof typeof resourceBorders] || 'border-gray-300';
}

/**
 * Get shift status border based on job assignments
 */
export function getShiftStatusBorder(
  hasMultipleDayJobs: boolean,
  hasNightJob: boolean,
  hasDayJob: boolean,
  resourceType?: string
): string {
  // Priority order: Red (double shift) > Teal (multiple day jobs) > Orange (night only)
  if (hasNightJob && hasDayJob) {
    return 'border-2 border-red-500'; // Double shift
  }
  
  if (hasMultipleDayJobs) {
    return 'border-2 border-teal-500'; // Multiple day jobs only
  }
  
  if (hasNightJob && !hasDayJob) {
    return 'border-2 border-orange-500'; // Night shift only
  }
  
  return `border ${getResourceBorder(resourceType || '')}`; // Default single day or unassigned
}

/**
 * Get complete border style combining resource type and shift status
 */
export function getCompleteBorderStyle(
  resourceType: string,
  hasMultipleDayJobs: boolean,
  hasNightJob: boolean,
  hasDayJob: boolean
): string {
  // Shift status takes priority over resource type borders
  if (hasNightJob && hasDayJob) {
    return 'border-2 border-red-500'; // Double shift
  }
  
  if (hasMultipleDayJobs) {
    return 'border-2 border-teal-500'; // Multiple day jobs only
  }
  
  if (hasNightJob && !hasDayJob) {
    return 'border-2 border-orange-500'; // Night shift only
  }
  
  // Default to resource type border for single day or unassigned
  return `border ${getResourceBorder(resourceType)}`;
}

/**
 * Get legacy resource colors combining both background and border styles
 * Used by components that need the complete color mapping
 */
export function getLegacyResourceColors() {
  const result: Record<string, { color: string; borderColor: string }> = {};
  
  Object.keys(resourceColors).forEach(type => {
    result[type] = {
      color: resourceColors[type as keyof typeof resourceColors],
      borderColor: resourceBorders[type as keyof typeof resourceBorders]
    };
  });
  
  return result;
}