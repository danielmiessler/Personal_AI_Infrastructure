/**
 * Agent Extractor
 *
 * Extracts spawned agent information from parsed transcript.
 * Identifies Task tool calls and their status.
 *
 * All operations are DETERMINISTIC - no LLM calls.
 */

import type { ParsedTranscript } from './transcript.ts';

export interface SpawnedAgent {
  id: string;
  task: string;
  status: 'running' | 'completed' | 'unknown';
  subagentType?: string;
  timestamp?: string;
}

/**
 * Extract agent information from transcript
 */
export function extractAgentInfo(transcript: ParsedTranscript): SpawnedAgent[] {
  const agents: SpawnedAgent[] = [];
  const agentMap = new Map<string, SpawnedAgent>();

  for (const call of transcript.toolCalls) {
    if (call.tool === 'Task') {
      const description = call.params.description || call.params.prompt || 'Unknown task';
      const subagentType = call.params.subagent_type;

      // Generate a short ID from the description
      const id = generateAgentId(String(description));

      const agent: SpawnedAgent = {
        id,
        task: String(description).slice(0, 50),
        status: 'running',
        subagentType: subagentType ? String(subagentType) : undefined,
        timestamp: call.timestamp,
      };

      agentMap.set(id, agent);
    }

    // Check for TaskOutput calls to update status
    if (call.tool === 'TaskOutput') {
      const taskId = call.params.task_id;
      if (typeof taskId === 'string') {
        // Try to find matching agent
        for (const [id, agent] of agentMap) {
          if (id.includes(taskId) || taskId.includes(id)) {
            agent.status = 'completed';
          }
        }
      }
    }
  }

  return Array.from(agentMap.values());
}

/**
 * Generate a short agent ID from description
 */
function generateAgentId(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-');

  return `agent-${words || 'task'}`;
}

/**
 * Get running agents
 */
export function getRunningAgents(agents: SpawnedAgent[]): SpawnedAgent[] {
  return agents.filter(agent => agent.status === 'running');
}

/**
 * Get completed agents
 */
export function getCompletedAgents(agents: SpawnedAgent[]): SpawnedAgent[] {
  return agents.filter(agent => agent.status === 'completed');
}

/**
 * Format agents as markdown table
 */
export function formatAgentsAsMarkdown(agents: SpawnedAgent[]): string {
  if (agents.length === 0) {
    return '| - | No agents spawned | - |';
  }

  return agents
    .map(agent => `| ${agent.id} | ${agent.task} | ${agent.status} |`)
    .join('\n');
}

/**
 * Get agent summary
 */
export function getAgentSummary(agents: SpawnedAgent[]): {
  total: number;
  running: number;
  completed: number;
} {
  return {
    total: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    completed: agents.filter(a => a.status === 'completed').length,
  };
}
