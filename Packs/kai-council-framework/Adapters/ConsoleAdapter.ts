/**
 * Console Adapter
 *
 * Outputs council session events to the terminal with color coding.
 * Always active in council sessions.
 *
 * Supports all visibility modes:
 * - full: Complete transcript with all agent statements
 * - progress: Round summaries and key events
 * - summary: Final synthesis only
 */

import {
  BaseAdapter,
  type CouncilSession,
  type CouncilRound,
  type VisibilityMode
} from './AdapterInterface';
import type { Agent } from '../Engine/AgentLoader';
import type { Conflict } from '../Engine/ConflictResolver';
import type { SynthesisResult } from '../Engine/SynthesisEngine';
import {
  calculateQualityMetrics,
  getQualityLevel,
  getQualityRecommendations,
  type QualityMetrics
} from '../Engine/QualityMetrics';

// ============================================================================
// ANSI Color Codes
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Agent colors (cycle through for different agents)
const agentColors = [
  colors.cyan,
  colors.magenta,
  colors.yellow,
  colors.green,
  colors.blue,
  colors.brightCyan,
  colors.brightMagenta,
];

/**
 * Get a consistent color for an agent based on their name
 */
function getAgentColor(agentName: string): string {
  let hash = 0;
  for (let i = 0; i < agentName.length; i++) {
    hash = ((hash << 5) - hash) + agentName.charCodeAt(i);
    hash = hash & hash;
  }
  return agentColors[Math.abs(hash) % agentColors.length] ?? colors.white;
}

// ============================================================================
// Console Adapter
// ============================================================================

export class ConsoleAdapter extends BaseAdapter {
  name = 'console';

  private agentColorMap: Map<string, string> = new Map();
  private sessionStartTime?: Date;
  private showQualityMetrics: boolean = true;
  private qualityDomain?: string;

  constructor(visibility: VisibilityMode = 'full', options?: { showQualityMetrics?: boolean; qualityDomain?: string }) {
    super();
    this.visibility = visibility;
    this.showQualityMetrics = options?.showQualityMetrics ?? true;
    this.qualityDomain = options?.qualityDomain;
  }

  override async onSessionStart(session: CouncilSession): Promise<void> {
    this.sessionStartTime = session.startTime;

    // Assign colors to agents
    for (const agent of session.roster) {
      this.agentColorMap.set(agent.name, getAgentColor(agent.name));
    }

    if (this.shouldShow('progress')) {
      this.printHeader('COUNCIL SESSION', session.topic);
      console.log();
      console.log(`${colors.dim}Session ID: ${session.id}${colors.reset}`);
      console.log(`${colors.dim}Started: ${session.startTime.toLocaleString()}${colors.reset}`);
      console.log();
      console.log(`${colors.bold}Roster:${colors.reset}`);
      for (const agent of session.roster) {
        const color = this.agentColorMap.get(agent.name) || colors.white;
        const vetoBadge = agent.vetoPower ? ` ${colors.red}[VETO]${colors.reset}` : '';
        console.log(`  ${color}${agent.name}${colors.reset} (${agent.role})${vetoBadge}`);
      }
      console.log();

      if (session.context) {
        console.log(`${colors.bold}Context:${colors.reset}`);
        console.log(`  ${colors.dim}${session.context}${colors.reset}`);
        console.log();
      }

      console.log(`${colors.dim}${'='.repeat(60)}${colors.reset}`);
      console.log();
    }
  }

  override async onAgentSpeak(agent: Agent, content: string): Promise<void> {
    if (!this.shouldShow('full')) {
      return;
    }

    const color = this.agentColorMap.get(agent.name) || colors.white;

    console.log(`${color}${colors.bold}[${agent.name}]${colors.reset} ${colors.dim}(${agent.role})${colors.reset}`);
    console.log();

    // Format content with proper indentation
    const lines = content.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }

