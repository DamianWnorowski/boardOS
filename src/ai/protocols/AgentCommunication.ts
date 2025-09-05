import { EventEmitter } from 'events';
import { POVAgentType, A2AMessage, A2AResponse } from '../types/AITypes';
import { logger } from '../../utils/logger';

/**
 * Agent-to-Agent (A2A) Communication Protocol
 * 
 * Implements 2025's Agent-to-Agent communication standard
 * with support for broadcast, consensus voting, and async workflows.
 */
export class AgentCommunication extends EventEmitter {
  private messageQueue: Map<string, A2AMessage> = new Map();
  private responseHandlers: Map<string, (response: A2AResponse) => void> = new Map();
  private subscribedAgents: Set<POVAgentType> = new Set();
  private messageHistory: A2AMessage[] = [];
  
  // Configuration
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_HISTORY_SIZE = 500;
  private readonly MESSAGE_TIMEOUT = 5000; // milliseconds
  private readonly RETRY_ATTEMPTS = 3;
  
  // Metrics
  private metrics = {
    messagesSent: 0,
    messagesReceived: 0,
    responsesReceived: 0,
    timeouts: 0,
    errors: 0,
    averageResponseTime: 0
  };

  constructor() {
    super();
    this.setupCleanupTasks();
  }

  /**
   * Subscribe agent to communication protocol
   */
  subscribeAgent(agentType: POVAgentType): void {
    this.subscribedAgents.add(agentType);
    logger.debug(`Agent ${agentType} subscribed to A2A protocol`);
    this.emit('agentSubscribed', agentType);
  }

  /**
   * Unsubscribe agent from communication protocol
   */
  unsubscribeAgent(agentType: POVAgentType): void {
    this.subscribedAgents.delete(agentType);
    logger.debug(`Agent ${agentType} unsubscribed from A2A protocol`);
    this.emit('agentUnsubscribed', agentType);
  }

