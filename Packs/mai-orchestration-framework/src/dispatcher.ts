/**
 * Agent Dispatcher
 *
 * Dispatches tasks to appropriate agents based on task type and agent availability.
 */

import type { FarmTask, AgentConfig, TaskType } from 'mai-orchestration-core';

export interface DispatchResult {
  agentId: string;
  outputFile: string;
}

/**
 * Default agent configurations
 */
const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'general-purpose',
    name: 'General Purpose Agent',
    capabilities: ['implementation', 'test', 'review', 'research'],
    maxConcurrent: 5,
    currentLoad: 0,
  },
  {
    id: 'bash',
    name: 'Bash Agent',
    capabilities: ['implementation', 'test'],
    maxConcurrent: 3,
    currentLoad: 0,
  },
  {
    id: 'explore',
    name: 'Explore Agent',
    capabilities: ['research', 'review'],
    maxConcurrent: 5,
    currentLoad: 0,
  },
];

export class AgentDispatcher {
  private agents: Map<string, AgentConfig>;
  private taskOutputDir: string;

  constructor(outputDir: string = '/tmp/mai-orchestration') {
    this.agents = new Map();
    this.taskOutputDir = outputDir;

    // Initialize with default agents
    for (const agent of DEFAULT_AGENTS) {
      this.agents.set(agent.id, { ...agent });
    }
  }

  /**
   * Select the best agent for a task type
   */
  selectAgent(taskType: TaskType): AgentConfig | undefined {
    const candidates = Array.from(this.agents.values())
      .filter(agent => agent.capabilities.includes(taskType))
      .filter(agent => agent.currentLoad < agent.maxConcurrent)
      .sort((a, b) => a.currentLoad - b.currentLoad); // Prefer less loaded agents

    return candidates[0];
  }

  /**
   * Dispatch a task to an agent
   */
  dispatch(task: FarmTask): DispatchResult | undefined {
    const agent = this.selectAgent(task.type);

    if (!agent) {
      return undefined;
    }

    // Increment load
    agent.currentLoad++;
    this.agents.set(agent.id, agent);

    // Generate output file path
    const outputFile = `${this.taskOutputDir}/${task.taskId}.output`;

    return {
      agentId: agent.id,
      outputFile,
    };
  }

  /**
   * Release an agent (task completed)
   */
  release(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent && agent.currentLoad > 0) {
      agent.currentLoad--;
      this.agents.set(agentId, agent);
    }
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.currentLoad < agent.maxConcurrent
    );
  }

  /**
   * Check if a specific agent is available
   */
  isAgentAvailable(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    return agent !== undefined && agent.currentLoad < agent.maxConcurrent;
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get total capacity
   */
  getTotalCapacity(): { total: number; used: number; available: number } {
    let total = 0;
    let used = 0;

    for (const agent of this.agents.values()) {
      total += agent.maxConcurrent;
      used += agent.currentLoad;
    }

    return { total, used, available: total - used };
  }

  /**
   * Register a custom agent
   */
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, { ...config, currentLoad: 0 });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }
}
