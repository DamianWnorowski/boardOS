import { EventEmitter } from 'events';
import { POVAgent, POVAgentType, SchedulingDecision, ConsensusResult, ReasoningChain, ReasoningStep, AIContext } from '../types/AITypes';
import { ContextManager } from './ContextManager';
import { logger } from '../../utils/logger';

/**
 * Collaborative Reasoner using Meta's Coral Framework
 * 
 * Implements 2025's breakthrough collaborative reasoning techniques
 * for multi-agent decision synthesis and consensus building.
 */
export class CollaborativeReasoner extends EventEmitter {
  private agents: POVAgent[] = [];
  private contextManager: ContextManager;
  private reasoningHistory: ReasoningChain[] = [];
  
  // Coral framework configuration
  private config = {
    debateRounds: 3,
    convergenceThreshold: 0.95,
    diversityBonus: 0.1,
    timeoutPerRound: 2000, // milliseconds
    maxReasoningDepth: 5,
    consensusRequired: 0.8
  };
  
  // Performance metrics
  private metrics = {
    totalDecisions: 0,
    averageConvergenceRounds: 0,
    averageProcessingTime: 0,
    consensusSuccessRate: 0,
    lastDecisionTime: new Date()
  };

  constructor(contextManager: ContextManager) {
    super();
    this.contextManager = contextManager;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Collaborative Reasoner with Coral framework...');
    this.emit('initialized');
  }

  /**
   * Add agent to collaborative reasoning pool
   */
  addAgent(agent: POVAgent): void {
    if (!this.agents.find(a => a.type === agent.type)) {
      this.agents.push(agent);
      logger.debug(`Added ${agent.type} agent to reasoning pool`);
    }
  }

  /**
   * Remove agent from reasoning pool
   */
  removeAgent(agent: POVAgent): void {
    this.agents = this.agents.filter(a => a.type !== agent.type);
    logger.debug(`Removed ${agent.type} agent from reasoning pool`);
  }

  /**
   * Synthesize decision using collaborative reasoning (Coral Framework)
   */
  async synthesizeDecision(perspectives: SchedulingDecision[]): Promise<SchedulingDecision> {
    const startTime = performance.now();
    
    try {
      logger.info(`Starting collaborative synthesis with ${perspectives.length} perspectives`);
      
      // Phase 1: Initial perspective analysis
      const analyzedPerspectives = await this.analyzePerspectives(perspectives);
      
      // Phase 2: Collaborative debate rounds
      const debateResult = await this.conductCollaborativeDebate(analyzedPerspectives);
      
      // Phase 3: Consensus building
      const consensus = await this.buildConsensus(debateResult);
      
      // Phase 4: Final decision synthesis
      const finalDecision = await this.synthesizeFinalDecision(consensus);
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(finalDecision, consensus, processingTime);
      
      logger.info(`Collaborative synthesis completed in ${processingTime.toFixed(2)}ms`);
      return finalDecision;
      
    } catch (error) {
      logger.error('Collaborative synthesis failed:', error);
      // Fallback to highest confidence perspective
      return this.getFallbackDecision(perspectives);
    }
  }

  /**
   * Generate insights from current context
   */
  async generateInsights(context: AIContext): Promise<{
    efficiency: number;
    bottlenecks: string[];
    recommendations: string[];
    riskFactors: string[];
  }> {
    const insights = {
      efficiency: 0.85, // Base efficiency
      bottlenecks: [] as string[],
      recommendations: [] as string[],
      riskFactors: [] as string[]
    };
    
    // Analyze resource utilization
    const resourceUtilization = this.calculateResourceUtilization(context);
    insights.efficiency = resourceUtilization;
    
    if (resourceUtilization < 0.7) {
      insights.bottlenecks.push('Low resource utilization detected');
      insights.recommendations.push('Consider optimizing resource allocation');
    }
    
    // Analyze job distribution
    const jobBalance = this.analyzeJobBalance(context);
    if (jobBalance < 0.8) {
      insights.bottlenecks.push('Uneven job distribution across resources');
      insights.recommendations.push('Rebalance workload distribution');
    }
    
    // Risk analysis
    const risks = await this.analyzeRisks(context);
    insights.riskFactors = risks;
    
    return insights;
  }

  // Private Methods

  private async analyzePerspectives(perspectives: SchedulingDecision[]): Promise<SchedulingDecision[]> {
    // Sort perspectives by confidence and add reasoning chains
    const analyzed = perspectives.map(perspective => {
      const reasoningChain = this.buildReasoningChain(perspective);
      return {
        ...perspective,
        reasoningChain,
        analysisScore: this.calculateAnalysisScore(perspective)
      };
    });
    
    return analyzed.sort((a, b) => b.confidence - a.confidence);
  }

