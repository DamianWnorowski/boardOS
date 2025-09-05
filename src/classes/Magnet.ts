import { v4 as uuidv4 } from 'uuid';
import { ResourceType, TimeSlot, MagnetInteractionRule } from '../types';

/**
 * MagnetStatus represents the current state of a magnet
 * - Available: The magnet is in the resource pool, not assigned
 * - Assigned: The magnet is assigned to a job
 * - MultiAssigned: The magnet is assigned to multiple jobs with different time slots
 * - InTransit: The magnet is being dragged by the user
 */
export enum MagnetStatus {
  Available = 'available',
  Assigned = 'assigned',
  MultiAssigned = 'multiAssigned',
  InTransit = 'inTransit'
}

/**
 * MagnetType categorizes magnets into broader groups for easier filtering and handling
 */
export enum MagnetCategory {
  Personnel = 'personnel',
  Equipment = 'equipment',
  Vehicle = 'vehicle'
}

/**
 * Position represents a magnet's location on the board
 */
export interface Position {
  x: number;
  y: number;
  jobId?: string;
  rowType?: string;
  position?: number;
}

/**
 * Assignment tracks where and when a magnet is assigned
 */
export interface MagnetAssignment {
  id: string;
  jobId: string;
  rowId: string;
  position: number;
  timeSlot: TimeSlot;
  attachedToId?: string;
  attachments: string[]; // IDs of magnets attached to this one
}

/**
 * CompatibilityRule defines which magnets can attach to one another
 */
export interface CompatibilityRule {
  sourceType: ResourceType;
  targetType: ResourceType;
  canAttach: boolean;
  isRequired?: boolean;
  maxCount?: number;
}

/**
 * Magnet class represents a draggable resource in the scheduler
 */
export class Magnet {
  // Core properties
  id: string;
  resourceId: string;
  type: ResourceType;
  name: string;
  identifier?: string;
  model?: string;
  category: MagnetCategory;
  
  // State properties
  status: MagnetStatus = MagnetStatus.Available;
  position: Position = { x: 0, y: 0 };
  assignments: MagnetAssignment[] = [];
  
  // Visual properties
  color: string;
  borderColor: string;
  zIndex: number = 1;
  
  // Functional properties
  isAttached: boolean = false;
  attachedToId?: string;
  attachments: string[] = [];
  requiredAttachments: ResourceType[] = []; // Now set externally
  maxAttachments: number = 0; // Now set externally
  
  // Snapping and interaction properties
  snapThreshold: number = 20; // Pixels
  isDragging: boolean = false;
  isHovered: boolean = false;
  
  constructor(
    resourceId: string,
    type: ResourceType,
    name: string,
    identifier?: string,
    model?: string,
    initialColor: string = 'bg-gray-200',
    initialBorderColor: string = 'border-gray-400',
    initialRequiredAttachments: ResourceType[] = [],
    initialMaxAttachments: number = 0
  ) {
    this.id = `magnet-${uuidv4()}`;
    this.resourceId = resourceId;
    this.type = type;
    this.name = name;
    this.identifier = identifier;
    this.model = model;
    
    // Determine magnet category based on type
    if (['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'].includes(type)) {
      this.category = MagnetCategory.Personnel;
    } else if (['truck'].includes(type)) {
      this.category = MagnetCategory.Vehicle;
    } else {
      this.category = MagnetCategory.Equipment;
    }
    
    // Assign visual properties based on type
    this.color = initialColor;
    this.borderColor = initialBorderColor;
    
    // Set required attachments for certain types
    this.requiredAttachments = initialRequiredAttachments;
    this.maxAttachments = initialMaxAttachments;
  }
  
  /**
   * Check if magnet can accept more attachments
   */
  canAcceptMoreAttachments(): boolean {
    return this.attachments.length < this.maxAttachments;
  }
  
  /**
   * Get remaining attachment capacity
   */
  getRemainingAttachmentCapacity(): number {
    return Math.max(0, this.maxAttachments - this.attachments.length);
  }
  
  /**
   * Create a new assignment for this magnet
   */
  assignToJob(jobId: string, rowId: string, position: number, timeSlot?: TimeSlot): string {
    const assignmentId = `assignment-${uuidv4()}`;
    
    const newAssignment: MagnetAssignment = {
      id: assignmentId,
      jobId,
      rowId,
      position,
      timeSlot: timeSlot || {
        startTime: '07:00',
        endTime: '15:30',
        isFullDay: true
      },
      attachments: []
    };
    
    this.assignments.push(newAssignment);
    
    // Update status based on number of assignments
    this.status = this.assignments.length > 1 ? 
      MagnetStatus.MultiAssigned : 
      MagnetStatus.Assigned;
    
    return assignmentId;
  }
  
