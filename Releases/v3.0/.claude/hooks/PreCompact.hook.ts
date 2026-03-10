#!/usr/bin/env bun
/**
 * PreCompact.hook.ts — Context Compaction Safety Net
 *
 * Fires before context compaction. Saves a condensed identity snapshot
 * that LoadContext can reference if needed, and logs the event.
 *
 * PreCompact hooks can only do side effects — stdout is NOT injected
 * into the compaction summary. The real context preservation happens
 * when SessionStart fires with source "compact" and LoadContext.hook.ts
 * re-injects the full SKILL.md.
 *
 * TRIGGER: PreCompact (matcher: auto|manual)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { readStdinWithTimeout } from "./lib/stdin";

const HOME = homedir();
const PAI_DIR = join(HOME, ".claude");
const SETTINGS_PATH = join(PAI_DIR, "settings.json");
const STATE_DIR = join(PAI_DIR, "MEMORY", "STATE");
const SNAPSHOT_PATH = join(STATE_DIR, "identity-snapshot.json");
const LOG_PATH = join(STATE_DIR, "compaction-log.jsonl");

// Read hook input from stdin (cross-platform)
let input: { trigger?: string; session_id?: string; custom_instructions?: string } = {};
try {
  const stdin = await readStdinWithTimeout();
  if (stdin.trim()) {
    input = JSON.parse(stdin);
  }
} catch {
  // Ignore parse errors — proceed with defaults
}

// Read identity from settings.json
function getIdentity(): { daName: string; principalName: string; timezone: string } {
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    return {
      daName: settings.daidentity?.name || "PAI",
      principalName: settings.principal?.name || "User",
      timezone: settings.principal?.timezone || "UTC",
    };
  } catch {
    return { daName: "PAI", principalName: "User", timezone: "UTC" };
  }
}

// Ensure STATE directory exists
if (!existsSync(STATE_DIR)) {
  mkdirSync(STATE_DIR, { recursive: true });
}

const identity = getIdentity();
const now = new Date().toISOString();

// Save identity snapshot for recovery purposes
const snapshot = {
  savedAt: now,
  trigger: input.trigger || "unknown",
  sessionId: input.session_id || "unknown",
  identity,
};

writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

// Append to compaction log (JSONL for history)
const logEntry = JSON.stringify({
  timestamp: now,
  trigger: input.trigger || "unknown",
  sessionId: input.session_id || "unknown",
  daName: identity.daName,
  principalName: identity.principalName,
});

appendFileSync(LOG_PATH, logEntry + "\n");

console.error(`🔄 PreCompact: Identity snapshot saved (${identity.daName}/${identity.principalName})`);
console.error(`📝 Compaction event logged: ${input.trigger || "unknown"} trigger`);

process.exit(0);
