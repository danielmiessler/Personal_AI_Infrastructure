#!/usr/bin/env bun

/**
 * Council Framework - Main Orchestrator
 *
 * Orchestrates multi-agent council sessions for collaborative decision-making.
 *
 * Usage:
 *   import { runCouncil } from './Orchestrator';
 *   const result = await runCouncil({ topic: 'Should we...', roster: 'auto' });
 *
 * CLI:
 *   bun run Orchestrator.ts "Decision topic" --roster auto
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';
import { loadAgents, type Agent } from './AgentLoader';
import { selectAgents, type SelectionResult } from './RosterSelector';
import { synthesize, type SynthesisResult, type SynthesisStrategy } from './SynthesisEngine';
import { detectConflicts, resolveConflicts, type Conflict } from './ConflictResolver';
import type { OutputAdapter } from '../Adapters/AdapterInterface';
import { ConsoleAdapter } from '../Adapters/ConsoleAdapter';
import { FileAdapter } from '../Adapters/FileAdapter';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

export type VisibilityMode = 'full' | 'progress' | 'summary';

export interface CouncilOptions {
  /** The decision question or topic to discuss */
  topic: string;
  /** Background context for the decision */
  context?: string;
  /** Agents to participate - array of names or 'auto' for smart selection */
  roster?: string[] | 'auto';
  /** Maximum discussion rounds (default: 3) */
  maxRounds?: number;
  /** Output verbosity: full, progress, or summary (default: full) */
  visibility?: VisibilityMode;
  /** How to combine perspectives: consensus, weighted, or facilitator */
  synthesisStrategy?: SynthesisStrategy;
  /** Threshold for conflict detection (0-1, default: 0.3) */
  conflictThreshold?: number;
  /** Output directory for file adapter */
  outputDir?: string;
  /** Additional adapters to use */
  adapters?: OutputAdapter[];
}

