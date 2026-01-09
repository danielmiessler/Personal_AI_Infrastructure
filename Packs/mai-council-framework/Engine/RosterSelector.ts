#!/usr/bin/env bun

/**
 * Roster Selector
 *
 * Intelligently selects the most relevant agents for a council session
 * based on topic keywords, domain mapping, and participation history.
 *
 * Ported and enhanced from PAI v1 Standup skill.
 *
 * Usage:
 *   import { selectAgents } from './RosterSelector';
 *   const result = selectAgents('authentication design', { maxAgents: 3 });
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';
import { getAvailableAgents, loadAgent, type Agent } from './AgentLoader';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

export interface DomainConfig {
  keywords: string[];
  primary_agents: string[];
  secondary_agents: string[];
  weight: number;
}

export interface QuestionPattern {
  pattern: string;
  domain: string;
  description: string;
}

export interface SelectionConfig {
  min_agents: number;
  max_agents: number;
  default_agents: number;
  fallback_roster: string[];
  allow_manual_override: boolean;
  high_relevance_threshold: number;
  medium_relevance_threshold: number;
  tie_breaker: string;
}

export interface DomainMapping {
  version: string;
  domains: Record<string, DomainConfig>;
  selection: SelectionConfig;
  question_patterns: QuestionPattern[];
}

export interface ParticipationData {
  agents: Record<string, {
    total_sessions: number;
    last_participated: string;
    participation_rate: number;
  }>;
}

export interface AgentScore {
  agent: string;
  score: number;
  reason: string;
  participation_rate: number;
}

export interface SelectionResult {
  selected_agents: string[];
  domain_detected: string[];
  scores: AgentScore[];
  reason: string;
}

export interface SelectionOptions {
  /** Additional context about the feature/decision */
  featureContext?: string;
  /** Manual roster override */
  manualRoster?: string[];
  /** Maximum number of agents to select */
  maxAgents?: number;
  /** Minimum number of agents to select */
  minAgents?: number;
}

// ============================================================================
// Domain Mapping
// ============================================================================

/**
 * Default domain mapping when no config file exists
 */
function getDefaultDomainMapping(): DomainMapping {
  return {
    version: '1.0',
    domains: {
      security: {
        keywords: [
          'auth', 'authentication', 'authorization', 'security', 'vuln',
          'vulnerability', 'exploit', 'attack', 'threat', 'STRIDE', 'CMMC',
          'compliance', 'encryption', 'crypto', 'SSL', 'TLS', 'XSS', 'CSRF',
          'injection', 'SQL injection', 'credential', 'password', 'session',
          'token', 'JWT', 'OAuth', 'SAML', 'MFA', '2FA'
        ],
        primary_agents: ['SecurityEngineer', 'QALead'],
        secondary_agents: ['TechLead'],
        weight: 1.0
      },
      ux: {
        keywords: [
          'UX', 'user experience', 'user interface', 'UI', 'design',
          'usability', 'accessibility', 'a11y', 'user research', 'persona',
          'user flow', 'wireframe', 'prototype', 'feedback', 'stakeholder'
        ],
        primary_agents: ['BusinessAnalyst', 'QALead'],
        secondary_agents: ['SecurityEngineer', 'TechLead'],
        weight: 1.0
      },
      planning: {
        keywords: [
          'timeline', 'estimate', 'capacity', 'velocity', 'sprint',
          'schedule', 'deadline', 'how long', 'duration', 'effort',
          'story points', 'roadmap'
        ],
        primary_agents: ['TechLead', 'ProductManager'],
        secondary_agents: ['QALead'],
        weight: 1.0
      },
      prioritization: {
        keywords: [
          'priority', 'prioritize', 'MVP', 'must have', 'should have',
          'could have', 'won\'t have', 'MoSCoW', 'scope', 'backlog',
          'defer', 'should we build'
        ],
        primary_agents: ['ProductManager', 'BusinessAnalyst'],
        secondary_agents: ['TechLead'],
        weight: 1.0
      },
      testing: {
        keywords: [
          'test', 'testing', 'QA', 'quality', 'coverage', 'unit test',
          'integration test', 'E2E', 'end-to-end', 'acceptance', 'ATDD',
          'testability', 'mock', 'fixture', 'assertion', 'how many tests'
        ],
        primary_agents: ['QALead', 'TechLead'],
        secondary_agents: ['SecurityEngineer'],
        weight: 1.0
      },
      architecture: {
        keywords: [
          'architecture', 'design', 'system design', 'component', 'service',
          'microservice', 'API', 'endpoint', 'database', 'schema',
          'data model', 'pattern', 'SOLID', 'DRY', 'infrastructure',
          'deployment', 'scalability', 'performance'
        ],
        primary_agents: ['TechLead', 'ProductManager'],
        secondary_agents: ['SecurityEngineer', 'QALead'],
        weight: 1.0
      },
      database: {
        keywords: [
          'database', 'DB', 'SQL', 'query', 'schema', 'migration',
          'ORM', 'PostgreSQL', 'MySQL', 'MongoDB', 'data model',
          'index', 'transaction', 'ACID'
        ],
        primary_agents: ['SecurityEngineer', 'TechLead'],
        secondary_agents: ['QALead'],
        weight: 1.0
      },
      compliance: {
        keywords: [
          'compliance', 'regulatory', 'CMMC', 'GDPR', 'HIPAA', 'SOX',
          'audit', 'audit trail', 'regulation', 'policy', 'governance'
        ],
        primary_agents: ['SecurityEngineer', 'QALead'],
        secondary_agents: ['TechLead'],
        weight: 1.0
      }
    },
    selection: {
      min_agents: 2,
      max_agents: 5,
      default_agents: 3,
      fallback_roster: ['ProductManager', 'TechLead', 'SecurityEngineer'],
      allow_manual_override: true,
      high_relevance_threshold: 0.7,
      medium_relevance_threshold: 0.4,
      tie_breaker: 'participation_rate'
    },
    question_patterns: [
      {
        pattern: '(how long|how much time|duration|estimate|when)',
        domain: 'planning',
        description: 'Timeline/estimation questions'
      },
      {
        pattern: '(how many tests|test count|coverage|testing)',
        domain: 'testing',
        description: 'Testing-focused questions'
      },
      {
        pattern: '(should we|priority|MVP|defer)',
        domain: 'prioritization',
        description: 'Prioritization questions'
      },
      {
        pattern: '(security|secure|attack|threat|vuln)',
        domain: 'security',
        description: 'Security-focused questions'
      },
      {
        pattern: '(user|UX|experience|usability)',
        domain: 'ux',
        description: 'User experience questions'
      }
    ]
  };
}

