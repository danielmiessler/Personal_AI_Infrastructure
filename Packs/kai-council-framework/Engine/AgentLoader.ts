#!/usr/bin/env bun

/**
 * Agent Loader
 *
 * Dynamically loads agent definitions from installed agent packs.
 * Agents are defined as markdown files with YAML frontmatter.
 *
 * Usage:
 *   import { loadAgents, loadAgent } from './AgentLoader';
 *   const agents = await loadAgents(['SecurityEngineer', 'TechLead']);
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

export interface AgentFrontmatter {
  name: string;
  role: string;
  expertise: string[];
  personality: string[];
  triggers: string[];
  veto_power?: boolean;
  veto_criteria?: string;
}

export interface Agent {
  /** Agent identifier */
  name: string;
  /** Role title (e.g., "Security Engineer") */
  role: string;
  /** Areas of expertise */
  expertise: string[];
  /** Personality traits affecting communication style */
  personality: string[];
  /** Triggers for when to involve this agent */
  triggers: string[];
  /** Whether this agent can veto decisions */
  vetoPower: boolean;
  /** Criteria for exercising veto */
  vetoCriteria?: string;
  /** Full markdown content (for LLM persona) */
  content: string;
  /** Source file path */
  sourcePath: string;
}

interface AgentCache {
  agents: Map<string, Agent>;
  lastScan: Date;
  packPaths: string[];
}

// ============================================================================
// Agent Cache
// ============================================================================

const agentCache: AgentCache = {
  agents: new Map(),
  lastScan: new Date(0),
  packPaths: []
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get the Packs directory path
 */
function getPacksDir(): string {
  // Navigate up from Engine/ to kai-council-framework/ to Packs/
  return path.join(__dirname, '..', '..');
}

/**
 * Discover agent pack directories
 */
function discoverAgentPacks(): string[] {
  const packsDir = getPacksDir();
  const packPaths: string[] = [];

  if (!fs.existsSync(packsDir)) {
    return packPaths;
  }

  const entries = fs.readdirSync(packsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('kai-agents-')) {
      const agentsDir = path.join(packsDir, entry.name, 'Agents');
      if (fs.existsSync(agentsDir)) {
        packPaths.push(agentsDir);
      }
    }
  }

  return packPaths;
}

/**
 * Scan for all available agents
 */
function scanForAgents(): void {
  const now = new Date();

  // Check if cache is still valid
  if (now.getTime() - agentCache.lastScan.getTime() < CACHE_TTL) {
    return;
  }

  agentCache.agents.clear();
  agentCache.packPaths = discoverAgentPacks();

  for (const packPath of agentCache.packPaths) {
    scanPackDirectory(packPath);
  }

  agentCache.lastScan = now;
}

/**
 * Scan a single pack directory for agents
 */
function scanPackDirectory(packPath: string): void {
  if (!fs.existsSync(packPath)) {
    return;
  }

  const entries = fs.readdirSync(packPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const agentPath = path.join(packPath, entry.name);
        const agent = parseAgentFile(agentPath);
        if (agent) {
          agentCache.agents.set(agent.name.toLowerCase(), agent);
          // Also cache by role for flexibility
          agentCache.agents.set(agent.role.toLowerCase().replace(/\s+/g, ''), agent);
        }
      } catch (error) {
        console.warn(`Failed to parse agent file ${entry.name}:`, error);
      }
    }
  }
}

// ============================================================================
// Agent Parsing
// ============================================================================

/**
 * Parse a markdown file with YAML frontmatter into an Agent
 */
function parseAgentFile(filePath: string): Agent | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    console.warn(`No frontmatter found in ${filePath}`);
    return null;
  }

  const frontmatter = yaml.parse(frontmatterMatch[1]) as AgentFrontmatter;

  if (!frontmatter.name || !frontmatter.role) {
    console.warn(`Missing required fields in ${filePath}`);
    return null;
  }

  return {
    name: frontmatter.name,
    role: frontmatter.role,
    expertise: frontmatter.expertise || [],
    personality: frontmatter.personality || [],
    triggers: frontmatter.triggers || [],
    vetoPower: frontmatter.veto_power || false,
    vetoCriteria: frontmatter.veto_criteria,
    content: content,
    sourcePath: filePath
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load multiple agents by name
 *
 * @param names Agent names to load
 * @returns Array of loaded agents
 */
export async function loadAgents(names: string[]): Promise<Agent[]> {
  scanForAgents();

  const agents: Agent[] = [];

  for (const name of names) {
    const agent = await loadAgent(name);
    if (agent) {
      agents.push(agent);
    } else {
      console.warn(`Agent not found: ${name}`);
    }
  }

  return agents;
}

/**
 * Load a single agent by name
 *
 * @param name Agent name or role
 * @returns Agent or null if not found
 */
export async function loadAgent(name: string): Promise<Agent | null> {
  scanForAgents();

  // Try exact match first
  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  const agent = agentCache.agents.get(normalizedName);

  if (agent) {
    return agent;
  }

  // Try partial match
  for (const [key, cachedAgent] of agentCache.agents) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return cachedAgent;
    }
  }

  return null;
}