  /**
   * Remove an assignment from this magnet
   */
  removeAssignment(assignmentId: string): void {
    this.assignments = this.assignments.filter(a => a.id !== assignmentId);
    
    // Update status based on remaining assignments
    if (this.assignments.length === 0) {
      this.status = MagnetStatus.Available;
    } else if (this.assignments.length === 1) {
      this.status = MagnetStatus.Assigned;
    }
  }
  
  /**
   * Update a time slot for an assignment
   */
  updateTimeSlot(assignmentId: string, timeSlot: TimeSlot): boolean {
    // Check for time conflicts with other assignments
    if (this.hasTimeConflict(timeSlot, assignmentId)) {
      return false;
    }
    
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      assignment.timeSlot = timeSlot;
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a time slot conflicts with existing assignments
   */
  hasTimeConflict(timeSlot: TimeSlot, excludeAssignmentId?: string): boolean {
    // If this is a full day assignment, it conflicts with anything
    if (timeSlot.isFullDay) {
      return this.assignments.some(a => 
        (!excludeAssignmentId || a.id !== excludeAssignmentId)
      );
    }
    
    // Check against other assignments
    return this.assignments.some(a => {
      // Skip the assignment we're updating
      if (excludeAssignmentId && a.id === excludeAssignmentId) {
        return false;
      }
      
      const existingSlot = a.timeSlot;
      
      // If existing slot is full day, it conflicts
      if (existingSlot.isFullDay) {
        return true;
      }
      
      // Convert times to minutes for comparison
      const getMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const start1 = getMinutes(timeSlot.startTime);
      const end1 = getMinutes(timeSlot.endTime);
      const start2 = getMinutes(existingSlot.startTime);
      const end2 = getMinutes(existingSlot.endTime);
      
      // Check for overlap
      return start1 < end2 && start2 < end1;
    });
  }
  
  /**
   * Attach another magnet to this one
   */
  attachMagnet(magnetId: string): boolean {
    if (!this.attachments.includes(magnetId) && this.canAcceptMoreAttachments()) {
      this.attachments.push(magnetId);
      return true;
    }
    return false;
  }
  
  /**
   * Detach a magnet from this one
   */
  detachMagnet(magnetId: string): boolean {
    const initialLength = this.attachments.length;
    this.attachments = this.attachments.filter(id => id !== magnetId);
    return this.attachments.length !== initialLength;
  }
  
  /**
   * Check if this magnet can attach to another
   */
  canAttachTo(_magnet: Magnet): boolean {
    void _magnet; // For future attachment validation logic
    // This method is now primarily for internal Magnet logic,
    // the main compatibility check happens in MagnetManager.linkMagnets
    // based on the rules from SchedulerContext
    return true; // Placeholder, actual rule check is external
  }
  
  /**
   * Check if this magnet has all required attachments
   */
  hasRequiredAttachments(magnets: Map<string, Magnet>): boolean {
    if (this.requiredAttachments.length === 0) {
      return true;
    }
    
    // Check each attachment to see if it satisfies a requirement
    const attachedTypes = this.attachments
      .map(id => magnets.get(id)?.type)
      .filter(Boolean) as ResourceType[];
    
    return this.requiredAttachments.every(reqType => 
      attachedTypes.includes(reqType)
    );
  }
  
  /**
   * Start dragging this magnet
   */
  startDrag(): void {
    this.isDragging = true;
    this.status = MagnetStatus.InTransit;
    this.zIndex = 100; // Bring to front
  }
  
  /**
   * End dragging this magnet
   */
  endDrag(): void {
    this.isDragging = false;
    this.status = this.assignments.length > 1 ? 
      MagnetStatus.MultiAssigned : 
      this.assignments.length === 1 ? 
      MagnetStatus.Assigned : 
      MagnetStatus.Available;
    this.zIndex = 1;
  }
  
  /**
   * Check if this magnet can snap to a position
   */
  canSnapTo(position: Position): boolean {
    // Calculate distance
    const dx = this.position.x - position.x;
    const dy = this.position.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= this.snapThreshold;
  }
  
  /**
   * Get formatted name for display
   */
  getDisplayName(): { line1: string, line2: string } {
    // Clean parenthetical names
    const cleanName = this.name.replace(/\([^)]*\)\s*/g, '').trim();
    const nameParts = cleanName.split(' ');
    
    // For names with 2 or fewer parts, use standard first/last split
    if (nameParts.length <= 2) {
      return { 
        line1: nameParts[0] || '', 
        line2: nameParts[1] || ''
      };
    }
    
    // For names with more than 2 parts, put first name on line 1, rest on line 2
    return {
      line1: nameParts[0],
      line2: nameParts.slice(1).join(' ')
    };
  }
  