    console.log();
    console.log(`${colors.dim}${'─'.repeat(40)}${colors.reset}`);
    console.log();
  }

  override async onRoundComplete(round: CouncilRound): Promise<void> {
    if (this.shouldShow('progress')) {
      console.log();
      console.log(`${colors.bold}${colors.blue}Round ${round.number} Complete${colors.reset}`);

      // Show position summary
      const positions = {
        approve: round.perspectives.filter(p => p.position === 'approve').map(p => p.agent.name),
        block: round.perspectives.filter(p => p.position === 'block').map(p => p.agent.name),
        defer: round.perspectives.filter(p => p.position === 'defer').map(p => p.agent.name),
        neutral: round.perspectives.filter(p => p.position === 'neutral').map(p => p.agent.name),
      };

      console.log();
      if (positions.approve.length > 0) {
        console.log(`  ${colors.green}Approve:${colors.reset} ${positions.approve.join(', ')}`);
      }
      if (positions.block.length > 0) {
        console.log(`  ${colors.red}Block:${colors.reset} ${positions.block.join(', ')}`);
      }
      if (positions.defer.length > 0) {
        console.log(`  ${colors.yellow}Defer:${colors.reset} ${positions.defer.join(', ')}`);
      }
      if (positions.neutral.length > 0) {
        console.log(`  ${colors.dim}Neutral:${colors.reset} ${positions.neutral.join(', ')}`);
      }

      if (round.consensusReached) {
        console.log();
        console.log(`  ${colors.green}${colors.bold}Consensus Reached${colors.reset}`);
      }

      console.log();
      console.log(`${colors.dim}${'='.repeat(60)}${colors.reset}`);
      console.log();
    }
  }

  override async onConflictDetected(conflict: Conflict): Promise<void> {
    if (!this.shouldShow('progress')) {
      return;
    }

    const severityColor = {
      critical: colors.bgRed + colors.white,
      major: colors.red,
      minor: colors.yellow,
    }[conflict.severity];

    console.log();
    console.log(`${severityColor}${colors.bold} CONFLICT DETECTED ${colors.reset}`);
    console.log(`  ${colors.bold}Type:${colors.reset} ${conflict.type}`);
    console.log(`  ${colors.bold}Severity:${colors.reset} ${conflict.severity}`);
    console.log(`  ${colors.bold}Agents:${colors.reset} ${conflict.agents.join(', ')}`);
    console.log(`  ${colors.bold}Description:${colors.reset}`);
    console.log(`    ${conflict.description}`);

    if (conflict.suggestedResolution) {
      console.log(`  ${colors.bold}Suggested Resolution:${colors.reset}`);
      console.log(`    ${colors.cyan}${conflict.suggestedResolution}${colors.reset}`);
    }

    console.log();
  }

  override async onSynthesisComplete(synthesis: SynthesisResult): Promise<void> {
    // Always show synthesis (even in summary mode)
    this.printHeader('SYNTHESIS', 'Decision Analysis');
    console.log();

    // Decision
    console.log(`${colors.bold}Decision:${colors.reset}`);
    console.log(`  ${colors.brightWhite}${synthesis.decision}${colors.reset}`);
    console.log();

    // Confidence meter
    const confidencePercent = Math.round(synthesis.confidence * 100);
    const filledBars = Math.round(synthesis.confidence * 20);
    const emptyBars = 20 - filledBars;
    const confidenceColor = synthesis.confidence >= 0.7 ? colors.green :
                           synthesis.confidence >= 0.5 ? colors.yellow : colors.red;

    console.log(`${colors.bold}Confidence:${colors.reset} ${confidenceColor}${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}${colors.reset} ${confidencePercent}%`);
    console.log();

    // Consensus level
    const consensusColor = {
      unanimous: colors.green,
      strong: colors.green,
      moderate: colors.yellow,
      weak: colors.red,
      none: colors.red,
    }[synthesis.consensusLevel];

    console.log(`${colors.bold}Consensus:${colors.reset} ${consensusColor}${synthesis.consensusLevel.toUpperCase()}${colors.reset}`);
    console.log();

    // Rationale
    if (synthesis.rationale && this.shouldShow('progress')) {
      console.log(`${colors.bold}Rationale:${colors.reset}`);
      console.log(`  ${synthesis.rationale}`);
      console.log();
    }

    // Trade-offs
    if (synthesis.tradeoffs.length > 0 && this.shouldShow('progress')) {
      console.log(`${colors.bold}Trade-offs:${colors.reset}`);
      for (const tradeoff of synthesis.tradeoffs) {
        console.log(`  ${colors.yellow}•${colors.reset} ${tradeoff}`);
      }
      console.log();
    }

    // Recommendations/Action Items
    if (synthesis.recommendations.length > 0) {
      console.log(`${colors.bold}Action Items:${colors.reset}`);
      for (const rec of synthesis.recommendations) {
        console.log(`  ${colors.cyan}□${colors.reset} ${rec}`);
      }
      console.log();
    }

    // Dissent
    if (synthesis.dissent && this.shouldShow('progress')) {
      console.log(`${colors.red}${colors.bold}Dissenting Opinion:${colors.reset}`);
      console.log(`  ${colors.dim}${synthesis.dissent}${colors.reset}`);
      console.log();
    }

    // Agent contributions (full mode only)
    if (this.shouldShow('full') && synthesis.agentContributions.size > 0) {
      console.log(`${colors.bold}Agent Contributions:${colors.reset}`);
      for (const [agentName, contribution] of synthesis.agentContributions) {
        const color = this.agentColorMap.get(agentName) || colors.white;
        console.log(`  ${color}${agentName}:${colors.reset} ${contribution}`);
      }
      console.log();
    }
  }

  override async onSessionEnd(session: CouncilSession): Promise<void> {
    if (!this.shouldShow('progress')) {
      return;
    }

    const duration = session.endTime && this.sessionStartTime
      ? ((session.endTime.getTime() - this.sessionStartTime.getTime()) / 1000).toFixed(1)
      : '?';

    console.log(`${colors.dim}${'='.repeat(60)}${colors.reset}`);
    console.log();

    // Show quality metrics if enabled
    if (this.showQualityMetrics && session.rounds.length > 0) {
      this.printQualityMetrics(session);
    }

    console.log(`${colors.bold}Session Complete${colors.reset}`);
    console.log(`  ${colors.dim}Duration: ${duration}s${colors.reset}`);
    console.log(`  ${colors.dim}Rounds: ${session.rounds.length}${colors.reset}`);
    console.log(`  ${colors.dim}Session ID: ${session.id}${colors.reset}`);
    console.log();
  }

  /**
   * Display quality metrics for the session
   */
  private printQualityMetrics(session: CouncilSession): void {
    const metrics = calculateQualityMetrics(session, {
      domain: this.qualityDomain || session.topic,
      devilsAdvocateEnabled: true
    });

    const qualityLevel = getQualityLevel(metrics.qualityScore);

    console.log();
    console.log(`${colors.bold}Quality Metrics:${colors.reset}`);
    console.log();

    // Quality score with visual bar
    const qualityPercent = Math.round(metrics.qualityScore * 100);
    const qualityFilledBars = Math.round(metrics.qualityScore * 20);
    const qualityEmptyBars = 20 - qualityFilledBars;
    const qualityColor = metrics.qualityScore >= 0.7 ? colors.green :
                         metrics.qualityScore >= 0.5 ? colors.yellow : colors.red;

    console.log(`  ${colors.bold}Quality Score:${colors.reset} ${qualityColor}${'█'.repeat(qualityFilledBars)}${'░'.repeat(qualityEmptyBars)}${colors.reset} ${qualityPercent}% (${qualityLevel})`);

    // Concerns addressed ratio
    if (metrics.uniqueConcernsRaised > 0) {
      const concernsRatio = metrics.concernsAddressed / metrics.uniqueConcernsRaised;
      const concernsPercent = Math.round(concernsRatio * 100);
      const concernsColor = concernsRatio >= 0.7 ? colors.green :
                            concernsRatio >= 0.4 ? colors.yellow : colors.red;
      console.log(`  ${colors.bold}Concerns:${colors.reset}      ${concernsColor}${metrics.concernsAddressed}/${metrics.uniqueConcernsRaised} addressed${colors.reset} (${concernsPercent}%)`);
    } else {
      console.log(`  ${colors.bold}Concerns:${colors.reset}      ${colors.dim}No concerns raised${colors.reset}`);
    }

    // Conflicts resolved
    if (metrics.conflictsDetected > 0) {
      const conflictRatio = metrics.conflictsResolved / metrics.conflictsDetected;
      const conflictColor = conflictRatio >= 0.8 ? colors.green :
                            conflictRatio >= 0.5 ? colors.yellow : colors.red;
      console.log(`  ${colors.bold}Conflicts:${colors.reset}     ${conflictColor}${metrics.conflictsResolved}/${metrics.conflictsDetected} resolved${colors.reset}`);
    } else {
      console.log(`  ${colors.bold}Conflicts:${colors.reset}     ${colors.green}None detected${colors.reset}`);
    }

    // Devil's advocate
    const advocateColor = metrics.devilsAdvocateEngaged ? colors.green : colors.dim;
    const advocateStatus = metrics.devilsAdvocateEngaged ? 'Engaged' : 'Not engaged';
    console.log(`  ${colors.bold}Devil's Adv:${colors.reset}   ${advocateColor}${advocateStatus}${colors.reset}`);

    // Expertise alignment
    const expertisePercent = Math.round(metrics.expertiseAlignmentScore * 100);
    const expertiseColor = metrics.expertiseAlignmentScore >= 0.7 ? colors.green :
                           metrics.expertiseAlignmentScore >= 0.4 ? colors.yellow : colors.dim;
    console.log(`  ${colors.bold}Expertise:${colors.reset}     ${expertiseColor}${expertisePercent}% aligned${colors.reset}`);

    // Perspectives and rounds
    console.log(`  ${colors.bold}Perspectives:${colors.reset}  ${colors.cyan}${metrics.perspectiveCount} agents${colors.reset}`);
    console.log(`  ${colors.bold}Rounds:${colors.reset}        ${colors.cyan}${metrics.roundCount}${colors.reset}`);

    // Quality recommendations (if quality is not excellent and in progress mode)
    if (this.shouldShow('full') && qualityLevel !== 'excellent') {
      const recommendations = getQualityRecommendations(metrics);
      if (recommendations.length > 0) {
        console.log();
        console.log(`  ${colors.dim}${colors.italic}Recommendations for improvement:${colors.reset}`);
        for (const rec of recommendations.slice(0, 3)) {
          console.log(`    ${colors.dim}- ${rec}${colors.reset}`);
        }
      }
    }

    console.log();
  }

  /**
   * Print a formatted header
   */
  private printHeader(title: string, subtitle?: string): void {
    console.log();
    console.log(`${colors.bold}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}  ${title}${colors.reset}`);
    if (subtitle) {
      console.log(`${colors.dim}  ${subtitle}${colors.reset}`);
    }
    console.log(`${colors.bold}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
  }
}

// Register with adapter registry
import { adapterRegistry } from './AdapterInterface';
adapterRegistry.register('console', () => new ConsoleAdapter());
