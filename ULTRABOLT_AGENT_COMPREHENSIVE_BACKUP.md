# UltraBolt Agent - Comprehensive Backup Monofile
*Construction Scheduler Project - Complete AI Agent Instructions*

---

## 🎯 PROJECT IDENTITY & PURPOSE

**Project Name**: Construction Scheduler (boardOS / Rosemar_SiteOps)  
**Core Purpose**: Sophisticated drag-and-drop construction workforce scheduling with magnet-based resource assignment  
**Technology Stack**: React 18 + TypeScript + Supabase + Tailwind CSS + react-dnd  
**Architecture**: Context-based state management with real-time database synchronization  

**Business Domain**: Road construction, milling, paving, and maintenance operations with advanced resource optimization and safety compliance.

---

## 🏗️ COMPLETE SYSTEM ARCHITECTURE

### **Frontend Architecture**
```
src/
├── components/          # UI components (200+ lines max per file)
│   ├── board/          # Main scheduling interface
│   ├── resources/      # Resource cards and pools
│   ├── modals/         # Configuration dialogs
│   ├── mobile/         # Touch-optimized components
│   ├── layout/         # Application layout
│   └── common/         # Shared utilities (ErrorBoundary, Portal)
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
├── utils/              # Business logic utilities
├── data/               # Resource definitions and mock data
├── classes/            # Core business classes (Magnet system)
├── services/           # Database service layer
└── lib/                # External integrations (Supabase)
```

### **Database Architecture**
```sql
-- Core Tables (PostgreSQL with RLS)
users            -- Personnel profiles with auth integration
resources        -- Equipment, vehicles, personnel catalog
jobs             -- Construction projects and jobs
assignments      -- Resource-to-job mappings with attachments
magnet_interaction_rules -- Business logic rules
drop_rules       -- UI interaction permissions
job_row_configs  -- Dynamic job layout configurations
audit_logs       -- Complete change tracking
truck_driver_assignments -- Vehicle-operator relationships
```

### **State Management Pattern**
- **Primary**: React Context with `useScheduler()` hook
- **Secondary**: Zustand for performance-critical state
- **Persistence**: Supabase real-time + localStorage fallback
- **Optimization**: Memoized selectors with stable references

---

## 📋 COMPLETE BUSINESS LOGIC RULES

### **Core Resource Types**
```typescript
// Personnel (can work multiple shifts)
'operator' | 'driver' | 'striper' | 'foreman' | 'laborer' | 'privateDriver'

// Equipment (requires operators, location tracking)
'skidsteer' | 'paver' | 'excavator' | 'sweeper' | 'millingMachine' | 
'grader' | 'dozer' | 'payloader' | 'roller' | 'equipment'

// Vehicles (requires drivers, configuration tracking)
'truck' // with subtypes: 10W (tag trailers), Trac (flowboy/dump-trailer)
```

### **Job Types & Shift Management**
```typescript
// Job Types
'milling' | 'paving' | 'both' | 'drainage' | 'stripping' | 'hired' | 'other'

// Shifts (resources can work multiple)
'day' | 'night' // Double shift = both day and night

// Row Types (job organization structure)
'Forman' | 'Equipment' | 'Sweeper' | 'Tack' | 'MPT' | 'crew' | 'trucks'
```

### **Magnet Interaction Rules (Safety & Operational)**
```typescript
interface MagnetInteractionRule {
  sourceType: ResourceType;  // What attaches
  targetType: ResourceType;  // What it attaches to
  canAttach: boolean;        // Permission to attach
  isRequired?: boolean;      // Must have this attachment
  maxCount?: number;         // Maximum allowed attachments
}

// Critical Safety Rules:
- Equipment MUST have operators (paver → operator required)
- Trucks MUST have drivers (truck → driver required)
- Specialized laborers: Paver → screwman (max 2), MillingMachine → groundman (max 1)
- Equipment without operators shows warning indicators
```

### **Drop Rules (UI Interaction Control)**
```typescript
interface DropRule {
  rowType: RowType;           // Which job row
  allowedTypes: ResourceType[]; // What can be dropped here
}

// Standard Drop Rules:
- Forman row: Only foremen
- Equipment row: Equipment + operators
- Crew row: All personnel
- Trucks row: Trucks + drivers
- Sweeper row: Sweepers + operators
```

