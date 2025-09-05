import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from '../../../context/KeyboardShortcutsContext';
import CompactQuickSelect from '../CompactQuickSelect';
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp';

vi.mock('../../../hooks/useMagnet', () => ({
  useMagnets: () => ({
    magnets: [],
    filterMagnetsByType: () => [
      { id: 'mag1', name: 'Test Magnet 1', type: 'operator', status: 'Available' },
      { id: 'mag2', name: 'Test Magnet 2', type: 'driver', status: 'Available' }
    ],
    getAvailableMagnets: () => [
      { id: 'mag1', name: 'Test Magnet 1', type: 'operator', status: 'Available' },
      { id: 'mag2', name: 'Test Magnet 2', type: 'driver', status: 'Available' }
    ]
  }),
  useMagnet: () => ({
    magnet: { id: 'mag1', name: 'Test Magnet', type: 'operator', status: 'Available' }
  })
}));

vi.mock('../MagnetCard', () => ({
  __esModule: true,
  default: ({ magnetId }: { magnetId: string }) => <div data-testid={`magnet-card-${magnetId}`}>Magnet Card</div>
}));

vi.mock('../DraggableQuickSelectCard', () => ({
  __esModule: true,
  default: ({ magnet }: { magnet: any }) => <div data-testid={`draggable-magnet-${magnet.id}`}>Draggable {magnet.name}</div>
}));

const TestComponent = () => {
  const { 
    isQuickSelectOpen, 
    isHelpOpen, 
    quickSelectState,
    quickSelectMagnets 
  } = useKeyboardShortcuts();
  
  return (
    <div>
      <div data-testid="quick-select-status">
        {isQuickSelectOpen ? 'open' : 'closed'}
      </div>
      <div data-testid="help-status">
        {isHelpOpen ? 'open' : 'closed'}
      </div>
      <div data-testid="selected-index">
        {quickSelectState.selectedIndex}
      </div>
      <div data-testid="magnet-count">
        {quickSelectMagnets.length}
      </div>
      <CompactQuickSelect />
      <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={() => {}} />
    </div>
  );
};

describe('Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = () => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      </DndProvider>
    );
  };

  describe('Tab key functionality', () => {
    it('opens quick select when Tab is pressed', () => {
      renderWithProvider();
      
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('closed');
      
      fireEvent.keyDown(window, { key: 'Tab' });
      
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('open');
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('navigates through magnets with Tab when quick select is open', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
      
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('1');
      
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('navigates backwards with Shift+Tab', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('1');
      
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('closes quick select with Enter', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('open');
      
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('closed');
    });

    it('closes quick select with Escape', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('open');
      
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('closed');
    });
  });

  describe('Help dialog functionality', () => {
    it('opens help with ? key', () => {
      renderWithProvider();
      
      expect(screen.getByTestId('help-status')).toHaveTextContent('closed');
      
      fireEvent.keyDown(window, { key: '?' });
      
      expect(screen.getByTestId('help-status')).toHaveTextContent('open');
    });

    it('closes help with Escape', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByTestId('help-status')).toHaveTextContent('open');
      
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByTestId('help-status')).toHaveTextContent('closed');
    });

    it('does not open help when quick select is open', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('open');
      
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByTestId('help-status')).toHaveTextContent('closed');
    });
  });

  describe('Input field exclusion', () => {
    it('ignores keyboard shortcuts when typing in input fields', () => {
      const TestWithInput = () => (
        <DndProvider backend={HTML5Backend}>
          <KeyboardShortcutsProvider>
            <input data-testid="test-input" />
            <TestComponent />
          </KeyboardShortcutsProvider>
        </DndProvider>
      );

      render(<TestWithInput />);
      
      const input = screen.getByTestId('test-input');
      input.focus();
      
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(screen.getByTestId('quick-select-status')).toHaveTextContent('closed');
      
      fireEvent.keyDown(input, { key: '?' });
      expect(screen.getByTestId('help-status')).toHaveTextContent('closed');
    });
  });

  describe('Visual components', () => {
    it('renders QuickSelectOverlay when open', () => {
      renderWithProvider();
      
      expect(screen.queryByText('Quick Select Magnet')).not.toBeInTheDocument();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      
      expect(screen.getByText('Quick Select Magnet')).toBeInTheDocument();
      expect(screen.getByText('Tab: Next • Shift+Tab: Previous • Enter: Select • Esc: Close')).toBeInTheDocument();
    });

    it('renders KeyboardShortcutsHelp when open', () => {
      renderWithProvider();
      
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
      
      fireEvent.keyDown(window, { key: '?' });
      
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('highlights selected magnet in quick select overlay', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: 'Tab' });
      
      const selectedIndicator = screen.getByText('✓');
      expect(selectedIndicator).toBeInTheDocument();
    });
  });
});