---
title: Drag and Drop System
category: features
tags: [drag-drop, react-dnd, magnets, assignments]
related: [/04-features/magnet-system.md, /04-features/real-time-sync.md]
last-updated: 2025-08-29
---

# Drag and Drop System

## Quick Answer
BoardOS implements a sophisticated drag-and-drop system using react-dnd for desktop and custom touch handlers for mobile, featuring magnetic attachments, multi-shift assignments, and real-time synchronization.

## Overview

The drag-and-drop system is the core interaction model for BoardOS, allowing users to intuitively assign resources to jobs, create relationships between resources, and manage complex scheduling scenarios with simple gestures.

## Core Architecture

### Technology Stack

```typescript
// Desktop drag implementation
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

// Multi-backend support
const backend = isMobile ? TouchBackend : HTML5Backend;
```

### Drag Types

```typescript
enum ItemTypes {
  RESOURCE = 'resource',
  ASSIGNMENT = 'assignment',
  MAGNET = 'magnet',
  TEMPLATE = 'template'
}

interface DragItem {
  type: ItemTypes;
  id: string;
  resourceId: string;
  assignmentId?: string;
  sourceJobId?: string;
  isCtrlPressed?: boolean;
}
```

## Desktop Drag and Drop

### Resource Card Dragging

```typescript
const ResourceCard: React.FC<{ resource: Resource }> = ({ resource }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.RESOURCE,
    item: {
      type: ItemTypes.RESOURCE,
      id: resource.id,
      resourceId: resource.id
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div 
      ref={drag}
      className={`resource-card ${isDragging ? 'opacity-50' : ''}`}
    >
      {resource.name}
    </div>
  );
};
```

### Job Drop Zone

```typescript
const JobColumn: React.FC<{ job: Job }> = ({ job }) => {
  const { assignResource } = useScheduler();
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.RESOURCE, ItemTypes.ASSIGNMENT],
    
    canDrop: (item: DragItem) => {
      // Business rule validation
      return validateDropRules(item.resourceId, job.type);
    },
    
    drop: async (item: DragItem, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) return;
      
      // Handle different drop scenarios
      if (item.type === ItemTypes.RESOURCE) {
        await assignResource(item.resourceId, job.id, 'Equipment');
      } else if (item.type === ItemTypes.ASSIGNMENT) {
        await moveAssignment(item.assignmentId, job.id);
      }
    },
    
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <div 
      ref={drop}
      className={`job-column ${isOver ? 'bg-blue-50' : ''} ${canDrop ? 'border-green-500' : ''}`}
    >
      {/* Job content */}
    </div>
  );
};
```

## Mobile Touch Implementation

### Touch Event Handling

```typescript
const MobileResourceCard: React.FC = ({ resource }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setPosition({ x: touch.clientX, y: touch.clientY });
    
    // Visual feedback
    e.currentTarget.classList.add('dragging');
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    setPosition({ x: touch.clientX, y: touch.clientY });
    
    // Update drag preview position
    updateDragPreview(touch.clientX, touch.clientY);
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const dropTarget = document.elementFromPoint(
      position.x,
      position.y
    );
    
    // Find job container and execute drop
    const jobElement = dropTarget?.closest('.job-column');
    if (jobElement) {
      const jobId = jobElement.dataset.jobId;
      handleDrop(resource.id, jobId);
    }
    
    setIsDragging(false);
    e.currentTarget.classList.remove('dragging');
  };
  
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="touch-resource-card"
    >
      {resource.name}
    </div>
  );
};
```

### Mobile Drag Layer

```typescript
const MobileDragLayer: React.FC = () => {
  const { isMobile } = useMobileContext();
  const { draggedItem, position } = useDragContext();
  
  if (!isMobile || !draggedItem) return null;
  
  return (
    <Portal>
      <div
        className="mobile-drag-preview"
        style={{
          position: 'fixed',
          left: position.x - 50,
          top: position.y - 25,
          pointerEvents: 'none',
          zIndex: 1000,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <ResourceCard resource={draggedItem} />
      </div>
    </Portal>
  );
};
```

## Magnetic Attachment System

### Drop with Attachment

