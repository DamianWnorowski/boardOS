import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { DragProvider, useDragContext } from '../DragContext';

describe('DragContext', () => {
  describe('DragProvider', () => {
    it('should provide drag context to children', () => {
      const TestComponent = () => {
        const context = useDragContext();
        return <div>{context ? 'Context Available' : 'No Context'}</div>;
      };

      render(
        <DragProvider>
          <TestComponent />
        </DragProvider>
      );

      expect(screen.getByText('Context Available')).toBeInTheDocument();
    });

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        const context = useDragContext();
        return <div>{context ? 'Context Available' : 'No Context'}</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow('useDragContext must be used within a DragProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('useDragContext hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DragProvider>{children}</DragProvider>
    );

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should provide initial drag state', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });

      expect(result.current.dragState).toEqual({
        currentDragItem: null,
        dragCount: 0
      });
    });

    it('should update current drag item', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });
      const testItem = { id: '1', type: 'resource' };

      act(() => {
        result.current.setCurrentDragItem(testItem);
      });

      expect(result.current.dragState.currentDragItem).toEqual(testItem);
    });

    it('should increment drag count', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });

      act(() => {
        result.current.incrementDragCount();
      });

      expect(result.current.dragState.dragCount).toBe(1);

      act(() => {
        result.current.incrementDragCount();
      });

      expect(result.current.dragState.dragCount).toBe(2);
    });

    it('should reset drag state', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });
      const testItem = { id: '1', type: 'resource' };

      act(() => {
        result.current.setCurrentDragItem(testItem);
        result.current.incrementDragCount();
        result.current.incrementDragCount();
      });

      expect(result.current.dragState.currentDragItem).toEqual(testItem);
      expect(result.current.dragState.dragCount).toBe(2);

      act(() => {
        result.current.resetDragState();
      });

      expect(result.current.dragState.currentDragItem).toBeNull();
      expect(result.current.dragState.dragCount).toBe(0);
    });

    it('should track Ctrl key state', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });

      expect(result.current.getIsCtrlHeld()).toBe(false);

      act(() => {
        fireEvent.keyDown(window, { ctrlKey: true });
      });

      expect(result.current.getIsCtrlHeld()).toBe(true);

      act(() => {
        fireEvent.keyUp(window, { ctrlKey: false });
      });

      expect(result.current.getIsCtrlHeld()).toBe(false);
    });

    it('should track Meta key state (for Mac)', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });

      expect(result.current.getIsCtrlHeld()).toBe(false);

      act(() => {
        fireEvent.keyDown(window, { metaKey: true });
      });

      expect(result.current.getIsCtrlHeld()).toBe(true);

      act(() => {
        fireEvent.keyUp(window, { metaKey: false });
      });

      expect(result.current.getIsCtrlHeld()).toBe(false);
    });

    it('should reset Ctrl state on resetDragState', () => {
      const { result } = renderHook(() => useDragContext(), { wrapper });

      act(() => {
        fireEvent.keyDown(window, { ctrlKey: true });
      });

      expect(result.current.getIsCtrlHeld()).toBe(true);

      act(() => {
        result.current.resetDragState();
      });

      expect(result.current.getIsCtrlHeld()).toBe(false);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners on mount/unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <DragProvider>
          <div>Test</div>
        </DragProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Integration', () => {
    it('should handle multiple state updates correctly', () => {
      const { result } = renderHook(() => useDragContext(), { 
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <DragProvider>{children}</DragProvider>
        )
      });

      const item1 = { id: '1', type: 'resource' };
      const item2 = { id: '2', type: 'assignment' };

      act(() => {
        result.current.setCurrentDragItem(item1);
        result.current.incrementDragCount();
      });

      expect(result.current.dragState.currentDragItem).toEqual(item1);
      expect(result.current.dragState.dragCount).toBe(1);

      act(() => {
        result.current.setCurrentDragItem(item2);
        result.current.incrementDragCount();
      });

      expect(result.current.dragState.currentDragItem).toEqual(item2);
      expect(result.current.dragState.dragCount).toBe(2);
    });

    it('should maintain separate state for drag item and count', () => {
      const { result } = renderHook(() => useDragContext(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <DragProvider>{children}</DragProvider>
        )
      });

      const testItem = { id: '1', type: 'resource' };

      act(() => {
        result.current.setCurrentDragItem(testItem);
      });

      expect(result.current.dragState.currentDragItem).toEqual(testItem);
      expect(result.current.dragState.dragCount).toBe(0);

      act(() => {
        result.current.incrementDragCount();
        result.current.incrementDragCount();
      });

      expect(result.current.dragState.currentDragItem).toEqual(testItem);
      expect(result.current.dragState.dragCount).toBe(2);

      act(() => {
        result.current.setCurrentDragItem(null);
      });

      expect(result.current.dragState.currentDragItem).toBeNull();
      expect(result.current.dragState.dragCount).toBe(2);
    });
  });
});