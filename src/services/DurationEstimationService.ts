import { Job, JobPhase, JobEstimate } from '../types';

export class DurationEstimationService {
  // Base production rates (can be adjusted based on historical data)
  private static readonly BASE_RATES = {
    milling: 22000, // sq yards per day
    paving_highway: 2000, // tons per day for highways
    paving_parking_lot: 800, // tons per day for parking lots (slower due to complexity)
    paving_residential: 1500, // tons per day for residential
    excavation: 150, // cubic yards per day
    drainage: 300, // linear feet per day
    concrete: 50, // cubic yards per day
  };

  /**
   * Estimate milling duration based on square yards and complexity
   */
  static estimateMillingDays(sqYards: number, complexity: number = 1.0): number {
    const rate = this.BASE_RATES.milling / complexity;
    return Math.ceil(sqYards / rate);
  }

  /**
   * Estimate paving duration based on tons, job category, and complexity
   */
  static estimatePavingDays(tons: number, jobCategory: Job['job_category'], complexity: number = 1.0): number {
    let baseRate = this.BASE_RATES.paving_highway;
    
    switch (jobCategory) {
      case 'parking_lot':
        baseRate = this.BASE_RATES.paving_parking_lot;
        break;
      case 'residential':
        baseRate = this.BASE_RATES.paving_residential;
        break;
      case 'commercial':
        baseRate = this.BASE_RATES.paving_parking_lot; // Similar to parking lots
        break;
      case 'municipal':
        baseRate = this.BASE_RATES.paving_residential; // Similar to residential
        break;
      default:
        baseRate = this.BASE_RATES.paving_highway;
    }
    
    const rate = baseRate / complexity;
    return Math.ceil(tons / rate);
  }

  /**
   * Estimate excavation duration
   */
  static estimateExcavationDays(cubicYards: number, complexity: number = 1.0): number {
    const rate = this.BASE_RATES.excavation / complexity;
    return Math.ceil(cubicYards / rate);
  }

  /**
   * Estimate drainage work duration
   */
  static estimateDrainageDays(linearFeet: number, complexity: number = 1.0): number {
    const rate = this.BASE_RATES.drainage / complexity;
    return Math.ceil(linearFeet / rate);
  }

  /**
   * Estimate concrete work duration
   */
  static estimateConcreteDays(cubicYards: number, complexity: number = 1.0): number {
    const rate = this.BASE_RATES.concrete / complexity;
    return Math.ceil(cubicYards / rate);
  }

  /**
   * Calculate total job duration and create phases based on job type
   */
  static calculateJobDuration(job: Partial<Job>): JobEstimate {
    const complexity = job.complexity_factor || 1.0;
    const estimate: JobEstimate = { total_days: 0 };

    switch (job.type) {
      case 'milling':
        if (job.estimated_sqyards) {
          estimate.milling_days = this.estimateMillingDays(job.estimated_sqyards, complexity);
          estimate.total_days = estimate.milling_days;
        }
        break;

      case 'paving':
        if (job.estimated_tons) {
          estimate.paving_days = this.estimatePavingDays(job.estimated_tons, job.job_category, complexity);
          estimate.total_days = estimate.paving_days;
        }
        break;

      case 'both':
        if (job.estimated_sqyards && job.estimated_tons) {
          estimate.milling_days = this.estimateMillingDays(job.estimated_sqyards, complexity);
          estimate.paving_days = this.estimatePavingDays(job.estimated_tons, job.job_category, complexity);
          estimate.total_days = estimate.milling_days + estimate.paving_days;
        }
        break;

      case 'drainage':
        // Drainage jobs have excavation + drainage + concrete phases
        if (job.estimated_cubic_yards && job.estimated_linear_feet) {
          estimate.excavation_days = this.estimateExcavationDays(job.estimated_cubic_yards, complexity);
          estimate.drainage_days = this.estimateDrainageDays(job.estimated_linear_feet, complexity);
          estimate.concrete_days = this.estimateConcreteDays(job.estimated_cubic_yards * 0.1, complexity); // Estimate concrete based on excavation
          estimate.total_days = estimate.excavation_days + estimate.drainage_days + estimate.concrete_days;
        }
        break;

      default:
        // For other job types, use a default estimation or manual input
        estimate.total_days = 1;
    }

    return estimate;
  }