### **Assignment Logic & Time Management**
```typescript
interface Assignment {
  id: string;
  resourceId: string;
  jobId: string;
  row: RowType;
  position?: number;
  attachedTo?: string;      // Parent assignment ID
  attachments?: string[];   // Child assignment IDs
  timeSlot?: TimeSlot;     // Custom time override
  note?: string;           // Personal notes
  truckConfig?: 'flowboy' | 'dump-trailer'; // Truck configuration
}

// Time Conflict Rules:
- Resources can work multiple jobs (day + night = double shift)
- Time slots must not overlap for same resource
- Full day assignments conflict with any other assignment
- Visual indicators: Green (on-site time), Blue (yard departure time)
```

---

## 🎨 UI/UX DESIGN SYSTEM

### **Color System & Visual Indicators**
```typescript
// Resource Type Colors
const resourceColors = {
  operator: 'bg-blue-100 text-blue-800',
  driver: 'bg-green-100 text-green-800', 
  foreman: 'bg-purple-100 text-purple-800',
  laborer: 'bg-gray-100 text-gray-800',
  truck: 'bg-blue-600 text-white',
  paver: 'bg-red-100 text-red-800',
  // ... etc
};

// Shift Status Borders (Priority Order)
1. Red Border: Double shift (day + night jobs)
2. Teal Border: Multiple day jobs only  
3. Orange Border: Night shift only
4. Default Border: Single day job or unassigned
```

### **Drag & Drop System**
```typescript
// Item Types
ItemTypes.RESOURCE   // From resource pool
ItemTypes.ASSIGNMENT // Between jobs/rows

// Drag Modifiers
Ctrl+Drag = Second shift assignment (doesn't remove original)
Normal Drag = Move assignment (removes from original location)

// Visual Feedback Colors
- Blue: Normal assignment operation
- Orange: Creating double shift
- Red: Adding 3rd+ jobs (overwork warning)
- Purple: Moving existing assignments
```

### **Mobile Responsiveness**
- Touch-optimized drag and drop with `react-dnd-touch-backend`
- Separate mobile layout with tab navigation
- Gesture support for mobile interactions
- Responsive breakpoints: `sm: <640px, md: <768px, lg: <1024px, xl: ≥1024px`

---

## 🔧 COMPONENT ARCHITECTURE PATTERNS

### **Component Organization Principles**
```typescript
// File Size Limits
- Max 200 lines per component file
- Split at logical boundaries when approaching limit
- Use index.ts for barrel exports
- Separate business logic into custom hooks

// Naming Conventions
- Components: PascalCase (MagnetCard.tsx)
- Hooks: camelCase with 'use' prefix (useMagnet.ts) 
- Utils: camelCase (timeUtils.ts)
- Types: PascalCase interfaces
- Constants: UPPER_SNAKE_CASE
```

### **Key Component Patterns**
```typescript
// Resource Pool Component Pattern
<ResourceCard 
  resource={resource}
  isDragging={boolean}
  isDisabled={boolean}
  onPersonClick={() => handleClick}
  showDoubleShift={boolean}
/>

// Assignment Display Pattern  
<AssignmentCard 
  assignment={assignment}
  onOpenPersonModal={(assignment) => openModal}
/>

// Modal Pattern with Portal
<Portal>
  <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]">
    <div className="bg-white rounded-lg shadow-xl">
      {/* Modal content */}
    </div>
  </div>
</Portal>
```

### **Error Boundary Implementation**
```typescript
// Every major component section wrapped in ErrorBoundary
<ErrorBoundary fallback={<ErrorMessage />}>
  <ComponentSection />
</ErrorBoundary>

// Development vs Production error display
- Development: Full error details with stack trace
- Production: User-friendly error messages with retry options
```

---

## 💾 DATABASE DESIGN & INTEGRATION