```typescript
const EquipmentDropZone: React.FC = ({ equipment, job }) => {
  const { attachResources } = useScheduler();
  
  const [, drop] = useDrop({
    accept: ItemTypes.RESOURCE,
    
    canDrop: (item: DragItem) => {
      const resource = getResource(item.resourceId);
      // Check if operator can attach to equipment
      return resource.type === 'operator' && 
             canAttachToEquipment(resource, equipment);
    },
    
    drop: async (item: DragItem) => {
      // Create assignment with automatic attachment
      await attachResources(item.resourceId, equipment.id, job.id);
    }
  });
  
  return (
    <div ref={drop} className="equipment-drop-zone">
      {equipment.name}
      <div className="attachment-indicator">
        Drop operator here to attach
      </div>
    </div>
  );
};
```

## Multi-Shift Assignments

### Ctrl+Drag for Second Shift

```typescript
const AssignmentCard: React.FC = ({ assignment }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ASSIGNMENT,
    
    item: (monitor) => {
      const isCtrlPressed = monitor.getInitialClientOffset() && 
                           window.event?.ctrlKey;
      
      return {
        type: ItemTypes.ASSIGNMENT,
        id: assignment.id,
        resourceId: assignment.resourceId,
        sourceJobId: assignment.jobId,
        isCtrlPressed // Flag for copy vs move
      };
    },
    
    end: async (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (!dropResult) return;
      
      if (item.isCtrlPressed) {
        // Create second shift (copy)
        await createSecondShift(
          item.resourceId,
          dropResult.jobId,
          'night'
        );
      } else {
        // Move assignment
        await moveAssignment(
          item.id,
          dropResult.jobId
        );
      }
    }
  });
  
  return (
    <div ref={drag} className="assignment-card">
      {/* Assignment content */}
    </div>
  );
};
```

## Visual Feedback System

### Drop Indicators

```typescript
const DropIndicator: React.FC<{ state: DropState }> = ({ state }) => {
  const getIndicatorClass = () => {
    switch (state) {
      case 'valid':
        return 'border-2 border-green-500 bg-green-50';
      case 'invalid':
        return 'border-2 border-red-500 bg-red-50';
      case 'hovering':
        return 'border-2 border-blue-500 bg-blue-50';
      default:
        return '';
    }
  };
  
  return <div className={`drop-indicator ${getIndicatorClass()}`} />;
};
```

### Drag Preview Customization

```typescript
const CustomDragPreview: React.FC = ({ item }) => {
  return (
    <div className="custom-drag-preview">
      <div className="preview-card">
        <Icon type={item.type} />
        <span>{item.name}</span>
        <Badge count={item.attachments?.length} />
      </div>
    </div>
  );
};

// Usage in drag configuration
useDrag({
  preview: (monitor) => <CustomDragPreview item={monitor.getItem()} />
});
```

## Optimistic Updates

### Immediate UI Feedback

```typescript
const OptimisticDragHandler = () => {
  const { assignments, setAssignments } = useScheduler();
  
  const handleDrop = async (item: DragItem, targetJobId: string) => {
    // 1. Create optimistic assignment
    const tempAssignment = {
      id: `temp-${Date.now()}`,
      resourceId: item.resourceId,
      jobId: targetJobId,
      row: 'Equipment',
      _isOptimistic: true
    };
    
    // 2. Update UI immediately
    setAssignments(prev => [...prev, tempAssignment]);
    
    try {
      // 3. Perform actual database operation
      const realAssignment = await DatabaseService.assignResource(
        item.resourceId,
        targetJobId,
        'Equipment'
      );
      
      // 4. Replace optimistic with real data
      setAssignments(prev => 
        prev.map(a => 
          a.id === tempAssignment.id ? realAssignment : a
        )
      );
    } catch (error) {
      // 5. Rollback on error
      setAssignments(prev => 
        prev.filter(a => a.id !== tempAssignment.id)
      );
      
      showError('Failed to assign resource');
    }
  };
};
```

## Business Rule Validation

### Drop Rules Engine

