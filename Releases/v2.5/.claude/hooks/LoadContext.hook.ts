#!/usr/bin/env bun
/**
 * LoadContext.hook.ts - Inject PAI context into Claude's Context (SessionStart)
 *
 * PURPOSE:
 * The foundational context injection hook. Reads the PAI SKILL.md plus
 * AI Steering Rules (SYSTEM and USER) and outputs them as a <system-reminder>
 * to stdout.
 *
 * TRIGGER: SessionStart
 *
 * INPUT:
 * - Environment: PAI_DIR, TIME_ZONE
 * - Files: skills/PAI/SKILL.md, skills/PAI/SYSTEM/AISTEERINGRULES.md,
 *          skills/PAI/USER/AISTEERINGRULES.md, MEMORY/STATE/progress/*.json
 *
 * OUTPUT:
 * - stdout: <system-reminder> containing SKILL.md + AI Steering Rules
 * - stdout: Active work summary if previous sessions have pending work
 * - stderr: Status messages and errors
 * - exit(0): Normal completion
 * - exit(1): Critical failure (SKILL.md not found)
 *
 * DESIGN PHILOSOPHY:
 * Load SKILL.md and AI Steering Rules at session start. These are critical for
 * consistent behavior. Other context (USER docs, SYSTEM docs) loads dynamically
 * based on the Context Loading section in SKILL.md.
 *
 * ERROR HANDLING:
 * - Missing SKILL.md: Fatal error, exits with code 1
 * - Missing steering rules: Logged warning, continues (non-fatal)
 * - Progress file errors: Logged, continues (non-fatal)
 * - Date command failure: Falls back to ISO timestamp
 *
 * PERFORMANCE:
 * - Blocking: Yes (context is essential)
 * - Typical execution: <50ms
 * - Skipped for subagents: Yes (they get context differently)
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { getPaiDir } from './lib/paths';
import { recordSessionStart } from './lib/notifications';

/**
 * Reset tab title to clean state at session start.
 * Prevents stale tab titles from previous sessions bleeding through.
 * Uses Kitty remote control to set a neutral title immediately.
 */
function resetTabTitle(paiDir: string): void {
  const cleanTitle = 'New Session';
  const stateFile = join(paiDir, 'MEMORY', 'STATE', 'tab-title.json');

  try {
    // Reset Kitty tab title immediately
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;
    if (isKitty) {
      execSync(`kitty @ set-tab-title "${cleanTitle}"`, { stdio: 'ignore', timeout: 2000 });
      // Reset tab color to default (dark blue for active, no special color for inactive)
      execSync(
        `kitten @ set-tab-color --self active_bg=#002B80 active_fg=#FFFFFF inactive_bg=none inactive_fg=#A0A0A0`,
        { stdio: 'ignore', timeout: 2000 }
      );
      // Tab title reset to clean state
    }

    // Reset state file to prevent any stale data
    const cleanState = {
      title: cleanTitle,
      rawTitle: cleanTitle,
      timestamp: new Date().toISOString(),
      state: 'idle'
    };
    writeFileSync(stateFile, JSON.stringify(cleanState, null, 2));
    // Tab state file reset
  } catch (err) {
    // Failed to reset tab title - non-fatal
    // Non-fatal, continue with session
  }
}

async function getCurrentDate(): Promise<string> {
  try {
    const proc = Bun.spawn(['date', '+%Y-%m-%d %H:%M:%S %Z'], {
      stdout: 'pipe',
      env: { ...process.env, TZ: process.env.TIME_ZONE || 'America/Los_Angeles' }
    });
    const output = await new Response(proc.stdout).text();
    return output.trim();
  } catch (error) {
    // Failed to get current date - using fallback
    return new Date().toISOString();
  }
}

interface Settings {
  contextFiles?: string[];
  [key: string]: unknown;
}

/**
 * Load settings.json and return the settings object.
 */
function loadSettings(paiDir: string): Settings {
  const settingsPath = join(paiDir, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      return JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch (err) {
      // Failed to parse settings.json
    }
  }
  return {};
}

/**
 * Load context files from settings.json contextFiles array.
 * Falls back to hardcoded paths if array not defined.
 */
function loadContextFiles(paiDir: string, settings: Settings): string {
  const defaultFiles = [
    'skills/PAI/SKILL.md',
    'skills/PAI/SYSTEM/AISTEERINGRULES.md',
    'skills/PAI/USER/AISTEERINGRULES.md'
  ];

  const contextFiles = settings.contextFiles || defaultFiles;
  let combinedContent = '';

  for (const relativePath of contextFiles) {
    const fullPath = join(paiDir, relativePath);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      if (combinedContent) combinedContent += '\n\n---\n\n';
      combinedContent += content;
      // Loaded context file
    } else {
      // Context file not found
    }
  }

  return combinedContent;
}