  /**
   * Generate job phases based on job type and estimates
   */
  static generateJobPhases(job: Partial<Job>, startDate: string): JobPhase[] {
    const phases: JobPhase[] = [];
    const estimate = this.calculateJobDuration(job);
    let currentDate = new Date(startDate);
    let sequenceOrder = 1;

    const addDaysToDate = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    switch (job.type) {
      case 'milling':
        if (estimate.milling_days && job.estimated_sqyards) {
          const endDate = addDaysToDate(currentDate, estimate.milling_days - 1);
          phases.push({
            id: `${job.id}-milling`,
            job_id: job.id!,
            phase_type: 'milling',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(endDate),
            daily_target: job.estimated_sqyards / estimate.milling_days,
            daily_unit: 'sqyards',
            sequence_order: sequenceOrder++
          });
        }
        break;

      case 'paving':
        if (estimate.paving_days && job.estimated_tons) {
          const endDate = addDaysToDate(currentDate, estimate.paving_days - 1);
          phases.push({
            id: `${job.id}-paving`,
            job_id: job.id!,
            phase_type: 'paving',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(endDate),
            daily_target: job.estimated_tons / estimate.paving_days,
            daily_unit: 'tons',
            sequence_order: sequenceOrder++
          });
        }
        break;

      case 'both':
        // Milling phase first
        if (estimate.milling_days && job.estimated_sqyards) {
          const millingEnd = addDaysToDate(currentDate, estimate.milling_days - 1);
          phases.push({
            id: `${job.id}-milling`,
            job_id: job.id!,
            phase_type: 'milling',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(millingEnd),
            daily_target: job.estimated_sqyards / estimate.milling_days,
            daily_unit: 'sqyards',
            sequence_order: sequenceOrder++
          });
          currentDate = addDaysToDate(millingEnd, 1);
        }
        
        // Paving phase second
        if (estimate.paving_days && job.estimated_tons) {
          const pavingEnd = addDaysToDate(currentDate, estimate.paving_days - 1);
          phases.push({
            id: `${job.id}-paving`,
            job_id: job.id!,
            phase_type: 'paving',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(pavingEnd),
            daily_target: job.estimated_tons / estimate.paving_days,
            daily_unit: 'tons',
            sequence_order: sequenceOrder++
          });
        }
        break;

      case 'drainage':
        // Excavation phase
        if (estimate.excavation_days && job.estimated_cubic_yards) {
          const excavationEnd = addDaysToDate(currentDate, estimate.excavation_days - 1);
          phases.push({
            id: `${job.id}-excavation`,
            job_id: job.id!,
            phase_type: 'excavation',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(excavationEnd),
            daily_target: job.estimated_cubic_yards / estimate.excavation_days,
            daily_unit: 'cubic_yards',
            sequence_order: sequenceOrder++
          });
          currentDate = addDaysToDate(excavationEnd, 1);
        }

        // Drainage phase
        if (estimate.drainage_days && job.estimated_linear_feet) {
          const drainageEnd = addDaysToDate(currentDate, estimate.drainage_days - 1);
          phases.push({
            id: `${job.id}-drainage`,
            job_id: job.id!,
            phase_type: 'drainage',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(drainageEnd),
            daily_target: job.estimated_linear_feet / estimate.drainage_days,
            daily_unit: 'linear_feet',
            sequence_order: sequenceOrder++
          });
          currentDate = addDaysToDate(drainageEnd, 1);
        }

        // Concrete phase
        if (estimate.concrete_days) {
          const concreteEnd = addDaysToDate(currentDate, estimate.concrete_days - 1);
          const concreteAmount = job.estimated_cubic_yards ? job.estimated_cubic_yards * 0.1 : 5; // Default concrete amount
          phases.push({
            id: `${job.id}-concrete`,
            job_id: job.id!,
            phase_type: 'concrete',
            estimated_start: formatDate(currentDate),
            estimated_end: formatDate(concreteEnd),
            daily_target: concreteAmount / estimate.concrete_days,
            daily_unit: 'cubic_yards',
            sequence_order: sequenceOrder++
          });
        }
        break;
    }

    return phases;
  }

  /**
   * Calculate the end date for a job based on start date and duration
   */
  static calculateEndDate(startDate: string, totalDays: number): string {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDays - 1); // -1 because start date counts as day 1
    return end.toISOString().split('T')[0];
  }

  /**
   * Get production rate information for display
   */
  static getProductionRates() {
    return this.BASE_RATES;
  }

  /**
   * Update base rates (for admin configuration)
   */
  static updateBaseRates(rates: Partial<typeof DurationEstimationService.BASE_RATES>) {
    Object.assign(this.BASE_RATES, rates);
  }
}

export default DurationEstimationService;