/**
 * Joplin Adapter
 *
 * Saves council session transcripts to Joplin notes.
 * Uses the kai-joplin-skill CLI tools for Joplin integration.
 *
 * Output notes are named: Council: {topic} ({date})
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  BaseAdapter,
  type CouncilSession,
  type CouncilRound,
  type AdapterConfig
} from './AdapterInterface';
import type { Agent } from '../Engine/AgentLoader';
import type { Conflict } from '../Engine/ConflictResolver';
import type { SynthesisResult } from '../Engine/SynthesisEngine';

const execAsync = promisify(exec);

// Get PAI_DIR from environment or use default
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/PAI`;
const JOPLIN_TOOLS = `${PAI_DIR}/skills/Joplin/Tools`;

// ============================================================================
// Types
// ============================================================================

export interface JoplinAdapterConfig {
  notebookName?: string;  // Default: "Council Sessions"
  notePrefix?: string;    // Default: "Council:"
}

interface JoplinCreateResponse {
  success: boolean;
  message: string;
  id: string;
  title: string;
  notebook_id: string;
  notebook_name: string;
}

interface JoplinUpdateResponse {
  success: boolean;
  message: string;
  id: string;
  title: string;
}

// ============================================================================
// Joplin Adapter
// ============================================================================

export class JoplinAdapter extends BaseAdapter {
  name = 'joplin';

  private notebookName: string;
  private notePrefix: string;
  private noteId?: string;
  private lines: string[] = [];
  private sessionTopic: string = '';
  private joplinAvailable: boolean = true;

  constructor(config: JoplinAdapterConfig = {}) {
    super();
    this.notebookName = config.notebookName || 'Council Sessions';
    this.notePrefix = config.notePrefix || 'Council:';
  }

  override async initialize(config: AdapterConfig): Promise<void> {
    await super.initialize(config);

    // Reset state
    this.noteId = undefined;
    this.lines = [];
    this.sessionTopic = config.session.topic;
    this.joplinAvailable = true;

    // Verify Joplin tools are available
    try {
      await execAsync(`test -f "${JOPLIN_TOOLS}/Notes.ts"`);
    } catch {
      console.warn('[JoplinAdapter] Joplin tools not found at:', JOPLIN_TOOLS);
      console.warn('[JoplinAdapter] Session will not be saved to Joplin');
      this.joplinAvailable = false;
    }
  }

  override async onSessionStart(session: CouncilSession): Promise<void> {
    if (!this.joplinAvailable) return;

    // Build initial note content
    this.lines.push(`# Council Session: ${session.topic}`);
    this.lines.push('');
    this.lines.push('## Session Metadata');
    this.lines.push('');
    this.lines.push(`| Field | Value |`);
    this.lines.push(`|-------|-------|`);
    this.lines.push(`| Session ID | ${session.id} |`);
    this.lines.push(`| Started | ${session.startTime.toISOString()} |`);
    this.lines.push(`| Visibility | ${session.visibility} |`);
    this.lines.push(`| Strategy | ${session.synthesisStrategy} |`);
    this.lines.push('');

    this.lines.push('## Roster');
    this.lines.push('');
    this.lines.push('| Agent | Role | Expertise | Veto Power |');
    this.lines.push('|-------|------|-----------|------------|');

    for (const agent of session.roster) {
      this.lines.push(
        `| ${agent.name} | ${agent.role} | ${agent.expertise.slice(0, 3).join(', ')} | ${agent.vetoPower ? 'Yes' : 'No'} |`
      );
    }

    this.lines.push('');

    if (session.context) {
      this.lines.push('## Context');
      this.lines.push('');
      this.lines.push(session.context);
      this.lines.push('');
    }

    this.lines.push('---');
    this.lines.push('');
    this.lines.push('## Discussion');
    this.lines.push('');

    // Create the note in Joplin
    const dateStr = session.startTime.toISOString().split('T')[0];
    const noteTitle = `${this.notePrefix} ${session.topic} (${dateStr})`;

    try {
      this.noteId = await this.createNote(noteTitle, this.lines.join('\n'));
      console.log(`[JoplinAdapter] Created note: ${noteTitle}`);
    } catch (error) {
      console.error('[JoplinAdapter] Failed to create note:', error);
      this.joplinAvailable = false;
    }
  }

  override async onAgentSpeak(agent: Agent, content: string): Promise<void> {
    if (!this.joplinAvailable || !this.noteId) return;

    this.lines.push(`### ${agent.name} (${agent.role})`);
    this.lines.push('');
    this.lines.push(content);
    this.lines.push('');

    await this.updateNote();
  }

  override async onRoundComplete(round: CouncilRound): Promise<void> {
    if (!this.joplinAvailable || !this.noteId) return;

    this.lines.push('---');
    this.lines.push('');
    this.lines.push(`#### Round ${round.number} Summary`);
    this.lines.push('');

    // Position table
    this.lines.push('| Agent | Position | Key Concerns |');
    this.lines.push('|-------|----------|--------------|');

    for (const perspective of round.perspectives) {
      const concerns = perspective.concerns.slice(0, 2).join('; ') || '-';
      this.lines.push(
        `| ${perspective.agent.name} | ${perspective.position} | ${concerns} |`
      );
    }

    this.lines.push('');

    if (round.consensusReached) {
      this.lines.push('**Consensus Reached**');
      this.lines.push('');
    }

    if (round.conflicts.length > 0) {
      this.lines.push('**Conflicts:**');
      for (const conflict of round.conflicts) {
        this.lines.push(`- [${conflict.severity}] ${conflict.description}`);
      }
      this.lines.push('');
    }

    this.lines.push('---');
    this.lines.push('');

    await this.updateNote();
  }

  override async onConflictDetected(conflict: Conflict): Promise<void> {
    if (!this.joplinAvailable || !this.noteId) return;

    this.lines.push(`> **CONFLICT DETECTED** (${conflict.severity})`);
    this.lines.push(`>`);
    this.lines.push(`> **Type:** ${conflict.type}`);
    this.lines.push(`> **Agents:** ${conflict.agents.join(', ')}`);
    this.lines.push(`> **Description:** ${conflict.description}`);

    if (conflict.suggestedResolution) {
      this.lines.push(`>`);
      this.lines.push(`> **Suggested Resolution:** ${conflict.suggestedResolution}`);
    }

    this.lines.push('');

    await this.updateNote();
  }

  override async onSynthesisComplete(synthesis: SynthesisResult): Promise<void> {
    if (!this.joplinAvailable || !this.noteId) return;

    this.lines.push('## Synthesis');
    this.lines.push('');

    // Decision
    this.lines.push('### Decision');
    this.lines.push('');
    this.lines.push(`**${synthesis.decision}**`);
    this.lines.push('');

    // Metrics
    this.lines.push('### Metrics');
    this.lines.push('');
    this.lines.push(`- **Confidence:** ${(synthesis.confidence * 100).toFixed(0)}%`);
    this.lines.push(`- **Consensus Level:** ${synthesis.consensusLevel}`);
    this.lines.push('');

    // Rationale
    if (synthesis.rationale) {
      this.lines.push('### Rationale');
      this.lines.push('');
      this.lines.push(synthesis.rationale);
      this.lines.push('');
    }

    // Trade-offs
    if (synthesis.tradeoffs.length > 0) {
      this.lines.push('### Trade-offs');
      this.lines.push('');
      for (const tradeoff of synthesis.tradeoffs) {
        this.lines.push(`- ${tradeoff}`);
      }
      this.lines.push('');
    }

    // Recommendations
    if (synthesis.recommendations.length > 0) {
      this.lines.push('### Action Items');
      this.lines.push('');
      for (const rec of synthesis.recommendations) {
        this.lines.push(`- [ ] ${rec}`);
      }
      this.lines.push('');
    }

    // Dissent
    if (synthesis.dissent) {
      this.lines.push('### Dissenting Opinion');
      this.lines.push('');
      this.lines.push(`> ${synthesis.dissent.replace(/\n/g, '\n> ')}`);
      this.lines.push('');
    }

    // Agent contributions
    if (synthesis.agentContributions.size > 0) {
      this.lines.push('### Agent Contributions');
      this.lines.push('');

      for (const [agentName, contribution] of synthesis.agentContributions) {
        this.lines.push(`**${agentName}:**`);
        this.lines.push(contribution);
        this.lines.push('');
      }
    }

    await this.updateNote();
  }

  override async onSessionEnd(session: CouncilSession): Promise<void> {
    if (!this.joplinAvailable || !this.noteId) return;

    this.lines.push('---');
    this.lines.push('');
    this.lines.push('## Session Summary');
    this.lines.push('');
    this.lines.push(`- **Session ID:** ${session.id}`);
    this.lines.push(`- **Started:** ${session.startTime.toISOString()}`);
    this.lines.push(`- **Ended:** ${session.endTime?.toISOString() || 'N/A'}`);
    this.lines.push(`- **Total Rounds:** ${session.rounds.length}`);
    this.lines.push(`- **Agents:** ${session.roster.map(a => a.name).join(', ')}`);
    this.lines.push('');

    // Duration calculation
    if (session.endTime) {
      const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      this.lines.push(`- **Duration:** ${duration.toFixed(1)} seconds`);
      this.lines.push('');
    }

    this.lines.push('---');
    this.lines.push('');
    this.lines.push('*Generated by Council Framework v1.0*');

    await this.updateNote();

    // Log output
    console.log(`\n[JoplinAdapter] Session transcript saved to Joplin note: ${this.noteId}`);
  }

  /**
   * Get the Joplin note ID (if created)
   */
  getNoteId(): string | undefined {
    return this.noteId;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Create a new note in Joplin
   */
  private async createNote(title: string, body: string): Promise<string> {
    const escapedTitle = this.escapeShellArg(title);
    const escapedBody = this.escapeShellArg(body);
    const escapedNotebook = this.escapeShellArg(this.notebookName);

    const command = `cd "${JOPLIN_TOOLS}" && bun run Notes.ts create ${escapedTitle} --notebook ${escapedNotebook} --body ${escapedBody}`;

    try {
      const { stdout } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large content
      });

      const response = JSON.parse(stdout.trim()) as JoplinCreateResponse;

      if (!response.success) {
        throw new Error(response.message || 'Failed to create note');
      }

      return response.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Notebook') && error.message.includes('not found')) {
        console.warn(`[JoplinAdapter] Notebook "${this.notebookName}" not found. Please create it in Joplin.`);
      }
      throw error;
    }
  }

  /**
   * Update the note with current content
   */
  private async updateNote(): Promise<void> {
    if (!this.noteId) return;

    const escapedBody = this.escapeShellArg(this.lines.join('\n'));

    const command = `cd "${JOPLIN_TOOLS}" && bun run Notes.ts update ${this.noteId} --body ${escapedBody}`;

    try {
      const { stdout } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large content
      });

      const response = JSON.parse(stdout.trim()) as JoplinUpdateResponse;

      if (!response.success) {
        throw new Error(response.message || 'Failed to update note');
      }
    } catch (error) {
      console.error('[JoplinAdapter] Failed to update note:', error);
      // Don't throw - allow session to continue even if Joplin update fails
    }
  }

  /**
   * Escape a string for safe shell argument passing
   *
   * Uses single quotes with proper escaping for content that may contain
   * special characters, newlines, or shell metacharacters.
   */
  private escapeShellArg(arg: string): string {
    // Replace single quotes with the escape sequence: end quote, escaped quote, start quote
    // This ensures content with single quotes is handled properly
    const escaped = arg.replace(/'/g, "'\"'\"'");
    return `'${escaped}'`;
  }
}

// Register with adapter registry
import { adapterRegistry } from './AdapterInterface';
adapterRegistry.register('joplin', () => new JoplinAdapter());
