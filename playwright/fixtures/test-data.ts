import { v4 as uuidv4 } from 'uuid';

// Test data factory for creating consistent test data

export interface TestResource {
  id: string;
  type: string;
  name: string;
  identifier?: string;
  model?: string;
  onSite: boolean;
}

export interface TestJob {
  id: string;
  name: string;
  type: 'street' | 'highway' | 'parking-lot' | 'paving' | 'milling' | 'both';
  shift: 'day' | 'night';
  notes?: string;
  finalized: boolean;
  scheduleDate: Date;
}

export interface TestAssignment {
  id: string;
  resourceId: string;
  jobId: string;
  row: string;
  position: number;
  attachedTo?: string;
}

export class TestDataFactory {
  // Resource creation methods
  static createOperator(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'operator',
      name: `Test Operator ${Math.floor(Math.random() * 1000)}`,
      identifier: `OP-${Math.floor(Math.random() * 1000)}`,
      onSite: false,
      ...overrides
    };
  }

  static createDriver(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'driver',
      name: `Test Driver ${Math.floor(Math.random() * 1000)}`,
      identifier: `DR-${Math.floor(Math.random() * 1000)}`,
      onSite: false,
      ...overrides
    };
  }

  static createExcavator(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'excavator',
      name: `Excavator ${Math.floor(Math.random() * 100)}`,
      identifier: `EX-${Math.floor(Math.random() * 100)}`,
      model: 'CAT 320',
      onSite: false,
      ...overrides
    };
  }

  static createPaver(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'paver',
      name: `Paver ${Math.floor(Math.random() * 100)}`,
      identifier: `PV-${Math.floor(Math.random() * 100)}`,
      model: 'AP1055F',
      onSite: false,
      ...overrides
    };
  }

  static createTruck(classType: string = '10W', overrides?: Partial<TestResource>): TestResource {
    // Generate valid identifiers based on classType that will show up in the UI
    let identifier: string;
    if (classType === '10W') {
      // Use 10W truck identifiers (389-399)
      const validIds = ['389', '390', '391', '392', '393', '394', '395', '396', '397', '398', '399'];
      identifier = validIds[Math.floor(Math.random() * validIds.length)];
    } else if (classType === 'Trac') {
      // Use Trac truck identifiers (43-44, 49-76)  
      const validIds = ['43', '44', ...Array.from({length: 28}, (_, i) => (49 + i).toString())];
      identifier = validIds[Math.floor(Math.random() * validIds.length)];
    } else {
      // For other trucks, use a non-standard identifier that goes to "Other" category
      identifier = `TEST-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
    
    return {
      id: uuidv4(),
      type: 'truck',
      name: `Truck #${identifier}`,
      identifier: identifier,
      model: classType,
      onSite: false,
      ...overrides
    };
  }

  static createScrewman(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'screwman',
      name: `Screwman ${Math.floor(Math.random() * 100)}`,
      identifier: `SC-${Math.floor(Math.random() * 100)}`,
      onSite: false,
      ...overrides
    };
  }

  static createSkidsteer(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'skidsteer',
      name: `Skidsteer ${Math.floor(Math.random() * 100)}`,
      identifier: `SK-${Math.floor(Math.random() * 100)}`,
      model: 'CAT 262',
      onSite: false,
      ...overrides
    };
  }

  static createSweeper(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'sweeper',
      name: `Sweeper ${Math.floor(Math.random() * 100)}`,
      identifier: `SW-${Math.floor(Math.random() * 100)}`,
      model: 'Elgin Pelican',
      onSite: false,
      ...overrides
    };
  }

  static createMillingMachine(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'millingMachine',
      name: `Milling Machine ${Math.floor(Math.random() * 100)}`,
      identifier: `MM-${Math.floor(Math.random() * 100)}`,
      model: 'W 200 Fi',
      onSite: false,
      ...overrides
    };
  }

  static createGrader(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'grader',
      name: `Grader ${Math.floor(Math.random() * 100)}`,
      identifier: `GR-${Math.floor(Math.random() * 100)}`,
      model: 'CAT 140M',
      onSite: false,
      ...overrides
    };
  }

  static createDozer(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'dozer',
      name: `Dozer ${Math.floor(Math.random() * 100)}`,
      identifier: `DZ-${Math.floor(Math.random() * 100)}`,
      model: 'CAT D8T',
      onSite: false,
      ...overrides
    };
  }

  static createPayloader(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'payloader',
      name: `Payloader ${Math.floor(Math.random() * 100)}`,
      identifier: `PL-${Math.floor(Math.random() * 100)}`,
      model: 'CAT 950',
      onSite: false,
      ...overrides
    };
  }

  static createRoller(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'roller',
      name: `Roller ${Math.floor(Math.random() * 100)}`,
      identifier: `RL-${Math.floor(Math.random() * 100)}`,
      model: 'CAT CB54',
      onSite: false,
      ...overrides
    };
  }

  static createEquipment(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'equipment',
      name: `Equipment ${Math.floor(Math.random() * 100)}`,
      identifier: `EQ-${Math.floor(Math.random() * 100)}`,
      model: 'Generic',
      onSite: false,
      ...overrides
    };
  }

  static createLaborer(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'laborer',
      name: `Laborer ${Math.floor(Math.random() * 100)}`,
      identifier: `LB-${Math.floor(Math.random() * 100)}`,
      onSite: false,
      ...overrides
    };
  }

  static createForeman(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'foreman',
      name: `Foreman ${Math.floor(Math.random() * 100)}`,
      identifier: `FM-${Math.floor(Math.random() * 100)}`,
      onSite: false,
      ...overrides
    };
  }

  static createStriper(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'striper',
      name: `Striper ${Math.floor(Math.random() * 100)}`,
      identifier: `ST-${Math.floor(Math.random() * 100)}`,
      onSite: false,
      ...overrides
    };
  }

  static createPrivateDriver(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'privateDriver',
      name: `Private Driver ${Math.floor(Math.random() * 100)}`,
      identifier: `PD-${Math.floor(Math.random() * 100)}`,
      onSite: false,
      ...overrides
    };
  }

  static createGroundman(overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'groundman',
      name: `Groundman ${Math.floor(Math.random() * 100)}`,
      identifier: `GM-${Math.floor(Math.random() * 100)}`,
      onSite: false,
      ...overrides
    };
  }

  // Specialized truck creation methods
  static createTenWheelTruck(overrides?: Partial<TestResource>): TestResource {
    return this.createTruck('10W', overrides);
  }

  static createTracTruck(overrides?: Partial<TestResource>): TestResource {
    return this.createTruck('Trac', overrides);
  }

  static createOtherTruck(overrides?: Partial<TestResource>): TestResource {
    return this.createTruck('Other', overrides);
  }

  // Job creation methods
  static createDayJob(overrides?: Partial<TestJob>): TestJob {
    return {
      id: uuidv4(),
      name: `Test Day Job ${Math.floor(Math.random() * 1000)}`,
      type: 'street',
      shift: 'day',
      finalized: false,
      scheduleDate: new Date(),
      ...overrides
    };
  }

  static createNightJob(overrides?: Partial<TestJob>): TestJob {
    return {
      id: uuidv4(),
      name: `Test Night Job ${Math.floor(Math.random() * 1000)}`,
      type: 'highway',
      shift: 'night',
      finalized: false,
      scheduleDate: new Date(),
      ...overrides
    };
  }

  static createFinalizedJob(overrides?: Partial<TestJob>): TestJob {
    return {
      id: uuidv4(),
      name: `Finalized Job ${Math.floor(Math.random() * 1000)}`,
      type: 'parking-lot',
      shift: 'day',
      finalized: true,
      scheduleDate: new Date(),
      notes: 'This job is finalized and cannot be modified',
      ...overrides
    };
  }

  // Create specific job types for truck testing
  static createJob(name: string, type: TestJob['type'], overrides?: Partial<TestJob>): TestJob {
    return {
      id: uuidv4(),
      name,
      type,
      shift: 'day',
      finalized: false,
      scheduleDate: new Date(),
      ...overrides
    };
  }

  static createTruck(name: string, identifier: string, classType: string = 'Trac', overrides?: Partial<TestResource>): TestResource {
    return {
      id: uuidv4(),
      type: 'truck',
      name,
      identifier,
      model: classType,
      onSite: false,
      ...overrides
    };
  }

  // Assignment creation
  static createAssignment(
    resourceId: string,
    jobId: string,
    row: string = 'Equipment',
    overrides?: Partial<TestAssignment>
  ): TestAssignment {
    return {
      id: uuidv4(),
      resourceId,
      jobId,
      row,
      position: 0,
      ...overrides
    };
  }

  // Bulk creation methods
  static createResourceSet() {
    return {
      operators: [
        this.createOperator({ name: 'John Doe', identifier: 'OP-001' }),
        this.createOperator({ name: 'Jane Smith', identifier: 'OP-002' }),
        this.createOperator({ name: 'Bob Wilson', identifier: 'OP-003' })
      ],
      drivers: [
        this.createDriver({ name: 'Mike Johnson', identifier: 'DR-001' }),
        this.createDriver({ name: 'Sarah Davis', identifier: 'DR-002' })
      ],
      equipment: [
        this.createExcavator({ name: 'EX-01', identifier: 'EQ-001' }),
        this.createPaver({ name: 'PV-01', identifier: 'EQ-002' }),
        this.createTruck('10W', { name: 'Truck-01', identifier: 'T-001' })
      ],
      screwmen: [
        this.createScrewman({ name: 'Tom Brown', identifier: 'SC-001' }),
        this.createScrewman({ name: 'Jim Green', identifier: 'SC-002' }),
        this.createScrewman({ name: 'Pat White', identifier: 'SC-003' })
      ]
    };
  }

  static createJobSet() {
    return {
      dayJobs: [
        this.createDayJob({ name: 'Main Street Paving' }),
        this.createDayJob({ name: '5th Avenue Repair' })
      ],
      nightJobs: [
        this.createNightJob({ name: 'Highway 101 Resurfacing' }),
        this.createNightJob({ name: 'Interstate 5 Maintenance' })
      ],
      finalizedJobs: [
        this.createFinalizedJob({ name: 'Completed Parking Lot' })
      ]
    };
  }

  // Scenario-specific test data
  static createEquipmentOperatorScenario() {
    const excavator = this.createExcavator({ name: 'Test Excavator' });
    const operator = this.createOperator({ name: 'Test Operator' });
    const job = this.createDayJob({ name: 'Equipment Test Job' });
    
    return { excavator, operator, job };
  }

  static createTruckDriverScenario() {
    const truck = this.createTruck('10W', { name: 'Test Truck #390', identifier: '390' });
    const driver = this.createDriver({ name: 'Test Driver' });
    const job = this.createDayJob({ name: 'Truck Test Job' });
    
    return { truck, driver, job };
  }

  static createPaverScrewmenScenario() {
    const paver = this.createPaver({ name: 'Test Paver' });
    const operator = this.createOperator({ name: 'Paver Operator' });
    const screwmen = [
      this.createScrewman({ name: 'Screwman 1' }),
      this.createScrewman({ name: 'Screwman 2' }),
      this.createScrewman({ name: 'Screwman 3' }) // Third one should be rejected
    ];
    const job = this.createDayJob({ name: 'Paving Job' });
    
    return { paver, operator, screwmen, job };
  }

  static createDoubleShiftScenario() {
    const operator = this.createOperator({ name: 'Double Shift Operator' });
    const dayJob = this.createDayJob({ name: 'Day Shift Job' });
    const nightJob = this.createNightJob({ name: 'Night Shift Job' });
    
    return { operator, dayJob, nightJob };
  }

  // Cleanup helper
  static generateCleanupIds(resources: TestResource[], jobs: TestJob[], assignments: TestAssignment[]) {
    return {
      resourceIds: resources.map(r => r.id),
      jobIds: jobs.map(j => j.id),
      assignmentIds: assignments.map(a => a.id)
    };
  }
}

// Export helper functions for common test scenarios
export const createBasicTestData = () => {
  const resources = TestDataFactory.createResourceSet();
  const jobs = TestDataFactory.createJobSet();
  
  return {
    resources: [
      ...resources.operators,
      ...resources.drivers,
      ...resources.equipment,
      ...resources.screwmen
    ],
    jobs: [
      ...jobs.dayJobs,
      ...jobs.nightJobs,
      ...jobs.finalizedJobs
    ]
  };
};

export const createBusinessRuleTestData = () => {
  return {
    equipmentOperator: TestDataFactory.createEquipmentOperatorScenario(),
    truckDriver: TestDataFactory.createTruckDriverScenario(),
    paverScrewmen: TestDataFactory.createPaverScrewmenScenario(),
    doubleShift: TestDataFactory.createDoubleShiftScenario()
  };
};