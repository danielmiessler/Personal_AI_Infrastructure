#!/usr/bin/env node

/**
 * Agent Selection Algorithm for Standup V2
 *
 * Intelligently selects 2-3 most relevant agents based on question/feature context.
 *
 * Usage:
 *   node agent-selection.ts "Review this authentication design"
 *   => ["Daniel", "Clay", "Amy"]
 *
 * Features:
 * - Domain keyword matching
 * - Question context override
 * - Manual roster override
 * - Participation tracking (for rotation)
 * - Fallback to full team if no clear match
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';

// ES module compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface DomainConfig {
  keywords: string[];
  primary_agents: string[];
  secondary_agents: string[];
  weight: number;
}

interface AgentProfile {
  role: string;
  expertise: string[];
  veto_power: boolean;
  veto_criteria?: string;
}

interface QuestionPattern {
  pattern: string;
  domain: string;
  description: string;
}

interface SelectionConfig {
  min_agents: number;
  max_agents: number;
  default_agents: number;
  fallback_roster: string[];
  allow_manual_override: boolean;
  high_relevance_threshold: number;
  medium_relevance_threshold: number;
  tie_breaker: string;
}

interface DomainMapping {
  version: string;
  last_updated: string;
  domains: Record<string, DomainConfig>;
  agents: Record<string, AgentProfile>;
  selection: SelectionConfig;
  question_patterns: QuestionPattern[];
}

interface ParticipationData {
  agents: Record<string, {
    total_standups: number;
    last_participated: string;
    participation_rate: number;
  }>;
}

interface AgentScore {
  agent: string;
  score: number;
  reason: string;
  participation_rate: number;
}

interface SelectionResult {
  selected_agents: string[];
  domain_detected: string[];
  scores: AgentScore[];
  reason: string;
}

// Load configuration files
function loadDomainMapping(): DomainMapping {
  const configPath = path.join(__dirname, 'domain-mapping.yaml');
  const content = fs.readFileSync(configPath, 'utf-8');
  return yaml.parse(content) as DomainMapping;
}

function loadParticipationData(): ParticipationData {
  const statePath = path.join(__dirname, '..', 'state', 'participation.yaml');

  // Create default if doesn't exist
  if (!fs.existsSync(statePath)) {
    const defaultData: ParticipationData = {
      agents: {
        Daniel: { total_standups: 0, last_participated: '', participation_rate: 0 },
        Mary: { total_standups: 0, last_participated: '', participation_rate: 0 },
        Clay: { total_standups: 0, last_participated: '', participation_rate: 0 },
        Hefley: { total_standups: 0, last_participated: '', participation_rate: 0 },
        Amy: { total_standups: 0, last_participated: '', participation_rate: 0 }
      }
    };

    // Create state directory if needed
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    fs.writeFileSync(statePath, yaml.stringify(defaultData));
    return defaultData;
  }

  const content = fs.readFileSync(statePath, 'utf-8');
  return yaml.parse(content) as ParticipationData;
}

function saveParticipationData(data: ParticipationData): void {
  const statePath = path.join(__dirname, '..', 'state', 'participation.yaml');
  fs.writeFileSync(statePath, yaml.stringify(data));
}

// Core selection algorithm
function selectAgents(
  question: string,
  featureContext: string = '',
  manualRoster: string[] = []
): SelectionResult {
  const config = loadDomainMapping();
  const participation = loadParticipationData();

  // Manual override
  if (manualRoster.length > 0 && config.selection.allow_manual_override) {
    return {
      selected_agents: manualRoster,
      domain_detected: [],
      scores: manualRoster.map(agent => ({
        agent,
        score: 1.0,
        reason: 'Manual override',
        participation_rate: participation.agents[agent]?.participation_rate || 0
      })),
      reason: 'Manual roster override specified'
    };
  }

  // Combine question and feature context
  const fullContext = `${question} ${featureContext}`.toLowerCase();

  // Check for question pattern overrides
  let primaryDomain: string | null = null;
  for (const pattern of config.question_patterns) {
    const regex = new RegExp(pattern.pattern, 'i');
    if (regex.test(question)) {
      primaryDomain = pattern.domain;
      break;
    }
  }

  // Detect domains from keywords
  const domainScores: Record<string, number> = {};
  const domainsDetected: string[] = [];

  for (const [domainName, domainConfig] of Object.entries(config.domains)) {
    let matchCount = 0;
    for (const keyword of domainConfig.keywords) {
      if (fullContext.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Better scoring: Use logarithmic scale for keyword matches
      // 1 match = 0.5, 2 matches = 0.7, 3+ matches = 0.9+
      // This ensures domains with even 1-2 keyword matches score reasonably
      const baseScore = Math.min(0.5 + (matchCount * 0.2), 1.0);
      domainScores[domainName] = baseScore * domainConfig.weight;
      domainsDetected.push(domainName);
    }
  }

  // If question pattern override, boost that domain
  if (primaryDomain && domainScores[primaryDomain]) {
    domainScores[primaryDomain] *= 1.5;
  }

  // Calculate agent scores
  const agentScores: AgentScore[] = [];

  for (const [agentName, agentProfile] of Object.entries(config.agents)) {
    let agentScore = 0;
    let reasons: string[] = [];

    // Score based on domain expertise
    for (const [domainName, score] of Object.entries(domainScores)) {
      const domainConfig = config.domains[domainName];

      if (domainConfig.primary_agents.includes(agentName)) {
        agentScore += score * 1.0;
        reasons.push(`Primary: ${domainName}`);
      } else if (domainConfig.secondary_agents.includes(agentName)) {
        agentScore += score * 0.5;
        reasons.push(`Secondary: ${domainName}`);
      }
    }

    // Normalize score
    agentScore = Math.min(agentScore, 1.0);

    agentScores.push({
      agent: agentName,
      score: agentScore,
      reason: reasons.join(', ') || 'No match',
      participation_rate: participation.agents[agentName]?.participation_rate || 0
    });
  }

  // Sort by score descending
  agentScores.sort((a, b) => {
    // First by score
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // Tie-breaker
    if (config.selection.tie_breaker === 'participation_rate') {
      return a.participation_rate - b.participation_rate;  // Lower participation preferred
    }

    // Default: alphabetical
    return a.agent.localeCompare(b.agent);
  });

  // Select top agents
  const highRelevance = agentScores.filter(a => a.score >= config.selection.high_relevance_threshold);
  const mediumRelevance = agentScores.filter(
    a => a.score >= config.selection.medium_relevance_threshold &&
         a.score < config.selection.high_relevance_threshold
  );

  let selectedAgents: string[] = [];

  if (highRelevance.length >= config.selection.default_agents) {
    // Enough high-relevance agents to fill default
    selectedAgents = highRelevance
      .slice(0, config.selection.default_agents)
      .map(a => a.agent);
  } else if (highRelevance.length >= config.selection.min_agents) {
    // Some high-relevance agents, but fewer than default - fill with medium-relevance
    selectedAgents = [
      ...highRelevance.map(a => a.agent),
      ...mediumRelevance.slice(0, config.selection.default_agents - highRelevance.length).map(a => a.agent)
    ];
  } else if (highRelevance.length + mediumRelevance.length >= config.selection.min_agents) {
    // Mix of high and medium relevance (not enough high alone)
    selectedAgents = [
      ...highRelevance.map(a => a.agent),
      ...mediumRelevance.slice(0, config.selection.default_agents - highRelevance.length).map(a => a.agent)
    ];
  } else {
    // No clear match, use fallback (full team)
    return {
      selected_agents: config.selection.fallback_roster,
      domain_detected: domainsDetected,
      scores: agentScores,
      reason: 'No clear domain match, using full team'
    };
  }

  return {
    selected_agents: selectedAgents,
    domain_detected: domainsDetected,
    scores: agentScores,
    reason: `Domain match: ${domainsDetected.join(', ')}`
  };
}

// Update participation tracking
function updateParticipation(selectedAgents: string[]): void {
  const participation = loadParticipationData();
  const today = new Date().toISOString().split('T')[0];

  // Increment total standups for all agents
  let totalStandups = 0;
  for (const agent in participation.agents) {
    totalStandups = Math.max(totalStandups, participation.agents[agent].total_standups);
  }
  totalStandups += 1;

  // Update selected agents
  for (const agent of selectedAgents) {
    if (participation.agents[agent]) {
      participation.agents[agent].total_standups += 1;
      participation.agents[agent].last_participated = today;
      participation.agents[agent].participation_rate =
        participation.agents[agent].total_standups / totalStandups;
    }
  }

  // Update participation rates for non-selected agents
  for (const agent in participation.agents) {
    if (!selectedAgents.includes(agent)) {
      participation.agents[agent].participation_rate =
        participation.agents[agent].total_standups / totalStandups;
    }
  }

  saveParticipationData(participation);
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node agent-selection.ts "<question>" [feature_context] [manual_roster]');
    console.error('');
    console.error('Examples:');
    console.error('  node agent-selection.ts "Review authentication design"');
    console.error('  node agent-selection.ts "How long will this take?"');
    console.error('  node agent-selection.ts "Security review" "Payment processing API" "Daniel,Clay,Amy"');
    process.exit(1);
  }

  const question = args[0];
  const featureContext = args[1] || '';
  const manualRoster = args[2] ? args[2].split(',').map(s => s.trim()) : [];

  const result = selectAgents(question, featureContext, manualRoster);

  // Output as JSON for programmatic use
  if (process.env.OUTPUT_FORMAT === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Human-readable output
    console.log('');
    console.log('🎯 Agent Selection Result');
    console.log('========================');
    console.log('');
    console.log(`Question: "${question}"`);
    if (featureContext) {
      console.log(`Feature: "${featureContext}"`);
    }
    console.log('');
    console.log(`Domain(s) Detected: ${result.domain_detected.join(', ') || 'None'}`);
    console.log(`Reason: ${result.reason}`);
    console.log('');
    console.log('Selected Agents:');
    for (const agent of result.selected_agents) {
      const score = result.scores.find(s => s.agent === agent);
      console.log(`  - ${agent} (score: ${score?.score.toFixed(2)}, ${score?.reason})`);
    }
    console.log('');
    console.log('All Agent Scores:');
    for (const score of result.scores) {
      const selected = result.selected_agents.includes(score.agent) ? '✓' : ' ';
      console.log(`  [${selected}] ${score.agent.padEnd(8)} ${score.score.toFixed(2)}  ${score.reason}`);
    }
  }

  // Update participation if not a dry run
  if (!process.env.DRY_RUN) {
    updateParticipation(result.selected_agents);
  }
}

// Export for testing
export {
  selectAgents,
  updateParticipation,
  loadDomainMapping,
  loadParticipationData,
  saveParticipationData,
  type SelectionResult,
  type AgentScore
};

// Run CLI if called directly
// ES module compatible check
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
