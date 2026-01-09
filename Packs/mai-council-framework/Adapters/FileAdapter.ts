/**
 * File Adapter
 *
 * Writes council session transcripts to markdown files.
 * Creates a detailed record of the session for future reference.
 *
 * Output files are named: council-{session-id}.md
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  BaseAdapter,
  type CouncilSession,
  type CouncilRound,
  type AdapterConfig
} from './AdapterInterface';
import type { Agent } from '../Engine/AgentLoader';
import type { Conflict } from '../Engine/ConflictResolver';
import type { SynthesisResult } from '../Engine/SynthesisEngine';

// ============================================================================
// File Adapter
// ============================================================================

export class FileAdapter extends BaseAdapter {
  name = 'file';

  private outputDir: string;
  private outputPath?: string;
  private lines: string[] = [];

  constructor(outputDir?: string) {
    super();
    this.outputDir = outputDir || path.join(process.cwd(), 'council-sessions');
  }

  override async initialize(config: AdapterConfig): Promise<void> {
    await super.initialize(config);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Set output file path
    this.outputPath = path.join(
      this.outputDir,
      `council-${config.session.id}.md`
    );

    this.lines = [];
  }

  override async onSessionStart(session: CouncilSession): Promise<void> {
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

    await this.saveFile();
  }

  override async onAgentSpeak(agent: Agent, content: string): Promise<void> {
    this.lines.push(`### ${agent.name} (${agent.role})`);
    this.lines.push('');
    this.lines.push(content);
    this.lines.push('');

    await this.saveFile();
  }

  override async onRoundComplete(round: CouncilRound): Promise<void> {
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

    await this.saveFile();
  }

  override async onConflictDetected(conflict: Conflict): Promise<void> {
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

    await this.saveFile();
  }

  override async onSynthesisComplete(synthesis: SynthesisResult): Promise<void> {
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

    await this.saveFile();
  }

  override async onSessionEnd(session: CouncilSession): Promise<void> {
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

    await this.saveFile();

    // Log output path
    console.log(`\nSession transcript saved to: ${this.outputPath}`);
  }

  /**
   * Save current content to file
   */
  private async saveFile(): Promise<void> {
    if (this.outputPath) {
      await fs.promises.writeFile(this.outputPath, this.lines.join('\n'), 'utf-8');
    }
  }

  /**
   * Get the output file path
   */
  getOutputPath(): string | undefined {
    return this.outputPath;
  }
}

// Register with adapter registry
import { adapterRegistry } from './AdapterInterface';
adapterRegistry.register('file', () => new FileAdapter());