### **Current Schema Extensions Needed**
```sql
-- Extend users table for complete personnel management
ALTER TABLE users ADD COLUMN phone_numbers JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN addresses JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN emergency_contact JSONB;
ALTER TABLE users ADD COLUMN employment_details JSONB;
ALTER TABLE users ADD COLUMN performance_reviews JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN training_records JSONB DEFAULT '[]';

-- Add equipment maintenance tracking
CREATE TABLE equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id),
  maintenance_type VARCHAR(100),
  scheduled_date DATE,
  completed_date DATE,
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add project financial tracking  
CREATE TABLE project_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  budget DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  labor_cost DECIMAL(15,2),
  equipment_cost DECIMAL(15,2),
  material_cost DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### **Real-time Subscription Patterns**
```typescript
// Subscribe to all table changes for live updates
useEffect(() => {
  const channels = [
    supabase.channel('assignments').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'assignments' }, 
      handleAssignmentChange
    ),
    supabase.channel('resources').on('postgres_changes',
      { event: '*', schema: 'public', table: 'resources' },
      handleResourceChange  
    ),
    // ... more subscriptions
  ];
  
  channels.forEach(channel => channel.subscribe());
  return () => channels.forEach(channel => supabase.removeChannel(channel));
}, []);
```

### **Edge Functions for Complex Operations**
```typescript
// Supabase Edge Functions for business logic
/supabase/functions/
├── assign-resource/     # Complex assignment validation
├── move-assignment-group/ # Atomic group movements  
├── validate-rules/      # Business rule validation
├── generate-reports/    # Job report generation
└── send-notifications/  # SMS/email crew notifications
```

---

## 🧪 TESTING STRATEGY & PATTERNS

### **Test Architecture**
```typescript
// Test Categories
├── Unit Tests          # Business logic, utilities
├── Component Tests     # UI behavior, interactions
├── Integration Tests   # Context providers, hooks
├── E2E Tests          # Critical user workflows
└── Database Tests     # Edge functions, RLS policies

// Test Utilities
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createTestContext } from './test-utils';

// Mock Patterns
vi.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, vi.fn()]
}));
```

### **Critical Test Scenarios**
```typescript
// Must-test scenarios for any changes:
1. Drag and drop functionality across all device types
2. Magnet attachment rules enforcement  
3. Time conflict detection and prevention
4. Multi-shift assignment logic
5. Real-time synchronization
6. Mobile touch interactions
7. Database constraint validation
8. Business rule compliance
9. Error handling and recovery
10. Performance under load
```

---

## 🚀 DEPLOYMENT & ENVIRONMENT MANAGEMENT

### **Environment Configuration**
```env
# Required Environment Variables
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Development Settings
NODE_ENV=development
VITE_LOG_LEVEL=debug

# Production Settings
NODE_ENV=production
VITE_LOG_LEVEL=error
```

### **Build & Deployment Pipeline**
```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server with HMR
npm test            # Run test suite
npm run lint        # Code quality checks

# Production
npm run build       # Optimized production build
npm run preview     # Test production build locally
```

### **Database Migration Strategy**
```sql
-- Migration file naming: descriptive_name.sql
-- Always use IF NOT EXISTS for safety
-- Include comprehensive comments
-- Enable RLS on all new tables
-- Add appropriate indexes
-- Include audit triggers
```

---

## 🎮 AI AGENT COMMAND PROTOCOLS

### **Core Development Commands**

#### **Component Creation Command**
```
AI Command: Create a new [ComponentType] component for [Purpose]
Requirements:
- Follow existing component patterns
- Include proper TypeScript typing
- Add error boundary wrapper
- Implement responsive design
- Add relevant tests
- Document props interface
- Use logger for debug output
- Follow color system guidelines
```

#### **Business Logic Extension Command**
```
AI Command: Extend business logic for [Feature]
Requirements:
- Update type definitions first
- Add database schema changes if needed
- Implement service layer functions
- Add context actions
- Update UI components
- Add comprehensive tests
- Document business rules
- Validate against existing rules
```

#### **Database Schema Update Command**
```
AI Command: Update database schema for [Purpose]  
Requirements:
- Create new migration file (descriptive_name.sql)
- Include complete markdown summary
- Use IF NOT EXISTS/IF EXISTS patterns
- Enable RLS on new tables
- Add appropriate policies
- Create necessary indexes
- Update TypeScript types
- Add service layer functions
```

### **Debugging & Troubleshooting Commands**

#### **Performance Investigation Command**
```
AI Command: Investigate performance issue with [Component/Feature]
Steps:
1. Check component re-render patterns
2. Verify memoization usage
3. Analyze database query efficiency  
4. Review real-time subscription load
5. Check mobile touch performance
6. Validate memory usage patterns
7. Recommend optimizations
```

#### **Business Rule Validation Command**  
```
AI Command: Validate business rules for [Scenario]
Steps:
1. Check magnet interaction rules
2. Verify drop rule consistency
3. Test time conflict detection
4. Validate assignment constraints
5. Check safety requirement compliance
6. Test edge cases and error conditions
7. Document rule interactions
```

---

## 🔐 SECURITY & COMPLIANCE PROTOCOLS

### **Row Level Security (RLS) Implementation**
```sql
-- All tables MUST have RLS enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Standard policy patterns
CREATE POLICY "Users can read all data" ON table_name
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Foremen and admins can modify" ON table_name  
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('foreman', 'admin')
    )
  );
