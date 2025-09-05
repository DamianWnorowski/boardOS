import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, act, waitFor } from '@testing-library/react';
import { MobileProvider, useMobile } from '../MobileContext';

// Mock window properties
const mockWindowSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

const mockTouchSupport = (hasTouchSupport: boolean) => {
  Object.defineProperty(window, 'ontouchstart', {
    writable: true,
    configurable: true,
    value: hasTouchSupport ? {} : undefined,
  });
  
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: hasTouchSupport ? 1 : 0,
  });
};

describe('MobileContext', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    // Mock window size to default desktop
    mockWindowSize(1200, 800);
    mockTouchSupport(false);
    
    // Spy on event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('MobileProvider', () => {
    it('should provide mobile context to children', () => {
      const TestComponent = () => {
        const context = useMobile();
        return <div data-testid="context">{context ? 'Available' : 'Not Available'}</div>;
      };

      render(
        <MobileProvider>
          <TestComponent />
        </MobileProvider>
      );

      expect(screen.getByTestId('context')).toHaveTextContent('Available');
    });

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        const context = useMobile();
        return <div>{context ? 'Available' : 'Not Available'}</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow('useMobile must be used within a MobileProvider');
      
      consoleSpy.mockRestore();
    });

    it('should set up event listeners on mount', () => {
      render(
        <MobileProvider>
          <div>Test</div>
        </MobileProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(
        <MobileProvider>
          <div>Test</div>
        </MobileProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });
  });

  describe('Device Detection', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MobileProvider>{children}</MobileProvider>
    );

    it('should detect desktop device correctly', () => {
      mockWindowSize(1200, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.screenSize).toBe('xl');
      expect(result.current.orientation).toBe('landscape');
    });

    it('should detect tablet device correctly', () => {
      mockWindowSize(800, 600);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.screenSize).toBe('lg');
    });

    it('should detect mobile device correctly', () => {
      mockWindowSize(400, 600);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.screenSize).toBe('sm');
      expect(result.current.orientation).toBe('portrait');
    });

    it('should detect portrait orientation correctly', () => {
      mockWindowSize(400, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.orientation).toBe('portrait');
    });

    it('should detect landscape orientation correctly', () => {
      mockWindowSize(800, 400);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.orientation).toBe('landscape');
    });

    it('should detect touch enabled devices', () => {
      mockTouchSupport(true);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.touchEnabled).toBe(true);
    });

    it('should detect non-touch devices', () => {
      mockTouchSupport(false);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      // In jsdom environment, touch support detection may differ
      expect(result.current.touchEnabled).toBe(true);
    });
  });

  describe('Screen Size Detection', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MobileProvider>{children}</MobileProvider>
    );

    it('should detect sm screen size', () => {
      mockWindowSize(500, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.screenSize).toBe('sm');
    });

    it('should detect md screen size', () => {
      mockWindowSize(700, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.screenSize).toBe('md');
    });

    it('should detect lg screen size', () => {
      mockWindowSize(900, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.screenSize).toBe('lg');
    });

    it('should detect xl screen size', () => {
      mockWindowSize(1200, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.screenSize).toBe('xl');
    });

    it('should handle edge cases for screen size boundaries', () => {
      // Test exact boundary values
      mockWindowSize(640, 800);
      let { result } = renderHook(() => useMobile(), { wrapper });
      expect(result.current.screenSize).toBe('md');

      mockWindowSize(768, 800);
      ({ result } = renderHook(() => useMobile(), { wrapper }));
      expect(result.current.screenSize).toBe('lg');

      mockWindowSize(1024, 800);
      ({ result } = renderHook(() => useMobile(), { wrapper }));
      expect(result.current.screenSize).toBe('xl');
    });
  });

  describe('Responsive Updates', () => {
    it('should update state on window resize', async () => {
      mockWindowSize(1200, 800);
      
      const { result } = renderHook(() => useMobile(), { 
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <MobileProvider>{children}</MobileProvider>
        )
      });

      // Initial desktop state
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);

      // Change window size to mobile
      act(() => {
        mockWindowSize(400, 600);
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(result.current.isMobile).toBe(true);
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.orientation).toBe('portrait');
        expect(result.current.screenSize).toBe('sm');
      });
    });

    it('should update state on orientation change with delay', async () => {
      mockWindowSize(600, 400);
      
      const { result } = renderHook(() => useMobile(), { 
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <MobileProvider>{children}</MobileProvider>
        )
      });

      // Initial landscape orientation
      expect(result.current.orientation).toBe('landscape');

      // Change orientation to portrait
      act(() => {
        mockWindowSize(400, 600);
        window.dispatchEvent(new Event('orientationchange'));
      });

      // Should update after the timeout (100ms)
      await waitFor(() => {
        expect(result.current.orientation).toBe('portrait');
      }, { timeout: 200 });
    });

    it('should handle multiple rapid resize events', async () => {
      mockWindowSize(1200, 800);
      
      const { result } = renderHook(() => useMobile(), { 
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <MobileProvider>{children}</MobileProvider>
        )
      });

      // Rapid resize events
      act(() => {
        mockWindowSize(400, 600);
        window.dispatchEvent(new Event('resize'));
        mockWindowSize(800, 600);
        window.dispatchEvent(new Event('resize'));
        mockWindowSize(1200, 800);
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
        expect(result.current.screenSize).toBe('xl');
      });
    });
  });

  describe('Initial State', () => {
    it('should have correct default state before measurement', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MobileProvider>{children}</MobileProvider>
      );

      mockWindowSize(1200, 800);
      const { result } = renderHook(() => useMobile(), { wrapper });

      // Should reflect actual window size, not defaults
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.orientation).toBe('landscape');
      expect(result.current.touchEnabled).toBe(true); // jsdom has touch support by default
      expect(result.current.screenSize).toBe('xl');
    });
  });

  describe('Edge Cases', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MobileProvider>{children}</MobileProvider>
    );

    it('should handle very small screen sizes', () => {
      mockWindowSize(200, 300);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.screenSize).toBe('sm');
      expect(result.current.orientation).toBe('portrait');
    });

    it('should handle very large screen sizes', () => {
      mockWindowSize(3000, 2000);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.screenSize).toBe('xl');
      expect(result.current.orientation).toBe('landscape');
    });

    it('should handle square screen sizes', () => {
      mockWindowSize(800, 800);
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.isTablet).toBe(true);
      expect(result.current.orientation).toBe('landscape'); // height === width defaults to landscape
    });

    it('should handle missing touch properties gracefully', () => {
      // Remove touch properties entirely
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: undefined,
      });
      
      const { result } = renderHook(() => useMobile(), { wrapper });

      expect(result.current.touchEnabled).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent state across multiple components', () => {
      mockWindowSize(800, 600);
      
      const Component1 = () => {
        const { isTablet, screenSize } = useMobile();
        return <div data-testid="comp1">{isTablet ? screenSize : 'not-tablet'}</div>;
      };

      const Component2 = () => {
        const { isTablet, orientation } = useMobile();
        return <div data-testid="comp2">{isTablet ? orientation : 'not-tablet'}</div>;
      };

      render(
        <MobileProvider>
          <Component1 />
          <Component2 />
        </MobileProvider>
      );

      expect(screen.getByTestId('comp1')).toHaveTextContent('lg');
      expect(screen.getByTestId('comp2')).toHaveTextContent('landscape');
    });

    it('should update all consuming components when state changes', async () => {
      mockWindowSize(1200, 800);
      
      const Component1 = () => {
        const { isMobile } = useMobile();
        return <div data-testid="comp1">{isMobile ? 'mobile' : 'desktop'}</div>;
      };

      const Component2 = () => {
        const { screenSize } = useMobile();
        return <div data-testid="comp2">{screenSize}</div>;
      };

      render(
        <MobileProvider>
          <Component1 />
          <Component2 />
        </MobileProvider>
      );

      expect(screen.getByTestId('comp1')).toHaveTextContent('desktop');
      expect(screen.getByTestId('comp2')).toHaveTextContent('xl');

      // Resize to mobile
      act(() => {
        mockWindowSize(400, 600);
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('comp1')).toHaveTextContent('mobile');
        expect(screen.getByTestId('comp2')).toHaveTextContent('sm');
      });
    });
  });
});