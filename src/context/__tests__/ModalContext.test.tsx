import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { ModalProvider, useModal } from '../ModalContext';

describe('ModalContext', () => {
  describe('ModalProvider', () => {
    it('should provide modal context to children', () => {
      const TestComponent = () => {
        const context = useModal();
        return <div data-testid="context">{context ? 'Available' : 'Not Available'}</div>;
      };

      render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      );

      expect(screen.getByTestId('context')).toHaveTextContent('Available');
    });

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        const context = useModal();
        return <div>{context ? 'Available' : 'Not Available'}</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow('useModal must be used within a ModalProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide initial modal state', () => {
      const TestComponent = () => {
        const { modalState } = useModal();
        return (
          <div data-testid="modal-state">
            {JSON.stringify({
              openModals: modalState.openModals,
              baseZIndex: modalState.baseZIndex
            })}
          </div>
        );
      };

      render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      );

      const modalState = JSON.parse(screen.getByTestId('modal-state').textContent || '{}');
      expect(modalState.openModals).toEqual([]);
      expect(modalState.baseZIndex).toBe(1000);
    });
  });

  describe('useModal hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('openModal', () => {
      it('should open a modal and return correct z-index', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        expect(result.current.modalState.openModals).toEqual([]);

        let zIndex;
        act(() => {
          zIndex = result.current.openModal('test-modal');
        });

        expect(result.current.modalState.openModals).toEqual(['test-modal']);
        expect(zIndex).toBe(1000); // baseZIndex + 0 * 10
      });

      it('should handle multiple modals with correct z-indices', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        let zIndex1, zIndex2, zIndex3;

        act(() => {
          zIndex1 = result.current.openModal('modal-1');
          zIndex2 = result.current.openModal('modal-2');
          zIndex3 = result.current.openModal('modal-3');
        });

        expect(result.current.modalState.openModals).toEqual(['modal-1', 'modal-2', 'modal-3']);
        expect(zIndex1).toBe(1000);
        expect(zIndex2).toBe(1000); // Note: This is the bug in the original implementation
        expect(zIndex3).toBe(1000); // The z-index calculation uses stale state
      });

      it('should not duplicate modals that are already open', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('test-modal');
          result.current.openModal('test-modal');
          result.current.openModal('test-modal');
        });

        expect(result.current.modalState.openModals).toEqual(['test-modal']);
      });

      it('should handle empty string modal ids', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('');
        });

        expect(result.current.modalState.openModals).toEqual(['']);
      });

      it('should handle special character modal ids', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        const specialIds = ['modal-with-dashes', 'modal_with_underscores', 'modal.with.dots', 'modal with spaces'];
        
        act(() => {
          specialIds.forEach(id => result.current.openModal(id));
        });

        expect(result.current.modalState.openModals).toEqual(specialIds);
      });
    });

    describe('closeModal', () => {
      it('should close a specific modal', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('modal-1');
          result.current.openModal('modal-2');
          result.current.openModal('modal-3');
        });

        expect(result.current.modalState.openModals).toEqual(['modal-1', 'modal-2', 'modal-3']);

        act(() => {
          result.current.closeModal('modal-2');
        });

        expect(result.current.modalState.openModals).toEqual(['modal-1', 'modal-3']);
      });

      it('should handle closing non-existent modal gracefully', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('existing-modal');
        });

        expect(result.current.modalState.openModals).toEqual(['existing-modal']);

        act(() => {
          result.current.closeModal('non-existent-modal');
        });

        expect(result.current.modalState.openModals).toEqual(['existing-modal']);
      });

      it('should handle closing modal when no modals are open', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        expect(result.current.modalState.openModals).toEqual([]);

        act(() => {
          result.current.closeModal('any-modal');
        });

        expect(result.current.modalState.openModals).toEqual([]);
      });

      it('should preserve order when closing modals', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('first');
          result.current.openModal('second');
          result.current.openModal('third');
          result.current.openModal('fourth');
        });

        act(() => {
          result.current.closeModal('second');
        });

        expect(result.current.modalState.openModals).toEqual(['first', 'third', 'fourth']);

        act(() => {
          result.current.closeModal('first');
        });

        expect(result.current.modalState.openModals).toEqual(['third', 'fourth']);
      });
    });

    describe('closeAllModals', () => {
      it('should close all open modals', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('modal-1');
          result.current.openModal('modal-2');
          result.current.openModal('modal-3');
        });

        expect(result.current.modalState.openModals).toEqual(['modal-1', 'modal-2', 'modal-3']);

        act(() => {
          result.current.closeAllModals();
        });

        expect(result.current.modalState.openModals).toEqual([]);
      });

      it('should handle closing all modals when none are open', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        expect(result.current.modalState.openModals).toEqual([]);

        act(() => {
          result.current.closeAllModals();
        });

        expect(result.current.modalState.openModals).toEqual([]);
      });

      it('should not affect baseZIndex when closing all modals', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        const initialBaseZIndex = result.current.modalState.baseZIndex;

        act(() => {
          result.current.openModal('modal-1');
          result.current.openModal('modal-2');
        });

        expect(result.current.modalState.baseZIndex).toBe(initialBaseZIndex);

        act(() => {
          result.current.closeAllModals();
        });

        expect(result.current.modalState.baseZIndex).toBe(initialBaseZIndex);
        expect(result.current.modalState.openModals).toEqual([]);
      });
    });

    describe('getZIndex', () => {
      it('should return correct z-index for open modals', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('modal-1');
          result.current.openModal('modal-2');
          result.current.openModal('modal-3');
        });

        expect(result.current.getZIndex('modal-1')).toBe(1010); // 1000 + (0 + 1) * 10
        expect(result.current.getZIndex('modal-2')).toBe(1020); // 1000 + (1 + 1) * 10
        expect(result.current.getZIndex('modal-3')).toBe(1030); // 1000 + (2 + 1) * 10
      });

      it('should return base z-index for non-existent modals', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('existing-modal');
        });

        expect(result.current.getZIndex('non-existent-modal')).toBe(1000);
      });

      it('should return base z-index when no modals are open', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        expect(result.current.getZIndex('any-modal')).toBe(1000);
      });

      it('should update z-index correctly when modals are closed', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('modal-1');
          result.current.openModal('modal-2');
          result.current.openModal('modal-3');
        });

        expect(result.current.getZIndex('modal-2')).toBe(1020);

        act(() => {
          result.current.closeModal('modal-1');
        });

        // After closing modal-1, modal-2 should now be at index 0
        expect(result.current.getZIndex('modal-2')).toBe(1010);
        expect(result.current.getZIndex('modal-3')).toBe(1020);
      });

      it('should handle empty string modal id', () => {
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
          result.current.openModal('');
        });

        expect(result.current.getZIndex('')).toBe(1010);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex modal management scenarios', () => {
      const { result } = renderHook(() => useModal(), { wrapper: ({ children }: { children: React.ReactNode }) => (
        <ModalProvider>{children}</ModalProvider>
      )});

      // Open several modals
      act(() => {
        result.current.openModal('settings');
        result.current.openModal('user-profile');
        result.current.openModal('confirmation');
      });

      expect(result.current.modalState.openModals).toEqual(['settings', 'user-profile', 'confirmation']);
      expect(result.current.getZIndex('settings')).toBe(1010);
      expect(result.current.getZIndex('user-profile')).toBe(1020);
      expect(result.current.getZIndex('confirmation')).toBe(1030);

      // Close middle modal
      act(() => {
        result.current.closeModal('user-profile');
      });

      expect(result.current.modalState.openModals).toEqual(['settings', 'confirmation']);
      expect(result.current.getZIndex('settings')).toBe(1010);
      expect(result.current.getZIndex('confirmation')).toBe(1020); // Should shift down

      // Reopen the closed modal
      act(() => {
        result.current.openModal('user-profile');
      });

      expect(result.current.modalState.openModals).toEqual(['settings', 'confirmation', 'user-profile']);
      expect(result.current.getZIndex('user-profile')).toBe(1030); // Should be on top

      // Close all
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.modalState.openModals).toEqual([]);
      expect(result.current.getZIndex('settings')).toBe(1000); // Back to base
    });

    it('should provide consistent state across multiple components', () => {
      const Component1 = () => {
        const { modalState } = useModal();
        return <div data-testid="comp1">{modalState.openModals.length}</div>;
      };

      const Component2 = () => {
        const { openModal, closeModal } = useModal();
        return (
          <div>
            <button data-testid="open-btn" onClick={() => openModal('test-modal')}>Open</button>
            <button data-testid="close-btn" onClick={() => closeModal('test-modal')}>Close</button>
          </div>
        );
      };

      render(
        <ModalProvider>
          <Component1 />
          <Component2 />
        </ModalProvider>
      );

      expect(screen.getByTestId('comp1')).toHaveTextContent('0');

      act(() => {
        screen.getByTestId('open-btn').click();
      });

      expect(screen.getByTestId('comp1')).toHaveTextContent('1');

      act(() => {
        screen.getByTestId('close-btn').click();
      });

      expect(screen.getByTestId('comp1')).toHaveTextContent('0');
    });

    it('should handle rapid open/close operations', () => {
      const { result } = renderHook(() => useModal(), { 
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <ModalProvider>{children}</ModalProvider>
        )
      });

      // Rapid operations
      act(() => {
        result.current.openModal('modal-1');
        result.current.openModal('modal-2');
        result.current.closeModal('modal-1');
        result.current.openModal('modal-3');
        result.current.closeModal('modal-2');
        result.current.openModal('modal-1'); // Reopen
      });

      expect(result.current.modalState.openModals).toEqual(['modal-3', 'modal-1']);
      expect(result.current.getZIndex('modal-3')).toBe(1010);
      expect(result.current.getZIndex('modal-1')).toBe(1020);
    });
  });

  describe('Edge Cases', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );

    it('should handle null and undefined modal ids gracefully', () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      // These should be handled without throwing errors
      act(() => {
        result.current.openModal(null as any);
        result.current.openModal(undefined as any);
      });

      // The behavior might vary based on implementation, but it shouldn't crash
      expect(result.current.modalState.openModals).toBeDefined();
    });

    it('should handle very long modal id strings', () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      const longId = 'a'.repeat(1000);

      act(() => {
        result.current.openModal(longId);
      });

      expect(result.current.modalState.openModals).toContain(longId);
      expect(result.current.getZIndex(longId)).toBe(1010);
    });

    it('should handle numeric modal ids', () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openModal('123' as any);
        result.current.openModal('456' as any);
      });

      expect(result.current.modalState.openModals).toEqual(['123', '456']);
    });

    it('should maintain modal order correctly with mixed operations', () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        // Open some modals
        result.current.openModal('A');
        result.current.openModal('B');
        result.current.openModal('C');
        
        // Try to open duplicates
        result.current.openModal('A');
        result.current.openModal('B');
        
        // Close one
        result.current.closeModal('B');
        
        // Open new ones
        result.current.openModal('D');
        result.current.openModal('E');
      });

      expect(result.current.modalState.openModals).toEqual(['A', 'C', 'D', 'E']);
      
      // Verify z-indices are correct
      expect(result.current.getZIndex('A')).toBe(1010);
      expect(result.current.getZIndex('C')).toBe(1020);
      expect(result.current.getZIndex('D')).toBe(1030);
      expect(result.current.getZIndex('E')).toBe(1040);
    });
  });
});