#!/usr/bin/env bun
/**
 * ConfigChange.hook.ts - Configuration Change Guard
 *
 * PURPOSE:
 * Fires when settings.json or other config files change during a session.
 * Guards against mid-session hook disabling or security system tampering.
 *
 * TRIGGER: ConfigChange (claude-code v2.1.49+)
 *
 * BEHAVIOR:
 * - BLOCK: changes that remove or disable PAI security hooks (SecurityValidator, etc.)
 * - LOG: all config changes to MEMORY/STATE/config-changes.jsonl
 * - ALLOW: all other changes (whitelist approach — don't over-block)
 *
 * OUTPUT FORMAT (for blocking):
 *   {"decision": "block", "reason": "..."}
 * Allowed (exit 0 with no output, or):
 *   {"decision": "allow"}
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ConfigChangeInput {
  session_id: string;
  config_path?: string;
  hook_event_name: string;
  change_type?: string;
}

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const LOG_PATH = join(PAI_DIR, 'MEMORY', 'STATE', 'config-changes.jsonl');

// Critical hooks that must not be disabled
const CRITICAL_HOOKS = [
  'SecurityValidator',
  'StopOrchestrator',
  'ConfigChange',
];

function logChange(entry: object): void {
  try {
    const dir = join(PAI_DIR, 'MEMORY', 'STATE');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    // Silent fail — log failure shouldn't block change
  }
}

function checkForCriticalHookRemoval(configPath: string): string | null {
  try {
    if (!existsSync(configPath)) return null;
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Check if any critical hook is missing from the hooks section
    const hooksStr = JSON.stringify(config?.hooks || {});
    for (const hookName of CRITICAL_HOOKS) {
      if (!hooksStr.includes(hookName)) {
        return `Critical hook "${hookName}" appears to be missing from settings.json`;
      }
    }
  } catch {
    // If we can't read/parse, allow the change
  }
  return null;
}

async function readStdin(): Promise<ConfigChangeInput | null> {
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>(resolve => setTimeout(resolve, 500));
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) return JSON.parse(input) as ConfigChangeInput;
  } catch {
    // Ignore parse errors
  }
  return null;
}

async function main() {
  const input = await readStdin();

  if (!input) {
    process.exit(0);
  }

  const configPath = input.config_path || join(PAI_DIR, 'settings.json');

  // Log the change
  logChange({
    session_id: input.session_id,
    config_path: configPath,
    change_type: input.change_type || 'unknown',
  });

  // Only guard settings.json — other config files are lower risk
  if (!configPath.includes('settings.json')) {
    process.exit(0);
  }

  // Check for critical hook removal
  const violation = checkForCriticalHookRemoval(configPath);
  if (violation) {
    console.error(`[ConfigChange] BLOCKED: ${violation}`);
    console.log(JSON.stringify({
      decision: 'block',
      reason: `PAI security guard: ${violation}. Restore the hook before proceeding.`,
    }));
    process.exit(0);
  }

  console.error(`[ConfigChange] Config change allowed and logged: ${configPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[ConfigChange] Fatal error:', err);
  process.exit(0);
});