```

### **Data Validation Protocols**
```typescript
// Input sanitization patterns
const sanitizeInput = (input: string) => {
  return input.trim().replace(/[<>]/g, '');
};

// Business rule validation
const validateAssignment = (resourceId, jobId, row) => {
  // Check drop rules
  // Check magnet interaction rules  
  // Check time conflicts
  // Check capacity limits
  // Return validation result
};
```

---

## 🎯 SPECIALIZED COMPONENT PROTOCOLS

### **Drag & Drop Implementation Protocol**
```typescript
// Standard drag source pattern
const [{ isDragging }, drag] = useDrag({
  type: ItemTypes.RESOURCE,
  item: (monitor) => {
    const isCtrlHeld = getIsCtrlHeld();
    return { 
      type: ItemTypes.RESOURCE,
      resource,
      isSecondShift: isCtrlHeld
    };
  },
  collect: (monitor) => ({
    isDragging: monitor.isDragging()
  })
});

// Standard drop target pattern
const [{ isOver, canDrop }, drop] = useDrop({
  accept: [ItemTypes.RESOURCE, ItemTypes.ASSIGNMENT],
  canDrop: (item) => {
    // Check drop rules
    // Check business constraints
    // Return boolean
  },
  drop: (item) => {
    // Handle assignment creation
    // Update database
    // Return drop result
  },
  collect: (monitor) => ({
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
  })
});
```

### **Modal Management Protocol**
```typescript
// Standard modal pattern with Portal
const Modal = ({ onClose }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl">
          {/* Modal content */}
        </div>
      </div>
    </Portal>
  );
};
```

### **Resource Card Display Protocol**
```typescript
// Resource display logic
const ResourceCard = ({ resource, isDisabled, assignmentId }) => {
  // Determine display format based on type
  const isEquipment = equipmentTypes.includes(resource.type);
  const isPersonnel = personnelTypes.includes(resource.type);
  
  // Equipment: Show model and unit number
  // Personnel: Show first/last name split
  // Trucks: Show unit number and driver
  
  // Status indicators:
  // - On-site status for equipment/vehicles
  // - Double shift indicator for personnel
  // - Time indicators (blue = yard time, green = job time)
  // - Note indicators with sticky note icon
};
```

---

## 📊 DATA FLOW & STATE MANAGEMENT

### **Context Provider Hierarchy**
```typescript
// Provider nesting order (outer to inner)
<MobileProvider>          // Device detection
  <DragProvider>          // Drag state management
    <ModalProvider>       // Modal z-index management  
      <SchedulerProvider> // Main application state
        <App />
      </SchedulerProvider>
    </ModalProvider>
  </DragProvider>
</MobileProvider>
```

### **State Update Patterns**
```typescript
// Optimistic updates with rollback
const updateResource = async (resource) => {
  // Update local state immediately
  setResources(prev => prev.map(r => r.id === resource.id ? resource : r));
  
  try {
    // Sync to database
    await supabase.from('resources').update(resource).eq('id', resource.id);
  } catch (error) {
    // Rollback on error
    setResources(prev => /* restore previous state */);
    throw error;
  }
};

// Batch updates for performance
const batchUpdateAssignments = (updates) => {
  setAssignments(prev => {
    const updated = [...prev];
    updates.forEach(update => {
      const index = updated.findIndex(a => a.id === update.id);
      if (index !== -1) updated[index] = update;
    });
    return updated;
  });
};
```

---

## 🎛️ ADVANCED FEATURES & CUSTOMIZATION

### **Rule Engine Customization**
```typescript
// Dynamic rule creation based on available resources
const createDynamicRules = (availableResourceTypes) => {
  const ruleCreator = new MagnetRuleCreator();
  
  availableResourceTypes.forEach(type => {
    if (equipmentTypes.includes(type)) {
      ruleCreator.addRequiredOperator(type);
    }
    if (type === 'truck') {
      ruleCreator.addRequiredDriver(type);
    }
  });
  
  return ruleCreator.getRules();
};

