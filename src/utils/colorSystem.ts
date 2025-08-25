// Color system utility functions for the scheduler application

import { Resource } from '../types';

// Resource type color mappings
const resourceColors = {
  operator: 'bg-blue-100 text-blue-800',
  driver: 'bg-green-100 text-green-800', 
  striper: 'bg-yellow-100 text-yellow-800',
  foreman: 'bg-purple-100 text-purple-800',
  laborer: 'bg-gray-100 text-gray-800',
  privateDriver: 'bg-indigo-100 text-indigo-800',
  skidsteer: 'bg-orange-100 text-orange-800',
  paver: 'bg-red-100 text-red-800',
  excavator: 'bg-yellow-100 text-yellow-800',
  sweeper: 'bg-blue-100 text-blue-800',
  millingMachine: 'bg-purple-100 text-purple-800',
  grader: 'bg-green-100 text-green-800',
  dozer: 'bg-gray-100 text-gray-800',
  payloader: 'bg-indigo-100 text-indigo-800',
  roller: 'bg-pink-100 text-pink-800',
  equipment: 'bg-teal-100 text-teal-800',
  truck: 'bg-blue-600 text-white'
};

// Resource type border mappings
const resourceBorders = {
  operator: 'border-blue-300',
  driver: 'border-green-300',
  striper: 'border-yellow-300', 
  foreman: 'border-purple-300',
  laborer: 'border-gray-300',
  privateDriver: 'border-indigo-300',
  skidsteer: 'border-orange-300',
  paver: 'border-red-300',
  excavator: 'border-yellow-300',
  sweeper: 'border-blue-300',
  millingMachine: 'border-purple-300',
  grader: 'border-green-300',
  dozer: 'border-gray-300',
  payloader: 'border-indigo-300',
  roller: 'border-pink-300',
  equipment: 'border-teal-300',
  truck: 'border-blue-700'
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
  hasDayJob: boolean
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