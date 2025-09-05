import { RowType } from '../types';

/**
 * Determines if a row type is needed based on the job type
 * @param rowType The type of row (Sweeper, Tack, MPT, etc.)
 * @param jobType The type of job (milling, paving, both, other)
 * @returns boolean indicating if the row is needed for this job type
 */
export function isRowNeededForJobType(rowType: RowType, jobType: string): boolean {
  // For now, define which rows are needed based on job type:
  
  // For milling jobs:
  if (jobType === 'milling') {
    // Milling typically needs sweeper, MPT, but not tack
    switch (rowType) {
      case 'Tack':
        return false; // Tack is not needed for milling jobs
      default:
        return true;
    }
  }
  
  // For paving jobs:
  if (jobType === 'paving') {
    // All row types can be needed for paving
    return true;
  }
  
  // For both (milling & paving):
  if (jobType === 'both') {
    // All row types are needed
    return true;
  }
  
  // For other job types:
  if (jobType === 'other' || jobType === 'drainage' || jobType === 'stripping' || jobType === 'hired') {
    // For other jobs, only basic rows are needed by default
    switch (rowType) {
      case 'Forman':
      case 'Equipment':
      case 'crew':
      case 'trucks':
        return true; // These basic rows are typically needed
      default:
        return false; // Most specialized services are not needed by default
    }
  }
  
  // Default case - all rows are needed
  return true;
}

/**
 * Check if a row type is togglable
 * @param rowType The type of row
 * @returns boolean indicating if the row can be toggled
 */
export function isRowTogglable(_rowType: RowType): boolean {
  void _rowType; // Acknowledge unused parameter for future implementation
  // Future implementation may check specific row type constraints
  // All row types can be toggled/overridden
  return true;
}

/**
 * Get a list of recommended equipment types for a specific job type and row
 * @param jobType The type of job
 * @param rowType The type of row
 * @returns Array of recommended equipment types for that row
 */
export function getRecommendedEquipment(jobType: string, rowType: RowType) {
  if (rowType === 'Equipment') {
    if (jobType === 'paving') {
      return [
        { type: 'paver', count: 1 },
        { type: 'roller', count: 3 }
      ];
    } else if (jobType === 'milling') {
      return [
        { type: 'millingMachine', count: 1 }
      ];
    } else if (jobType === 'both') {
      return [
        { type: 'millingMachine', count: 1 },
        { type: 'paver', count: 1 },
        { type: 'roller', count: 3 }
      ];
    }
  } else if (rowType === 'Sweeper') {
    return [{ type: 'sweeper', count: 1 }];
  } else if (rowType === 'trucks') {
    if (jobType === 'paving') {
      return [{ type: 'truck', count: 5 }];
    } else if (jobType === 'milling') {
      return [{ type: 'truck', count: 6 }];
    } else if (jobType === 'both') {
      return [{ type: 'truck', count: 8 }];
    }
  }
  
  return [];
}