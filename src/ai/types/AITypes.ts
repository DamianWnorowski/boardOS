import { Job, Resource, Assignment, RowType } from '../../types';

/**
 * AI Types for Multi-POV Scheduling System
 * Based on 2025 AI breakthroughs and construction scheduling best practices
 */

// Core POV Agent Types
export type POVAgentType = 'strategic' | 'operational' | 'resource' | 'compliance' | 'predictive';

// AI Context for maintaining state across agents
export interface AIContext {
  jobs: Job[];
  resources: Resource[];
  assignments: Assignment[];
  constraints?: any;
  timestamp: Date;
  sessionId: string;
  historical?: {
    pastJobs: Job[];
    performanceMetrics: Record<string, number>;
    patterns: SchedulingPattern[];
  };
  realTime?: {
    weatherData?: WeatherCondition[];
    trafficData?: TrafficCondition[];
    emergencies?: EmergencyEvent[];
  };
}

// Scheduling Decision Structure
export interface SchedulingDecision {
  id: string;
  agentType: POVAgentType;
  timestamp: Date;
  confidence: number; // 0-1 confidence score
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Recommended actions
  actions: SchedulingAction[];
  
  // Reasoning and explanation
  reasoning: string;
  factors: DecisionFactor[];
  
  // Impact analysis
  impact: {
    costEffect: number; // percentage change
    timeEffect: number; // hours gained/lost
    resourceEffect: number; // utilization change
    riskLevel: 'low' | 'medium' | 'high';
  };
  
  // Alternative options
  alternatives?: SchedulingDecision[];
  
  // Metadata
  processingTime: number; // milliseconds
  dataQuality: number; // 0-1 score
}

// Individual scheduling actions
export interface SchedulingAction {
  type: 'assign' | 'reassign' | 'unassign' | 'defer' | 'prioritize' | 'optimize';
  resourceId?: string;
  jobId?: string;
  rowType?: RowType;
  position?: number;
  timestamp?: Date;
  parameters?: Record<string, any>;
  explanation: string;
}

// Decision factors for explainability
export interface DecisionFactor {
  name: string;
  weight: number; // 0-1 influence on decision
  value: any;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// Consensus building result
export interface ConsensusResult {
  decision: SchedulingDecision;
  agreementLevel: number; // 0-1
  dissenting: POVAgentType[];
  convergenceRounds: number;
  finalVotes: Map<POVAgentType, number>;
}

// Pattern recognition for strategic planning
export interface SchedulingPattern {
  id: string;
  name: string;
  frequency: number; // times seen
  success_rate: number; // 0-1
  conditions: PatternCondition[];
  outcomes: PatternOutcome[];
  seasonality?: 'daily' | 'weekly' | 'monthly' | 'seasonal';
}

export interface PatternCondition {
  type: 'weather' | 'resource' | 'job_type' | 'time' | 'location';
  value: any;
  operator: '=' | '>' | '<' | 'in' | 'like';
}

export interface PatternOutcome {
  metric: string;
  value: number;
  variance: number;
}

// Environmental conditions
export interface WeatherCondition {
  timestamp: Date;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  visibility: number;
  workability: number; // 0-1 score for construction work
}

export interface TrafficCondition {
  timestamp: Date;
  location: string;
  congestionLevel: number; // 0-1
  travelTime: number; // minutes
  alternateRoutes: string[];
}

export interface EmergencyEvent {
  id: string;
  type: 'accident' | 'equipment_failure' | 'weather' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedResources: string[];
  estimatedDuration: number; // hours
  mitigationOptions: string[];
}

// Base POV Agent Interface
export interface POVAgent {
  type: POVAgentType;
  name: string;
  version: string;
  capabilities: AgentCapability[];
  
  // Core evaluation method
  evaluate(context: AIContext): Promise<SchedulingDecision>;
  
  // Agent-specific methods
  initialize(): Promise<void>;
  updateModel?(data: any): Promise<void>;
  getStatus(): AgentStatus;
  destroy?(): Promise<void>;
  
  // Performance and learning
  getPerformanceMetrics(): AgentMetrics;
  learn?(feedback: AgentFeedback): Promise<void>;
}

export interface AgentCapability {
  name: string;
  description: string;
  confidence: number; // 0-1 agent's confidence in this capability
}

export interface AgentStatus {
  online: boolean;
  lastUpdate: Date;
  health: 'healthy' | 'degraded' | 'offline';
  processingLoad: number; // 0-1
  errorCount: number;
}

export interface AgentMetrics {
  totalDecisions: number;
  averageConfidence: number;
  averageProcessingTime: number;
  accuracyScore: number; // based on feedback
  lastPerformanceUpdate: Date;
}

export interface AgentFeedback {
  decisionId: string;
  actualOutcome: any;
  userRating?: number; // 1-5
  correctness: boolean;
  improvements?: string[];
}

// Genetic Algorithm Types for Schedule Optimization
export interface GeneticScheduleGenome {
  assignments: ChromosomeAssignment[];
  fitness: number;
  generation: number;
  mutations: number;
}

export interface ChromosomeAssignment {
  resourceId: string;
  jobId: string;
  rowType: RowType;
  position: number;
  timeSlot?: {
    start: Date;
    end: Date;
  };
}

// Reinforcement Learning Types
export interface RLState {
  resourceUtilization: number[];
  jobPriorities: number[];
  timeConstraints: number[];
  costFactors: number[];
}

export interface RLAction {
  type: 'assign' | 'reassign' | 'wait';
  resourceIndex: number;
  jobIndex: number;
  confidence: number;
}

export interface RLReward {
  immediate: number;
  delayed: number;
  total: number;
  components: {
    efficiency: number;
    cost: number;
    satisfaction: number;
    compliance: number;
  };
}

// Collaborative Reasoning Types
export interface ReasoningChain {
  id: string;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  alternatives: ReasoningChain[];
}

export interface ReasoningStep {
  id: string;
  premise: string;
  logic: string;
  conclusion: string;
  confidence: number;
  sources: string[];
}

// Multi-Agent Communication Protocol
export interface A2AMessage {
  id: string;
  from: POVAgentType;
  to: POVAgentType | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'consensus_vote';
  timestamp: Date;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiresResponse: boolean;
}

export interface A2AResponse {
  messageId: string;
  from: POVAgentType;
  timestamp: Date;
  success: boolean;
  data?: any;
  error?: string;
}

// Configuration Types
export interface AIConfiguration {
  orchestrator: {
    maxAgents: number;
    consensusThreshold: number;
    timeoutMs: number;
    maxRetries: number;
  };
  agents: {
    [K in POVAgentType]: {
      weight: number;
      priority: number;
      enabled: boolean;
    };
  };
  algorithms: {
    genetic: GeneticAlgorithmConfig;
    reinforcement: RLConfig;
    collaborative: CollaborativeConfig;
  };
}

export interface GeneticAlgorithmConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  fitnessFunction: 'weighted' | 'pareto' | 'hybrid';
}

export interface RLConfig {
  algorithm: 'DQN' | 'PPO' | 'A3C';
  episodes: number;
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  memorySize: number;
}

export interface CollaborativeConfig {
  debateRounds: number;
  convergenceThreshold: number;
  diversityBonus: number;
  timeoutPerRound: number;
}

// Export utility types
export type AgentRegistry = Map<POVAgentType, POVAgent>;
export type DecisionHistory = SchedulingDecision[];
export type PerformanceMetrics = Map<string, number>;