  /**
   * Get formatted equipment name for display
   */
  getEquipmentDisplayInfo(): { model: string, number: string } {
    if (!['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
           'roller', 'dozer', 'payloader', 'equipment'].includes(this.type)) {
      return { model: "", number: "" };
    }
    
    const match = this.name.match(/^(.+)\s+#(.+)$/);
    if (match) {
      return { model: match[1], number: match[2] };
    }
    
    return { model: this.name, number: this.identifier || "" };
  }
}

/**
 * MagnetManager handles collections of magnets and their interactions
 */
export class MagnetManager {
  magnets: Map<string, Magnet> = new Map();
  private rules: MagnetInteractionRule[] = [];
  private resourceColors: Record<ResourceType, { color: string, borderColor: string }> = {};

  /**
   * Set rules and colors from SchedulerContext
   */
  setRulesAndColors(rules: MagnetInteractionRule[], colors: Record<ResourceType, { color: string, borderColor: string }>) {
    this.rules = rules;
    this.resourceColors = colors;
  }

  /**
   * Clear all magnets from the manager
   */
  clear(): void {
    this.magnets.clear();
  }
  
  /**
   * Create a new magnet from a resource
   */
  createMagnet(
    resourceId: string,
    type: ResourceType,
    name: string,
    identifier?: string,
    model?: string
  ): Magnet {
    // Look up rules and colors based on type
    const requiredAttachments = this.rules
      .filter(r => r.targetType === type && r.isRequired)
      .map(r => r.sourceType);

    // Determine max attachments for this magnet type (as a target)
    const maxAttachments = this.rules
      .filter(r => r.targetType === type && r.canAttach)
      .reduce((max, rule) => Math.max(max, rule.maxCount || 0), 0);

    const colors = this.resourceColors[type] || { color: 'bg-gray-200', borderColor: 'border-gray-400' };

    const magnet = new Magnet(
      resourceId,
      type,
      name,
      identifier,
      model,
      colors.color,
      colors.borderColor,
      requiredAttachments,
      maxAttachments
    );
    this.magnets.set(magnet.id, magnet);
    return magnet;
  }
  
  /**
   * Get a magnet by ID
   */
  getMagnet(id: string): Magnet | undefined {
    return this.magnets.get(id);
  }
  
  /**
   * Get all magnets from a specific job
   */
  getMagnetsByJob(jobId: string): Magnet[] {
    return Array.from(this.magnets.values())
      .filter(magnet => 
        magnet.assignments.some(a => a.jobId === jobId)
      );
  }
  
  /**
   * Get all magnets in a specific row of a job
   */
  getMagnetsByJobRow(jobId: string, rowId: string): Magnet[] {
    return Array.from(this.magnets.values())
      .filter(magnet => 
        magnet.assignments.some(a => a.jobId === jobId && a.rowId === rowId)
      );
  }
  
  /**
   * Get all available magnets (not assigned to any job)
   */
  getAvailableMagnets(): Magnet[] {
    return Array.from(this.magnets.values())
      .filter(magnet => magnet.status === MagnetStatus.Available);
  }
  
  /**
   * Get all magnets matching a specific type
   */
  getMagnetsByType(type: ResourceType): Magnet[] {
    return Array.from(this.magnets.values())
      .filter(magnet => magnet.type === type);
  }
  
  /**
   * Get all magnets in a specific category
   */
  getMagnetsByCategory(category: MagnetCategory): Magnet[] {
    return Array.from(this.magnets.values())
      .filter(magnet => magnet.category === category);
  }
  
  /**
   * Check if a position is available for a magnet
   */
  isPositionAvailable(jobId: string, rowId: string, position: number): boolean {
    return !Array.from(this.magnets.values())
      .some(magnet => 
        magnet.assignments.some(a => 
          a.jobId === jobId && 
          a.rowId === rowId && 
          a.position === position
        )
      );
  }
  
  /**
   * Find the next available position in a row
   */
  getNextAvailablePosition(jobId: string, rowId: string): number {
    const positions = new Set(
      Array.from(this.magnets.values())
        .flatMap(magnet => 
          magnet.assignments
            .filter(a => a.jobId === jobId && a.rowId === rowId)
            .map(a => a.position)
        )
    );
    
    let position = 0;
    while (positions.has(position)) position++;
    
    return position;
  }
  
