/**
 * Output Adapter Interface
 *
 * Base interface for council output adapters. Adapters receive events
 * during council sessions and format/route them to different targets.
 *
 * Built-in adapters:
 * - ConsoleAdapter: Output to terminal with colors
 * - FileAdapter: Write session transcripts to markdown files
 *
 * Custom adapters can be created for:
 * - Joplin integration
 * - Slack/Discord notifications
 * - Database logging
 * - Custom dashboards
 */

import type { Agent } from '../Engine/AgentLoader';
import type { SynthesisResult } from '../Engine/SynthesisEngine';
import type { Conflict } from '../Engine/ConflictResolver';

// ============================================================================
// Types
// ============================================================================

/**
 * Visibility mode for output
 */
export type VisibilityMode = 'full' | 'progress' | 'summary';

/**
 * Council session information
 */
export interface CouncilSession {
  id: string;
  topic: string;
  context: string;
  roster: Agent[];
  rounds: CouncilRound[];
  visibility: VisibilityMode;
  synthesisStrategy: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * A single round of council discussion
 */
export interface CouncilRound {
  number: number;
  perspectives: AgentPerspective[];
  conflicts: Conflict[];
  consensusReached: boolean;
}

/**
 * An agent's perspective on the topic
 */
export interface AgentPerspective {
  agent: Agent;
  round: number;
  content: string;
  position: 'approve' | 'block' | 'defer' | 'neutral';
  concerns: string[];
  recommendations: string[];
  timestamp: Date;
}

/**
 * Configuration passed to adapter on initialization
 */
export interface AdapterConfig {
  session: CouncilSession;
  selectionResult?: {
    selected_agents: string[];
    domain_detected: string[];
    reason: string;
  };
}

// ============================================================================
// Output Adapter Interface
// ============================================================================

/**
 * Base interface for output adapters
 *
 * Implement this interface to create custom adapters that receive
 * council events and output them to different targets.
 */
export interface OutputAdapter {
  /**
   * Unique name for this adapter
   */
  name: string;

  /**
   * Initialize the adapter with session configuration
   *
   * Called once at the start of a council session.
   *
   * @param config Session configuration and metadata
   */
  initialize(config: AdapterConfig): Promise<void>;

  /**
   * Handle session start event
   *
   * Called when the council session begins.
   *
   * @param session The council session object
   */
  onSessionStart(session: CouncilSession): Promise<void>;

  /**
   * Handle agent speaking event
   *
   * Called each time an agent provides their perspective.
   *
   * @param agent The agent who is speaking
   * @param content The agent's statement/perspective
   */
  onAgentSpeak(agent: Agent, content: string): Promise<void>;

  /**
   * Handle round completion event
   *
   * Called at the end of each discussion round.
   *
   * @param round The completed round
   */
  onRoundComplete(round: CouncilRound): Promise<void>;

  /**
   * Handle conflict detection event
   *
   * Called when a conflict is detected between perspectives.
   *
   * @param conflict The detected conflict
   */
  onConflictDetected(conflict: Conflict): Promise<void>;

  /**
   * Handle synthesis completion event
   *
   * Called when the final synthesis is generated.
   *
   * @param synthesis The synthesis result
   */
  onSynthesisComplete(synthesis: SynthesisResult): Promise<void>;

  /**
   * Handle session end event
   *
   * Called when the council session completes.
   *
   * @param session The final session state
   */
  onSessionEnd(session: CouncilSession): Promise<void>;
}

// ============================================================================
// Base Adapter Class
// ============================================================================

/**
 * Abstract base class for adapters with default no-op implementations
 *
 * Extend this class to create adapters that only need to handle
 * specific events.
 */
export abstract class BaseAdapter implements OutputAdapter {
  abstract name: string;

  protected visibility: VisibilityMode = 'full';
  protected config?: AdapterConfig;

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.visibility = config.session.visibility;
  }

  async onSessionStart(_session: CouncilSession): Promise<void> {
    // Default: no-op
  }

  async onAgentSpeak(_agent: Agent, _content: string): Promise<void> {
    // Default: no-op
  }

  async onRoundComplete(_round: CouncilRound): Promise<void> {
    // Default: no-op
  }

  async onConflictDetected(_conflict: Conflict): Promise<void> {
    // Default: no-op
  }

  async onSynthesisComplete(_synthesis: SynthesisResult): Promise<void> {
    // Default: no-op
  }

  async onSessionEnd(_session: CouncilSession): Promise<void> {
    // Default: no-op
  }

  /**
   * Check if content should be shown based on visibility mode
   */
  protected shouldShow(level: 'full' | 'progress' | 'summary'): boolean {
    const levels = ['summary', 'progress', 'full'];
    const currentLevel = levels.indexOf(this.visibility);
    const requiredLevel = levels.indexOf(level);
    return currentLevel >= requiredLevel;
  }
}

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Registry for available adapters
 */
export class AdapterRegistry {
  private adapters: Map<string, () => OutputAdapter> = new Map();

  /**
   * Register an adapter factory
   */
  register(name: string, factory: () => OutputAdapter): void {
    this.adapters.set(name, factory);
  }

  /**
   * Create an adapter instance by name
   */
  create(name: string): OutputAdapter | null {
    const factory = this.adapters.get(name);
    if (factory) {
      return factory();
    }
    return null;
  }

  /**
   * List registered adapter names
   */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Global adapter registry
export const adapterRegistry = new AdapterRegistry();
