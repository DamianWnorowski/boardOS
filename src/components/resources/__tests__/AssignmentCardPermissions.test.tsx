import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AssignmentCard from '../AssignmentCard';
import { Assignment, Resource } from '../../../types';

// Mock all the context dependencies
const mockSchedulerContext = {
  getResourceById: vi.fn(),
  getJobById: vi.fn(() => ({ id: 'test-job', name: 'Test Job', shift: 'day', startTime: '08:00' })),
  getAttachedAssignments: vi.fn(() => []),
  getAssignmentById: vi.fn(),
  updateTimeSlot: vi.fn(),
  getMagnetInteractionRule: vi.fn(),
  getRequiredAttachmentsForType: vi.fn(() => []),
  getMaxAttachmentsForType: vi.fn(() => 1),
  canMagnetAttachTo: vi.fn(() => true),
  hasMultipleJobAssignments: vi.fn(() => false),
  isWorkingDouble: vi.fn(() => false)
};

const mockMobileContext = {
  isMobile: false
};

const mockDragContext = {
  dragState: { isDragging: false },
  setCurrentDragItem: vi.fn(),
  getIsCtrlHeld: vi.fn(() => false)
};

// Mock hooks
vi.mock('../../../context/SchedulerContext', () => ({
  useScheduler: () => mockSchedulerContext
}));

vi.mock('../../../context/MobileContext', () => ({
  useMobile: () => mockMobileContext
}));

vi.mock('../../../context/DragContext', () => ({
  useDragContext: () => mockDragContext
}));

// Mock utility functions
vi.mock('../../../utils/dndBackend', () => ({
  getMobileDragSourceOptions: vi.fn(() => ({})),
  getMobileDropTargetOptions: vi.fn(() => ({}))
}));

