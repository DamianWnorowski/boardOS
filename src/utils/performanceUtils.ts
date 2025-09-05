import React from 'react';
import { useMemo, useCallback, useRef } from 'react';

/**
 * Performance optimization utilities
 */

/**
 * Debounce hook for search inputs
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Memoized callback that only changes when dependencies change
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef(callback);
  
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, deps) as T;
};

/**
 * Memoized filter for large arrays
 */
export const useMemoizedFilter = <T>(
  array: T[],
  filterFn: (item: T) => boolean,
  deps: React.DependencyList
): T[] => {
  return useMemo(() => {
    return array.filter(filterFn);
  }, [array, ...deps]);
};

/**
 * Virtualization helper for large lists
 */
export const useVirtualization = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      itemCount
    );
    
    return {
      startIndex: Math.max(0, startIndex),
      endIndex,
      visibleCount: endIndex - startIndex
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount]);
  
  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    onScroll,
    totalHeight: itemCount * itemHeight,
    offsetY: visibleItems.startIndex * itemHeight
  };
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  React.useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      if (timeSinceLastRender < 16) { // Less than 60fps
        console.warn(`${componentName} rendering too frequently:`, {
          renderCount: renderCount.current,
          timeSinceLastRender
        });
      }
    }
    
    lastRenderTime.current = now;
  });
  
  return {
    renderCount: renderCount.current
  };
};