// Rule template system
const templates = {
  standardConstruction: () => buildStandardConstructionRules(),
  pavingOperations: () => buildPavingRules(),
  millingOperations: () => buildMillingRules(),
  customProject: (config) => buildCustomRules(config)
};
```

### **Job Row Configuration System**
```typescript
// Split row layouts for complex jobs
interface JobRowConfig {
  jobId: string;
  rowType: RowType;
  isSplit: boolean;
  boxes: JobRowBox[];
}

// Box-based resource organization
interface JobRowBox {
  id: string;
  name: string;
  allowedTypes: ResourceType[];
  maxCount?: number;
  attachmentRules?: BoxAttachmentRule[];
}
```

### **Time Management System**
```typescript
// Time slot with conflict detection
interface TimeSlot {
  startTime: string;    // HH:MM format
  endTime: string;      // HH:MM format  
  isFullDay?: boolean;  // Overrides start/end times
}

// Conflict resolution strategies
1. Automatic adjustment: Shift overlapping times
2. User notification: Warn about conflicts
3. Business rule enforcement: Prevent invalid assignments
4. Visual indicators: Show conflict status
```

---

## 📱 MOBILE OPTIMIZATION PROTOCOLS

### **Touch Interaction Guidelines**
```typescript
// Touch target sizing
button, .clickable-element {
  min-height: 44px;  // iOS minimum
  min-width: 44px;   // Android minimum  
}

// Touch gesture support
const handleTouch = {
  touchStart: (e) => /* Track touch start */,
  touchMove: (e) => /* Handle drag movement */,
  touchEnd: (e) => /* Complete drag operation */
};

