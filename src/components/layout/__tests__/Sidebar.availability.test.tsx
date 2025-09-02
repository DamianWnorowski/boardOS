import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Sidebar from '../Sidebar';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { ModalProvider } from '../../../context/ModalContext';
import { MobileProvider } from '../../../context/MobileContext';
import { DragProvider } from '../../../context/DragContext';
import { Assignment, Job, Resource, ViewType } from '../../../types';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockResources: Resource[] = [
  {
    id: 'operator-1',
    name: 'John Operator',
    type: 'operator',
    identifier: 'OP01',
  },
  {
    id: 'laborer-1', 
    name: 'Joe Laborer',
    type: 'laborer',
    identifier: 'L01',
  },
  {
    id: 'paver-1',
    name: 'Paver 01',
    type: 'paver',
    identifier: 'PV01',
  },
];

const mockJobs: Job[] = [
  {
    id: 'job-today',
    name: 'Today Job',
    type: 'paving',
    schedule_date: '2025-09-02',
    startTime: '07:00',
    finalized: false,
  },
  {
    id: 'job-tomorrow',
    name: 'Tomorrow Job', 
    type: 'paving',
    schedule_date: '2025-09-03',
    startTime: '07:00',
    finalized: false,
  },
  {
    id: 'job-next-week',
    name: 'Next Week Job',
    type: 'paving', 
    schedule_date: '2025-09-09',
    startTime: '07:00',
    finalized: false,
  },
];

const mockAssignments: Assignment[] = [
  {
    id: 'assignment-today',
    resourceId: 'operator-1',
    jobId: 'job-today',
    row: 'equipment',
    timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
  },
  {
    id: 'assignment-tomorrow', 
    resourceId: 'laborer-1',
    jobId: 'job-tomorrow',
    row: 'crew',
    timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
  },
  {
    id: 'assignment-next-week',
    resourceId: 'paver-1', 
    jobId: 'job-next-week',
    row: 'equipment',
    timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
  },
];

const createMockSchedulerContext = (currentView: ViewType, selectedDate: Date) => ({
  jobs: mockJobs,
  resources: mockResources,
  assignments: mockAssignments,
  rowOverrides: [],
  selectedDate,
  currentView,
  filteredResourceType: null,
  searchTerm: '',
  truckDriverAssignments: {},
  magnetInteractionRules: [],
  dropRules: [],
  jobRowConfigs: [],
  isLoading: false,
  error: null,
  
  // Functions
  addJob: vi.fn(),
  updateJob: vi.fn(),
  removeJob: vi.fn(),
  finalizeJob: vi.fn(),
  unfinalizeJob: vi.fn(),
  addResource: vi.fn(),
  updateResource: vi.fn(),
  removeResource: vi.fn(),
  toggleResourceOnSite: vi.fn(),
  assignResource: vi.fn(),
  assignResourceWithTruckConfig: vi.fn(),
  assignResourceWithAttachment: vi.fn(),
  updateAssignment: vi.fn(),
  removeAssignment: vi.fn(),
  updateTimeSlot: vi.fn(),
  updateAssignmentNote: vi.fn(),
  cleanupOrphanedData: vi.fn(),
  attachResources: vi.fn(),
  detachResources: vi.fn(),
  moveAssignmentGroup: vi.fn(),
  toggleRowEnabled: vi.fn(),
  isRowEnabled: vi.fn(),
  setSelectedDate: vi.fn(),
  setCurrentView: vi.fn(),
  setFilteredResourceType: vi.fn(),
  setSearchTerm: vi.fn(),
  assignDriverToTruck: vi.fn(),
  unassignDriverFromTruck: vi.fn(),
  getTruckDriver: vi.fn(),
  getDriverTruck: vi.fn(),
  getResourcesByAssignment: vi.fn(),
  getAvailableResources: () => mockResources,
  getResourceById: (id: string) => mockResources.find(r => r.id === id),
  getJobById: (id: string) => mockJobs.find(j => j.id === id),
  getAssignmentById: vi.fn(),
  getAssignmentByResource: vi.fn(),
  getAttachedAssignments: vi.fn(),
  hasMultipleJobAssignments: vi.fn(),
  getResourceOtherAssignments: vi.fn(),
  hasTimeConflict: vi.fn(),
  getJobNotes: vi.fn(),
  isWorkingDouble: vi.fn(),
  getResourceDoubleShiftJobs: vi.fn(),
  updateMagnetInteractionRule: vi.fn(),
  getMagnetInteractionRule: vi.fn(),
  getRequiredAttachmentsForType: vi.fn(),
  getMaxAttachmentsForType: vi.fn(),
  canMagnetAttachTo: vi.fn(),
  updateDropRule: vi.fn(),
  getDropRule: vi.fn(),
  canDropOnRow: vi.fn(),
  updateJobRowConfig: vi.fn(),
  getJobRowConfig: vi.fn(),
});

const mockModalContext = {
  openModal: vi.fn(),
  closeModal: vi.fn(),
  getZIndex: vi.fn(() => 1000),
};