  /**
   * Handle linking magnets together
   */
  linkMagnets(sourceId: string, targetId: string): boolean {
    const source = this.magnets.get(sourceId);
    const target = this.magnets.get(targetId);
    
    if (!source || !target) {
      return false;
    }
    
    // Determine logical source and target based on resource categories
    const { logicalSource, logicalTarget } = this.determineLogicalDirection(source, target);
    
    // Check rule for logical source attaching to logical target
    const rule = this.rules.find(r => r.sourceType === logicalSource.type && r.targetType === logicalTarget.type);
    if (!rule || !rule.canAttach) {
      // Log the failed attachment attempt for debugging
      return false;
    }
    
    // Check if logical target can accept more attachments of this logical source type
    const currentCountOfSourceType = logicalTarget.attachments
      .map(id => this.magnets.get(id)?.type)
      .filter(attachedType => attachedType === logicalSource.type)
      .length;

    if (rule.maxCount !== undefined && currentCountOfSourceType >= rule.maxCount) {
      return false;
    }
    
    // Perform the attachment in the logical direction
    const attachmentSuccess = logicalTarget.attachMagnet(logicalSource.id);
    if (attachmentSuccess) {
      logicalSource.attachedToId = logicalTarget.id;
      logicalSource.isAttached = true;
      
      }
    
    return attachmentSuccess;
  }
  
  /**
   * Determine the logical direction for attachment based on resource types
   * Personnel should always be the logical source (what gets attached)
   * Equipment/vehicles should always be the logical target (what gets attached to)
   */
  private determineLogicalDirection(magnet1: Magnet, magnet2: Magnet): { logicalSource: Magnet, logicalTarget: Magnet } {
    const personnelTypes = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    const vehicleTypes = ['truck'];
    
    const magnet1IsPersonnel = personnelTypes.includes(magnet1.type);
    const magnet2IsPersonnel = personnelTypes.includes(magnet2.type);
    const magnet1IsEquipmentOrVehicle = equipmentTypes.includes(magnet1.type) || vehicleTypes.includes(magnet1.type);
    const magnet2IsEquipmentOrVehicle = equipmentTypes.includes(magnet2.type) || vehicleTypes.includes(magnet2.type);
    
    // Case 1: One is personnel, one is equipment/vehicle
    if (magnet1IsPersonnel && magnet2IsEquipmentOrVehicle) {
      return { logicalSource: magnet1, logicalTarget: magnet2 };
    }
    if (magnet2IsPersonnel && magnet1IsEquipmentOrVehicle) {
      return { logicalSource: magnet2, logicalTarget: magnet1 };
    }
    
    // Case 2: Both are same category - preserve original drag direction
    // This includes personnel-to-personnel or equipment-to-equipment attachments
    return { logicalSource: magnet1, logicalTarget: magnet2 };
  }
  
  /**
   * Handle unlinking magnets
   */
  unlinkMagnets(sourceId: string, targetId: string): boolean {
    const source = this.magnets.get(sourceId);
    const target = this.magnets.get(targetId);
    
    if (!source || !target) {
      return false;
    }
    
    // Perform the detachment
    target.detachMagnet(sourceId);
    source.attachedToId = undefined;
    source.isAttached = false;
    
    return true;
  }
  
  /**
   * Check for magnets without required attachments
   */
  getIncompleteMagnets(): Magnet[] {
    return Array.from(this.magnets.values())
      .filter(magnet => 
        magnet.status === MagnetStatus.Assigned && 
        !magnet.hasRequiredAttachments(this.magnets)
      );
  }
  
  /**
   * Convert magnets to serializable format for storage
   */
  serialize(): string {
    const data = Array.from(this.magnets.values()).map(magnet => ({
      id: magnet.id,
      resourceId: magnet.resourceId,
      type: magnet.type,
      name: magnet.name,
      identifier: magnet.identifier,
      model: magnet.model,
      status: magnet.status,
      assignments: magnet.assignments,
      attachedToId: magnet.attachedToId,
      attachments: magnet.attachments
    }));
    
    return JSON.stringify(data);
  }
  
  /**
   * Load magnets from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsedData = JSON.parse(data);
      this.magnets.clear();
      
      parsedData.forEach((item: any) => {
        const magnet = new Magnet(
          item.resourceId,
          item.type,
          item.name,
          item.identifier,
          item.model
        );
        
        magnet.id = item.id;
        magnet.status = item.status;
        magnet.assignments = item.assignments;
        magnet.attachedToId = item.attachedToId;
        magnet.attachments = item.attachments;
        magnet.isAttached = !!item.attachedToId;
        
        this.magnets.set(magnet.id, magnet);
      });
    } catch (error) {
      console.error('Error deserializing magnets:', error);
    }
  }
}

// Singleton instance for global access
export const magnetManager = new MagnetManager();