  /**
   * Send message to specific agent or broadcast to all
   */
  async sendMessage(
    from: POVAgentType,
    to: POVAgentType | 'broadcast',
    type: 'request' | 'response' | 'notification' | 'consensus_vote',
    payload: any,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      requiresResponse?: boolean;
      timeout?: number;
    } = {}
  ): Promise<A2AResponse | A2AResponse[] | void> {
    
    const message: A2AMessage = {
      id: this.generateMessageId(),
      from,
      to,
      type,
      timestamp: new Date(),
      payload,
      priority: options.priority || 'normal',
      requiresResponse: options.requiresResponse || false
    };

    try {
      // Validate message
      this.validateMessage(message);
      
      // Add to queue and history
      this.messageQueue.set(message.id, message);
      this.addToHistory(message);
      
      // Route message
      if (to === 'broadcast') {
        return await this.broadcastMessage(message, options.timeout);
      } else {
        return await this.sendDirectMessage(message, options.timeout);
      }
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to send A2A message:', error);
      throw error;
    }
  }

  /**
   * Send consensus vote request to all agents
   */
  async requestConsensusVote(
    from: POVAgentType,
    proposal: any,
    timeout: number = 10000
  ): Promise<Map<POVAgentType, any>> {
    
    const consensusPayload = {
      type: 'consensus_request',
      proposal,
      deadline: new Date(Date.now() + timeout),
      requiredAgents: Array.from(this.subscribedAgents).filter(a => a !== from)
    };

    const responses = await this.sendMessage(
      from,
      'broadcast',
      'consensus_vote',
      consensusPayload,
      { requiresResponse: true, timeout, priority: 'high' }
    ) as A2AResponse[];

    // Collect votes
    const votes = new Map<POVAgentType, any>();
    responses.forEach(response => {
      if (response.success && response.data?.vote !== undefined) {
        votes.set(response.from, response.data.vote);
      }
    });

    return votes;
  }

  /**
   * Send response to a received message
   */
  async sendResponse(
    originalMessageId: string,
    from: POVAgentType,
    success: boolean,
    data?: any,
    error?: string
  ): Promise<void> {
    
    const response: A2AResponse = {
      messageId: originalMessageId,
      from,
      timestamp: new Date(),
      success,
      data,
      error
    };

    // Find the response handler
    const handler = this.responseHandlers.get(originalMessageId);
    if (handler) {
      handler(response);
      this.responseHandlers.delete(originalMessageId);
    }

    this.metrics.responsesReceived++;
    this.emit('responseReceived', response);
  }

  /**
   * Register message handler for incoming messages
   */
  onMessage(
    agentType: POVAgentType,
    handler: (message: A2AMessage, respond: (success: boolean, data?: any, error?: string) => void) => void
  ): void {
    
    this.on(`message:${agentType}`, (message: A2AMessage) => {
      const respond = (success: boolean, data?: any, error?: string) => {
        this.sendResponse(message.id, agentType, success, data, error);
      };
      
      try {
        handler(message, respond);
      } catch (error) {
        logger.error(`Message handler error for ${agentType}:`, error);
        respond(false, null, error.toString());
      }
    });

    logger.debug(`Message handler registered for ${agentType}`);
  }

  /**
   * Get communication metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.messageQueue.size,
      historySize: this.messageHistory.length,
      subscribedAgents: this.subscribedAgents.size,
      pendingResponses: this.responseHandlers.size
    };
  }

  /**
   * Get message history for debugging
   */
  getMessageHistory(limit: number = 50): A2AMessage[] {
    return this.messageHistory.slice(-limit);
  }

  // Private Methods

  private async broadcastMessage(message: A2AMessage, timeout?: number): Promise<A2AResponse[]> {
    const targetAgents = Array.from(this.subscribedAgents).filter(agent => agent !== message.from);
    const responses: A2AResponse[] = [];
    
    const broadcastPromises = targetAgents.map(async (agent) => {
      try {
        const response = await this.deliverToAgent(agent, message, timeout);
        if (response) responses.push(response);
      } catch (error) {
        logger.warn(`Broadcast delivery failed to ${agent}:`, error);
        // Continue with other agents
      }
    });

    await Promise.all(broadcastPromises);
    
    this.metrics.messagesSent += targetAgents.length;
    logger.debug(`Broadcast message sent to ${targetAgents.length} agents, ${responses.length} responses`);
    
    return responses;
  }

  private async sendDirectMessage(message: A2AMessage, timeout?: number): Promise<A2AResponse | void> {
    const targetAgent = message.to as POVAgentType;
    
    if (!this.subscribedAgents.has(targetAgent)) {
      throw new Error(`Agent ${targetAgent} not subscribed to A2A protocol`);
    }

    try {
      const response = await this.deliverToAgent(targetAgent, message, timeout);
      this.metrics.messagesSent++;
      
      if (response) {
        this.updateResponseTimeMetrics(message.timestamp, response.timestamp);
      }
      
      return response;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  private async deliverToAgent(
    agent: POVAgentType,
    message: A2AMessage,
    timeout?: number
  ): Promise<A2AResponse | null> {
    
    return new Promise((resolve, reject) => {
      // Set up response handler if response is required
      if (message.requiresResponse) {
        const responseTimeout = timeout || this.MESSAGE_TIMEOUT;
        
        const timeoutId = setTimeout(() => {
          this.responseHandlers.delete(message.id);
          this.metrics.timeouts++;
          resolve(null); // Don't reject, just resolve with null for timeouts
        }, responseTimeout);

        this.responseHandlers.set(message.id, (response: A2AResponse) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      }

      // Emit message to the target agent
      this.emit(`message:${agent}`, message);
      this.metrics.messagesReceived++;

      // If no response required, resolve immediately
      if (!message.requiresResponse) {
        resolve(null);
      }
    });
  }

  private validateMessage(message: A2AMessage): void {
    if (!message.from || !message.to || !message.type) {
      throw new Error('Invalid message: missing required fields');
    }

    if (message.to !== 'broadcast' && !this.subscribedAgents.has(message.to as POVAgentType)) {
      throw new Error(`Target agent ${message.to} not subscribed`);
    }

    if (!['request', 'response', 'notification', 'consensus_vote'].includes(message.type)) {
      throw new Error(`Invalid message type: ${message.type}`);
    }
  }

  private addToHistory(message: A2AMessage): void {
    this.messageHistory.push(message);
    
    // Maintain history size limit
    if (this.messageHistory.length > this.MAX_HISTORY_SIZE) {
      this.messageHistory = this.messageHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  private generateMessageId(): string {
    return `a2a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateResponseTimeMetrics(sentTime: Date, responseTime: Date): void {
    const responseTimeMs = responseTime.getTime() - sentTime.getTime();
    
    const currentAvg = this.metrics.averageResponseTime;
    const count = this.metrics.responsesReceived;
    
    this.metrics.averageResponseTime = (currentAvg * (count - 1) + responseTimeMs) / count;
  }

  private setupCleanupTasks(): void {
    // Clean up old messages every 5 minutes
    setInterval(() => {
      this.cleanupOldMessages();
    }, 5 * 60 * 1000);

    // Clean up expired response handlers every minute
    setInterval(() => {
      this.cleanupExpiredHandlers();
    }, 60 * 1000);
  }

  private cleanupOldMessages(): void {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    // Clean queue
    const messagesToRemove = Array.from(this.messageQueue.entries())
      .filter(([_, message]) => message.timestamp < cutoff)
      .map(([id]) => id);
    
    messagesToRemove.forEach(id => this.messageQueue.delete(id));
    
    // Clean history
    this.messageHistory = this.messageHistory.filter(msg => msg.timestamp >= cutoff);
    
    if (messagesToRemove.length > 0) {
      logger.debug(`Cleaned up ${messagesToRemove.length} old messages`);
    }
  }

  private cleanupExpiredHandlers(): void {
    const expiredHandlers: string[] = [];
    const expiredCutoff = new Date(Date.now() - this.MESSAGE_TIMEOUT);
    
    this.messageQueue.forEach((message, id) => {
      if (message.timestamp < expiredCutoff && this.responseHandlers.has(id)) {
        expiredHandlers.push(id);
      }
    });
    
    expiredHandlers.forEach(id => {
      this.responseHandlers.delete(id);
      this.messageQueue.delete(id);
    });
    
    if (expiredHandlers.length > 0) {
      logger.debug(`Cleaned up ${expiredHandlers.length} expired response handlers`);
    }
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.messageQueue.clear();
    this.responseHandlers.clear();
    this.messageHistory = [];
    this.subscribedAgents.clear();
    this.removeAllListeners();
    
    logger.info('Agent Communication protocol destroyed');
  }
}

// Export singleton instance
export const agentComm = new AgentCommunication();