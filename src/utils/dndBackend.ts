import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';
import logger from './logger';

// Custom transition for touch devices
const touchTransition = {
  ...TouchTransition,
  // Only use touch backend on actual touch devices
  check: (event: any) => {
    logger.debug('Touch transition check', { hasTouches: event.touches != null });
    return event.touches != null;
  }
};

// Multi-backend configuration that works well for construction scheduler
export const dndBackendOptions = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
      // Add mouse-specific options
      options: {
        enableMouseEvents: true,
      }
    },
    {
      id: 'touch',
      backend: TouchBackend,
      transition: touchTransition,
      preview: true,
      // Touch-specific options for better mobile experience
      options: {
        enableMouseEvents: false,
        delayTouchStart: 150, // Reduced delay for better responsiveness
        delayMouseStart: 0,
        touchSlop: 12, // Reduced slop for more responsive dragging
        ignoreContextMenu: true,
        enableHoverOutsideTarget: false,
        enableKeyboardEvents: false,
        // Add momentum scrolling support
        scrollAngleRanges: [
          { start: -45, end: 45 },
          { start: 135, end: 225 }
        ]
      }
    }
  ]
};

// Custom drag layer for better mobile preview
export const getDragLayerStyles = (isDragging: boolean, currentOffset: any) => {
  if (!isDragging || !currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px) scale(1.05)`;
  
  return {
    transform,
    WebkitTransform: transform,
    pointerEvents: 'none',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    zIndex: 9999,
    opacity: 0.8,
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  };
};

// Helper to determine if device supports touch
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Custom drag source options for mobile
export const getMobileDragSourceOptions = () => ({
  dropEffect: 'move' as const,
  effectAllowed: 'move' as const,
});

// Custom drop target options for mobile
export const getMobileDropTargetOptions = () => ({
  hover: false, // Disable hover on mobile for better performance
});