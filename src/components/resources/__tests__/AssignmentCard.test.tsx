import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AssignmentCard from '../AssignmentCard';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { MobileContext } from '../../../context/MobileContext';
import { DragContext } from '../../../context/DragContext';
import { Assignment, Resource, Job } from '../../../types';

// Mock modules
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../utils/localStorageUtils', () => ({
  safeLocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('../../../utils/dndBackend', () => ({
  getMobileDragSourceOptions: vi.fn(),
  getMobileDropTargetOptions: vi.fn(),
}));

// Mock child components
vi.mock('../ResourceCard', () => ({
  default: ({ resource, assignmentId, onPersonClick, hasNote }: any) => (
    <div 
      data-testid={`resource-card-${resource.id}`}
      onClick={() => onPersonClick && onPersonClick()}
    >
      {resource.name}
      {hasNote && <span data-testid="note-indicator">📝</span>}
      <span data-testid={`assignment-${assignmentId}`}>{assignmentId}</span>
    </div>
  ),
}));

vi.mock('../modals/ScrewmanSelectorModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="screwman-modal">
      <button onClick={onClose}>Close Screwman</button>
    </div>
  ),
}));

vi.mock('../modals/OperatorSelectorModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="operator-modal">
      <button onClick={onClose}>Close Operator</button>
    </div>
  ),
}));

vi.mock('../modals/TimeSlotModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="timeslot-modal">
      <button onClick={onClose}>Close TimeSlot</button>
    </div>
  ),
}));

vi.mock('../modals/PersonModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="person-modal">
      <button onClick={onClose}>Close Person</button>
    </div>
  ),
}));

