// Job Types
export interface Job {
  id: string;
  name: string;
  number?: string;
  type: 'milling' | 'paving' | 'both' | 'other' | 'drainage' | 'stripping' | 'hired';
  shift: 'day' | 'night';
  notes?: string;
  startTime?: string; // Default start time for crew (format: "HH:MM")
  finalized?: boolean; // Whether the job is finalized and ready for export
  plants?: string[]; // Plants for paving jobs (Lydel, East Island, competitors)
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

// Resource Types
export type PersonnelRole = 'operator' | 'driver' | 'striper' | 'foreman' | 'laborer' | 'privateDriver';
export type EquipmentCategory = 'skidsteer' | 'paver' | 'excavator' | 'sweeper' | 'millingMachine' | 'grader' | 'dozer' | 'payloader' | 'roller' | 'equipment' | 'truck';
export type ResourceType = PersonnelRole | EquipmentCategory;

// Employee interface for personnel
export interface Employee {
  id: string;
  userId?: string; // Link to auth.users
  type: PersonnelRole;
  name: string;
  employeeId?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  email?: string;
  address?: string;
  hireDate?: string;
  role: string;
  certifications: string[];
  skills: string[];
  permissions: string[];
  performanceReviews?: any[];
  trainingRecords?: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Equipment interface for machinery and vehicles
export interface Equipment {
  id: string;
  type: EquipmentCategory;
  name: string;
  identifier?: string; // Unit number
  model?: string;
  make?: string;
  year?: number;
  vin?: string;
  serialNumber?: string;
  location?: string;
  onSite: boolean;
  acquisitionDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  fuelType?: string;
  engineHours?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceNotes?: string;
  insurancePolicy?: string;
  registrationExpiry?: string;
  inspectionDate?: string;
  isOperational: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Unified resource interface for backward compatibility
export interface Resource {
  id: string;
  type: ResourceType;
  classType: 'employee' | 'equipment';
  name: string;
  identifier?: string;
  location?: string;
  model?: string;
  vin?: string;
  onSite?: boolean; // Whether the equipment is currently on site
}

// Time slot for assignments
export interface TimeSlot {
  startTime: string; // format: "HH:MM"
  endTime: string;   // format: "HH:MM"
  isFullDay?: boolean;
}

// Assignment Types
export type RowType = 'Forman' | 'Equipment' | 'Sweeper'|'Tack'|'MPT' |  'crew' | 'trucks';

export interface Assignment {
  id: string;
  resourceId: string;
  jobId: string;
  row: RowType;
  position?: number;
  attachedTo?: string; // ID of assignment this is attached to
  attachments?: string[]; // IDs of assignments attached to this one
  timeSlot?: TimeSlot; // Time slot for this assignment
  note?: string; // Personal note for this assignment
  truckConfig?: 'flowboy' | 'dump-trailer'; // Truck configuration stored with assignment
}

// Row override to toggle row visibility/availability
export interface RowOverride {
  jobId: string;
  rowType: RowType;
  enabled: boolean;
}

// Magnet interaction rule types
export interface MagnetInteractionRule {
  sourceType: ResourceType; // The type of magnet being attached
  targetType: ResourceType; // The type of magnet it's attaching to
  canAttach: boolean;
  isRequired?: boolean; // Is this attachment required for the targetType?
  maxCount?: number;    // Max number of sourceTypes that can attach to targetType
}

// Drop rules for each row type
export interface DropRule {
  rowType: RowType;
  allowedTypes: ResourceType[];
}

// Job-specific row configuration
export interface JobRowBox {
  id: string;
  name: string;
  allowedTypes: ResourceType[];
  maxCount?: number;
  attachmentRules?: BoxAttachmentRule[];
  isSplit?: boolean;
  subBoxes?: JobRowBox[];
}

// Rules for what can attach to what within a box
export interface BoxAttachmentRule {
  sourceType: ResourceType;
  targetType: ResourceType;
  canAttach: boolean;
  isAutoAttach?: boolean; // Automatically attach when dropped together
  priority?: number; // Priority for auto-attachment
}

export interface JobRowConfig {
  jobId: string;
  rowType: RowType;
  boxes: JobRowBox[];
  isSplit: boolean;
}

// Drag Item Types
export enum ItemTypes {
  RESOURCE = 'resource',
  ASSIGNMENT = 'assignment',
}

export interface DragItem {
  type: string;
  resource: Resource;
  assignments: Assignment[];
  primaryAssignment: Assignment;
  assignmentId?: string;
  jobId?: string;
  row?: RowType;
  isSecondShift?: boolean;
}