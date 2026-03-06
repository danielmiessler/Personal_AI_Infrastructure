#!/usr/bin/env bun
/**
 * EventLogger.hook.ts — Unified event logger for pure-observability hooks
 *
 * Single hook that handles multiple Claude Code events that only need
 * logging to events.jsonl. Uses a routing table pattern:
 * - SubagentStart    → agent.start
 * - SubagentStop     → agent.stop
 * - TaskCompleted    → task.completed
 * - InstructionsLoaded → instructions.loaded (v2.1.69+)
 * - TeammateIdle     → teammate.idle (v2.1.69+, responds with continue:false)
 *
 * TRIGGERS: SubagentStart, SubagentStop, TaskCompleted, InstructionsLoaded, TeammateIdle
 * OUTPUT: Silent for most events; TeammateIdle outputs JSON response to stdout
 * PERFORMANCE: <10ms — single appendEvent call per invocation
 *
 * DESIGN: This hook is intentionally thin. Hooks that do real work
 * (PRDSync, VoiceCompletion, etc.) keep their own files.
 * Only pure event-loggers are consolidated here.
 *
 * To add a new event:
 * 1. Add handler function: function handleEventName(input) { appendEvent({...}); }
 * 2. Add to HANDLERS routing table
 * 3. (Optional) Add to RESPONDERS if the hook needs to output JSON
 * 4. Register in settings.json hooks section
 */

import { appendEvent } from './lib/event-emitter';

async function readStdin(timeout = 1000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);
    process.stdin.on('data', chunk => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

// ── Event handlers ──

function handleSubagentStart(input: Record<string, unknown>): void {
  appendEvent({
    type: 'agent.start',
    source: 'EventLogger',
    agent_type: String(input.agent_type || 'unknown'),
    agent_id: input.agent_id as string | undefined,
    description: String(input.description || input.prompt || '').slice(0, 100) || undefined,
  });
}

function handleSubagentStop(input: Record<string, unknown>): void {
  appendEvent({
    type: 'agent.stop',
    source: 'EventLogger',
    agent_id: input.agent_id as string | undefined,
    agent_type: input.agent_type as string | undefined,
    transcript_path: (input.agent_transcript_path || input.transcript_path) as string | undefined,
    last_message_preview: String(input.last_assistant_message || '').slice(0, 200) || undefined,
  });
}

function handleTaskCompleted(input: Record<string, unknown>): void {
  appendEvent({
    type: 'task.completed',
    source: 'EventLogger',
    task_id: input.task_id as string | undefined,
    task_subject: input.task_subject as string | undefined,
  });
}

function handleInstructionsLoaded(input: Record<string, unknown>): void {
  const files = Array.isArray(input.files) ? input.files.map(String) : [];
  appendEvent({
    type: 'instructions.loaded',
    source: 'EventLogger',
    files: files.length > 0 ? files : undefined,
    count: files.length || undefined,
  });
}

function handleTeammateIdle(input: Record<string, unknown>): void {
  appendEvent({
    type: 'teammate.idle',
    source: 'EventLogger',
    agent_id: input.agent_id as string | undefined,
    idle_reason: input.idle_reason as string | undefined,
  });
}

// ── Routing table ──

const HANDLERS: Record<string, (input: Record<string, unknown>) => void> = {
  SubagentStart: handleSubagentStart,
  SubagentStop: handleSubagentStop,
  TaskCompleted: handleTaskCompleted,
  InstructionsLoaded: handleInstructionsLoaded,
  TeammateIdle: handleTeammateIdle,
};

// ── Response generators (hooks that output JSON to stdout) ──

const RESPONDERS: Record<string, (input: Record<string, unknown>) => object | null> = {
  TeammateIdle: () => {
    return { continue: false, stopReason: 'PAI: teammate idle timeout' };
  },
};

// ── Main ──

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) { process.exit(0); }

    const input: Record<string, unknown> = JSON.parse(raw);
    const eventName = String(input.hook_event_name || '');

    const handler = HANDLERS[eventName];
    if (handler) {
      handler(input);
    } else {
      appendEvent({
        type: 'custom.unknown',
        source: 'EventLogger',
        hook_event_name: eventName,
      });
    }

    const responder = RESPONDERS[eventName];
    if (responder) {
      const response = responder(input);
      if (response) {
        process.stdout.write(JSON.stringify(response));
      }
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main().catch(() => process.exit(0));
