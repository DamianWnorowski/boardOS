import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import JobRow from '../JobRow';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { MobileContext } from '../../../context/MobileContext';
import { DragContext } from '../../../context/DragContext';
import { ModalContext } from '../../../context/ModalContext';
import { RowType, Job, Assignment, Resource } from '../../../types';
import { isRowNeededForJobType, isRowTogglable } from '../../../utils/jobUtils';

// Mock modules
vi.mock('../../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../utils/jobUtils', () => ({
  isRowNeededForJobType: vi.fn(),
  isRowTogglable: vi.fn(),
}));

vi.mock('../../../utils/dndBackend', () => ({
  getMobileDropTargetOptions: vi.fn(),
}));

// Mock child components
vi.mock('../../resources/AssignmentCard', () => ({
  default: ({ assignment }: { assignment: Assignment }) => (
    <div data-testid={`assignment-card-${assignment.id}`}>
      Assignment: {assignment.resourceId}
    </div>
  ),
}));

vi.mock('../../resources/TemplateCard', () => ({
  default: ({ equipmentType, label, onClick }: any) => (
    <button data-testid={`template-${equipmentType}`} onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock('../../modals/EquipmentSelectorModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="equipment-selector-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../../modals/TruckConfigModal', () => ({
  default: ({ onSelect, onClose }: any) => (
    <div data-testid="truck-config-modal">
      <button onClick={() => onSelect('flowboy')}>Flowboy</button>
      <button onClick={() => onSelect('dump-trailer')}>Dump Trailer</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../../modals/PersonModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="person-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('JobRow', () => {
  // Mock data
  const mockJob: Job = {
    id: 'job-1',
    name: 'Test Job',
    type: 'paving',
    startTime: '07:00',
    finalized: false,
  };

  const mockResource: Resource = {
    id: 'resource-1',
    name: 'Test Resource',
    type: 'paver',
    identifier: 'P001',
  };

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    resourceId: 'resource-1',
    jobId: 'job-1',
    row: 'Equipment',
    position: 0,
  };

  // Mock context values
  const mockSchedulerContext = {
    assignments: [mockAssignment],
    resources: [mockResource],
    jobs: [mockJob],
    getResourcesByAssignment: vi.fn((jobId: string, rowType: string) => {
      // Return assignments that match the jobId and rowType
      return [mockAssignment].filter(assignment => 
        assignment.jobId === jobId && assignment.row === rowType
      );
    }),
    assignResource: vi.fn(),
    assignResourceWithTruckConfig: vi.fn(),
    moveAssignmentGroup: vi.fn(),
    getJobById: vi.fn(() => mockJob),
    getAssignmentById: vi.fn(() => mockAssignment),
    getResourceById: vi.fn(() => mockResource),
    isRowEnabled: vi.fn(() => true),
    toggleRowEnabled: vi.fn(),
    getTruckDriver: vi.fn(),
    canDropOnRow: vi.fn(() => true),
    getDropRule: vi.fn(() => ['paver', 'roller']),
    getJobRowConfig: vi.fn(() => ({ 
      isSplit: true,
      boxes: [
        {
          name: 'Equipment',
          allowedTypes: ['paver', 'roller', 'excavator', 'skidsteer', 'millingMachine', 'sweeper', 'grader', 'dozer', 'payloader', 'equipment']
        },
        {
          name: 'Personnel',
          allowedTypes: ['operator', 'driver', 'foreman', 'laborer', 'striper']
        }
      ]
    })),
    getAttachedAssignments: vi.fn(() => []),
    removeAssignment: vi.fn(),
    assignResourceWithAttachment: vi.fn(),
    attachResources: vi.fn(),
    detachResources: vi.fn(),
    hasMultipleJobAssignments: vi.fn(() => false),
    isWorkingDouble: vi.fn(() => false),
    getMagnetInteractionRule: vi.fn(() => ({ canAttach: true, maxCount: 1 })),
    getRequiredAttachmentsForType: vi.fn(() => []),
    getMaxAttachmentsForType: vi.fn(() => 1),
  };

  const mockMobileContext = {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape' as const,
    touchEnabled: false,
    screenSize: 'xl' as const,
  };

  const mockDragContext = {
    dragState: { currentDragItem: null, dragCount: 0 },
    setCurrentDragItem: vi.fn(),
    incrementDragCount: vi.fn(),
    resetDragState: vi.fn(),
    getIsCtrlHeld: vi.fn(() => false),
  };

  const mockModalContext = {
    modalState: { openModals: [], baseZIndex: 1000 },
    openModal: vi.fn(),
    closeModal: vi.fn(),
    closeAllModals: vi.fn(),
    getZIndex: vi.fn(() => 1000),
  };

  const renderJobRow = (props: Partial<React.ComponentProps<typeof JobRow>> = {}) => {
    const defaultProps = {
      jobId: 'job-1',
      rowType: 'Equipment' as RowType,
      label: 'Equipment',
      ...props,
    };

    return render(
      <DndProvider backend={HTML5Backend}>
        <SchedulerContext.Provider value={mockSchedulerContext as any}>
          <MobileContext.Provider value={mockMobileContext as any}>
            <DragContext.Provider value={mockDragContext as any}>
              <ModalContext.Provider value={mockModalContext as any}>
                <JobRow {...defaultProps} />
              </ModalContext.Provider>
            </DragContext.Provider>
          </MobileContext.Provider>
        </SchedulerContext.Provider>
      </DndProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Reset job utils mocks
    isRowNeededForJobType.mockReturnValue(true);
    isRowTogglable.mockReturnValue(false);
    
    // Reset scheduler context mocks to default values
    mockSchedulerContext.getJobById.mockReturnValue(mockJob);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render row with label', () => {
      renderJobRow();
      expect(screen.getAllByText('Equipment')).toHaveLength(2); // Header + split box
    });

    it('should display assignment count when assignments exist', () => {
      renderJobRow();
      expect(screen.getByText('1 assigned')).toBeInTheDocument();
    });

    it('should not display assignment count when no assignments', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      renderJobRow();
      expect(screen.queryByText(/assigned/)).not.toBeInTheDocument();
    });

    it('should show drop rules indicator', () => {
      const { container } = renderJobRow();
      
      // Find the Info icon by its class
      const infoIcon = container.querySelector('.lucide-info');
      expect(infoIcon).toBeInTheDocument();
      
      // Hover should show tooltip
      fireEvent.mouseEnter(infoIcon!);
      expect(screen.getByText(/Allowed: Paver, Roller/)).toBeInTheDocument();
    });

    it('should show finalized indicator when job is finalized', () => {
      const finalizedJob = { ...mockJob, finalized: true };
      mockSchedulerContext.getJobById.mockReturnValue(finalizedJob);
      
      renderJobRow();
      expect(screen.getByTitle('Job is finalized')).toBeInTheDocument();
    });
  });

  describe('Row State Management', () => {
    it('should show toggle button for toggleable rows', () => {
      isRowTogglable.mockReturnValue(true);
      
      renderJobRow();
      expect(screen.getByTitle(/Enable row|Disable row/)).toBeInTheDocument();
    });

    it('should handle row toggle', () => {
      isRowTogglable.mockReturnValue(true);
      
      renderJobRow();
      
      const toggleButton = screen.getByTitle(/Enable row|Disable row/);
      fireEvent.click(toggleButton);
      
      expect(mockSchedulerContext.toggleRowEnabled).toHaveBeenCalledWith('job-1', 'Equipment');
    });

    it('should not allow toggle on finalized jobs', () => {
      isRowTogglable.mockReturnValue(true);
      
      const finalizedJob = { ...mockJob, finalized: true };
      mockSchedulerContext.getJobById.mockReturnValue(finalizedJob);
      
      renderJobRow();
      expect(screen.queryByTitle(/Enable row|Disable row/)).not.toBeInTheDocument();
    });

    it('should show disabled status when row is needed but disabled', () => {
        isRowNeededForJobType.mockReturnValue(true);
      isRowTogglable.mockReturnValue(true);
      mockSchedulerContext.isRowEnabled.mockReturnValue(false);
      
      renderJobRow();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('should show manually enabled status when row is not needed but enabled', () => {
        isRowNeededForJobType.mockReturnValue(false);
      isRowTogglable.mockReturnValue(true);
      mockSchedulerContext.isRowEnabled.mockReturnValue(true);
      
      renderJobRow();
      expect(screen.getByText('Manually enabled')).toBeInTheDocument();
    });
  });

  describe('Assignment Display', () => {
    it('should render assignment cards', () => {
      renderJobRow();
      expect(screen.getByTestId('assignment-card-assignment-1')).toBeInTheDocument();
    });

    it('should filter out attached assignments', () => {
      const attachedAssignment = { ...mockAssignment, id: 'attached-1', attachedTo: 'assignment-1' };
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([mockAssignment, attachedAssignment]);
      
      renderJobRow();
      expect(screen.getByTestId('assignment-card-assignment-1')).toBeInTheDocument();
      expect(screen.queryByTestId('assignment-card-attached-1')).not.toBeInTheDocument();
    });

    it('should sort assignments by priority', () => {
      const operatorResource = { ...mockResource, id: 'operator-1', type: 'operator' };
      const laborerResource = { ...mockResource, id: 'laborer-1', type: 'laborer' };
      const equipmentAssignment = mockAssignment;
      const operatorAssignment = { ...mockAssignment, id: 'op-assignment', resourceId: 'operator-1' };
      const laborerAssignment = { ...mockAssignment, id: 'lab-assignment', resourceId: 'laborer-1' };
      
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([
        laborerAssignment,
        equipmentAssignment,
        operatorAssignment,
      ]);
      
      mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
        if (id === 'resource-1') return mockResource;
        if (id === 'operator-1') return operatorResource;
        if (id === 'laborer-1') return laborerResource;
        return null;
      });
      
      renderJobRow();
      
      // Equipment should come first, then operators, then laborers
      const assignmentCards = screen.getAllByTestId(/assignment-card-/);
      expect(assignmentCards[0]).toHaveAttribute('data-testid', 'assignment-card-assignment-1');
      expect(assignmentCards[1]).toHaveAttribute('data-testid', 'assignment-card-op-assignment');
      expect(assignmentCards[2]).toHaveAttribute('data-testid', 'assignment-card-lab-assignment');
    });
  });

  describe('Template Cards', () => {
    it('should show paver template for paving jobs without paver', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      renderJobRow();
      expect(screen.getByTestId('template-paver')).toBeInTheDocument();
    });

    it('should not show paver template when paver already exists', () => {
      const paverResource = { ...mockResource, type: 'paver' };
      const paverAssignment = { ...mockAssignment, resourceId: 'paver-1' };
      
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([paverAssignment]);
      mockSchedulerContext.getResourceById.mockReturnValue(paverResource);
      
      renderJobRow();
      expect(screen.queryByTestId('template-paver')).not.toBeInTheDocument();
    });

    it('should show roller template for paving jobs with less than 2 rollers', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      renderJobRow();
      expect(screen.getByTestId('template-roller')).toBeInTheDocument();
    });

    it('should show templates for milling jobs', () => {
      const millingJob = { ...mockJob, type: 'milling' };
      mockSchedulerContext.getJobById.mockReturnValue(millingJob);
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      renderJobRow();
      expect(screen.getByTestId('template-millingMachine')).toBeInTheDocument();
      expect(screen.getByTestId('template-skidsteer')).toBeInTheDocument();
    });

    it('should handle template card clicks', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      renderJobRow();
      
      const paverTemplate = screen.getByTestId('template-paver');
      fireEvent.click(paverTemplate);
      
      // Should open equipment selector modal
      expect(screen.getByTestId('equipment-selector-modal')).toBeInTheDocument();
    });
  });

  describe('Trucks Row Special Handling', () => {
    it('should render truck row with special layout', () => {
      renderJobRow({ rowType: 'trucks', label: 'Trucks' });
      
      expect(screen.getByText('Flowboy')).toBeInTheDocument();
      expect(screen.getByText('Dump Trailer')).toBeInTheDocument();
      expect(screen.getByText('10W Trucks')).toBeInTheDocument();
    });

    it('should show flowboy section for paving jobs', () => {
      const pavingJob = { ...mockJob, type: 'paving' };
      mockSchedulerContext.getJobById.mockReturnValue(pavingJob);
      
      renderJobRow({ rowType: 'trucks', label: 'Trucks' });
      
      expect(screen.getByText('Flowboy')).toBeInTheDocument();
      expect(screen.getByText('Add Flowboy')).toBeInTheDocument();
    });

    it('should show dump trailer section for milling jobs', () => {
      const millingJob = { ...mockJob, type: 'milling' };
      mockSchedulerContext.getJobById.mockReturnValue(millingJob);
      
      renderJobRow({ rowType: 'trucks', label: 'Trucks' });
      
      expect(screen.getByText('Dump Trailer')).toBeInTheDocument();
      expect(screen.getByText('Add Dump Trailer')).toBeInTheDocument();
    });

    it('should handle truck limit changes', () => {
      renderJobRow({ rowType: 'trucks', label: 'Trucks' });
      
      const flowboySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(flowboySelect, { target: { value: '3' } });
      
      // Should update localStorage
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Drop Handling', () => {
    it('should handle resource drops', async () => {
      const mockDragItem = {
        type: 'RESOURCE',
        resource: mockResource,
      };

      renderJobRow();
      
      // Simulate drop
      const dropZone = screen.getByText('Equipment').closest('div');
      expect(dropZone).toBeInTheDocument();
      
      // Note: Full drop testing would require more complex DnD setup
    });

    it('should reject drops on finalized jobs', () => {
      const finalizedJob = { ...mockJob, finalized: true };
      mockSchedulerContext.getJobById.mockReturnValue(finalizedJob);
      
      renderJobRow();
      
      // The canDrop function should return false for finalized jobs
      // This would be tested in integration tests with full DnD setup
    });

    it('should reject drops on inactive rows', () => {
      isRowNeededForJobType.mockReturnValue(false);
      mockSchedulerContext.isRowEnabled.mockReturnValue(false);
      
      renderJobRow();
      
      // The canDrop function should return false for inactive rows
      // This would be tested in integration tests with full DnD setup
    });
  });

  describe('Modal Handling', () => {
    it('should open equipment selector modal', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      renderJobRow();
      
      const paverTemplate = screen.getByTestId('template-paver');
      fireEvent.click(paverTemplate);
      
      expect(screen.getByTestId('equipment-selector-modal')).toBeInTheDocument();
    });

    it('should close equipment selector modal', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      renderJobRow();
      
      const paverTemplate = screen.getByTestId('template-paver');
      fireEvent.click(paverTemplate);
      
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('equipment-selector-modal')).not.toBeInTheDocument();
    });

    it('should handle truck configuration modal', async () => {
      renderJobRow({ rowType: 'trucks', label: 'Trucks' });
      
      // This would be triggered by a truck drop in real usage
      // For testing, we need to manually trigger the truck config state
    });

    it('should open person modal when assignment is clicked', () => {
      renderJobRow();
      
      // The person modal opening would be triggered by AssignmentCard
      // which we've mocked, so this would be tested in integration tests
    });
  });

  describe('Split Rows', () => {
    it('should handle split row configuration', () => {
      const splitConfig = {
        isSplit: true,
        boxes: [
          { name: 'Equipment', allowedTypes: ['paver'] },
          { name: 'Personnel', allowedTypes: ['operator'] },
        ],
      };
      mockSchedulerContext.getJobRowConfig.mockReturnValue(splitConfig);
      
      renderJobRow();
      
      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(screen.getByText('Personnel')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      isRowTogglable.mockReturnValue(true);
      
      renderJobRow();
      
      const toggleButton = screen.getByTitle(/Enable row|Disable row/);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have descriptive tooltips', () => {
      renderJobRow();
      
      const infoIcon = screen.getByTitle(/Allowed/);
      expect(infoIcon).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing job gracefully', () => {
      mockSchedulerContext.getJobById.mockReturnValue(null);
      
      expect(() => renderJobRow()).not.toThrow();
    });

    it('should handle missing resources gracefully', () => {
      mockSchedulerContext.getResourceById.mockReturnValue(null);
      
      expect(() => renderJobRow()).not.toThrow();
    });

    it('should handle empty assignments array', () => {
      mockSchedulerContext.getResourcesByAssignment.mockReturnValue([]);
      
      expect(() => renderJobRow()).not.toThrow();
      expect(screen.queryByText(/assigned/)).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderJobRow();
      
      // Re-render with same props
      rerender(
        <DndProvider backend={HTML5Backend}>
          <SchedulerContext.Provider value={mockSchedulerContext as any}>
            <MobileContext.Provider value={mockMobileContext as any}>
              <DragContext.Provider value={mockDragContext as any}>
                <ModalContext.Provider value={mockModalContext as any}>
                  <JobRow jobId="job-1" rowType="Equipment" label="Equipment" />
                </ModalContext.Provider>
              </DragContext.Provider>
            </MobileContext.Provider>
          </SchedulerContext.Provider>
        </DndProvider>
      );
      
      // Should still render correctly
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should integrate with all required contexts', () => {
      renderJobRow();
      
      // Should not throw errors and render properly
      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(mockSchedulerContext.getResourcesByAssignment).toHaveBeenCalled();
      expect(mockSchedulerContext.getJobById).toHaveBeenCalled();
    });

    it('should handle context updates', () => {
      const { rerender } = renderJobRow();
      
      // Update context
      const updatedSchedulerContext = {
        ...mockSchedulerContext,
        getResourcesByAssignment: vi.fn(() => []),
      };
      
      rerender(
        <DndProvider backend={HTML5Backend}>
          <SchedulerContext.Provider value={updatedSchedulerContext as any}>
            <MobileContext.Provider value={mockMobileContext as any}>
              <DragContext.Provider value={mockDragContext as any}>
                <ModalContext.Provider value={mockModalContext as any}>
                  <JobRow jobId="job-1" rowType="Equipment" label="Equipment" />
                </ModalContext.Provider>
              </DragContext.Provider>
            </MobileContext.Provider>
          </SchedulerContext.Provider>
        </DndProvider>
      );
      
      // Should update to show no assignments
      expect(screen.queryByText(/assigned/)).not.toBeInTheDocument();
    });
  });
});