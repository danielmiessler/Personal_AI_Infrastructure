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
 * - Files: MEMORY/STATE/current-work.json
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Updates: MEMORY/WORK/<dir>/META.yaml (status: COMPLETED, completed_at timestamp)
 * - Deletes: MEMORY/STATE/current-work.json (clears session state)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: AutoWorkCreation (expects WORK/ structure and current-work.json)
 * - COORDINATES WITH: WorkCompletionLearning (both run at SessionEnd)
 * - MUST RUN BEFORE: None (final cleanup)
 * - MUST RUN AFTER: WorkCompletionLearning (learning capture uses state before clear)
 *
 * STATE TRANSITIONS:
 * - META.yaml status: "ACTIVE" → "COMPLETED"
 * - META.yaml completed_at: null → ISO timestamp
 * - current-work.json: exists → deleted
 *
 * DESIGN NOTES:
 * - Does NOT write to SESSIONS/ directory (WORK/ is the primary tracking system)
 * - Deleting current-work.json signals a clean slate for next session
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
import { getISOTimestamp } from './lib/time';

const MEMORY_DIR = join(process.env.HOME!, '.claude', 'MEMORY');
const STATE_DIR = join(MEMORY_DIR, 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');
const WORK_DIR = join(MEMORY_DIR, 'WORK');

interface CurrentWork {
  session_id: string;
  work_dir: string;
  created_at: string;
  item_count: number;
}

/**
 * Mark work directory as completed and clear session state
 */
function clearSessionWork(): void {
  try {
    if (!existsSync(CURRENT_WORK_FILE)) {
      // No current work to complete
      return;
    }

    // Read current work state
    const content = readFileSync(CURRENT_WORK_FILE, 'utf-8');
    const currentWork: CurrentWork = JSON.parse(content);

    // Mark work directory as COMPLETED
    if (currentWork.work_dir) {
      const metaPath = join(WORK_DIR, currentWork.work_dir, 'META.yaml');
      if (existsSync(metaPath)) {
        let metaContent = readFileSync(metaPath, 'utf-8');
        metaContent = metaContent.replace(/^status: "ACTIVE"$/m, 'status: "COMPLETED"');
        metaContent = metaContent.replace(/^completed_at: null$/m, `completed_at: "${getISOTimestamp()}"`);
        writeFileSync(metaPath, metaContent, 'utf-8');
        // Marked work directory as COMPLETED
      }
    }

    // Delete state file
    unlinkSync(CURRENT_WORK_FILE);
    // Cleared session work state
  } catch (error) {
    // Error clearing session work - non-critical
  }
}

async function main() {
  try {
    // Read input from stdin (not strictly needed but matches hook pattern)
    const input = await Bun.stdin.text();
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    // Mark work as complete and clear state
    // NOTE: Does NOT write to SESSIONS/ - WORK/ is the primary system
    clearSessionWork();

    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    process.exit(0);
  }
}

main();
