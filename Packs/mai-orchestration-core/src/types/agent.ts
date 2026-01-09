/**
 * Agent Status Types
 *
 * Types for tracking agent status and managing agent registry.
 */

export type AgentStatusType = 'queued' | 'running' | 'complete' | 'failed';

export interface AgentStatus {
  agentId: string;
  taskId: string;
  status: AgentStatusType;
  startTime: Date;
  endTime?: Date;
  outputFile: string;
  progress?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  capabilities: Array<'implementation' | 'test' | 'review' | 'research'>;
  maxConcurrent: number;
  currentLoad: number;
}

/**
 * Agent Registry for tracking active agents
 */
export class AgentRegistry {
  private agents: Map<string, AgentStatus> = new Map();

  /**
   * Register or update an agent status
   */
  set(agentId: string, status: AgentStatus): void {
    this.agents.set(agentId, status);
  }

  /**
   * Get agent status by ID
   */
  get(agentId: string): AgentStatus | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all active agents (queued or running)
   */
  getActive(): AgentStatus[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'queued' || agent.status === 'running'
    );
  }

  /**
   * Get all completed agents
   */
  getCompleted(): AgentStatus[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'complete'
    );
  }

  /**
   * Get all failed agents
   */
  getFailed(): AgentStatus[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'failed'
    );
  }

  /**
   * Get agent by task ID
   */
  getByTask(taskId: string): AgentStatus | undefined {
    return Array.from(this.agents.values()).find(
      agent => agent.taskId === taskId
    );
  }

  /**
   * Update agent status
   */
  update(agentId: string, updates: Partial<AgentStatus>): void {
    const existing = this.agents.get(agentId);
    if (existing) {
      this.agents.set(agentId, { ...existing, ...updates });
    }
  }

  /**
   * Remove an agent from registry
   */
  remove(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * Get all agents
   */
  getAll(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent count
   */
  get size(): number {
    return this.agents.size;
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
  }
}

/**
 * Create an agent status entry
 */
export function createAgentStatus(
  agentId: string,
  taskId: string,
  outputFile: string
): AgentStatus {
  return {
    agentId,
    taskId,
    status: 'queued',
    startTime: new Date(),
    outputFile,
  };
}

/**
 * Mark agent as running
 */
export function markAgentRunning(status: AgentStatus): AgentStatus {
  return {
    ...status,
    status: 'running',
    startTime: new Date(),
  };
}

/**
 * Mark agent as complete
 */
export function markAgentComplete(status: AgentStatus): AgentStatus {
  return {
    ...status,
    status: 'complete',
    endTime: new Date(),
    progress: 100,
  };
}

/**
 * Mark agent as failed
 */
export function markAgentFailed(status: AgentStatus): AgentStatus {
  return {
    ...status,
    status: 'failed',
    endTime: new Date(),
  };
}

/**
 * Calculate agent duration in ms
 */
export function calculateAgentDuration(status: AgentStatus): number | undefined {
  if (!status.endTime) return undefined;
  return status.endTime.getTime() - status.startTime.getTime();
}