// Mobile-specific animations
.mobile-drag-feedback {
  transform: scale(1.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  border-radius: 8px;
}
```

### **Responsive Layout Breakpoints**
```css
/* Mobile-first approach */
.resource-grid {
  @apply grid-cols-2;      /* Mobile default */
  @screen md {
    @apply grid-cols-3;    /* Tablet */
  }
  @screen lg {
    @apply grid-cols-4;    /* Desktop */
  }
}
```

---

## 🔍 TROUBLESHOOTING & DEBUG PROTOCOLS

### **Common Issue Resolution**
```typescript
// Drag and drop not working
1. Check backend configuration in dndBackend.ts
2. Verify touch detection for mobile devices
3. Check item type compatibility
4. Validate drop target canDrop logic
5. Review z-index conflicts

// Business rules not enforcing  
1. Verify rule definitions in context
2. Check database rule synchronization
3. Validate rule evaluation logic
4. Test rule priority and conflicts
5. Check user permission levels

// Performance issues
1. Check component re-render patterns
2. Review memoization usage
3. Analyze database query performance
4. Check real-time subscription load
5. Validate mobile touch responsiveness
```

### **Debug Logging Protocol**
```typescript
// Structured logging with context
logger.debug('Operation description', {
  component: 'ComponentName',
  action: 'actionName',
  resourceId: 'id',
  additionalContext: data
});

// Performance tracking
logger.debug('Performance measurement', {
  operation: 'operationName',
  duration: `${endTime - startTime}ms`,
  itemCount: items.length
});
```

---

## 🔄 WORKFLOW AUTOMATION & INTEGRATION

### **External Integration Patterns**
```typescript
// Google Maps integration for job locations
const loadGoogleMaps = async () => {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
  script.onload = initializeMap;
  document.head.appendChild(script);
};

// SMS notification system
const sendCrewNotifications = async (job, assignments) => {
  const messages = assignments.map(assignment => {
    const resource = getResourceById(assignment.resourceId);
    return generatePersonalizedMessage(resource, assignment, job);
  });
  
  // Send via edge function
  await fetch('/functions/v1/send-notifications', {
    method: 'POST',
    body: JSON.stringify({ messages })
  });
};
```

### **Report Generation System**
```typescript
// Job export for SMS and printing
const generateJobReport = (job, assignments) => {
  const groupedByRow = groupAssignmentsByRow(assignments);
  
  let report = `JOB: ${job.name}\n`;
  report += `Type: ${job.type}\n`;
  report += `Start Time: ${job.startTime}\n`;
  
  Object.entries(groupedByRow).forEach(([row, resources]) => {
    report += `\n${row}:\n`;
    resources.forEach(resource => {
      report += `  • ${resource.name} (${resource.startTime})\n`;
    });
  });
  
  return report;
};
```

---

## 🎨 DESIGN SYSTEM & VISUAL STANDARDS

### **Color System Implementation**
```typescript
// Consistent color mappings
const colorSystem = {
  // Resource type colors
  resourceColors: {
    operator: 'bg-blue-100 text-blue-800',
    driver: 'bg-green-100 text-green-800',
    foreman: 'bg-purple-100 text-purple-800',
    // ... etc
  },
  
  // Status indicator colors
  statusColors: {
    available: 'bg-gray-100',
    assigned: 'bg-blue-100', 
    doubleShift: 'border-red-500',
    multipleJobs: 'border-teal-500',
    nightOnly: 'border-orange-500'
  },
  
  // Time indicator colors
  timeColors: {
    yardDeparture: 'bg-blue-500',  // Off-site vehicles
    jobSiteTime: 'bg-green-500'   // On-site or personnel
  }
};
```

### **Animation & Interaction Standards**
```typescript
// Framer Motion animation patterns
const cardVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

// Transition specifications
const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 25
};
```

---

## 🧠 AI AGENT OPERATION GUIDELINES

### **Code Generation Protocols**
```
1. ALWAYS maintain existing patterns and conventions
2. NEVER break existing functionality while adding new features
3. ALWAYS add appropriate TypeScript typing
4. ALWAYS include error handling and logging
5. ALWAYS follow component size limits (200 lines max)
6. ALWAYS add tests for new functionality
7. ALWAYS update documentation for significant changes
8. ALWAYS consider mobile responsiveness
9. ALWAYS validate business rule compliance
10. ALWAYS use logger instead of console.log
```

### **Refactoring Guidelines**
```
When refactoring existing code:
1. Analyze current functionality completely
2. Identify improvement opportunities  
3. Maintain backward compatibility
4. Update all related components
5. Run full test suite
6. Verify mobile functionality
7. Check performance impact
8. Update documentation
9. Clean up unused files with shell commands
10. Validate business rule compliance
```

### **Feature Addition Protocol**
```
For new features:
1. Define TypeScript interfaces first
2. Plan database schema changes
3. Create service layer functions
4. Implement UI components
5. Add context actions and state
6. Implement business logic validation
7. Add comprehensive tests
8. Update relevant documentation
9. Test mobile compatibility
10. Verify performance impact
```

---

## 🔧 MAINTENANCE & MONITORING

### **Code Quality Standards**
```typescript
// Required code quality checks
1. TypeScript strict mode compliance
2. ESLint rule adherence
3. Component prop interface documentation
4. Error boundary implementation
5. Performance optimization (memoization)
6. Mobile touch compatibility
7. Accessibility compliance
8. Security validation (input sanitization)
9. Business rule compliance
10. Test coverage for critical paths
```

### **Performance Monitoring**
```typescript
// Performance benchmarks to maintain
- Component render time: <16ms for 60fps
- Database query response: <200ms
- Drag operation latency: <50ms
- Mobile touch response: <100ms
- Real-time update propagation: <500ms
- Initial page load: <3s
- Bundle size: <2MB compressed
```

---

## 🚨 CRITICAL BUSINESS RULES ENFORCEMENT

### **Safety Rule Validation**
```typescript
// NEVER allow these unsafe conditions:
1. Equipment without operators (except specific exceptions)
2. Trucks without drivers  
3. Time conflicts for same resource
4. Assignment violations of certification requirements
5. Capacity overruns without approval
6. Safety rule bypassing without proper authorization

// ALWAYS enforce these safety checks:
1. CDL verification for truck drivers
2. Equipment certification for operators  
3. Safety training verification
4. Medical clearance validation
5. Union compliance checking
6. Equipment inspection status
```

### **Data Integrity Requirements**
```typescript
// NEVER allow these data inconsistencies:
1. Orphaned assignments (resource or job deleted)
2. Circular attachment references
3. Invalid time slot formats
4. Missing required attachments
5. Rule violations in active assignments
6. Inconsistent audit trail data

