#!/usr/bin/env bun
// $PAI_DIR/hooks/capture-all-events.ts
// Captures ALL Claude Code hook events to JSONL

import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { enrichEventWithAgentMetadata, isAgentSpawningCall } from './lib/metadata-extraction';

interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  timestamp: number;
  timestamp_local: string;
}

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return new Date().toISOString();
  }
}

function getEventsFilePath(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const now = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');

  const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);

  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

function getSessionMappingFile(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  return join(paiDir, 'agent-sessions.json');
}

function getAgentForSession(sessionId: string): string {
  try {
    const mappingFile = getSessionMappingFile();
    if (existsSync(mappingFile)) {
      const mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
      return mappings[sessionId] || process.env.DA || 'main';
    }
  } catch {
    // Ignore errors
  }
  return process.env.DA || 'main';
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
  } catch {
    // Silently fail
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const eventTypeIndex = args.indexOf('--event-type');

    if (eventTypeIndex === -1) {
      console.error('Missing --event-type argument');
      process.exit(0);
    }

    const eventType = args[eventTypeIndex + 1];
    const stdinData = await Bun.stdin.text();
    const hookData = JSON.parse(stdinData);

    const sessionId = hookData.session_id || 'main';
    let agentName = getAgentForSession(sessionId);

    // Update agent mapping based on event type
    if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
      agentName = hookData.tool_input.subagent_type;
      setAgentForSession(sessionId, agentName);
    } else if (eventType === 'SubagentStop' || eventType === 'Stop') {
      agentName = process.env.DA || 'main';
      setAgentForSession(sessionId, agentName);
    } else if (process.env.CLAUDE_CODE_AGENT) {
      agentName = process.env.CLAUDE_CODE_AGENT;
      setAgentForSession(sessionId, agentName);
    } else if (hookData.agent_type) {
      agentName = hookData.agent_type;
      setAgentForSession(sessionId, agentName);
    }

    let event: HookEvent = {
      source_app: agentName,
      session_id: hookData.session_id || 'main',
      hook_event_type: eventType,
      payload: hookData,
      timestamp: Date.now(),
      timestamp_local: getLocalTimestamp()
    };

    // Enrich with agent instance metadata for Task calls
    if (isAgentSpawningCall(hookData.tool_name, hookData.tool_input)) {
      event = enrichEventWithAgentMetadata(event, hookData.tool_input, hookData.description);
    }

    // Append to events file
    const eventsFile = getEventsFilePath();
    const jsonLine = JSON.stringify(event) + '\n';
    appendFileSync(eventsFile, jsonLine, 'utf-8');

  } catch (error) {
    console.error('Event capture error:', error);
  }

  process.exit(0);
}

main();
