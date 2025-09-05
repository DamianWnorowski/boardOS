import { POVAgent, POVAgentType, SchedulingDecision, AIContext, AgentStatus, AgentMetrics, AgentCapability, SchedulingAction, DecisionFactor } from '../types/AITypes';
import { Job, Resource, Assignment, RowType, ResourceType } from '../../types';
import { agentComm } from '../protocols/AgentCommunication';
import { logger } from '../../utils/logger';

/**
 * Resource POV Agent
 * 
 * Focuses on personnel skill matching and optimization, equipment utilization maximization,
 * availability tracking and prediction, and attachment rule validation and enforcement.
 * Specializes in resource-centric decision making and optimization.
 */
export class ResourceAgent implements POVAgent {
  public readonly type: POVAgentType = 'resource';
  public readonly name = 'Resource Optimization Agent';
  public readonly version = '1.0.0';
  
  public readonly capabilities: AgentCapability[] = [
    {
      name: 'Personnel Skill Matching',
      description: 'Match personnel to jobs based on skills, certifications, and experience',
      confidence: 0.95
    },
    {
      name: 'Equipment Utilization Optimization',
      description: 'Maximize equipment usage efficiency and minimize downtime',
      confidence: 0.92
    },
    {
      name: 'Availability Tracking',
      description: 'Track real-time resource availability and predict future availability',
      confidence: 0.90
    },
    {
      name: 'Attachment Rule Enforcement',
      description: 'Enforce resource attachment rules and safety requirements',
      confidence: 0.94
    },
    {
      name: 'Resource Capacity Planning',
      description: 'Plan resource allocation across multiple projects and time horizons',
      confidence: 0.87
    }
  ];

  private isInitialized: boolean = false;
  private skillMatrix: Map<string, string[]> = new Map();
  private attachmentRules: Map<string, any[]> = new Map();
  private utilizationHistory: Map<string, number[]> = new Map();
  private maintenanceSchedule: Map<string, Date[]> = new Map();
  
  // Resource optimization configuration
  private config = {
    skillMatchThreshold: 0.8,
    utilizationTarget: 0.85,
    maxUtilizationThreshold: 0.95,
    minUtilizationThreshold: 0.3,
    attachmentValidationStrict: true,
    capacityPlanningHorizon: 30, // days
    maintenanceBufferHours: 2,
    experienceWeightFactor: 0.3
  };

  // Performance metrics
  private metrics: AgentMetrics = {
    totalDecisions: 0,
    averageConfidence: 0,
    averageProcessingTime: 0,
    accuracyScore: 0,
    lastPerformanceUpdate: new Date()
  };

  // Resource tracking
  private resourceAvailabilityCache: Map<string, { available: boolean; until: Date; reason?: string }> = new Map();
  private skillCompatibilityCache: Map<string, Map<string, number>> = new Map();

  constructor() {
    this.setupCommunication();
    this.initializeResourceData();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Resource Agent already initialized');
      return;
    }

