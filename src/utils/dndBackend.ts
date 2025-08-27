import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';
import logger from './logger';

// Custom HTML5Backend that allows shift+drag for second job assignments
class ShiftDragHTML5Backend {
  private html5Backend: HTML5Backend;
  private manager: any;
  private context: any;
  private options: any;

  constructor(manager: any, context: any, options: any) {
    // Create the original HTML5Backend instance
    this.html5Backend = new HTML5Backend(manager, context, options);
    
    // Store references for delegation
    this.manager = manager;
    this.context = context;
    this.options = options;
    
    // Override the handleTopDragStartCapture method to allow shift key
    this.setupShiftDragOverride();
  }

  // Delegate all methods to the original backend
  setup() {
    return this.html5Backend.setup();
  }

  teardown() {
    return this.html5Backend.teardown();
  }

  connectDragSource(sourceId: any, node: any, options: any) {
    return this.html5Backend.connectDragSource(sourceId, node, options);
  }

  connectDragPreview(previewId: any, node: any, options: any) {
    return this.html5Backend.connectDragPreview(previewId, node, options);
  }

  connectDropTarget(targetId: any, node: any, options: any) {
    return this.html5Backend.connectDropTarget(targetId, node, options);
  }

  // Custom method to override shift key handling
  setupShiftDragOverride() {
    // Try to override React DnD's modifier key check more safely
    try {
      const backend = this.html5Backend as any;
      
      // Check if the method exists before trying to override it
      if (backend.handleTopDragStartCapture) {
        const originalHandler = backend.handleTopDragStartCapture.bind(backend);
        
        backend.handleTopDragStartCapture = (e: DragEvent) => {
          if (e.shiftKey) {
            logger.debug('🔧 Intercepting shift+drag to allow it');
            
            // Create a modified event that looks like it doesn't have shift pressed
            const modifiedEvent = new Proxy(e, {
              get(target, prop) {
                if (prop === 'shiftKey') {
                  return false; // Tell React DnD that shift isn't pressed
                }
                return (target as any)[prop];
              }
            });
            
            return originalHandler(modifiedEvent);
          }
          
          return originalHandler(e);
        };
      }
    } catch (error) {
      logger.warn('Failed to override shift+drag behavior:', error);
    }
  }
}

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
        // Override React DnD's default behavior to allow shift+drag
        ignoreContextMenu: false,
        // Custom option to bypass modifier key restrictions
        getDropTargetElementsAtPoint: undefined,
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