// ALWAYS maintain these constraints:
1. Foreign key referential integrity
2. Business rule compliance
3. Time conflict prevention  
4. Attachment count limits
5. User permission enforcement
6. Complete audit trail logging
```

---

## 📚 COMPLETE REFERENCE DOCUMENTATION

### **File Organization Standards**
```
Component Files:
- Main component logic: ComponentName.tsx
- Component tests: ComponentName.test.tsx  
- Component styles: ComponentName.module.css (if needed)
- Component types: ComponentName.types.ts (if complex)

Utility Files:
- Business logic: featureUtils.ts
- Type definitions: types/index.ts
- Constants: constants.ts
- Test utilities: test-utils.ts

Database Files:
- Migrations: descriptive_name.sql
- Edge functions: /supabase/functions/function-name/
- Type definitions: lib/database.types.ts
- Service layer: services/ServiceName.ts
```

### **Import/Export Conventions**
```typescript
// Import order (enforced by ESLint)
1. React imports
2. Third-party library imports  
3. Internal imports (absolute paths)
4. Relative imports
5. Type-only imports (with 'type' keyword)

// Export patterns
export default ComponentName;           // Default export for components
export { utilityFunction };           // Named exports for utilities
export type { InterfaceName };        // Type-only exports
export * from './submodule';          // Re-exports for barrel files
```

---

## 🎯 PROJECT-SPECIFIC AI COMMANDS

### **Construction Scheduler Specific Commands**

#### **Resource Management Commands**
```
Command: "Add new equipment type [EquipmentType]"
- Update ResourceType enum
- Add to equipment color mappings  
- Update rule systems (magnet + drop)
- Add UI support (ResourceCard, selectors)
- Update database enum if using Supabase
- Add template cards
- Test drag and drop functionality

Command: "Create job for [JobType] with [RequiredResources]"
- Validate job type against existing types
- Check resource availability
- Apply job-specific row configurations
- Set up required equipment templates
- Configure default plant assignments (for paving)
- Set appropriate shift and timing defaults
```

#### **Rule System Commands**
```
Command: "Update magnet rules for [Scenario]"
- Identify affected resource type pairs
- Update MagnetInteractionRule definitions
- Validate rule consistency with RuleValidator
- Test rule enforcement in UI
- Update rule templates if creating new pattern
- Document business justification

Command: "Configure job row for [JobType]"  
- Set up appropriate row types for job
- Configure drop rules for each row
- Set up split layouts if needed
- Add template cards for common equipment
- Configure capacity limits
- Test drag and drop functionality
```

#### **Performance Optimization Commands**
```
Command: "Optimize component [ComponentName] for performance"
- Analyze re-render patterns with React DevTools
- Add appropriate memoization (useMemo, useCallback, React.memo)
- Check prop drilling and context optimization
- Verify stable callback references
- Add performance monitoring hooks
- Test under load conditions
- Document optimization techniques used
```

---

## 🛡️ SECURITY & COMPLIANCE STANDARDS

### **Data Protection Requirements**
```sql
-- Personal information encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive fields
ALTER TABLE users ADD COLUMN ssn_encrypted BYTEA;
ALTER TABLE users ADD COLUMN phone_encrypted BYTEA;

-- Audit all data access
CREATE TRIGGER audit_user_access 
  AFTER SELECT ON users 
  FOR EACH ROW EXECUTE FUNCTION log_data_access();
```

### **Role-Based Access Control**
```typescript
// User roles and permissions
enum UserRole {
  ADMIN = 'admin',
  FOREMAN = 'foreman', 
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}

// Permission checking
const checkPermission = (user, action, resource) => {
  const permissions = getRolePermissions(user.role);
  return permissions.includes(`${action}:${resource}`);
};
```

---

## 🔮 FUTURE ENHANCEMENT ROADMAP

### **Planned Major Features**
```
Phase 1: Core Functionality (Current)
- Drag and drop scheduling
- Basic resource management
- Simple rule enforcement
- Mobile responsiveness

Phase 2: Advanced Features (Next)
- Advanced reporting and analytics
- Calendar integration
- Advanced rule engine
- API integrations (payroll, GPS tracking)

Phase 3: Enterprise Features (Future)
- Multi-tenant support
- Advanced permissions
- Custom workflow builder
- AI-powered optimization
- Predictive maintenance
- Advanced cost tracking