const renderSidebar = (currentView: ViewType, selectedDate: Date) => {
  const schedulerContext = createMockSchedulerContext(currentView, selectedDate);
  
  return render(
    <DndProvider backend={HTML5Backend}>
      <DragProvider>
        <MobileProvider>
          <ModalProvider>
            <SchedulerContext.Provider value={schedulerContext}>
              <div style={{ zIndex: 1000 }}>
                <Sidebar />
              </div>
            </SchedulerContext.Provider>
          </ModalProvider>
        </MobileProvider>
      </DragProvider>
    </DndProvider>
  );
};

describe('Sidebar Resource Availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show only resources not assigned on current date in day view', () => {
    const today = new Date('2025-09-02'); // Same as job-today
    renderSidebar('day', today);
    
    // operator-1 is assigned to job-today, should not appear
    expect(screen.queryByText('John Operator')).not.toBeInTheDocument();
    
    // laborer-1 is assigned to job-tomorrow, should appear (not assigned today)
    expect(screen.getByText('Joe Laborer')).toBeInTheDocument();
    
    // paver-1 is assigned to job-next-week, should appear (not assigned today)
    expect(screen.getByText('Paver 01')).toBeInTheDocument();
  });

  it('should show only resources not assigned on selected date in day view', () => {
    const tomorrow = new Date('2025-09-03'); // Same as job-tomorrow
    renderSidebar('day', tomorrow);
    
    // operator-1 is assigned to job-today, should appear (not assigned tomorrow)
    expect(screen.getByText('John Operator')).toBeInTheDocument();
    
    // laborer-1 is assigned to job-tomorrow, should not appear
    expect(screen.queryByText('Joe Laborer')).not.toBeInTheDocument();
    
    // paver-1 is assigned to job-next-week, should appear (not assigned tomorrow)
    expect(screen.getByText('Paver 01')).toBeInTheDocument();
  });

  it('should show resources not assigned in current week for week view', () => {
    const weekDate = new Date('2025-09-04'); // Thursday in same week as 9/2 and 9/3
    renderSidebar('week', weekDate);
    
    // operator-1 and laborer-1 are assigned to jobs this week (9/2 and 9/3), should not appear
    expect(screen.queryByText('John Operator')).not.toBeInTheDocument();
    expect(screen.queryByText('Joe Laborer')).not.toBeInTheDocument();
    
    // paver-1 is assigned to job-next-week (9/9), should appear (not assigned this week)
    expect(screen.getByText('Paver 01')).toBeInTheDocument();
  });

  it('should show all assigned resources for month view', () => {
    const monthDate = new Date('2025-09-15');
    renderSidebar('month', monthDate);
    
    // In month view, should use global availability (all assignments considered)
    // All resources are assigned somewhere, so none should appear
    expect(screen.queryByText('John Operator')).not.toBeInTheDocument();
    expect(screen.queryByText('Joe Laborer')).not.toBeInTheDocument();
    expect(screen.queryByText('Paver 01')).not.toBeInTheDocument();
  });

  it('should show all resources when no assignments exist', () => {
    const mockEmptySchedulerContext = {
      ...createMockSchedulerContext('day', new Date('2025-09-02')),
      assignments: [], // No assignments
    };
    
    render(
      <DndProvider backend={HTML5Backend}>
        <DragProvider>
          <MobileProvider>
            <ModalProvider>
              <SchedulerContext.Provider value={mockEmptySchedulerContext}>
                <div style={{ zIndex: 1000 }}>
                  <Sidebar />
                </div>
              </SchedulerContext.Provider>
            </ModalProvider>
          </MobileProvider>
        </DragProvider>
      </DndProvider>
    );
    
    // All resources should appear when no assignments exist
    expect(screen.getByText('John Operator')).toBeInTheDocument();
    expect(screen.getByText('Joe Laborer')).toBeInTheDocument();
    expect(screen.getByText('Paver 01')).toBeInTheDocument();
  });

  it('should handle jobs without schedule_date defaulting to today', () => {
    const jobsWithoutDates = [
      {
        id: 'job-no-date',
        name: 'No Date Job',
        type: 'paving',
        // No schedule_date - should default to today
        startTime: '07:00',
        finalized: false,
      }
    ];

    const assignmentWithoutDate = {
      id: 'assignment-no-date',
      resourceId: 'operator-1',
      jobId: 'job-no-date',
      row: 'equipment',
      timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
    };

    const mockContextWithoutDates = {
      ...createMockSchedulerContext('day', new Date('2025-09-02')),
      jobs: jobsWithoutDates,
      assignments: [assignmentWithoutDate],
      getJobById: (id: string) => jobsWithoutDates.find(j => j.id === id),
    };
    
    render(
      <DndProvider backend={HTML5Backend}>
        <DragProvider>
          <MobileProvider>
            <ModalProvider>
              <SchedulerContext.Provider value={mockContextWithoutDates}>
                <div style={{ zIndex: 1000 }}>
                  <Sidebar />
                </div>
              </SchedulerContext.Provider>
            </ModalProvider>
          </MobileProvider>
        </DragProvider>
      </DndProvider>
    );
    
    // operator-1 should not appear because job without date defaults to today
    expect(screen.queryByText('John Operator')).not.toBeInTheDocument();
    
    // Other resources should appear
    expect(screen.getByText('Joe Laborer')).toBeInTheDocument();
    expect(screen.getByText('Paver 01')).toBeInTheDocument();
  });
});