interface ProgressFile {
  project: string;
  status: string;
  updated: string;
  objectives: string[];
  next_steps: string[];
  handoff_notes: string;
}

/**
 * Load relationship context for session startup.
 * Returns a lightweight summary of key opinions and recent notes.
 */
function loadRelationshipContext(paiDir: string): string | null {
  const parts: string[] = [];

  // Load high-confidence opinions (>0.85) from OPINIONS.md
  const opinionsPath = join(paiDir, 'skills/PAI/USER/OPINIONS.md');
  if (existsSync(opinionsPath)) {
    try {
      const content = readFileSync(opinionsPath, 'utf-8');
      const highConfidence: string[] = [];

      // Extract opinions with confidence >= 0.85
      const opinionBlocks = content.split(/^### /gm).slice(1);
      for (const block of opinionBlocks) {
        const lines = block.split('\n');
        const statement = lines[0]?.trim();
        const confidenceMatch = block.match(/\*\*Confidence:\*\*\s*([\d.]+)/);
        const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0;

        if (confidence >= 0.85 && statement) {
          highConfidence.push(`• ${statement} (${(confidence * 100).toFixed(0)}%)`);
        }
      }

      if (highConfidence.length > 0) {
        parts.push('**Key Opinions (high confidence):**');
        parts.push(highConfidence.slice(0, 6).join('\n'));
      }
    } catch (err) {
      // Failed to load opinions - non-fatal
    }
  }

  // Load recent relationship notes (today and yesterday)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatMonth = (d: Date) => d.toISOString().slice(0, 7);

  const recentNotes: string[] = [];
  for (const date of [today, yesterday]) {
    const notePath = join(
      paiDir,
      'MEMORY/RELATIONSHIP',
      formatMonth(date),
      `${formatDate(date)}.md`
    );
    if (existsSync(notePath)) {
      try {
        const content = readFileSync(notePath, 'utf-8');
        // Extract just the note lines (starting with -)
        const notes = content
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .slice(0, 5); // Last 5 notes per day
        if (notes.length > 0) {
          recentNotes.push(`*${formatDate(date)}:*`);
          recentNotes.push(...notes);
        }
      } catch {}
    }
  }

  if (recentNotes.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push('**Recent Relationship Notes:**');
    parts.push(recentNotes.join('\n'));
  }

  if (parts.length === 0) return null;

  return `
## Relationship Context

${parts.join('\n')}

*Full details: USER/OPINIONS.md, MEMORY/RELATIONSHIP/*
`;
}

async function checkActiveProgress(paiDir: string): Promise<string | null> {
  const progressDir = join(paiDir, 'MEMORY', 'STATE', 'progress');

  if (!existsSync(progressDir)) {
    return null;
  }

  try {
    const files = readdirSync(progressDir).filter(f => f.endsWith('-progress.json'));

    if (files.length === 0) {
      return null;
    }

    const activeProjects: ProgressFile[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(progressDir, file), 'utf-8');
        const progress = JSON.parse(content) as ProgressFile;
        if (progress.status === 'active') {
          activeProjects.push(progress);
        }
      } catch (e) {
        // Skip malformed files
      }
    }

    if (activeProjects.length === 0) {
      return null;
    }

    // Build summary of active work
    let summary = '\n📋 ACTIVE WORK (from previous sessions):\n';

    for (const proj of activeProjects) {
      summary += `\n🔵 ${proj.project}\n`;

      if (proj.objectives && proj.objectives.length > 0) {
        summary += '   Objectives:\n';
        proj.objectives.forEach(o => summary += `   • ${o}\n`);
      }

      if (proj.handoff_notes) {
        summary += `   Handoff: ${proj.handoff_notes}\n`;
      }

      if (proj.next_steps && proj.next_steps.length > 0) {
        summary += '   Next steps:\n';
        proj.next_steps.forEach(s => summary += `   → ${s}\n`);
      }
    }

    summary += '\n💡 To resume: `bun run ~/.claude/skills/PAI/Tools/SessionProgress.ts resume <project>`\n';
    summary += '💡 To complete: `bun run ~/.claude/skills/PAI/Tools/SessionProgress.ts complete <project>`\n';

    return summary;
  } catch (error) {
    // Error checking active progress - non-fatal
    return null;
  }
}