vi.mock('../../../utils/localStorageUtils', () => ({
  safeLocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn()
  }
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

const mockAssignment: Assignment = {
  id: 'test-assignment',
  resourceId: 'test-resource',
  jobId: 'test-job',
  row: 'Equipment',
  position: 0,
  timeSlot: { startTime: '08:00', endTime: '15:30', isFullDay: true },
  attachments: []
};

const mockPaver: Resource = {
  id: 'test-paver',
  name: 'Paver 1',
  type: 'paver',
  classType: 'equipment',
  identifier: 'PV001',
  onSite: true,
  location: 'Site A'
};

const mockOperatorWithPermissions: Resource = {
  id: 'test-operator-1',
  name: 'John Doe',
  type: 'operator',
  classType: 'employee',
  identifier: 'OP001',
  onSite: true,
  location: 'Site A',
  allowedEquipment: ['paver', 'roller'] // Has paver permission
};

const mockOperatorWithoutPermissions: Resource = {
  id: 'test-operator-2',
  name: 'Jane Smith',
  type: 'operator',
  classType: 'employee',
  identifier: 'OP002',
  onSite: true,
  location: 'Site A',
  allowedEquipment: ['roller'] // No paver permission
};

describe('AssignmentCard Equipment Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAssignmentCard = (assignment: Assignment, resource: Resource, attachedAssignments: Assignment[] = []) => {
    mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
      if (id === resource.id) return resource;
      if (id === 'test-operator-1') return mockOperatorWithPermissions;
      if (id === 'test-operator-2') return mockOperatorWithoutPermissions;
      if (id === 'test-paver') return mockPaver;
      return null;
    });
    
    mockSchedulerContext.getAttachedAssignments.mockReturnValue(attachedAssignments);

    return render(
      <DndProvider backend={HTML5Backend}>
        <AssignmentCard 
          assignment={assignment}
          onOpenPersonModal={vi.fn()}
          onScrewmanRequested={vi.fn()}
          onGroundmanRequested={vi.fn()}
        />
      </DndProvider>
    );
  };

  it('should show permission warning for operator without equipment permission', () => {
    // Create an operator attached to paver without permission
    const operatorAssignment: Assignment = {
      ...mockAssignment,
      resourceId: 'test-operator-2',
      attachedTo: 'paver-assignment'
    };

    // Mock getResourceById to return the paver for the attachedTo check
    mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
      if (id === 'test-operator-2') return mockOperatorWithoutPermissions;
      if (id === 'paver-assignment' || id === 'test-paver') return mockPaver;
      return null;
    });

    const { container } = renderAssignmentCard(operatorAssignment, mockOperatorWithoutPermissions);
    
    // Should show warning indicator
    const warningIcon = container.querySelector('[title*="not authorized to operate"]');
    expect(warningIcon).toBeInTheDocument();
  });

  it('should show permission warning for equipment with unauthorized operator', () => {
    // Create operator assignment attached to paver
    const operatorAssignment: Assignment = {
      id: 'operator-assignment',
      resourceId: 'test-operator-2',
      jobId: 'test-job',
      row: 'crew',
      position: 0,
      timeSlot: { startTime: '08:00', endTime: '15:30', isFullDay: true },
      attachments: [],
      attachedTo: 'test-assignment'
    };

    const { container } = renderAssignmentCard(mockAssignment, mockPaver, [operatorAssignment]);
    
    // Should show warning indicator
    const warningIcon = container.querySelector('[title*="operators without proper permissions"]');
    expect(warningIcon).toBeInTheDocument();
  });

  it('should not show permission warning for operator with proper permissions', () => {
    // Create operator assignment with proper permissions
    const operatorAssignment: Assignment = {
      ...mockAssignment,
      resourceId: 'test-operator-1',
      attachedTo: 'paver-assignment'
    };

    mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
      if (id === 'test-operator-1') return mockOperatorWithPermissions;
      if (id === 'paver-assignment') return mockPaver;
      return null;
    });

    const { container } = renderAssignmentCard(operatorAssignment, mockOperatorWithPermissions);
    
    // Should not show warning indicator
    const warningIcon = container.querySelector('[title*="not authorized to operate"]');
    expect(warningIcon).not.toBeInTheDocument();
  });

  it('should not show permission warning for equipment with authorized operator', () => {
    // Create operator assignment attached to paver with proper permissions
    const operatorAssignment: Assignment = {
      id: 'operator-assignment',
      resourceId: 'test-operator-1',
      jobId: 'test-job',
      row: 'crew',
      position: 0,
      timeSlot: { startTime: '08:00', endTime: '15:30', isFullDay: true },
      attachments: [],
      attachedTo: 'test-assignment'
    };

    const { container } = renderAssignmentCard(mockAssignment, mockPaver, [operatorAssignment]);
    
    // Should not show warning indicator
    const warningIcon = container.querySelector('[title*="operators without proper permissions"]');
    expect(warningIcon).not.toBeInTheDocument();
  });

  it('should not show permission warning for operators with no equipment restrictions', () => {
    const operatorNoRestrictions: Resource = {
      id: 'test-operator-3',
      name: 'Bob Wilson',
      type: 'operator',
      classType: 'employee',
      identifier: 'OP003',
      onSite: true,
      location: 'Site A'
      // No allowedEquipment field - should allow all equipment
    };

    const operatorAssignment: Assignment = {
      ...mockAssignment,
      resourceId: 'test-operator-3',
      attachedTo: 'paver-assignment'
    };

    mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
      if (id === 'test-operator-3') return operatorNoRestrictions;
      if (id === 'paver-assignment') return mockPaver;
      return null;
    });

    const { container } = renderAssignmentCard(operatorAssignment, operatorNoRestrictions);
    
    // Should not show warning indicator (backward compatibility)
    const warningIcon = container.querySelector('[title*="not authorized to operate"]');
    expect(warningIcon).not.toBeInTheDocument();
  });

  it('should not show permission warning for operators with empty equipment restrictions', () => {
    const operatorEmptyRestrictions: Resource = {
      id: 'test-operator-4',
      name: 'Alice Johnson',
      type: 'operator',
      classType: 'employee',
      identifier: 'OP004',
      onSite: true,
      location: 'Site A',
      allowedEquipment: [] // Empty array - should allow all equipment
    };

    const operatorAssignment: Assignment = {
      ...mockAssignment,
      resourceId: 'test-operator-4',
      attachedTo: 'paver-assignment'
    };

    mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
      if (id === 'test-operator-4') return operatorEmptyRestrictions;
      if (id === 'paver-assignment') return mockPaver;
      return null;
    });

    const { container } = renderAssignmentCard(operatorAssignment, operatorEmptyRestrictions);
    
    // Should not show warning indicator (backward compatibility)
    const warningIcon = container.querySelector('[title*="not authorized to operate"]');
    expect(warningIcon).not.toBeInTheDocument();
  });
});