/**
 * Get all available agent names
 *
 * @returns Array of agent names
 */
export function getAvailableAgents(): string[] {
  scanForAgents();

  const names = new Set<string>();

  for (const agent of agentCache.agents.values()) {
    names.add(agent.name);
  }

  return Array.from(names).sort();
}

/**
 * Get agents by expertise domain
 *
 * @param domain Domain to search for (e.g., "security", "testing")
 * @returns Array of agents with expertise in that domain
 */
export function getAgentsByDomain(domain: string): Agent[] {
  scanForAgents();

  const domainLower = domain.toLowerCase();
  const matchingAgents: Agent[] = [];
  const seen = new Set<string>();

  for (const agent of agentCache.agents.values()) {
    if (seen.has(agent.name)) continue;

    for (const expertise of agent.expertise) {
      if (expertise.toLowerCase().includes(domainLower)) {
        matchingAgents.push(agent);
        seen.add(agent.name);
        break;
      }
    }
  }

  return matchingAgents;
}

/**
 * Clear the agent cache (useful for testing or after installing new packs)
 */
export function clearCache(): void {
  agentCache.agents.clear();
  agentCache.lastScan = new Date(0);
  agentCache.packPaths = [];
}

/**
 * Force a rescan of agent packs
 */
export function rescan(): void {
  clearCache();
  scanForAgents();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  agentCount: number;
  packCount: number;
  lastScan: Date;
  packPaths: string[];
} {
  scanForAgents();

  // Count unique agents
  const uniqueAgents = new Set<string>();
  for (const agent of agentCache.agents.values()) {
    uniqueAgents.add(agent.name);
  }

  return {
    agentCount: uniqueAgents.size,
    packCount: agentCache.packPaths.length,
    lastScan: agentCache.lastScan,
    packPaths: agentCache.packPaths
  };
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--list') {
    console.log('Available Agents:');
    console.log('=================');

    const agents = getAvailableAgents();
    if (agents.length === 0) {
      console.log('No agents found. Install agent packs (kai-agents-*) first.');
    } else {
      for (const name of agents) {
        const agent = await loadAgent(name);
        if (agent) {
          console.log(`  ${name} (${agent.role})`);
          console.log(`    Expertise: ${agent.expertise.join(', ')}`);
        }
      }
    }

    const stats = getCacheStats();
    console.log('');
    console.log(`Total: ${stats.agentCount} agents from ${stats.packCount} packs`);
    return;
  }

  if (args[0] === '--domain') {
    const domain = args[1];
    if (!domain) {
      console.error('Usage: bun run AgentLoader.ts --domain <domain>');
      process.exit(1);
    }

    console.log(`Agents with expertise in "${domain}":`);
    const agents = getAgentsByDomain(domain);

    if (agents.length === 0) {
      console.log('  None found');
    } else {
      for (const agent of agents) {
        console.log(`  ${agent.name} (${agent.role})`);
      }
    }
    return;
  }

  // Load specific agent
  const agent = await loadAgent(args[0]);

  if (agent) {
    console.log(`Agent: ${agent.name}`);
    console.log(`Role: ${agent.role}`);
    console.log(`Expertise: ${agent.expertise.join(', ')}`);
    console.log(`Personality: ${agent.personality.join(', ')}`);
    console.log(`Veto Power: ${agent.vetoPower ? 'Yes' : 'No'}`);
    if (agent.vetoCriteria) {
      console.log(`Veto Criteria: ${agent.vetoCriteria}`);
    }
    console.log(`Source: ${agent.sourcePath}`);
  } else {
    console.error(`Agent not found: ${args[0]}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
