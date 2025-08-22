import { RowType } from '../types';

// Initial empty state
export const mockJobs = [];
export const mockResources = [];
export const mockAssignments = [];

// Row type definitions
export const rowTypes: RowType[] = ['Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'];

// Row type labels for display
export const rowTypeLabels: Record<RowType, string> = {
  Forman: 'Foreman',
  Equipment: 'Equipment',
  Sweeper: 'Sweeper',
  Tack: 'Tack',
  MPT: 'MPT',
  crew: 'Crew',
  trucks: 'Trucks',
};