/**
 * Load domain mapping from config file
 */
function loadDomainMapping(): DomainMapping {
  const configPath = path.join(__dirname, '..', 'Config', 'domain-mapping.yaml');

  if (!fs.existsSync(configPath)) {
    return getDefaultDomainMapping();
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return yaml.parse(content) as DomainMapping;
  } catch {
    return getDefaultDomainMapping();
  }
}

// ============================================================================
// Participation Tracking
// ============================================================================

const participationPath = path.join(__dirname, '..', 'state', 'participation.yaml');

/**
 * Load participation tracking data
 */
function loadParticipation(): ParticipationData {
  if (!fs.existsSync(participationPath)) {
    return { agents: {} };
  }

  try {
    const content = fs.readFileSync(participationPath, 'utf-8');
    return yaml.parse(content) as ParticipationData;
  } catch {
    return { agents: {} };
  }
}

/**
 * Save participation tracking data
 */
function saveParticipation(data: ParticipationData): void {
  const stateDir = path.dirname(participationPath);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(participationPath, yaml.stringify(data));
}

/**
 * Update participation after a session
 */
export function updateParticipation(selectedAgents: string[]): void {
  const participation = loadParticipation();
  const today = new Date().toISOString().split('T')[0];

  // Calculate total sessions
  let totalSessions = 0;
  for (const agent in participation.agents) {
    totalSessions = Math.max(totalSessions, participation.agents[agent].total_sessions);
  }
  totalSessions += 1;

  // Update selected agents
  for (const agent of selectedAgents) {
    if (!participation.agents[agent]) {
      participation.agents[agent] = {
        total_sessions: 0,
        last_participated: '',
        participation_rate: 0
      };
    }

    participation.agents[agent].total_sessions += 1;
    participation.agents[agent].last_participated = today;
    participation.agents[agent].participation_rate =
      participation.agents[agent].total_sessions / totalSessions;
  }

  // Update rates for non-selected agents
  for (const agent in participation.agents) {
    if (!selectedAgents.includes(agent)) {
      participation.agents[agent].participation_rate =
        participation.agents[agent].total_sessions / totalSessions;
    }
  }

  saveParticipation(participation);
}

// ============================================================================
// Selection Algorithm
// ============================================================================

/**
 * Select agents for a council session
 *
 * @param question The decision question or topic
 * @param options Selection options
 * @returns Selection result with agents and reasoning
 */