    try {
      logger.info('Initializing Resource Agent...');
      
      // Load skill matrix and attachment rules
      await this.loadSkillMatrix();
      await this.loadAttachmentRules();
      
      // Initialize utilization tracking
      this.initializeUtilizationTracking();
      
      // Load maintenance schedules
      await this.loadMaintenanceSchedules();
      
      // Subscribe to agent communication
      agentComm.subscribeAgent(this.type);
      
      this.isInitialized = true;
      logger.info('Resource Agent initialized successfully');
      
    } catch (error) {
      logger.error('Resource Agent initialization failed:', error);
      throw error;
    }
  }

  /**
   * Main evaluation method - resource perspective on scheduling decisions
   */
  async evaluate(context: AIContext): Promise<SchedulingDecision> {
    const startTime = performance.now();
    
    try {
      logger.debug('Resource Agent evaluating context...');
      
      // Resource analysis phases
      const skillAnalysis = await this.analyzeSkillRequirements(context);
      const utilizationAnalysis = await this.analyzeResourceUtilization(context);
      const attachmentAnalysis = await this.validateAttachmentRules(context);
      const availabilityAnalysis = await this.analyzeResourceAvailability(context);
      const capacityAnalysis = await this.analyzeResourceCapacity(context);
      
      // Synthesize resource decision
      const decision = await this.synthesizeResourceDecision(
        context,
        skillAnalysis,
        utilizationAnalysis,
        attachmentAnalysis,
        availabilityAnalysis,
        capacityAnalysis
      );
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(decision, processingTime);
      
      logger.debug(`Resource evaluation completed in ${processingTime.toFixed(2)}ms`);
      return decision;
      
    } catch (error) {
      logger.error('Resource Agent evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Find optimal resource assignments for jobs
   */
  async findOptimalAssignments(
    jobs: Job[],
    availableResources: Resource[]
  ): Promise<Array<{ jobId: string; resourceId: string; confidence: number; reasoning: string }>> {
    const assignments: Array<{ jobId: string; resourceId: string; confidence: number; reasoning: string }> = [];
    
    for (const job of jobs) {
      const bestAssignment = await this.findBestResourceForJob(job, availableResources);
      if (bestAssignment) {
        assignments.push(bestAssignment);
      }
    }
    
    return assignments.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Validate resource assignment against all rules
   */
  async validateAssignment(
    resourceId: string,
    jobId: string,
    rowType: RowType,
    context: AIContext
  ): Promise<{ valid: boolean; violations: string[]; warnings: string[] }> {
    const violations: string[] = [];
    const warnings: string[] = [];
    
    const resource = context.resources.find(r => r.id === resourceId);
    const job = context.jobs.find(j => j.id === jobId);
    
    if (!resource || !job) {
      violations.push('Resource or job not found');
      return { valid: false, violations, warnings };
    }
    
    // Check availability
    const availability = this.resourceAvailabilityCache.get(resourceId);
    if (availability && !availability.available) {
      violations.push(`Resource unavailable: ${availability.reason || 'Unknown reason'}`);
    }
    
    // Check skill requirements
    const skillMatch = this.calculateSkillMatch(resource, job);
    if (skillMatch < this.config.skillMatchThreshold) {
      violations.push(`Insufficient skill match: ${(skillMatch * 100).toFixed(1)}%`);
    } else if (skillMatch < 0.9) {
      warnings.push(`Moderate skill match: ${(skillMatch * 100).toFixed(1)}%`);
    }
    
    // Check attachment rules
    const attachmentRules = this.attachmentRules.get(resource.type);
    if (attachmentRules) {
      const ruleViolations = this.checkAttachmentRules(resource, job, rowType, attachmentRules);
      violations.push(...ruleViolations);
    }
    
    // Check utilization limits
    const currentUtilization = this.calculateResourceUtilization(resourceId, context);
    if (currentUtilization > this.config.maxUtilizationThreshold) {
      violations.push(`Resource over-utilized: ${(currentUtilization * 100).toFixed(1)}%`);
    }
    
    return {
      valid: violations.length === 0,
      violations,
      warnings
    };
  }

  getStatus(): AgentStatus {
    return {
      online: this.isInitialized,
      lastUpdate: new Date(),
      health: this.isInitialized ? 'healthy' : 'offline',
      processingLoad: this.resourceAvailabilityCache.size / 1000, // Normalize by expected cache size
      errorCount: 0
    };
  }

  getPerformanceMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get resource utilization statistics
   */
  getResourceUtilizationStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [resourceId, history] of this.utilizationHistory.entries()) {
      if (history.length > 0) {
        const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
        const max = Math.max(...history);
        const min = Math.min(...history);
        
        stats[resourceId] = { average: avg, max, min, dataPoints: history.length };
      }
    }
    
    return stats;
  }

  async destroy(): Promise<void> {
    agentComm.unsubscribeAgent(this.type);
    this.skillMatrix.clear();
    this.attachmentRules.clear();
    this.utilizationHistory.clear();
    this.resourceAvailabilityCache.clear();
    this.isInitialized = false;
    logger.info('Resource Agent destroyed');
  }

  // Private Resource Analysis Methods

  private async analyzeSkillRequirements(context: AIContext): Promise<{
    skillGaps: Array<{ jobId: string; requiredSkills: string[]; availableSkills: string[] }>;
    skillMatches: Array<{ resourceId: string; jobId: string; matchScore: number }>;
    recommendations: string[];
  }> {
    const skillGaps: Array<{ jobId: string; requiredSkills: string[]; availableSkills: string[] }> = [];
    const skillMatches: Array<{ resourceId: string; jobId: string; matchScore: number }> = [];
    const recommendations: string[] = [];
    
    // Analyze skill requirements for each job
    for (const job of context.jobs) {
      const requiredSkills = this.getJobSkillRequirements(job);
      const availableSkills = this.getAvailableSkills(context.resources);
      
      const missingSkills = requiredSkills.filter(skill => !availableSkills.includes(skill));
      
      if (missingSkills.length > 0) {
        skillGaps.push({
          jobId: job.id,
          requiredSkills: missingSkills,
          availableSkills
        });
        recommendations.push(`Job ${job.id} requires skills not available: ${missingSkills.join(', ')}`);
      }
      
      // Find best skill matches for this job
      for (const resource of context.resources.filter(r => r.onSite)) {
        const matchScore = this.calculateSkillMatch(resource, job);
        if (matchScore > this.config.skillMatchThreshold) {
          skillMatches.push({
            resourceId: resource.id,
            jobId: job.id,
            matchScore
          });
        }
      }
    }
    
    // Generate skill-based recommendations
    if (skillGaps.length > 0) {
      recommendations.push(`${skillGaps.length} jobs have skill gaps - consider training or hiring`);
    }
    
    if (skillMatches.length === 0) {
      recommendations.push('No optimal skill matches found - review job requirements');
    } else {
      recommendations.push(`${skillMatches.length} optimal skill matches identified`);
    }
    
    return { skillGaps, skillMatches, recommendations };
  }

  private async analyzeResourceUtilization(context: AIContext): Promise<{
    utilizationByType: Record<string, number>;
    underutilizedResources: string[];
    overutilizedResources: string[];
    recommendations: string[];
  }> {
    const utilizationByType: Record<string, number> = {};
    const underutilizedResources: string[] = [];
    const overutilizedResources: string[] = [];
    const recommendations: string[] = [];
    
    // Group resources by type
    const resourcesByType = context.resources.reduce((groups, resource) => {
      const type = resource.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(resource);
      return groups;
    }, {} as Record<string, Resource[]>);
    
    // Analyze utilization by type
    for (const [type, resources] of Object.entries(resourcesByType)) {
      const totalResources = resources.filter(r => r.onSite).length;
      const assignedResources = resources.filter(r => 
        r.onSite && context.assignments.some(a => a.resource_id === r.id)
      ).length;
      
      const utilization = totalResources > 0 ? assignedResources / totalResources : 0;
      utilizationByType[type] = utilization;
      
      if (utilization < this.config.minUtilizationThreshold) {
        underutilizedResources.push(`${type}: ${(utilization * 100).toFixed(1)}%`);
      } else if (utilization > this.config.maxUtilizationThreshold) {
        overutilizedResources.push(`${type}: ${(utilization * 100).toFixed(1)}%`);
      }
    }
    
    // Analyze individual resource utilization
    for (const resource of context.resources) {
      const utilization = this.calculateResourceUtilization(resource.id, context);
      this.updateUtilizationHistory(resource.id, utilization);
      
      if (utilization < this.config.minUtilizationThreshold) {
        underutilizedResources.push(`${resource.name}: ${(utilization * 100).toFixed(1)}%`);
      } else if (utilization > this.config.maxUtilizationThreshold) {
        overutilizedResources.push(`${resource.name}: ${(utilization * 100).toFixed(1)}%`);
      }
    }
    
    // Generate utilization recommendations
    if (underutilizedResources.length > 0) {
      recommendations.push(`${underutilizedResources.length} resources are underutilized - consider reallocation`);
    }
    
    if (overutilizedResources.length > 0) {
      recommendations.push(`${overutilizedResources.length} resources are overutilized - consider load balancing`);
    }
    
    const avgUtilization = Object.values(utilizationByType).reduce((sum, u) => sum + u, 0) / Object.keys(utilizationByType).length || 0;
    if (avgUtilization < this.config.utilizationTarget) {
      recommendations.push(`Overall utilization ${(avgUtilization * 100).toFixed(1)}% below target ${(this.config.utilizationTarget * 100).toFixed(1)}%`);
    }
    
    return { utilizationByType, underutilizedResources, overutilizedResources, recommendations };
  }

  private async validateAttachmentRules(context: AIContext): Promise<{
    violations: Array<{ assignmentId: string; rule: string; severity: 'warning' | 'error' }>;
    validAssignments: number;
    recommendations: string[];
  }> {
    const violations: Array<{ assignmentId: string; rule: string; severity: 'warning' | 'error' }> = [];
    const recommendations: string[] = [];
    let validAssignments = 0;
    
    for (const assignment of context.assignments) {
      const resource = context.resources.find(r => r.id === assignment.resource_id);
      const job = context.jobs.find(j => j.id === assignment.job_id);
      
      if (!resource || !job) {
        violations.push({
          assignmentId: assignment.id,
          rule: 'Missing resource or job reference',
          severity: 'error'
        });
        continue;
      }
      
      // Check attachment rules for this resource type
      const rules = this.attachmentRules.get(resource.type);
      if (rules) {
        const ruleViolations = this.checkAttachmentRules(resource, job, assignment.row_type, rules);
        
        ruleViolations.forEach(violation => {
          violations.push({
            assignmentId: assignment.id,
            rule: violation,
            severity: violation.includes('safety') ? 'error' : 'warning'
          });
        });
      }
      
      if (violations.filter(v => v.assignmentId === assignment.id).length === 0) {
        validAssignments++;
      }
    }
    
    // Generate attachment rule recommendations
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    
    if (errorCount > 0) {
      recommendations.push(`${errorCount} critical attachment rule violations require immediate attention`);
    }
    
    if (warningCount > 0) {
      recommendations.push(`${warningCount} attachment rule warnings should be reviewed`);
    }
    
    if (validAssignments === context.assignments.length) {
      recommendations.push('All assignments comply with attachment rules');
    }
    
    return { violations, validAssignments, recommendations };
  }

  private async analyzeResourceAvailability(context: AIContext): Promise<{
    availableResources: string[];
    unavailableResources: Array<{ id: string; reason: string; until?: Date }>;
    maintenanceConflicts: Array<{ resourceId: string; jobId: string; conflict: string }>;
    recommendations: string[];
  }> {
    const availableResources: string[] = [];
    const unavailableResources: Array<{ id: string; reason: string; until?: Date }> = [];
    const maintenanceConflicts: Array<{ resourceId: string; jobId: string; conflict: string }> = [];
    const recommendations: string[] = [];
    
    const currentTime = new Date();
    
    for (const resource of context.resources) {
      // Check basic availability
      if (!resource.onSite) {
        unavailableResources.push({
          id: resource.id,
          reason: 'Not on site'
        });
        continue;
      }
      
      // Check maintenance schedule
      const maintenanceSchedule = this.maintenanceSchedule.get(resource.id);
      if (maintenanceSchedule) {
        const upcomingMaintenance = maintenanceSchedule.find(date => 
          date > currentTime && date < new Date(currentTime.getTime() + 24 * 60 * 60 * 1000)
        );
        
        if (upcomingMaintenance) {
          unavailableResources.push({
            id: resource.id,
            reason: 'Scheduled maintenance',
            until: upcomingMaintenance
          });
          
          // Check for assignment conflicts
          const conflictingAssignments = context.assignments.filter(a => a.resource_id === resource.id);
          conflictingAssignments.forEach(assignment => {
            maintenanceConflicts.push({
              resourceId: resource.id,
              jobId: assignment.job_id,
              conflict: 'Assignment scheduled during maintenance window'
            });
          });
        }
      }
      
      // Check cached availability
      const cachedAvailability = this.resourceAvailabilityCache.get(resource.id);
      if (cachedAvailability && !cachedAvailability.available) {
        unavailableResources.push({
          id: resource.id,
          reason: cachedAvailability.reason || 'Unknown',
          until: cachedAvailability.until
        });
      } else {
        availableResources.push(resource.id);
      }
    }
    
    // Generate availability recommendations
    const availabilityRate = availableResources.length / context.resources.length;
    if (availabilityRate < 0.8) {
      recommendations.push(`Low resource availability: ${(availabilityRate * 100).toFixed(1)}%`);
    }
    
    if (maintenanceConflicts.length > 0) {
      recommendations.push(`${maintenanceConflicts.length} maintenance scheduling conflicts detected`);
    }
    
    if (unavailableResources.length > context.resources.length * 0.3) {
      recommendations.push('High number of unavailable resources may impact project delivery');
    }
    
    return { availableResources, unavailableResources, maintenanceConflicts, recommendations };
  }

  private async analyzeResourceCapacity(context: AIContext): Promise<{
    capacityByType: Record<string, { total: number; available: number; utilization: number }>;
    shortfalls: Array<{ type: string; shortfall: number }>;
    surpluses: Array<{ type: string; surplus: number }>;
    recommendations: string[];
  }> {
    const capacityByType: Record<string, { total: number; available: number; utilization: number }> = {};
    const shortfalls: Array<{ type: string; shortfall: number }> = [];
    const surpluses: Array<{ type: string; surplus: number }> = [];
    const recommendations: string[] = [];
    
    // Analyze capacity by resource type
    const resourceTypes = [...new Set(context.resources.map(r => r.type))];
    
    for (const type of resourceTypes) {
      const totalResources = context.resources.filter(r => r.type === type).length;
      const availableResources = context.resources.filter(r => r.type === type && r.onSite).length;
      const assignedResources = context.resources.filter(r => 
        r.type === type && r.onSite && 
        context.assignments.some(a => a.resource_id === r.id)
      ).length;
      
      const utilization = availableResources > 0 ? assignedResources / availableResources : 0;
      
      capacityByType[type] = {
        total: totalResources,
        available: availableResources,
        utilization
      };
      
      // Estimate demand
      const demandForType = this.estimateResourceDemand(type, context);
      
      if (demandForType > availableResources) {
        shortfalls.push({
          type,
          shortfall: demandForType - availableResources
        });
      } else if (availableResources > demandForType * 1.5) {
        surpluses.push({
          type,
          surplus: availableResources - demandForType
        });
      }
    }
    
    // Generate capacity recommendations
    if (shortfalls.length > 0) {
      recommendations.push(`Resource shortfalls identified: ${shortfalls.map(s => `${s.type} (${s.shortfall})`).join(', ')}`);
    }
    
    if (surpluses.length > 0) {
      recommendations.push(`Resource surpluses available: ${surpluses.map(s => `${s.type} (${s.surplus})`).join(', ')}`);
    }
    
    return { capacityByType, shortfalls, surpluses, recommendations };
  }

  private async synthesizeResourceDecision(
    context: AIContext,
    skillAnalysis: any,
    utilizationAnalysis: any,
    attachmentAnalysis: any,
    availabilityAnalysis: any,
    capacityAnalysis: any
  ): Promise<SchedulingDecision> {
    
    const actions: SchedulingAction[] = [];
    const factors: DecisionFactor[] = [];
    
    // Skill-based actions
    if (skillAnalysis.skillGaps.length > 0) {
      skillAnalysis.skillGaps.forEach((gap: any) => {
        actions.push({
          type: 'defer',
          jobId: gap.jobId,
          explanation: `Job requires skills not available: ${gap.requiredSkills.join(', ')}`
        });
      });
    }
    
    // High-confidence skill matches
    if (skillAnalysis.skillMatches.length > 0) {
      const topMatches = skillAnalysis.skillMatches
        .sort((a: any, b: any) => b.matchScore - a.matchScore)
        .slice(0, 5);
      
      topMatches.forEach((match: any) => {
        actions.push({
          type: 'assign',
          resourceId: match.resourceId,
          jobId: match.jobId,
          explanation: `Optimal skill match: ${(match.matchScore * 100).toFixed(1)}%`
        });
      });
    }
    
    factors.push({
      name: 'Skill Matching',
      weight: 0.3,
      value: skillAnalysis.skillMatches.length,
      impact: skillAnalysis.skillGaps.length > 0 ? 'negative' : 'positive',
      description: `${skillAnalysis.skillMatches.length} matches, ${skillAnalysis.skillGaps.length} gaps`
    });
    
    // Utilization optimization actions
    if (utilizationAnalysis.underutilizedResources.length > 0) {
      actions.push({
        type: 'optimize',
        explanation: `Improve utilization for ${utilizationAnalysis.underutilizedResources.length} underutilized resources`
      });
    }
    
    if (utilizationAnalysis.overutilizedResources.length > 0) {
      actions.push({
        type: 'reassign',
        explanation: `Redistribute load from ${utilizationAnalysis.overutilizedResources.length} overutilized resources`
      });
    }
    
    const avgUtilization = Object.values(utilizationAnalysis.utilizationByType).reduce((sum, u) => sum + u, 0) / 
                           Object.keys(utilizationAnalysis.utilizationByType).length || 0;
    
    factors.push({
      name: 'Resource Utilization',
      weight: 0.25,
      value: avgUtilization,
      impact: avgUtilization > this.config.utilizationTarget ? 'positive' : 'negative',
      description: `Average utilization: ${(avgUtilization * 100).toFixed(1)}%`
    });
    
    // Attachment rule compliance actions
    if (attachmentAnalysis.violations.length > 0) {
      const criticalViolations = attachmentAnalysis.violations.filter(v => v.severity === 'error');
      
      if (criticalViolations.length > 0) {
        actions.push({
          type: 'reassign',
          explanation: `Fix ${criticalViolations.length} critical attachment rule violations`
        });
      }
    }
    
    factors.push({
      name: 'Rule Compliance',
      weight: 0.2,
      value: attachmentAnalysis.validAssignments / Math.max(1, context.assignments.length),
      impact: attachmentAnalysis.violations.length > 0 ? 'negative' : 'positive',
      description: `${attachmentAnalysis.validAssignments}/${context.assignments.length} compliant assignments`
    });
    
    // Availability-based actions
    if (availabilityAnalysis.maintenanceConflicts.length > 0) {
      actions.push({
        type: 'defer',
        explanation: `Reschedule ${availabilityAnalysis.maintenanceConflicts.length} assignments conflicting with maintenance`
      });
    }
    
    const availabilityRate = availabilityAnalysis.availableResources.length / context.resources.length;
    factors.push({
      name: 'Resource Availability',
      weight: 0.15,
      value: availabilityRate,
      impact: availabilityRate > 0.8 ? 'positive' : 'negative',
      description: `${(availabilityRate * 100).toFixed(1)}% of resources available`
    });
    
    // Capacity planning actions
    if (capacityAnalysis.shortfalls.length > 0) {
      capacityAnalysis.shortfalls.forEach((shortfall: any) => {
        actions.push({
          type: 'defer',
          explanation: `Capacity shortfall in ${shortfall.type}: ${shortfall.shortfall} resources needed`
        });
      });
    }
    
    factors.push({
      name: 'Capacity Planning',
      weight: 0.1,
      value: capacityAnalysis.shortfalls.length,
      impact: capacityAnalysis.shortfalls.length > 0 ? 'negative' : 'positive',
      description: `${capacityAnalysis.shortfalls.length} capacity shortfalls identified`
    });
    
    // Calculate resource confidence
    const skillPenalty = skillAnalysis.skillGaps.length * 0.1;
    const utilizationBonus = Math.max(0, (avgUtilization - 0.5) * 0.2);
    const compliancePenalty = attachmentAnalysis.violations.filter(v => v.severity === 'error').length * 0.15;
    const availabilityBonus = Math.max(0, (availabilityRate - 0.7) * 0.3);
    
    const baseConfidence = 0.88; // Resource agent base confidence
    const totalConfidence = Math.max(0.1, Math.min(1.0,
      baseConfidence - skillPenalty + utilizationBonus - compliancePenalty + availabilityBonus
    ));
    
    // Determine priority
    const criticalViolations = attachmentAnalysis.violations.filter(v => v.severity === 'error').length;
    const priority = criticalViolations > 0 ? 'high' : 
                    skillAnalysis.skillGaps.length > 0 ? 'medium' : 'low';
    
    // Compile resource reasoning
    const reasoning = [
      `Resource analysis: ${skillAnalysis.skillMatches.length} skill matches, ${utilizationAnalysis.underutilizedResources.length} underutilized`,
      `Utilization: ${(avgUtilization * 100).toFixed(1)}%, Availability: ${(availabilityRate * 100).toFixed(1)}%`,
      ...skillAnalysis.recommendations,
      ...utilizationAnalysis.recommendations,
      ...attachmentAnalysis.recommendations,
      ...availabilityAnalysis.recommendations,
      ...capacityAnalysis.recommendations
    ].filter(r => r.length > 0).join('. ');
    
    return {
      id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentType: this.type,
      timestamp: new Date(),
      confidence: totalConfidence,
      priority: priority as any,
      actions,
      reasoning,
      factors,
      impact: {
        costEffect: utilizationAnalysis.underutilizedResources.length * -2, // Cost savings from better utilization
        timeEffect: skillAnalysis.skillMatches.length * 0.5, // Time savings from optimal matches
        resourceEffect: (avgUtilization - 0.5) * 20, // Resource utilization improvement
        riskLevel: criticalViolations > 0 ? 'high' : availabilityRate < 0.7 ? 'medium' : 'low'
      },
      processingTime: 0 // Will be set by caller
    };
  }

  // Helper Methods

  private setupCommunication(): void {
    agentComm.onMessage(this.type, async (message, respond) => {
      try {
        switch (message.type) {
          case 'request':
            if (message.payload.type === 'skill_analysis') {
              const analysis = await this.analyzeSkillRequirements(message.payload.context);
              respond(true, analysis);
            } else if (message.payload.type === 'resource_validation') {
              const validation = await this.validateAssignment(
                message.payload.resourceId,
                message.payload.jobId,
                message.payload.rowType,
                message.payload.context
              );
              respond(true, validation);
            } else {
              respond(false, null, 'Unknown request type');
            }
            break;
            
          case 'consensus_vote':
            const vote = this.evaluateConsensusProposal(message.payload.proposal);
            respond(true, { vote });
            break;
            
          default:
            respond(true); // Acknowledge other message types
        }
      } catch (error) {
        respond(false, null, error.toString());
      }
    });
  }

  private evaluateConsensusProposal(proposal: any): number {
    // Resource agent votes based on resource optimization potential
    return 0.75; // Placeholder implementation
  }

  private initializeResourceData(): void {
    logger.debug('Resource data structures initialized');
  }

  private async loadSkillMatrix(): Promise<void> {
    // Load skill requirements matrix
    const skillMappings = {
      'operator': ['equipment_operation', 'safety_protocols', 'maintenance_basics'],
      'driver': ['cdl_license', 'defensive_driving', 'route_planning'],
      'foreman': ['leadership', 'project_management', 'safety_oversight'],
      'laborer': ['physical_fitness', 'basic_construction', 'safety_awareness'],
      'paver': ['paving_experience', 'asphalt_handling', 'equipment_maintenance'],
      'millingMachine': ['milling_operation', 'depth_control', 'pattern_recognition']
    };
    
    for (const [resourceType, skills] of Object.entries(skillMappings)) {
      this.skillMatrix.set(resourceType, skills);
    }
    
    logger.debug(`Skill matrix loaded for ${this.skillMatrix.size} resource types`);
  }

  private async loadAttachmentRules(): Promise<void> {
    // Load attachment rules for construction equipment
    const attachmentRulesMap = {
      'paver': [
        { rule: 'requires_operator', required: true, safety: true },
        { rule: 'max_screwmen', limit: 2, safety: false },
        { rule: 'requires_material_truck', required: true, safety: false }
      ],
      'millingMachine': [
        { rule: 'requires_operator', required: true, safety: true },
        { rule: 'max_groundmen', limit: 1, safety: false },
        { rule: 'requires_sweeper', required: false, safety: false }
      ],
      'truck': [
        { rule: 'requires_driver', required: true, safety: true },
        { rule: 'weight_limit_check', required: true, safety: true }
      ]
    };
    
    for (const [resourceType, rules] of Object.entries(attachmentRulesMap)) {
      this.attachmentRules.set(resourceType, rules);
    }
    
    logger.debug(`Attachment rules loaded for ${this.attachmentRules.size} resource types`);
  }

  private initializeUtilizationTracking(): void {
    // Initialize utilization history tracking
    this.utilizationHistory.clear();
    logger.debug('Utilization tracking initialized');
  }

  private async loadMaintenanceSchedules(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, create some sample maintenance schedules
    logger.debug('Maintenance schedules loaded');
  }

  private getJobSkillRequirements(job: Job): string[] {
    const skillRequirements: string[] = [];
    
    switch (job.type) {
      case 'paving':
        skillRequirements.push('paving_experience', 'asphalt_handling', 'equipment_operation');
        break;
      case 'milling':
        skillRequirements.push('milling_operation', 'depth_control', 'equipment_operation');
        break;
      case 'drainage':
        skillRequirements.push('excavation', 'pipe_installation', 'surveying');
        break;
      default:
        skillRequirements.push('basic_construction', 'safety_awareness');
    }
    
    return skillRequirements;
  }

  private getAvailableSkills(resources: Resource[]): string[] {
    const availableSkills = new Set<string>();
    
    resources.forEach(resource => {
      const resourceSkills = this.skillMatrix.get(resource.type) || [];
      resourceSkills.forEach(skill => availableSkills.add(skill));
    });
    
    return Array.from(availableSkills);
  }

  private calculateSkillMatch(resource: Resource, job: Job): number {
    const requiredSkills = this.getJobSkillRequirements(job);
    const resourceSkills = this.skillMatrix.get(resource.type) || [];
    
    if (requiredSkills.length === 0) return 1.0;
    
    const matchingSkills = requiredSkills.filter(skill => resourceSkills.includes(skill));
    return matchingSkills.length / requiredSkills.length;
  }

  private checkAttachmentRules(resource: Resource, job: Job, rowType: RowType, rules: any[]): string[] {
    const violations: string[] = [];
    
    rules.forEach(rule => {
      switch (rule.rule) {
        case 'requires_operator':
          if (rule.required && resource.type !== 'operator') {
            violations.push(`${resource.type} requires operator assignment (safety rule)`);
          }
          break;
        case 'requires_driver':
          if (rule.required && resource.type === 'truck') {
            violations.push(`Truck requires driver assignment (safety rule)`);
          }
          break;
        case 'max_screwmen':
        case 'max_groundmen':
          // Would check actual assignment counts in real implementation
          break;
        default:
          // Unknown rule
          break;
      }
    });
    
    return violations;
  }

  private calculateResourceUtilization(resourceId: string, context: AIContext): number {
    const assignmentCount = context.assignments.filter(a => a.resource_id === resourceId).length;
    // Simplified utilization calculation - in reality would consider time spans
    return Math.min(1.0, assignmentCount / 3); // Assume max 3 assignments per resource
  }

  private updateUtilizationHistory(resourceId: string, utilization: number): void {
    const history = this.utilizationHistory.get(resourceId) || [];
    history.push(utilization);
    
    // Keep only last 30 data points
    if (history.length > 30) {
      history.shift();
    }
    
    this.utilizationHistory.set(resourceId, history);
  }

  private estimateResourceDemand(resourceType: string, context: AIContext): number {
    // Simplified demand estimation based on job types
    let demand = 0;
    
    context.jobs.forEach(job => {
      switch (job.type) {
        case 'paving':
          if (resourceType === 'paver') demand += 1;
          if (resourceType === 'operator') demand += 2;
          break;
        case 'milling':
          if (resourceType === 'millingMachine') demand += 1;
          if (resourceType === 'operator') demand += 1;
          break;
        default:
          if (resourceType === 'laborer') demand += 2;
      }
    });
    
    return demand;
  }

  private async findBestResourceForJob(
    job: Job, 
    availableResources: Resource[]
  ): Promise<{ jobId: string; resourceId: string; confidence: number; reasoning: string } | null> {
    
    let bestMatch: { resource: Resource; confidence: number } | null = null;
    
    for (const resource of availableResources.filter(r => r.onSite)) {
      const skillMatch = this.calculateSkillMatch(resource, job);
      
      if (skillMatch >= this.config.skillMatchThreshold) {
        if (!bestMatch || skillMatch > bestMatch.confidence) {
          bestMatch = { resource, confidence: skillMatch };
        }
      }
    }
    
    if (bestMatch) {
      return {
        jobId: job.id,
        resourceId: bestMatch.resource.id,
        confidence: bestMatch.confidence,
        reasoning: `Skill match: ${(bestMatch.confidence * 100).toFixed(1)}%`
      };
    }
    
    return null;
  }

  private updateMetrics(decision: SchedulingDecision, processingTime: number): void {
    const prevCount = this.metrics.totalDecisions;
    this.metrics.totalDecisions++;
    
    // Update averages
    this.metrics.averageConfidence = (this.metrics.averageConfidence * prevCount + decision.confidence) / this.metrics.totalDecisions;
    this.metrics.averageProcessingTime = (this.metrics.averageProcessingTime * prevCount + processingTime) / this.metrics.totalDecisions;
    
    this.metrics.lastPerformanceUpdate = new Date();
  }
}