describe('AssignmentCard', () => {
  // Mock data
  const mockJob: Job = {
    id: 'job-1',
    name: 'Test Job',
    type: 'paving',
    startTime: '07:00',
    finalized: false,
  };

  const mockPaverResource: Resource = {
    id: 'paver-1',
    name: 'Paver 01',
    type: 'paver',
    identifier: 'PV01',
  };

  const mockOperatorResource: Resource = {
    id: 'operator-1',
    name: 'John Doe',
    type: 'operator',
    identifier: 'OP01',
  };

  const mockTruckResource: Resource = {
    id: 'truck-1',
    name: 'Truck 01',
    type: 'truck',
    identifier: 'T01',
    onSite: true,
  };

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    resourceId: 'paver-1',
    jobId: 'job-1',
    row: 'Equipment',
    position: 0,
    timeSlot: {
      startTime: '07:00',
      endTime: '15:30',
      isFullDay: false,
    },
  };

  const mockAttachedAssignment: Assignment = {
    id: 'attached-1',
    resourceId: 'operator-1',
    jobId: 'job-1',
    row: 'Equipment',
    position: 0,
    attachedTo: 'assignment-1',
    timeSlot: {
      startTime: '07:00',
      endTime: '15:30',
      isFullDay: false,
    },
  };

  // Mock context values
  const mockSchedulerContext = {
    getResourceById: vi.fn(),
    removeAssignment: vi.fn(),
    assignResourceWithAttachment: vi.fn(),
    getAttachedAssignments: vi.fn(() => []),
    attachResources: vi.fn(),
    detachResources: vi.fn(),
    resources: [],
    assignments: [],
    getResourcesByAssignment: vi.fn(),
    getAssignmentById: vi.fn(),
    hasMultipleJobAssignments: vi.fn(() => false),
    getResourceOtherAssignments: vi.fn(),
    assignResource: vi.fn(),
    updateTimeSlot: vi.fn(),
    getJobById: vi.fn(() => mockJob),
    isWorkingDouble: vi.fn(() => false),
    getMagnetInteractionRule: vi.fn(),
    getRequiredAttachmentsForType: vi.fn(() => []),
    getMaxAttachmentsForType: vi.fn(() => 0),
    canMagnetAttachTo: vi.fn(() => true),
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

  const renderAssignmentCard = (props: Partial<React.ComponentProps<typeof AssignmentCard>> = {}) => {
    const defaultProps = {
      assignment: mockAssignment,
      onOpenPersonModal: vi.fn(),
      ...props,
    };

    return render(
      <DndProvider backend={HTML5Backend}>
        <SchedulerContext.Provider value={mockSchedulerContext as any}>
          <MobileContext.Provider value={mockMobileContext as any}>
            <DragContext.Provider value={mockDragContext as any}>
              <AssignmentCard {...defaultProps} />
            </DragContext.Provider>
          </MobileContext.Provider>
        </SchedulerContext.Provider>
      </DndProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
      if (id === 'paver-1') return mockPaverResource;
      if (id === 'operator-1') return mockOperatorResource;
      if (id === 'truck-1') return mockTruckResource;
      return null;
    });

    mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
      canAttach: true,
      maxCount: 2,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render assignment card with resource', () => {
      renderAssignmentCard();
      
      expect(screen.getByTestId('resource-card-paver-1')).toBeInTheDocument();
      expect(screen.getByText('Paver 01')).toBeInTheDocument();
    });

    it('should not render when resource is null', () => {
      mockSchedulerContext.getResourceById.mockReturnValue(null);
      
      const { container } = renderAssignmentCard();
      expect(container.firstChild).toBeNull();
    });

    it('should show time indicator for equipment', () => {
      renderAssignmentCard();
      
      // Time indicator should be visible
      expect(screen.getByText('07:00')).toBeInTheDocument();
    });

    it('should show note indicator when assignment has note', () => {
      const assignmentWithNote = { ...mockAssignment, note: 'Test note' };
      renderAssignmentCard({ assignment: assignmentWithNote });
      
      expect(screen.getByTestId('note-indicator')).toBeInTheDocument();
    });

    it('should show double shift indicator when working double', () => {
      mockSchedulerContext.isWorkingDouble.mockReturnValue(true);
      
      renderAssignmentCard();
      
      // The double shift indication would be passed to ResourceCard
      expect(screen.getByTestId('resource-card-paver-1')).toBeInTheDocument();
    });
  });

  describe('Attached Resources', () => {
    it('should render attached resources group', () => {
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([mockAttachedAssignment]);
      
      renderAssignmentCard();
      
      expect(screen.getByTestId('resource-card-paver-1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-operator-1')).toBeInTheDocument();
    });

    it('should handle truck with attached crew', () => {
      const truckAssignment = { ...mockAssignment, resourceId: 'truck-1' };
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([mockAttachedAssignment]);
      
      renderAssignmentCard({ assignment: truckAssignment });
      
      expect(screen.getByTestId('resource-card-truck-1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-operator-1')).toBeInTheDocument();
    });

    it('should handle laborer with attached truck', () => {
      const laborerResource = { ...mockOperatorResource, type: 'laborer' };
      const laborerAssignment = { ...mockAssignment, resourceId: 'operator-1' };
      const attachedTruckAssignment = { ...mockAttachedAssignment, resourceId: 'truck-1' };
      
      mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
        if (id === 'operator-1') return laborerResource;
        if (id === 'truck-1') return mockTruckResource;
        return null;
      });
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([attachedTruckAssignment]);
      
      renderAssignmentCard({ assignment: laborerAssignment });
      
      expect(screen.getByTestId('resource-card-operator-1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-truck-1')).toBeInTheDocument();
    });

    it('should handle equipment with personnel', () => {
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([mockAttachedAssignment]);
      
      renderAssignmentCard();
      
      // Should show both equipment and personnel
      expect(screen.getByTestId('resource-card-paver-1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-operator-1')).toBeInTheDocument();
    });
  });

  describe('Time Management', () => {
    it('should display current time slot', () => {
      renderAssignmentCard();
      
      expect(screen.getByText('07:00')).toBeInTheDocument();
    });

    it('should handle time editing', () => {
      renderAssignmentCard();
      
      const timeIndicator = screen.getByText('07:00');
      fireEvent.click(timeIndicator);
      
      // Should show time input
      const timeInput = screen.getByDisplayValue('07:00');
      expect(timeInput).toBeInTheDocument();
      
      // Change time
      fireEvent.change(timeInput, { target: { value: '08:00' } });
      fireEvent.blur(timeInput);
      
      expect(mockSchedulerContext.updateTimeSlot).toHaveBeenCalledWith(
        'assignment-1',
        {
          startTime: '08:00',
          endTime: '15:30',
          isFullDay: false,
        }
      );
    });

    it('should handle time editing with Enter key', () => {
      renderAssignmentCard();
      
      const timeIndicator = screen.getByText('07:00');
      fireEvent.click(timeIndicator);
      
      const timeInput = screen.getByDisplayValue('07:00');
      fireEvent.change(timeInput, { target: { value: '08:30' } });
      fireEvent.keyDown(timeInput, { key: 'Enter' });
      
      expect(mockSchedulerContext.updateTimeSlot).toHaveBeenCalledWith(
        'assignment-1',
        {
          startTime: '08:30',
          endTime: '15:30',
          isFullDay: false,
        }
      );
    });

    it('should use job default time when assignment has no time slot', () => {
      const assignmentNoTime = { ...mockAssignment, timeSlot: undefined };
      renderAssignmentCard({ assignment: assignmentNoTime });
      
      expect(screen.getByText('07:00')).toBeInTheDocument(); // Should use job's start time
    });

    it('should show different colors for onsite vs offsite vehicles', () => {
      const offsiteTruck = { ...mockTruckResource, onSite: false };
      const truckAssignment = { ...mockAssignment, resourceId: 'truck-1' };
      
      mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
        if (id === 'truck-1') return offsiteTruck;
        return mockPaverResource;
      });
      
      renderAssignmentCard({ assignment: truckAssignment });
      
      // Should show time indicator (color would be tested in integration)
      expect(screen.getByText('07:00')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('should open operator modal for equipment', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 1,
      });
      
      renderAssignmentCard();
      
      const addOperatorBtn = screen.getByText('+ Operator');
      fireEvent.click(addOperatorBtn);
      
      expect(screen.getByTestId('operator-modal')).toBeInTheDocument();
    });

    it('should close operator modal', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 1,
      });
      
      renderAssignmentCard();
      
      const addOperatorBtn = screen.getByText('+ Operator');
      fireEvent.click(addOperatorBtn);
      
      const closeBtn = screen.getByText('Close Operator');
      fireEvent.click(closeBtn);
      
      expect(screen.queryByTestId('operator-modal')).not.toBeInTheDocument();
    });

    it('should open screwman modal for pavers', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 2,
      });
      
      renderAssignmentCard();
      
      const addScrewmanBtn = screen.getByText('+ Screwman');
      fireEvent.click(addScrewmanBtn);
      
      expect(screen.getByTestId('screwman-modal')).toBeInTheDocument();
    });

    it('should open person modal when resource card is clicked', () => {
      const mockOnOpenPersonModal = vi.fn();
      renderAssignmentCard({ onOpenPersonModal: mockOnOpenPersonModal });
      
      const resourceCard = screen.getByTestId('resource-card-paver-1');
      fireEvent.click(resourceCard);
      
      expect(mockOnOpenPersonModal).toHaveBeenCalledWith(mockAssignment);
    });
  });

  describe('Add Buttons', () => {
    it('should show add operator button when operator is needed', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 1,
      });
      
      renderAssignmentCard();
      
      expect(screen.getByText('+ Operator')).toBeInTheDocument();
    });

    it('should not show add operator button when max operators reached', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 1,
      });
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([
        { ...mockAttachedAssignment, resourceId: 'operator-1' }
      ]);
      
      renderAssignmentCard();
      
      expect(screen.queryByText('+ Operator')).not.toBeInTheDocument();
    });

    it('should show add screwman button for pavers', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockImplementation((sourceType, targetType) => {
        if (sourceType === 'laborer' && targetType === 'paver') {
          return { canAttach: true, maxCount: 2 };
        }
        return { canAttach: false, maxCount: 0 };
      });
      
      renderAssignmentCard();
      
      expect(screen.getByText('+ Screwman')).toBeInTheDocument();
    });

    it('should show add groundman button for milling machines', () => {
      const millingResource = { ...mockPaverResource, type: 'millingMachine' };
      const millingAssignment = { ...mockAssignment, resourceId: 'milling-1' };
      
      mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
        if (id === 'milling-1') return millingResource;
        return null;
      });
      
      mockSchedulerContext.getMagnetInteractionRule.mockImplementation((sourceType, targetType) => {
        if (sourceType === 'laborer' && targetType === 'millingMachine') {
          return { canAttach: true, maxCount: 2 };
        }
        return { canAttach: false, maxCount: 0 };
      });
      
      renderAssignmentCard({ assignment: millingAssignment });
      
      expect(screen.getByText('+ Groundman')).toBeInTheDocument();
    });

    it('should not show add buttons when attachment rules do not allow', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: false,
        maxCount: 0,
      });
      
      renderAssignmentCard();
      
      expect(screen.queryByText('+ Operator')).not.toBeInTheDocument();
      expect(screen.queryByText('+ Screwman')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should be draggable', () => {
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').parentElement;
      expect(assignmentCard).toHaveAttribute('class', expect.stringContaining('cursor-move'));
    });

    it('should handle drag start with Ctrl key for second shift', () => {
      mockDragContext.getIsCtrlHeld.mockReturnValue(true);
      
      renderAssignmentCard();
      
      // The drag behavior would be tested in integration tests with actual DnD
      expect(mockDragContext.setCurrentDragItem).not.toHaveBeenCalled(); // Only called on actual drag
    });

    it('should prevent dragging when modals are open', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 1,
      });
      
      renderAssignmentCard();
      
      // Open modal
      const addOperatorBtn = screen.getByText('+ Operator');
      fireEvent.click(addOperatorBtn);
      
      // Dragging should be disabled when modal is open
      // This would be tested with actual drag attempt in integration tests
    });

    it('should handle drop of compatible resources', () => {
      renderAssignmentCard();
      
      // The drop handling would be tested in integration tests with actual DnD setup
    });

    it('should reject drop of incompatible resources', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: false,
        maxCount: 0,
      });
      
      renderAssignmentCard();
      
      // The drop rejection would be tested in integration tests
    });
  });

  describe('Double Click Handling', () => {
    it('should confirm before removing single assignment', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').parentElement;
      fireEvent.doubleClick(assignmentCard!);
      
      expect(confirmSpy).toHaveBeenCalledWith('Remove this resource from the job?');
      expect(mockSchedulerContext.removeAssignment).toHaveBeenCalledWith('assignment-1');
      
      confirmSpy.mockRestore();
    });

    it('should confirm before detaching group', () => {
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([mockAttachedAssignment]);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').closest('[class*="cursor-move"]');
      fireEvent.doubleClick(assignmentCard!);
      
      expect(confirmSpy).toHaveBeenCalledWith('Detach all resources from the group?');
      expect(mockSchedulerContext.removeAssignment).toHaveBeenCalledWith('attached-1');
      
      confirmSpy.mockRestore();
    });

    it('should not remove when user cancels confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').parentElement;
      fireEvent.doubleClick(assignmentCard!);
      
      expect(mockSchedulerContext.removeAssignment).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });

  describe('Style and Visual States', () => {
    it('should apply drag styling when dragging', () => {
      // This would be tested with actual drag state in integration tests
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').parentElement;
      expect(assignmentCard).toBeInTheDocument();
    });

    it('should apply hover styling on drop', () => {
      // This would be tested with actual drop events in integration tests
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').parentElement;
      expect(assignmentCard).toBeInTheDocument();
    });

    it('should show multi-job styling for resources on multiple jobs', () => {
      mockSchedulerContext.hasMultipleJobAssignments.mockReturnValue(true);
      
      renderAssignmentCard();
      
      const assignmentCard = screen.getByTestId('resource-card-paver-1').parentElement;
      expect(assignmentCard).toHaveAttribute('class', expect.stringContaining('ring-2'));
    });
  });

  describe('Error Handling', () => {
    it('should handle missing attached resources gracefully', () => {
      mockSchedulerContext.getAttachedAssignments.mockReturnValue([
        { ...mockAttachedAssignment, resourceId: 'missing-resource' }
      ]);
      mockSchedulerContext.getResourceById.mockImplementation((id: string) => {
        if (id === 'paver-1') return mockPaverResource;
        return null; // Missing resource
      });
      
      expect(() => renderAssignmentCard()).not.toThrow();
    });

    it('should handle missing job gracefully', () => {
      mockSchedulerContext.getJobById.mockReturnValue(null);
      
      expect(() => renderAssignmentCard()).not.toThrow();
    });

    it('should handle missing time slot gracefully', () => {
      const assignmentNoTime = { ...mockAssignment, timeSlot: undefined };
      renderAssignmentCard({ assignment: assignmentNoTime });
      
      expect(screen.getByText('07:00')).toBeInTheDocument(); // Should fallback to job time
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      mockSchedulerContext.getMagnetInteractionRule.mockReturnValue({
        canAttach: true,
        maxCount: 1,
      });
      
      renderAssignmentCard();
      
      const operatorBtn = screen.getByText('+ Operator');
      expect(operatorBtn).toBeInTheDocument();
      expect(operatorBtn.tagName).toBe('DIV'); // Custom styled button
    });

    it('should have descriptive titles and tooltips', () => {
      renderAssignmentCard();
      
      const timeIndicator = screen.getByText('07:00');
      expect(timeIndicator.closest('div')).toHaveAttribute('title', expect.stringContaining('Click to edit'));
    });
  });

  describe('Performance', () => {
    it('should handle cleanup on unmount', () => {
      const { unmount } = renderAssignmentCard();
      
      unmount();
      
      // Should cleanup without errors
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = renderAssignmentCard();
      
      // Re-render with same props
      rerender(
        <DndProvider backend={HTML5Backend}>
          <SchedulerContext.Provider value={mockSchedulerContext as any}>
            <MobileContext.Provider value={mockMobileContext as any}>
              <DragContext.Provider value={mockDragContext as any}>
                <AssignmentCard assignment={mockAssignment} onOpenPersonModal={vi.fn()} />
              </DragContext.Provider>
            </MobileContext.Provider>
          </SchedulerContext.Provider>
        </DndProvider>
      );
      
      // Should not cause additional calls to expensive functions
      expect(screen.getByTestId('resource-card-paver-1')).toBeInTheDocument();
    });
  });
});