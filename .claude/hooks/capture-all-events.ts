#!/usr/bin/env bun
/**
 * Capture All Events Hook
 * Captures ALL Claude Code hook events (not just tools) to JSONL
 * This hook provides comprehensive event tracking for the PAI observability system
 *
 * SETUP REQUIRED:
 * 1. Install Bun: https://bun.sh
 * 2. Set PAI_DIR environment variable (defaults to ~/.claude)
 * 3. Make this file executable: chmod +x capture-all-events.ts
 * 4. Configure in settings.json under "hooks" section
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  timestamp: number;
  timestamp_pst: string;
}

// Get PST timestamp (adjust timezone as needed for your location)
function getPSTTimestamp(): string {
  const date = new Date();
  // Change 'America/Los_Angeles' to your preferred timezone
  const pstDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  const hours = String(pstDate.getHours()).padStart(2, '0');
  const minutes = String(pstDate.getMinutes()).padStart(2, '0');
  const seconds = String(pstDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} PST`;
}

// Get current events file path
function getEventsFilePath(): string {
  // Use PAI_DIR environment variable or default to ~/.claude
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');

  const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);

  // Ensure directory exists
  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

// Session-to-agent mapping functions
function getSessionMappingFile(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  return join(paiDir, 'agent-sessions.json');
}

function getAgentForSession(sessionId: string): string {
  try {
    const mappingFile = getSessionMappingFile();
    if (existsSync(mappingFile)) {
      const mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
      // Default agent name - change 'kai' to your primary agent's name
      return mappings[sessionId] || 'kai';
    }
  } catch (error) {
    // Ignore errors, default to primary agent
  }
  // Change 'kai' to your primary agent's name
  return 'kai';
}

function setAgentForSession(sessionId: string, agentName: string): void {
  try {
    const mappingFile = getSessionMappingFile();
    let mappings: Record<string, string> = {};

    if (existsSync(mappingFile)) {
      mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
    }

    mappings[sessionId] = agentName;
    writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf-8');
  } catch (error) {
    // Silently fail - don't block
  }
}

async function main() {
  try {
    // Get event type from command line args
    const args = process.argv.slice(2);
    const eventTypeIndex = args.indexOf('--event-type');

    if (eventTypeIndex === -1) {
      console.error('Missing --event-type argument');
      process.exit(0); // Don't block Claude Code
    }

    const eventType = args[eventTypeIndex + 1];

    // Read hook data from stdin
    const stdinData = await Bun.stdin.text();
    const hookData = JSON.parse(stdinData);

    // Detect agent type from session mapping or payload
    const sessionId = hookData.session_id || 'main';
    let agentName = getAgentForSession(sessionId);

    // If this is a Task tool launching a subagent, update the session mapping
    if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
      agentName = hookData.tool_input.subagent_type;
      setAgentForSession(sessionId, agentName);
    }
    // If this is a SubagentStop or Stop event, reset to primary agent
    else if (eventType === 'SubagentStop' || eventType === 'Stop') {
      // Change 'kai' to your primary agent's name
      agentName = 'kai';
      setAgentForSession(sessionId, 'kai');
    }
    // Check if CLAUDE_CODE_AGENT env variable is set (for subagents)
    else if (process.env.CLAUDE_CODE_AGENT) {
      agentName = process.env.CLAUDE_CODE_AGENT;
      setAgentForSession(sessionId, agentName);
    }
    // Check if agent type is in the payload (alternative detection method)
    else if (hookData.agent_type) {
      agentName = hookData.agent_type;
      setAgentForSession(sessionId, agentName);
    }
    // Check if this is from a subagent based on cwd containing 'agent'
    else if (hookData.cwd && hookData.cwd.includes('/agents/')) {
      // Extract agent name from path like "/agents/designer/"
      const agentMatch = hookData.cwd.match(/\/agents\/([^\/]+)/);
      if (agentMatch) {
        agentName = agentMatch[1];
        setAgentForSession(sessionId, agentName);
      }
    }

    // Create event object
    const event: HookEvent = {
      source_app: agentName,
      session_id: hookData.session_id || 'main',
      hook_event_type: eventType,
      payload: hookData,
      timestamp: Date.now(),
      timestamp_pst: getPSTTimestamp()
    };

    // Append to events file
    const eventsFile = getEventsFilePath();
    const jsonLine = JSON.stringify(event) + '\n';
    appendFileSync(eventsFile, jsonLine, 'utf-8');

  } catch (error) {
    // Silently fail - don't block Claude Code
    console.error('Event capture error:', error);
  }

  process.exit(0);
}

main();