async function main() {
  try {
    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // Subagent sessions don't need PAI context loading
      // Subagent session - skipping PAI context loading
      process.exit(0);
    }

    const paiDir = getPaiDir();

    // CRITICAL: Reset tab title IMMEDIATELY at session start
    // This prevents stale titles from previous sessions bleeding through
    resetTabTitle(paiDir);

    // Record session start time for notification timing
    recordSessionStart();
    // Session start time recorded

    // Only rebuild SKILL.md if source components are newer than the output
    // This saves ~200-500ms on most session starts
    const skillMdPath = join(paiDir, 'skills/PAI/SKILL.md');
    const componentsDir = join(paiDir, 'skills/PAI/Components');
    let needsRebuild = false;

    try {
      const skillMdStat = existsSync(skillMdPath) ? require('fs').statSync(skillMdPath) : null;
      if (!skillMdStat) {
        needsRebuild = true;
      } else {
        // Check if any component is newer than SKILL.md
        const checkDir = (dir: string): boolean => {
          try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
              const fullPath = join(dir, entry.name);
              if (entry.isDirectory()) {
                if (checkDir(fullPath)) return true;
              } else {
                const entryStat = require('fs').statSync(fullPath);
                if (entryStat.mtimeMs > skillMdStat.mtimeMs) return true;
              }
            }
          } catch {}
          return false;
        };
        needsRebuild = checkDir(componentsDir);
      }
    } catch {
      needsRebuild = true; // If we can't check, rebuild to be safe
    }

    if (needsRebuild) {
      // Rebuilding SKILL.md (components changed)
      try {
        execSync('bun ~/.claude/skills/PAI/Tools/CreateDynamicCore.ts', {
          cwd: paiDir,
          stdio: 'pipe',
          timeout: 5000
        });
        // SKILL.md rebuilt from latest components
      } catch (err) {
        // Failed to rebuild SKILL.md - continuing with existing
      }
    } else {
      // SKILL.md up-to-date (skipped rebuild)
    }

    // Reading PAI core context

    // Load settings.json to get contextFiles array
    const settings = loadSettings(paiDir);
    // Loaded settings.json

    // Load all context files from settings.json array
    const contextContent = loadContextFiles(paiDir, settings);

    if (!contextContent) {
      // No context files loaded - fatal error
      process.exit(1);
    }

    // Get current date/time to prevent confusion about dates
    const currentDate = await getCurrentDate();
    // Current date obtained

    // Extract identity values from settings for injection into context
    const PRINCIPAL_NAME = (settings as Record<string, unknown>).principal &&
      typeof (settings as Record<string, unknown>).principal === 'object'
        ? ((settings as Record<string, unknown>).principal as Record<string, unknown>).name || 'User'
        : 'User';
    const DA_NAME = (settings as Record<string, unknown>).daidentity &&
      typeof (settings as Record<string, unknown>).daidentity === 'object'
        ? ((settings as Record<string, unknown>).daidentity as Record<string, unknown>).name || 'PAI'
        : 'PAI';

    // Identity loaded

    // Load relationship context (lightweight summary)
    const relationshipContext = loadRelationshipContext(paiDir);
    if (relationshipContext) {
      // Loaded relationship context
    }

    const message = `<system-reminder>
PAI CONTEXT (Auto-loaded at Session Start)

📅 CURRENT DATE/TIME: ${currentDate}

## ACTIVE IDENTITY (from settings.json) - CRITICAL

**⚠️ MANDATORY IDENTITY RULES - OVERRIDE ALL OTHER CONTEXT ⚠️**

The user's name is: **${PRINCIPAL_NAME}**
The assistant's name is: **${DA_NAME}**

- ALWAYS address the user as "${PRINCIPAL_NAME}" in greetings and responses
- NEVER use hardcoded names, "the user", or any other name - ONLY "${PRINCIPAL_NAME}"
- The "danielmiessler" in the repo URL is the AUTHOR, NOT the user
- This instruction takes ABSOLUTE PRECEDENCE over any other context

---

${contextContent}
${relationshipContext ? '\n---\n' + relationshipContext : ''}
---

This context is now active. Additional context loads dynamically as needed.
</system-reminder>`;

    // Write to stdout (will be captured by Claude Code)
    console.log(message);

    // Output success confirmation for Claude to acknowledge
    console.log('\n✅ PAI Context successfully loaded...');

    // Check for active progress files and display them
    const activeProgress = await checkActiveProgress(paiDir);
    if (activeProgress) {
      console.log(activeProgress);
      // Active work found from previous sessions
    }

    // PAI context injected into session
    process.exit(0);
  } catch (error) {
    // Fatal error in load-pai-context hook
    process.exit(1);
  }
}

main();