```typescript
interface DropRule {
  rowType: RowType;
  allowedTypes: ResourceType[];
  validate: (resource: Resource, job: Job) => boolean;
}

const dropRulesEngine = {
  canDrop(resource: Resource, job: Job, rowType: RowType): boolean {
    // 1. Check row-specific rules
    const rowRule = dropRules.find(r => r.rowType === rowType);
    if (!rowRule.allowedTypes.includes(resource.type)) {
      return false;
    }
    
    // 2. Check job-specific rules
    if (job.type === 'milling' && resource.type === 'paver') {
      return false; // Pavers can't work on milling jobs
    }
    
    // 3. Check capacity limits
    const currentAssignments = getJobAssignments(job.id);
    if (currentAssignments.length >= job.maxResources) {
      return false;
    }
    
    // 4. Check time conflicts
    if (hasTimeConflict(resource, job)) {
      return false;
    }
    
    return true;
  }
};
```

## Advanced Drag Scenarios

### Group Dragging

```typescript
const GroupDrag: React.FC = ({ magnetGroup }) => {
  const [, drag] = useDrag({
    type: ItemTypes.GROUP,
    
    item: {
      type: ItemTypes.GROUP,
      assignments: magnetGroup.assignments,
      mainResource: magnetGroup.mainResource,
      attachments: magnetGroup.attachments
    },
    
    end: async (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (!dropResult) return;
      
      // Move entire group atomically
      await DatabaseService.moveAssignmentGroup(
        item.assignments,
        dropResult.jobId
      );
    }
  });
  
  return (
    <div ref={drag} className="magnet-group">
      {/* Group visualization */}
    </div>
  );
};
```

### Cross-Container Dragging

```typescript
const CrossContainerDrag = () => {
  const handleDragBetweenContainers = (
    item: DragItem,
    sourceContainer: string,
    targetContainer: string
  ) => {
    // Handle different container types
    switch (`${sourceContainer}->${targetContainer}`) {
      case 'available->assigned':
        return assignResource(item.resourceId);
        
      case 'assigned->available':
        return unassignResource(item.assignmentId);
        
      case 'dayShift->nightShift':
        return changeShift(item.assignmentId, 'night');
        
      default:
        return moveWithinContainer(item, targetContainer);
    }
  };
};
```

## Performance Optimizations

### Drag Throttling

```typescript
const ThrottledDragMove = () => {
  const throttledMove = useThrottle((x: number, y: number) => {
    updateDragPreview(x, y);
  }, 16); // 60fps
  
  const handleDragMove = (e: DragEvent) => {
    throttledMove(e.clientX, e.clientY);
  };
};
```

### Virtual Scrolling During Drag

```typescript
const AutoScrollOnDrag = () => {
  const scrollContainer = useRef<HTMLDivElement>(null);
  
  const handleDragOver = (e: DragEvent) => {
    const container = scrollContainer.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const scrollZone = 50; // pixels from edge
    
    // Auto-scroll up
    if (e.clientY < rect.top + scrollZone) {
      container.scrollTop -= 10;
    }
    
    // Auto-scroll down
    if (e.clientY > rect.bottom - scrollZone) {
      container.scrollTop += 10;
    }
  };
};
```

## Accessibility Features

### Keyboard Navigation

```typescript
const KeyboardDraggable: React.FC = ({ resource }) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      // Start keyboard drag mode
      enterDragMode(resource);
    }
  };
  
  const handleArrowKeys = (e: KeyboardEvent) => {
    if (!isInDragMode) return;
    
    switch (e.key) {
      case 'ArrowUp':
        moveDragPreview(0, -1);
        break;
      case 'ArrowDown':
        moveDragPreview(0, 1);
        break;
      case 'Enter':
        completeDrag();
        break;
      case 'Escape':
        cancelDrag();
        break;
    }
  };
};
```

## Integration with Real-Time Updates

### Conflict Resolution

```typescript
const RealTimeDragSync = () => {
  const handleRemoteAssignmentChange = (change: AssignmentChange) => {
    // Check if we're currently dragging this resource
    if (isDragging(change.resourceId)) {
      // Show conflict indicator
      showConflictWarning('Resource was modified by another user');
      
      // Cancel current drag or merge changes
      if (change.type === 'delete') {
        cancelDrag();
      } else {
        mergeChanges(change);
      }
    }
  };
};
```

This drag-and-drop system provides intuitive resource management with comprehensive business rule validation, multi-platform support, and real-time synchronization capabilities.