export function selectAgents(
  question: string,
  options: SelectionOptions = {}
): SelectionResult {
  const config = loadDomainMapping();
  const participation = loadParticipation();

  // Manual override
  if (options.manualRoster && options.manualRoster.length > 0) {
    if (config.selection.allow_manual_override) {
      return {
        selected_agents: options.manualRoster,
        domain_detected: [],
        scores: options.manualRoster.map(agent => ({
          agent,
          score: 1.0,
          reason: 'Manual override',
          participation_rate: participation.agents[agent]?.participation_rate || 0
        })),
        reason: 'Manual roster override specified'
      };
    }
  }

  // Combine question and feature context
  const fullContext = `${question} ${options.featureContext || ''}`.toLowerCase();

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
      // Logarithmic scale for keyword matches
      const baseScore = Math.min(0.5 + (matchCount * 0.2), 1.0);
      domainScores[domainName] = baseScore * domainConfig.weight;
      domainsDetected.push(domainName);
    }
  }

  // Boost primary domain if detected via question pattern
  if (primaryDomain && domainScores[primaryDomain]) {
    domainScores[primaryDomain] *= 1.5;
  }

  // Get all available agents
  const availableAgents = getAvailableAgents();

  // Calculate agent scores
  const agentScores: AgentScore[] = [];

  for (const agentName of availableAgents) {
    let agentScore = 0;
    const reasons: string[] = [];

    // Score based on domain expertise
    for (const [domainName, score] of Object.entries(domainScores)) {
      const domainConfig = config.domains[domainName];

      if (domainConfig.primary_agents.some(a =>
        a.toLowerCase() === agentName.toLowerCase()
      )) {
        agentScore += score * 1.0;
        reasons.push(`Primary: ${domainName}`);
      } else if (domainConfig.secondary_agents.some(a =>
        a.toLowerCase() === agentName.toLowerCase()
      )) {
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
      // Lower participation preferred (rotation)
      return a.participation_rate - b.participation_rate;
    }

    // Default: alphabetical
    return a.agent.localeCompare(b.agent);
  });

  // Determine selection thresholds
  const minAgents = options.minAgents ?? config.selection.min_agents;
  const maxAgents = options.maxAgents ?? config.selection.default_agents;

  // Select top agents
  const highRelevance = agentScores.filter(
    a => a.score >= config.selection.high_relevance_threshold
  );
  const mediumRelevance = agentScores.filter(
    a => a.score >= config.selection.medium_relevance_threshold &&
         a.score < config.selection.high_relevance_threshold
  );

  let selectedAgents: string[] = [];

  if (highRelevance.length >= maxAgents) {
    // Enough high-relevance agents
    selectedAgents = highRelevance
      .slice(0, maxAgents)
      .map(a => a.agent);
  } else if (highRelevance.length >= minAgents) {
    // Some high-relevance, fill with medium
    selectedAgents = [
      ...highRelevance.map(a => a.agent),
      ...mediumRelevance
        .slice(0, maxAgents - highRelevance.length)
        .map(a => a.agent)
    ];
  } else if (highRelevance.length + mediumRelevance.length >= minAgents) {
    // Mix of high and medium
    selectedAgents = [
      ...highRelevance.map(a => a.agent),
      ...mediumRelevance
        .slice(0, maxAgents - highRelevance.length)
        .map(a => a.agent)
    ];
  } else {
    // No clear match, use fallback
    return {
      selected_agents: config.selection.fallback_roster.slice(0, maxAgents),
      domain_detected: domainsDetected,
      scores: agentScores,
      reason: 'No clear domain match, using fallback roster'
    };
  }

  return {
    selected_agents: selectedAgents,
    domain_detected: domainsDetected,
    scores: agentScores,
    reason: domainsDetected.length > 0
      ? `Domain match: ${domainsDetected.join(', ')}`
      : 'General selection based on available agents'
  };
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: bun run RosterSelector.ts "<question>" [feature_context] [manual_roster]');
    console.error('');
    console.error('Examples:');
    console.error('  bun run RosterSelector.ts "Review authentication design"');
    console.error('  bun run RosterSelector.ts "How long will this take?"');
    console.error('  bun run RosterSelector.ts "Security review" "Payment API" "SecurityEngineer,TechLead"');
    process.exit(1);
  }

  const question = args[0];
  const featureContext = args[1] || '';
  const manualRoster = args[2] ? args[2].split(',').map(s => s.trim()) : undefined;

  const result = selectAgents(question, { featureContext, manualRoster });

  // Output
  if (process.env.OUTPUT_FORMAT === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('');
    console.log('Agent Selection Result');
    console.log('======================');
    console.log('');
    console.log(`Question: "${question}"`);
    if (featureContext) {
      console.log(`Context: "${featureContext}"`);
    }
    console.log('');
    console.log(`Domains Detected: ${result.domain_detected.join(', ') || 'None'}`);
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
      const selected = result.selected_agents.includes(score.agent) ? '[x]' : '[ ]';
      console.log(`  ${selected} ${score.agent.padEnd(20)} ${score.score.toFixed(2)}  ${score.reason}`);
    }
  }

  // Update participation tracking
  if (!process.env.DRY_RUN) {
    updateParticipation(result.selected_agents);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for programmatic use
export { loadDomainMapping, loadParticipation };
