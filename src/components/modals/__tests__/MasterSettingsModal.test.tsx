import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MasterSettingsModal from '../MasterSettingsModal';
import { ModalProvider } from '../../../context/ModalContext';
import { SchedulerProvider } from '../../../context/SchedulerContext';

// Mock the child modals to avoid complex dependencies
vi.mock('../AddJobTypeModal', () => {
  return {
    default: function MockAddJobTypeModal({ onClose, onSave }: any) {
      return (
        <div data-testid="add-job-type-modal">
          <button onClick={() => onSave({ id: 'test', name: 'Test Job' })}>Save</button>
          <button onClick={onClose}>Close</button>
        </div>
      );
    }
  };
});

vi.mock('../AddAttachmentRuleModal', () => {
  return {
    default: function MockAddAttachmentRuleModal({ onClose, onSave }: any) {
      return (
        <div data-testid="add-attachment-rule-modal">
          <button onClick={() => onSave({ sourceType: 'operator', targetType: 'paver' })}>Save</button>
          <button onClick={onClose}>Close</button>
        </div>
      );
    }
  };
});

vi.mock('../AddResourceModal', () => {
  return {
    default: function MockAddResourceModal({ onClose }: any) {
      return (
        <div data-testid="add-resource-modal">
          <button onClick={onClose}>Close</button>
        </div>
      );
    }
  };
});

vi.mock('../QuickAddResourceModal', () => {
  return {
    default: function MockQuickAddResourceModal({ onClose }: any) {
      return (
        <div data-testid="quick-add-resource-modal">
          <button onClick={onClose}>Close</button>
        </div>
      );
    }
  };
});

// Mock the scheduler context
const mockSchedulerContext = {
  resources: [
    { id: '1', name: 'Test Operator', type: 'operator', identifier: 'OP001' },
    { id: '2', name: 'Test Truck', type: 'truck', identifier: 'TR001' }
  ],
  jobs: [
    { id: '1', name: 'Test Job', status: 'active' }
  ],
  assignments: [],
  dropRules: [],
  magnetRules: [],
  addResource: vi.fn(),
  deleteResource: vi.fn(),
  // Add other required context properties as needed
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ModalProvider>
      <SchedulerProvider value={mockSchedulerContext as any}>
        {component}
      </SchedulerProvider>
    </ModalProvider>
  );
};

describe('MasterSettingsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders the modal with all tabs', () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    expect(screen.getByText('Master Settings')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Job Rules')).toBeInTheDocument();
    expect(screen.getByText('Global Attachment Rules')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('displays system health metrics', () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    expect(screen.getByText('Job Rules')).toBeInTheDocument();
    expect(screen.getByText('Attachment Rules')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('opens Add Custom Job Type modal when button is clicked', async () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    // Navigate to Job Rules tab
    fireEvent.click(screen.getByText('Job Rules'));
    
    // Click Add Custom Job Type button
    const addJobTypeButton = screen.getByText('Add Custom Job Type');
    fireEvent.click(addJobTypeButton);
    
    // Verify modal opens
    await waitFor(() => {
      expect(screen.getByTestId('add-job-type-modal')).toBeInTheDocument();
    });
  });

  it('opens Add Attachment Rule modal when button is clicked', async () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    // Navigate to Global Attachment Rules tab
    fireEvent.click(screen.getByText('Global Attachment Rules'));
    
    // Click Add Attachment Rule button
    const addAttachmentRuleButton = screen.getByText('Add Attachment Rule');
    fireEvent.click(addAttachmentRuleButton);
    
    // Verify modal opens
    await waitFor(() => {
      expect(screen.getByTestId('add-attachment-rule-modal')).toBeInTheDocument();
    });
  });

  it('opens Add Resource modal when button is clicked', async () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    // Navigate to Resources tab
    fireEvent.click(screen.getByText('Resources'));
    
    // Click Add Resource button
    const addResourceButton = screen.getByText('Add Resource');
    fireEvent.click(addResourceButton);
    
    // Verify modal opens
    await waitFor(() => {
      expect(screen.getByTestId('add-resource-modal')).toBeInTheDocument();
    });
  });

  it('exports settings when export button is clicked', () => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock createElement and click
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation();
    vi.spyOn(document.body, 'removeChild').mockImplementation();
    
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    const exportButton = screen.getByText('Export Settings');
    fireEvent.click(exportButton);
    
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('switches between tabs correctly', () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    // Click on Job Rules tab
    fireEvent.click(screen.getByText('Job Rules'));
    expect(screen.getByText('Job Type Configurations')).toBeInTheDocument();
    
    // Click on Resources tab
    fireEvent.click(screen.getByText('Resources'));
    expect(screen.getByText('Resource Management')).toBeInTheDocument();
    
    // Click on Global Attachment Rules tab
    fireEvent.click(screen.getByText('Global Attachment Rules'));
    expect(screen.getByText('Universal rules defining which resources can attach to other resources')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    renderWithProviders(<MasterSettingsModal onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});