Phase 4: Platform Features (Long-term)
- Third-party app marketplace
- Custom dashboard builder
- Advanced analytics engine
- Machine learning integration
- IoT device integration
- Blockchain compliance tracking
```

### **Technical Debt Management**
```
Current Technical Debt:
1. Component size optimization (some files >200 lines)
2. Test coverage gaps in complex components
3. Bundle size optimization opportunities
4. Real-time performance under high load
5. Mobile touch gesture improvements
6. Accessibility compliance improvements

Debt Resolution Strategy:
1. Incremental refactoring during feature development
2. Dedicated cleanup sprints between major features
3. Performance monitoring and optimization
4. Security audit and compliance updates
5. Documentation improvement and maintenance
6. Test coverage expansion
```

---

## 🎯 AI AGENT SUCCESS CRITERIA

### **Development Quality Gates**
```
Before completing any development task:
✅ All TypeScript errors resolved
✅ All tests passing
✅ ESLint compliance achieved
✅ Mobile functionality verified
✅ Business rules validated
✅ Performance impact assessed
✅ Documentation updated
✅ Security implications considered
✅ Accessibility requirements met
✅ Error handling implemented
```

### **Feature Completion Checklist**
```
For each new feature:
✅ Requirements clearly defined
✅ Database schema updated (if needed)
✅ Service layer implemented
✅ UI components created
✅ Business logic validated
✅ Tests written and passing
✅ Mobile compatibility verified
✅ Performance optimized
✅ Documentation updated
✅ Security reviewed
```

---

## 📋 EMERGENCY PROCEDURES

### **System Recovery Protocols**
```typescript
// Data corruption recovery
1. Check localStorage backup data
2. Restore from Supabase if available
3. Validate data integrity
4. Clean up orphaned records
5. Rebuild derived state
6. Notify users of recovery

// Performance degradation response
1. Identify bottleneck components
2. Disable non-critical features temporarily
3. Optimize database queries
4. Reduce real-time subscription load
5. Implement graceful degradation
6. Monitor recovery metrics
```

### **Rollback Procedures**
```typescript
// Feature rollback protocol
1. Disable feature flags
2. Revert database migrations if needed
3. Restore previous component versions
4. Clear affected cache/storage
5. Notify users of changes
6. Monitor system stability
```

---

## 🎓 KNOWLEDGE TRANSFER PROTOCOLS

### **Onboarding New AI Agents**
```
Required Reading Order:
1. This comprehensive backup document
2. AI_PROJECT_GUIDE.md for project specifics
3. DATABASE_DESIGN_PROMPT.md for database context
4. Component-specific documentation
5. Business rule specifications
6. Testing patterns and examples

Hands-on Learning Tasks:
1. Create a simple new resource type
2. Add a basic modal component
3. Implement a new business rule
4. Add a test for existing functionality
5. Debug a common issue scenario
6. Optimize a performance bottleneck
```

### **Project Handoff Requirements**
```
For project continuity:
1. Complete this documentation
2. Comprehensive test coverage
3. Clear component interfaces
4. Business rule documentation
5. Database schema documentation
6. Deployment procedures
7. Monitoring and alerting setup
8. Recovery procedures
9. Contact information for key stakeholders
10. Training materials for end users
```

---

## 🎯 FINAL AI AGENT DIRECTIVES

### **Prime Directives**
```
1. NEVER compromise data integrity
2. ALWAYS maintain business rule compliance
3. ALWAYS consider mobile users
4. ALWAYS add appropriate error handling
5. ALWAYS use the logger instead of console.log
6. NEVER create components >200 lines
7. ALWAYS add tests for new functionality
8. ALWAYS update documentation for changes
9. ALWAYS consider performance implications
10. ALWAYS validate security implications
```

### **Quality Assurance Protocol**
```
Before considering any task complete:
1. Code compiles without errors
2. All tests pass
3. Mobile functionality verified
4. Business rules enforced
5. Performance acceptable
6. Security implications addressed
7. Documentation updated
8. Error handling implemented
9. Logging properly configured
10. Backward compatibility maintained
```

---

**This document serves as the complete backup of all knowledge, patterns, protocols, and procedures for the Construction Scheduler project. Any AI agent working on this project should reference this document as the authoritative source for all development decisions.**

**Last Updated**: [Current Date]  
**Version**: 1.0.0  
**Classification**: Comprehensive AI Agent Backup  
**Status**: Production Ready  

---

*END OF COMPREHENSIVE BACKUP DOCUMENT*