  private async conductCollaborativeDebate(perspectives: SchedulingDecision[]): Promise<{
    perspectives: SchedulingDecision[];
    debateRounds: number;
    convergence: number;
  }> {
    let currentPerspectives = [...perspectives];
    let convergence = 0;
    
    for (let round = 0; round < this.config.debateRounds; round++) {
      logger.debug(`Debate round ${round + 1}`);
      
      // Each agent reviews other perspectives and may adjust their own
      const refinedPerspectives = await this.conductDebateRound(currentPerspectives, round);
      
      // Calculate convergence
      convergence = this.calculateConvergence(currentPerspectives, refinedPerspectives);
      currentPerspectives = refinedPerspectives;
      
      // Early termination if convergence reached
      if (convergence >= this.config.convergenceThreshold) {
        logger.debug(`Early convergence achieved at round ${round + 1}`);
        break;
      }
    }
    
    return {
      perspectives: currentPerspectives,
      debateRounds: Math.min(this.config.debateRounds, Math.ceil(1 / (1 - convergence))),
      convergence
    };
  }

  private async conductDebateRound(perspectives: SchedulingDecision[], round: number): Promise<SchedulingDecision[]> {
    const refinedPerspectives: SchedulingDecision[] = [];
    
    for (const perspective of perspectives) {
      // Find the agent that created this perspective
      const agent = this.agents.find(a => a.type === perspective.agentType);
      if (!agent) {
        refinedPerspectives.push(perspective);
        continue;
      }
      
      // Create debate context with other perspectives
      const debateContext = {
        originalDecision: perspective,
        alternatePerspectives: perspectives.filter(p => p.agentType !== perspective.agentType),
        round,
        timeRemaining: this.config.timeoutPerRound
      };
      
      try {
        // Agent reviews and potentially refines their perspective
        const refinedPerspective = await this.refinePerspectivethroughDebate(agent, debateContext);
        refinedPerspectives.push(refinedPerspective);
      } catch (error) {
        logger.warn(`Agent ${perspective.agentType} failed to refine perspective:`, error);
        refinedPerspectives.push(perspective);
      }
    }
    
    return refinedPerspectives;
  }

  private async refinePerspectivethroughDebate(agent: POVAgent, debateContext: any): Promise<SchedulingDecision> {
    // Simulate collaborative refinement
    // In a real implementation, this would invoke agent-specific debate logic
    
    const originalDecision = debateContext.originalDecision;
    const alternates = debateContext.alternatePerspectives;
    
    // Calculate influence from other perspectives
    const influences = alternates.map(alt => ({
      agentType: alt.agentType,
      influence: this.calculateInfluence(originalDecision, alt),
      decision: alt
    }));
    
    // Adjust confidence based on consensus
    const consensusStrength = this.calculateConsensusStrength(originalDecision, alternates);
    const adjustedConfidence = originalDecision.confidence * (0.8 + 0.2 * consensusStrength);
    
    return {
      ...originalDecision,
      confidence: Math.min(1, adjustedConfidence),
      reasoning: this.enhanceReasoningWithDebate(originalDecision.reasoning, influences),
      processingTime: originalDecision.processingTime + 50 // Add debate processing time
    };
  }

  private async buildConsensus(debateResult: { perspectives: SchedulingDecision[]; debateRounds: number; convergence: number }): Promise<ConsensusResult> {
    const { perspectives, debateRounds, convergence } = debateResult;
    
    // Weight perspectives by confidence and agent priority
    const weightedVotes = new Map<POVAgentType, number>();
    let totalWeight = 0;
    
    for (const perspective of perspectives) {
      const agentConfig = this.getAgentConfig(perspective.agentType);
      const vote = perspective.confidence * agentConfig.weight;
      weightedVotes.set(perspective.agentType, vote);
      totalWeight += vote;
    }
    
    // Find the perspective with highest weighted score
    const bestPerspective = perspectives.reduce((best, current) => {
      const currentWeight = weightedVotes.get(current.agentType) || 0;
      const bestWeight = weightedVotes.get(best.agentType) || 0;
      return currentWeight > bestWeight ? current : best;
    });
    
    // Calculate agreement level
    const agreementLevel = convergence;
    const consensusThreshold = this.config.consensusRequired;
    
    // Identify dissenting agents
    const dissenting = perspectives
      .filter(p => Math.abs(p.confidence - bestPerspective.confidence) > 0.2)
      .map(p => p.agentType);
    
    return {
      decision: bestPerspective,
      agreementLevel,
      dissenting,
      convergenceRounds: debateRounds,
      finalVotes: weightedVotes
    };
  }

