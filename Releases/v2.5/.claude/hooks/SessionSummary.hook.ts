#!/usr/bin/env bun
/**
 * SessionSummary.hook.ts - Mark Work Complete and Clear State (SessionEnd)
 *
 * PURPOSE:
 * Finalizes a Claude Code session by marking the current work directory as
 * COMPLETED and clearing the session state. This ensures clean session boundaries
 * and accurate work tracking.
 *
 * TRIGGER: SessionEnd
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, transcript_path)
 * - Files: MEMORY/STATE/current-work-{session_id}.json (session-scoped)
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Updates: MEMORY/WORK/<dir>/META.yaml (status: COMPLETED, completed_at timestamp)
 * - Deletes: MEMORY/STATE/current-work-{session_id}.json (clears session state)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: AutoWorkCreation (expects WORK/ structure and current-work-*.json)
 * - COORDINATES WITH: WorkCompletionLearning (both run at SessionEnd)
 * - MUST RUN BEFORE: None (final cleanup)
 * - MUST RUN AFTER: WorkCompletionLearning (learning capture uses state before clear)
 *
 * STATE TRANSITIONS:
 * - META.yaml status: "ACTIVE" → "COMPLETED"
 * - META.yaml completed_at: null → ISO timestamp
 * - current-work-{session_id}.json: exists → deleted
 *
 * DESIGN NOTES:
 * - Session-scoped state files prevent race conditions in multi-session setups
 * - Falls back to legacy current-work.json for backwards compatibility
 *
 * ERROR HANDLING:
 * - No current work: Logs message, exits gracefully
 * - Missing META.yaml: Skips update, continues to state clear
 * - File operation failures: Logged to stderr
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <50ms
 */

import { writeFileSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getISOTimestamp } from './lib/time';

const MEMORY_DIR = join((process.env.HOME || process.env.USERPROFILE || homedir()), '.claude', 'MEMORY');
const STATE_DIR = join(MEMORY_DIR, 'STATE');
const WORK_DIR = join(MEMORY_DIR, 'WORK');

interface CurrentWork {
  session_id: string;
  session_dir: string;  // Must match AutoWorkCreation's field name
  created_at: string;
  item_count: number;
}

/**
 * Find the state file for this session.
 * Tries session-scoped file first, falls back to legacy singleton.
 */
function findStateFile(sessionId?: string): string | null {
  if (sessionId) {
    const scoped = join(STATE_DIR, `current-work-${sessionId}.json`);
    if (existsSync(scoped)) return scoped;
  }
  // Legacy fallback
  const legacy = join(STATE_DIR, 'current-work.json');
  if (existsSync(legacy)) return legacy;
  return null;
}

/**
 * Mark work directory as completed and clear session state
 */
function clearSessionWork(sessionId?: string): void {
  try {
    const stateFile = findStateFile(sessionId);
    if (!stateFile) return;

    const content = readFileSync(stateFile, 'utf-8');
    const currentWork: CurrentWork = JSON.parse(content);

    // Only clean up our own session's work (guard against legacy file with wrong session)
    if (sessionId && currentWork.session_id !== sessionId) return;

    // Mark work directory as COMPLETED
    if (currentWork.session_dir) {
      const metaPath = join(WORK_DIR, currentWork.session_dir, 'META.yaml');
      if (existsSync(metaPath)) {
        let metaContent = readFileSync(metaPath, 'utf-8');
        metaContent = metaContent.replace(/^status: "ACTIVE"$/m, 'status: "COMPLETED"');
        metaContent = metaContent.replace(/^completed_at: null$/m, `completed_at: "${getISOTimestamp()}"`);
        writeFileSync(metaPath, metaContent, 'utf-8');
      }
    }

    // Delete this session's state file
    unlinkSync(stateFile);
  } catch (error) {
    // Error clearing session work - non-critical
  }
}

async function main() {
  try {
    // Read stdin with timeout — extract session_id if available
    let sessionId: string | undefined;
    try {
      const input = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      if (input && input.trim()) {
        const data = JSON.parse(input);
        sessionId = data.session_id;
      }
    } catch {
      // Timeout or parse error — proceed without session_id (will use fallback)
    }

    clearSessionWork(sessionId);
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
