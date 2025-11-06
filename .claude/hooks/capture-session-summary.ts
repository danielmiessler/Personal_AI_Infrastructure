#!/usr/bin/env bun

/**
 * SessionEnd Hook - Captures session summary for UOCS
 *
 * Generates a session summary document when a Claude Code session ends,
 * documenting what was accomplished during the session.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SessionData {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  reason: string;
  [key: string]: any;
}

const HISTORY_DIR = join(process.env.HOME!, '.claude', 'history');

async function main() {
  try {
    // Read input from stdin
    const input = await Bun.stdin.text();
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    const data: SessionData = JSON.parse(input);

    // Generate timestamp for filename
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '')
      .replace(/\..+/, '')
      .replace('T', '-'); // YYYY-MM-DD-HHMMSS

    const yearMonth = timestamp.substring(0, 7); // YYYY-MM

    // Extract session info from transcript
    const sessionInfo = await analyzeSession(data);

    // Generate filename
    const filename = `${timestamp}_SESSION_${sessionInfo.focus}.md`;

    // Ensure directory exists
    const sessionDir = join(HISTORY_DIR, 'sessions', yearMonth);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    // Generate session document
    const sessionDoc = formatSessionDocument(timestamp, data, sessionInfo);

    // Write session file
    writeFileSync(join(sessionDir, filename), sessionDoc);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    console.error(`[UOCS] SessionEnd hook error: ${error}`);
    process.exit(0);
  }
}

async function analyzeSession(data: SessionData): Promise<any> {
  let filesChanged: string[] = [];
  let commandsExecuted: string[] = [];
  let toolsUsed: Set<string> = new Set();
  let startTime: number | null = null;
  let endTime: number | null = null;
  let userPrompts: string[] = [];
  let focus = 'general-work';

  try {
    // Read transcript file if it exists
    if (data.transcript_path && existsSync(data.transcript_path)) {
      const content = readFileSync(data.transcript_path, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Track timestamps for duration calculation
          if (entry.timestamp) {
            const ts = new Date(entry.timestamp).getTime();
            if (!startTime || ts < startTime) startTime = ts;
            if (!endTime || ts > endTime) endTime = ts;
          }

          // Extract user prompts for focus determination
          if (entry.type === 'user_message' && entry.content) {
            userPrompts.push(entry.content);
          }

          // Extract tool usage from tool_use blocks
          if (entry.type === 'tool_use' && entry.name) {
            toolsUsed.add(entry.name);

            // Extract file changes
            if ((entry.name === 'Edit' || entry.name === 'Write') && entry.input?.file_path) {
              filesChanged.push(entry.input.file_path);
            }

            // Extract bash commands
            if (entry.name === 'Bash' && entry.input?.command) {
              commandsExecuted.push(entry.input.command);
            }
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }

      // Determine focus from user prompts
      focus = determineFocus(userPrompts, Array.from(toolsUsed), filesChanged);
    }
  } catch (error) {
    // If transcript reading fails, try fallback to raw outputs
    console.error('[Session Summary] Transcript read failed, trying raw outputs...');
    // Fallback logic here if needed
  }

  // Calculate duration in minutes
  let duration = 0;
  if (startTime && endTime) {
    duration = Math.round((endTime - startTime) / 1000 / 60);
  }

  return {
    focus,
    filesChanged: [...new Set(filesChanged)].slice(0, 15), // Unique, max 15
    commandsExecuted: commandsExecuted.slice(0, 15), // Max 15
    toolsUsed: Array.from(toolsUsed),
    duration,
    userPrompts: userPrompts.slice(0, 3) // First 3 prompts for context
  };
}

function determineFocus(prompts: string[], tools: string[], files: string[]): string {
  const allText = prompts.join(' ').toLowerCase();

  // Check for specific patterns
  if (allText.includes('debug') || allText.includes('fix') || allText.includes('error')) {
    return 'debugging';
  }
  if (allText.includes('test') || tools.includes('Test')) {
    return 'testing';
  }
  if (allText.includes('refactor') || allText.includes('improve')) {
    return 'refactoring';
  }
  if (allText.includes('document') || allText.includes('readme') || allText.includes('comment')) {
    return 'documentation';
  }
  if (allText.includes('research') || allText.includes('investigate') || allText.includes('analyze')) {
    return 'research';
  }
  if (allText.includes('deploy') || allText.includes('release') || allText.includes('publish')) {
    return 'deployment';
  }
  if (tools.includes('Write') && files.length > 3) {
    return 'feature-development';
  }
  if (tools.includes('Edit') && files.length > 0) {
    return 'code-modification';
  }
  if (tools.includes('Bash') && tools.length <= 2) {
    return 'system-tasks';
  }

  return 'general-work';
}

function formatSessionDocument(timestamp: string, data: SessionData, info: any): string {
  const date = timestamp.substring(0, 10); // YYYY-MM-DD
  const time = timestamp.substring(11).replace(/-/g, ':'); // HH:MM:SS

  // Format focus for display
  const focusDisplay = info.focus.split('-').map((w: string) =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  return `---
capture_type: SESSION
timestamp: ${new Date().toISOString()}
session_id: ${data.session_id}
duration_minutes: ${info.duration}
focus: ${info.focus}
reason: ${data.reason || 'exit'}
cwd: ${data.cwd}
---

# Session: ${focusDisplay}

**Date:** ${date}
**Time:** ${time}
**Session ID:** ${data.session_id}
**Duration:** ${info.duration > 0 ? `${info.duration} minutes` : 'Less than 1 minute'}

---

## Session Overview

**Focus Area:** ${focusDisplay}
**Exit Reason:** ${data.reason || 'exit'}
**Working Directory:** \`${data.cwd}\`
${info.userPrompts.length > 0 ? `\n**Initial Request:** ${info.userPrompts[0].substring(0, 200)}${info.userPrompts[0].length > 200 ? '...' : ''}` : ''}

---

## Tools Used

${info.toolsUsed.length > 0 ? info.toolsUsed.map((t: string) => `- ${t}`).join('\n') : '- None recorded'}

**Total Tools:** ${info.toolsUsed.length}

---

## Files Modified

${info.filesChanged.length > 0 ? info.filesChanged.map((f: string) => `- \`${f}\``).join('\n') : '- None recorded'}

**Total Files Changed:** ${info.filesChanged.length}

---

## Commands Executed

${info.commandsExecuted.length > 0 ? '```bash\n' + info.commandsExecuted.join('\n') + '\n```' : 'None recorded'}

**Total Commands:** ${info.commandsExecuted.length}

---

## Session Details

- **Permission Mode:** ${data.permission_mode}
- **Transcript:** \`${data.transcript_path}\`
- **Session Ended:** ${new Date().toISOString()}

---

## Notes

This session summary was automatically generated by the PAI SessionEnd hook.

For full conversation transcript, see: \`${data.transcript_path}\`

---

**Status:** Completed
**Generated:** ${new Date().toISOString()}
`;
}

main();