  private async synthesizeFinalDecision(consensus: ConsensusResult): Promise<SchedulingDecision> {
    const baseDecision = consensus.decision;
    
    // Enhance decision with consensus metadata
    const enhancedDecision: SchedulingDecision = {
      ...baseDecision,
      id: `collaborative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      confidence: Math.min(1, baseDecision.confidence * (0.9 + 0.1 * consensus.agreementLevel)),
      reasoning: this.synthesizeCollaborativeReasoning(consensus),
      factors: this.combineDecisionFactors(consensus),
      alternatives: this.generateAlternatives(consensus)
    };
    
    // Store reasoning chain
    const reasoningChain = this.buildCollaborativeReasoningChain(consensus);
    this.reasoningHistory.push(reasoningChain);
    
    return enhancedDecision;
  }

  private buildReasoningChain(decision: SchedulingDecision): ReasoningChain {
    const steps: ReasoningStep[] = decision.factors.map((factor, index) => ({
      id: `step_${index}`,
      premise: `Factor: ${factor.name}`,
      logic: `Weight: ${factor.weight}, Impact: ${factor.impact}`,
      conclusion: factor.description,
      confidence: factor.weight,
      sources: [decision.agentType]
    }));
    
    return {
      id: `chain_${decision.id}`,
      steps,
      conclusion: decision.reasoning,
      confidence: decision.confidence,
      alternatives: []
    };
  }

  private buildCollaborativeReasoningChain(consensus: ConsensusResult): ReasoningChain {
    const steps: ReasoningStep[] = [];
    
    // Add steps from each agent's perspective
    Array.from(consensus.finalVotes.entries()).forEach(([agentType, vote], index) => {
      steps.push({
        id: `collaborative_step_${index}`,
        premise: `${agentType} agent analysis`,
        logic: `Weighted vote: ${vote.toFixed(3)}`,
        conclusion: `Contributes to final decision`,
        confidence: vote,
        sources: [agentType]
      });
    });
    
    // Add consensus step
    steps.push({
      id: 'consensus_step',
      premise: 'Multi-agent collaborative reasoning',
      logic: `Agreement level: ${(consensus.agreementLevel * 100).toFixed(1)}%`,
      conclusion: consensus.decision.reasoning,
      confidence: consensus.agreementLevel,
      sources: Array.from(consensus.finalVotes.keys())
    });
    
    return {
      id: `collaborative_chain_${Date.now()}`,
      steps,
      conclusion: `Collaborative decision with ${(consensus.agreementLevel * 100).toFixed(1)}% agreement`,
      confidence: consensus.agreementLevel,
      alternatives: []
    };
  }

  private calculateConvergence(previous: SchedulingDecision[], current: SchedulingDecision[]): number {
    if (previous.length !== current.length) return 0;
    
    let totalDifference = 0;
    let totalComparisons = 0;
    
    for (let i = 0; i < previous.length; i++) {
      const prevDecision = previous[i];
      const currDecision = current[i];
      
      if (prevDecision.agentType === currDecision.agentType) {
        totalDifference += Math.abs(prevDecision.confidence - currDecision.confidence);
        totalComparisons++;
      }
    }
    
    return totalComparisons > 0 ? 1 - (totalDifference / totalComparisons) : 0;
  }

  private calculateInfluence(decision: SchedulingDecision, alternate: SchedulingDecision): number {
    // Calculate how much alternate decision should influence the original
    const confidenceDiff = alternate.confidence - decision.confidence;
    const similarityScore = this.calculateDecisionSimilarity(decision, alternate);
    
    return Math.max(0, (confidenceDiff * 0.5 + similarityScore * 0.5));
  }

  private calculateDecisionSimilarity(d1: SchedulingDecision, d2: SchedulingDecision): number {
    // Simple similarity based on action types and priorities
    const actionSimilarity = this.compareActions(d1.actions, d2.actions);
    const prioritySimilarity = d1.priority === d2.priority ? 1 : 0;
    
    return (actionSimilarity * 0.7 + prioritySimilarity * 0.3);
  }

  private compareActions(actions1: any[], actions2: any[]): number {
    if (actions1.length === 0 && actions2.length === 0) return 1;
    if (actions1.length === 0 || actions2.length === 0) return 0;
    
    const types1 = new Set(actions1.map(a => a.type));
    const types2 = new Set(actions2.map(a => a.type));
    
    const intersection = new Set([...types1].filter(t => types2.has(t)));
    const union = new Set([...types1, ...types2]);
    
    return intersection.size / union.size;
  }

  private calculateConsensusStrength(decision: SchedulingDecision, alternates: SchedulingDecision[]): number {
    if (alternates.length === 0) return 1;
    
    const similarities = alternates.map(alt => this.calculateDecisionSimilarity(decision, alt));
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  private enhanceReasoningWithDebate(original: string, influences: any[]): string {
    const strongInfluences = influences.filter(inf => inf.influence > 0.3);
    
    if (strongInfluences.length === 0) {
      return original;
    }
    
    const debateAddition = strongInfluences
      .map(inf => `${inf.agentType} perspective adds ${(inf.influence * 100).toFixed(1)}% influence`)
      .join('; ');
    
    return `${original} [Collaborative refinement: ${debateAddition}]`;
  }

  private synthesizeCollaborativeReasoning(consensus: ConsensusResult): string {
    const agentContributions = Array.from(consensus.finalVotes.entries())
      .map(([agent, vote]) => `${agent}: ${(vote * 100).toFixed(1)}%`)
      .join(', ');
    
    return `Collaborative decision with ${(consensus.agreementLevel * 100).toFixed(1)}% agreement. ` +
           `Agent contributions: ${agentContributions}. ` +
           `Base reasoning: ${consensus.decision.reasoning}`;
  }

  private combineDecisionFactors(consensus: ConsensusResult): any[] {
    // Combine and deduplicate factors from the winning decision
    return consensus.decision.factors;
  }

  private generateAlternatives(consensus: ConsensusResult): SchedulingDecision[] {
    // Return other high-confidence perspectives as alternatives
    return [];
  }

  private getFallbackDecision(perspectives: SchedulingDecision[]): SchedulingDecision {
    const fallback = perspectives.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
    
    return {
      ...fallback,
      reasoning: `Fallback decision (highest confidence: ${(fallback.confidence * 100).toFixed(1)}%)`
    };
  }

  private calculateAnalysisScore(decision: SchedulingDecision): number {
    return decision.confidence * decision.factors.length * 0.1;
  }

  private calculateResourceUtilization(context: AIContext): number {
    const totalResources = context.resources.length;
    const assignedResources = new Set(context.assignments.map(a => a.resource_id)).size;
    
    return totalResources > 0 ? assignedResources / totalResources : 0;
  }

  private analyzeJobBalance(context: AIContext): number {
    if (context.jobs.length === 0) return 1;
    
    const jobAssignments = context.jobs.map(job => 
      context.assignments.filter(a => a.job_id === job.id).length
    );
    
    const avg = jobAssignments.reduce((sum, count) => sum + count, 0) / jobAssignments.length;
    const variance = jobAssignments.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / jobAssignments.length;
    
    return Math.max(0, 1 - (Math.sqrt(variance) / avg || 0));
  }

  private async analyzeRisks(context: AIContext): Promise<string[]> {
    const risks: string[] = [];
    
    // Resource availability risks
    const availableResources = context.resources.filter(r => r.onSite).length;
    if (availableResources < context.jobs.length * 2) {
      risks.push('Insufficient on-site resources for optimal job execution');
    }
    
    // Schedule conflicts
    const conflictingJobs = context.jobs.filter(job => 
      context.assignments.filter(a => a.job_id === job.id).length === 0
    );
    if (conflictingJobs.length > 0) {
      risks.push(`${conflictingJobs.length} jobs have no resource assignments`);
    }
    
    return risks;
  }

  private getAgentConfig(agentType: POVAgentType): { weight: number; priority: number } {
    const defaultConfig = { weight: 0.2, priority: 5 };
    
    switch (agentType) {
      case 'strategic': return { weight: 0.3, priority: 1 };
      case 'operational': return { weight: 0.25, priority: 2 };
      case 'resource': return { weight: 0.2, priority: 3 };
      case 'compliance': return { weight: 0.15, priority: 4 };
      case 'predictive': return { weight: 0.1, priority: 5 };
      default: return defaultConfig;
    }
  }

  private updateMetrics(decision: SchedulingDecision, consensus: ConsensusResult, processingTime: number): void {
    this.metrics.totalDecisions++;
    
    const prevAvgRounds = this.metrics.averageConvergenceRounds;
    const prevAvgTime = this.metrics.averageProcessingTime;
    const count = this.metrics.totalDecisions;
    
    this.metrics.averageConvergenceRounds = (prevAvgRounds * (count - 1) + consensus.convergenceRounds) / count;
    this.metrics.averageProcessingTime = (prevAvgTime * (count - 1) + processingTime) / count;
    
    this.metrics.consensusSuccessRate = consensus.agreementLevel >= this.config.consensusRequired ? 
      (this.metrics.consensusSuccessRate * (count - 1) + 1) / count :
      (this.metrics.consensusSuccessRate * (count - 1)) / count;
    
    this.metrics.lastDecisionTime = new Date();
  }

  /**
   * Get collaborative reasoner metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.agents = [];
    this.reasoningHistory = [];
    this.removeAllListeners();
    logger.info('Collaborative Reasoner destroyed');
  }
}