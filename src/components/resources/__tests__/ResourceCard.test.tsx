import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ResourceCard from '../ResourceCard';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { DragContext } from '../../../context/DragContext';
import { MobileContext } from '../../../context/MobileContext';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

describe('ResourceCard', () => {
  // Mock context values
  const mockSchedulerContext = {
    getTruckDriver: vi.fn(),
    jobs: [],
    resources: [],
    assignments: [],
    addJob: vi.fn(),
    removeJob: vi.fn(),
    updateJob: vi.fn(),
    addResource: vi.fn(),
    removeResource: vi.fn(),
    assignResource: vi.fn(),
    removeAssignment: vi.fn(),
    getJobById: vi.fn(),
    getResourceById: vi.fn(),
    getAssignmentById: vi.fn(),
    getResourcesByAssignment: vi.fn(),
    getAttachedAssignments: vi.fn(),
  };

  const mockDragContext = {
    dragState: { currentDragItem: null, dragCount: 0 },
    getIsCtrlHeld: vi.fn(() => false),
    setCurrentDragItem: vi.fn(),
    incrementDragCount: vi.fn(),
    resetDragState: vi.fn(),
  };

  const mockMobileContext = {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape' as const,
    touchEnabled: false,
    screenSize: 'xl' as const,
  };

  const renderResourceCard = (props: any = {}) => {
    const defaultProps = {
      resource: { id: 'r1', name: 'Res', type: 'laborer' },
      isDragging: false,
      ...props,
    };

    return render(
      <DndProvider backend={HTML5Backend}>
        <SchedulerContext.Provider value={mockSchedulerContext as any}>
          <MobileContext.Provider value={mockMobileContext as any}>
            <DragContext.Provider value={mockDragContext as any}>
              <ResourceCard {...defaultProps} />
            </DragContext.Provider>
          </MobileContext.Provider>
        </SchedulerContext.Provider>
      </DndProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders resource card with name', () => {
    const resource = { id: 'r1', name: 'Test Resource', type: 'laborer' };
    renderResourceCard({ resource });
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Resource')).toBeInTheDocument();
  });

  test('calls scheduler context methods', () => {
    const truckResource = { id: 't1', name: 'Truck 01', type: 'truck' };
    
    renderResourceCard({ resource: truckResource });
    
    expect(mockSchedulerContext.getTruckDriver).toHaveBeenCalledWith('t1');
  });

  test('handles truck with driver', () => {
    const truckResource = { id: 't1', name: 'Truck 01', type: 'truck' };
    const driverResource = { id: 'd1', name: 'Driver Name', type: 'operator' };
    
    mockSchedulerContext.getTruckDriver.mockReturnValue(driverResource);
    
    renderResourceCard({ resource: truckResource });
    
    expect(screen.getByText('Driver Name')).toBeInTheDocument();
  });

  test('handles truck without driver', () => {
    const truckResource = { id: 't1', name: 'Truck 01', type: 'truck' };
    
    mockSchedulerContext.getTruckDriver.mockReturnValue(null);
    
    renderResourceCard({ resource: truckResource });
    
    expect(screen.getByText('#')).toBeInTheDocument();
  });

  test('shows onsite indicator for onsite vehicles', () => {
    const onsiteVehicle = { id: 'v1', name: 'Vehicle 01', type: 'truck', onSite: true };
    
    renderResourceCard({ resource: onsiteVehicle });
    expect(screen.getByText('O.S')).toBeInTheDocument();
  });

  test('shows note indicator when hasNote is true', () => {
    const resource = { id: 'r1', name: 'Resource', type: 'laborer' };
    
    renderResourceCard({ resource, hasNote: true });
    
    // Look for the sticky note SVG element
    const noteIcon = document.querySelector('.lucide-sticky-note');
    expect(noteIcon).toBeInTheDocument();
  });
});