export interface AgentPerspective {
  agent: Agent;
  round: number;
  content: string;
  position: 'approve' | 'block' | 'defer' | 'neutral';
  concerns: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface CouncilRound {
  number: number;
  perspectives: AgentPerspective[];
  conflicts: Conflict[];
  consensusReached: boolean;
}

export interface CouncilSession {
  id: string;
  topic: string;
  context: string;
  roster: Agent[];
  rounds: CouncilRound[];
  visibility: VisibilityMode;
  synthesisStrategy: SynthesisStrategy;
  startTime: Date;
  endTime?: Date;
}

export interface CouncilResult {
  session: CouncilSession;
  synthesis: SynthesisResult;
  transcript: string;
  actionItems: ActionItem[];
}

export interface ActionItem {
  task: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface CouncilConfig {
  version: string;
  session: {
    defaults: {
      visibility: VisibilityMode;
      maxRounds: number;
      conflictThreshold: number;
      synthesisStrategy: SynthesisStrategy;
    };
  };
  adapters: {
    default: string[];
    optional: string[];
  };
}

// ============================================================================
// Configuration
// ============================================================================

function loadConfig(): CouncilConfig {
  const configPath = path.join(__dirname, '..', 'Config', 'council.yaml');

  if (!fs.existsSync(configPath)) {
    // Return defaults if config doesn't exist
    return {
      version: '1.0',
      session: {
        defaults: {
          visibility: 'full',
          maxRounds: 3,
          conflictThreshold: 0.3,
          synthesisStrategy: 'consensus'
        }
      },
      adapters: {
        default: ['console', 'file'],
        optional: ['joplin']
      }
    };
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  return yaml.parse(content) as CouncilConfig;
}

// ============================================================================
// Adapter Registry
// ============================================================================

const registeredAdapters: Map<string, OutputAdapter> = new Map();

/**
 * Register a custom output adapter
 */
export function registerAdapter(adapter: OutputAdapter): void {
  registeredAdapters.set(adapter.name, adapter);
}

/**
 * Get active adapters for a session
 */
function getActiveAdapters(options: CouncilOptions): OutputAdapter[] {
  const adapters: OutputAdapter[] = [];

  // Always include console adapter
  adapters.push(new ConsoleAdapter(options.visibility || 'full'));

  // Include file adapter if output directory specified or default enabled
  const config = loadConfig();
  if (options.outputDir || config.adapters.default.includes('file')) {
    adapters.push(new FileAdapter(options.outputDir));
  }

  // Include any custom adapters passed in options
  if (options.adapters) {
    adapters.push(...options.adapters);
  }

  // Include registered adapters
  for (const adapter of registeredAdapters.values()) {
    if (!adapters.find(a => a.name === adapter.name)) {
      adapters.push(adapter);
    }
  }

  return adapters;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `council-${timestamp}-${random}`;
}

/**
 * Create a new council session
 */
function createSession(
  topic: string,
  context: string,
  roster: Agent[],
  visibility: VisibilityMode,
  synthesisStrategy: SynthesisStrategy
): CouncilSession {
  return {
    id: generateSessionId(),
    topic,
    context,
    roster,
    rounds: [],
    visibility,
    synthesisStrategy,
    startTime: new Date()
  };
}

// ============================================================================
// Main Orchestration
// ============================================================================

/**
 * Run a council session
 *
 * @param options Council configuration options
 * @returns Council result with synthesis and action items
 */
export async function runCouncil(options: CouncilOptions): Promise<CouncilResult> {
  const config = loadConfig();

  // Apply defaults
  const maxRounds = options.maxRounds ?? config.session.defaults.maxRounds;
  const visibility = options.visibility ?? config.session.defaults.visibility;
  const synthesisStrategy = options.synthesisStrategy ?? config.session.defaults.synthesisStrategy;
  const conflictThreshold = options.conflictThreshold ?? config.session.defaults.conflictThreshold;
  const context = options.context ?? '';

  // Get active adapters
  const adapters = getActiveAdapters(options);

  // Determine roster
  let rosterNames: string[];
  let selectionResult: SelectionResult | undefined;

  if (options.roster === 'auto' || !options.roster) {
    selectionResult = selectAgents(options.topic, { featureContext: context });
    rosterNames = selectionResult.selected_agents;
  } else {
    rosterNames = options.roster;
  }

  // Load agents
  const agents = await loadAgents(rosterNames);

  if (agents.length === 0) {
    throw new Error('No agents could be loaded for the council session');
  }

  // Create session
  const session = createSession(
    options.topic,
    context,
    agents,
    visibility,
    synthesisStrategy
  );

  // Initialize adapters
  for (const adapter of adapters) {
    await adapter.initialize({ session, selectionResult });
  }

  // Notify session start
  for (const adapter of adapters) {
    await adapter.onSessionStart(session);
  }

  // Run rounds
  let consensusReached = false;

  for (let roundNum = 1; roundNum <= maxRounds && !consensusReached; roundNum++) {
    const round = await runRound(session, roundNum, adapters, conflictThreshold);
    session.rounds.push(round);
    consensusReached = round.consensusReached;

    // Notify round complete
    for (const adapter of adapters) {
      await adapter.onRoundComplete(round);
    }
  }

  // Generate synthesis
  const allPerspectives = session.rounds.flatMap(r => r.perspectives);
  const synthesis = synthesize(allPerspectives, {
    strategy: synthesisStrategy,
    conflictThreshold
  });

  // Notify synthesis complete
  for (const adapter of adapters) {
    await adapter.onSynthesisComplete(synthesis);
  }

  // Generate action items from synthesis
  const actionItems = extractActionItems(synthesis, agents);

  // Build transcript
  const transcript = buildTranscript(session, synthesis);

  // Finalize session
  session.endTime = new Date();

  // Notify session end
  for (const adapter of adapters) {
    await adapter.onSessionEnd(session);
  }

  return {
    session,
    synthesis,
    transcript,
    actionItems
  };
}

/**
 * Run a single discussion round
 */
async function runRound(
  session: CouncilSession,
  roundNum: number,
  adapters: OutputAdapter[],
  conflictThreshold: number
): Promise<CouncilRound> {
  const perspectives: AgentPerspective[] = [];

  // Collect perspectives from each agent
  for (const agent of session.roster) {
    const perspective = await collectPerspective(session, agent, roundNum);
    perspectives.push(perspective);

    // Notify agent spoke
    for (const adapter of adapters) {
      await adapter.onAgentSpeak(agent, perspective.content);
    }
  }

  // Detect conflicts
  const conflicts = detectConflicts(perspectives, conflictThreshold);

  // Notify conflicts
  for (const conflict of conflicts) {
    for (const adapter of adapters) {
      await adapter.onConflictDetected(conflict);
    }
  }

  // Attempt resolution if conflicts exist
  if (conflicts.length > 0) {
    await resolveConflicts(conflicts, perspectives);
  }

  // Check for consensus
  const consensusReached = checkConsensus(perspectives, conflicts);

  return {
    number: roundNum,
    perspectives,
    conflicts,
    consensusReached
  };
}

/**
 * Collect a perspective from an agent
 *
 * Note: In actual use, this would invoke the agent's LLM persona.
 * This is a placeholder that returns a structured perspective format.
 */
async function collectPerspective(
  session: CouncilSession,
  agent: Agent,
  round: number
): Promise<AgentPerspective> {
  // This is a placeholder - in actual use, this would:
  // 1. Build a prompt with session context
  // 2. Include previous round perspectives if round > 1
  // 3. Invoke the LLM with the agent's persona
  // 4. Parse the response into structured format

  return {
    agent,
    round,
    content: `[${agent.name}] Awaiting perspective...`,
    position: 'neutral',
    concerns: [],
    recommendations: [],
    timestamp: new Date()
  };
}

/**
 * Check if consensus has been reached
 */
function checkConsensus(
  perspectives: AgentPerspective[],
  conflicts: Conflict[]
): boolean {
  // No blocking positions and no unresolved critical conflicts
  const hasBlockers = perspectives.some(p => p.position === 'block');
  const hasCriticalConflicts = conflicts.some(c => c.type === 'direct' && !c.resolved);

  return !hasBlockers && !hasCriticalConflicts;
}

/**
 * Extract action items from synthesis
 */
function extractActionItems(
  synthesis: SynthesisResult,
  agents: Agent[]
): ActionItem[] {
  const items: ActionItem[] = [];

  // Extract from synthesis recommendations
  for (const rec of synthesis.recommendations) {
    // Try to assign owner based on domain
    const owner = assignOwner(rec, agents);

    items.push({
      task: rec,
      owner: owner?.name || 'Unassigned',
      priority: 'medium'
    });
  }

  return items;
}

/**
 * Assign an owner to a task based on domain matching
 */
function assignOwner(task: string, agents: Agent[]): Agent | undefined {
  const taskLower = task.toLowerCase();

  for (const agent of agents) {
    for (const domain of agent.expertise) {
      if (taskLower.includes(domain.toLowerCase())) {
        return agent;
      }
    }
  }

  return undefined;
}

/**
 * Build a transcript of the council session
 */
function buildTranscript(
  session: CouncilSession,
  synthesis: SynthesisResult
): string {
  const lines: string[] = [];

  lines.push(`# Council Session: ${session.topic}`);
  lines.push('');
  lines.push(`**Session ID**: ${session.id}`);
  lines.push(`**Started**: ${session.startTime.toISOString()}`);
  lines.push(`**Roster**: ${session.roster.map(a => a.name).join(', ')}`);
  lines.push('');

  if (session.context) {
    lines.push('## Context');
    lines.push('');
    lines.push(session.context);
    lines.push('');
  }

  lines.push('## Discussion');
  lines.push('');

  for (const round of session.rounds) {
    lines.push(`### Round ${round.number}`);
    lines.push('');

    for (const perspective of round.perspectives) {
      lines.push(`**${perspective.agent.name}** (${perspective.agent.role}):`);
      lines.push('');
      lines.push(perspective.content);
      lines.push('');

      if (perspective.concerns.length > 0) {
        lines.push('*Concerns:*');
        for (const concern of perspective.concerns) {
          lines.push(`- ${concern}`);
        }
        lines.push('');
      }
    }

    if (round.conflicts.length > 0) {
      lines.push('**Conflicts Detected:**');
      for (const conflict of round.conflicts) {
        lines.push(`- ${conflict.type}: ${conflict.description}`);
      }
      lines.push('');
    }
  }

  lines.push('## Synthesis');
  lines.push('');
  lines.push(`**Decision**: ${synthesis.decision}`);
  lines.push('');
  lines.push(`**Confidence**: ${(synthesis.confidence * 100).toFixed(0)}%`);
  lines.push('');
  lines.push(`**Consensus Level**: ${synthesis.consensusLevel}`);
  lines.push('');

  if (synthesis.rationale) {
    lines.push('**Rationale:**');
    lines.push('');
    lines.push(synthesis.rationale);
    lines.push('');
  }

  if (synthesis.tradeoffs.length > 0) {
    lines.push('**Trade-offs:**');
    for (const tradeoff of synthesis.tradeoffs) {
      lines.push(`- ${tradeoff}`);
    }
    lines.push('');
  }

  if (synthesis.recommendations.length > 0) {
    lines.push('**Action Items:**');
    for (const rec of synthesis.recommendations) {
      lines.push(`- [ ] ${rec}`);
    }
    lines.push('');
  }

  if (synthesis.dissent) {
    lines.push('**Dissenting Opinion:**');
    lines.push('');
    lines.push(synthesis.dissent);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`*Generated by Council Framework v1.0*`);

  return lines.join('\n');
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: bun run Orchestrator.ts "<topic>" [options]');
    console.error('');
    console.error('Options:');
    console.error('  --roster <agents>     Comma-separated agent names or "auto"');
    console.error('  --rounds <n>          Maximum discussion rounds (default: 3)');
    console.error('  --visibility <mode>   full, progress, or summary');
    console.error('  --strategy <name>     consensus, weighted, or facilitator');
    console.error('  --output <dir>        Output directory for transcripts');
    console.error('');
    console.error('Examples:');
    console.error('  bun run Orchestrator.ts "Should we add OAuth2?" --roster auto');
    console.error('  bun run Orchestrator.ts "Architecture review" --roster TechLead,SecurityEngineer');
    process.exit(1);
  }

  const topic = args[0];

  // Parse options
  const options: CouncilOptions = { topic };

  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--roster':
        options.roster = value === 'auto' ? 'auto' : value.split(',').map(s => s.trim());
        break;
      case '--rounds':
        options.maxRounds = parseInt(value, 10);
        break;
      case '--visibility':
        options.visibility = value as VisibilityMode;
        break;
      case '--strategy':
        options.synthesisStrategy = value as SynthesisStrategy;
        break;
      case '--output':
        options.outputDir = value;
        break;
      case '--context':
        options.context = value;
        break;
    }
  }

  try {
    const result = await runCouncil(options);

    console.log('\n' + '='.repeat(60));
    console.log('COUNCIL SESSION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Session ID: ${result.session.id}`);
    console.log(`Decision: ${result.synthesis.decision}`);
    console.log(`Confidence: ${(result.synthesis.confidence * 100).toFixed(0)}%`);
    console.log(`Action Items: ${result.actionItems.length}`);
  } catch (error) {
    console.error('Council session failed:', error);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for programmatic use
export {
  loadConfig,
  createSession,
  buildTranscript
};
