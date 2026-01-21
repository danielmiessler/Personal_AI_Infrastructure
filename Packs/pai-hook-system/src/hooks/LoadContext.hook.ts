#!/usr/bin/env bun
/**
 * LoadContext.hook.ts - Inject CORE Skill into Claude's Context (SessionStart)
 *
 * PURPOSE:
 * The foundational context injection hook. Reads the CORE SKILL.md and outputs
 * it as a <system-reminder> to stdout, which Claude Code captures and includes
 * in the model's context. This is how the AI receives identity, preferences,
 * response format rules, workflow routing, and security guidelines.
 *
 * TRIGGER: SessionStart
 *
 * INPUT:
 * - Environment: PAI_DIR, TIME_ZONE
 * - Files: skills/CORE/SKILL.md, MEMORY/STATE/progress/*.json
 *
 * OUTPUT:
 * - stdout: <system-reminder> containing full CORE skill content
 * - stdout: Active work summary if previous sessions have pending work
 * - stderr: Status messages and errors
 * - exit(0): Normal completion
 * - exit(1): Critical failure (SKILL.md not found)
 *
 * SIDE EFFECTS:
 * - Reads CORE skill file and injects into context
 * - Records session start time for notification timing
 * - Reads progress files to display active work
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None (foundational hook)
 * - COORDINATES WITH: StartupGreeting (both run at SessionStart)
 * - MUST RUN BEFORE: All other hooks (provides base context)
 * - MUST RUN AFTER: None
 *
 * CRITICAL IMPORTANCE:
 * This is the MOST important hook. Without it, the AI has no:
 * - Identity (who it is, who the user is)
 * - Response format rules
 * - Workflow routing
 * - Security guidelines
 * - System architecture knowledge
 *
 * ERROR HANDLING:
 * - Missing SKILL.md: Fatal error, exits with code 1
 * - Progress file errors: Logged, continues (non-fatal)
 * - Date command failure: Falls back to ISO timestamp
 *
 * PERFORMANCE:
 * - Blocking: Yes (context is essential)
 * - Typical execution: <50ms
 * - Skipped for subagents: Yes (they get context differently)
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { getPaiDir } from './lib/paths';
import { recordSessionStart } from './lib/notifications';

async function getCurrentDate(): Promise<string> {
  try {
    const proc = Bun.spawn(['date', '+%Y-%m-%d %H:%M:%S %Z'], {
      stdout: 'pipe',
      env: { ...process.env, TZ: process.env.TIME_ZONE || 'America/Los_Angeles' }
    });
    const output = await new Response(proc.stdout).text();
    return output.trim();
  } catch (error) {
    console.error('Failed to get current date:', error);
    return new Date().toISOString();
  }
}

interface ProgressFile {
  project: string;
  status: string;
  updated: string;
  objectives: string[];
  next_steps: string[];
  handoff_notes: string;
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

    summary += '\n💡 To resume: `bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts resume <project>`\n';
    summary += '💡 To complete: `bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts complete <project>`\n';

    return summary;
  } catch (error) {
    console.error('Error checking active progress:', error);
    return null;
  }
}

/**
 * Discover and read vault-specific context from VAULT.md
 * Looks in current working directory only
 */
async function loadVaultContext(): Promise<string | null> {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const vaultPath = join(projectDir, 'VAULT.md');

    if (!existsSync(vaultPath)) {
      return null;
    }

    console.error(`📁 Vault context found at: ${vaultPath}`);
    const vaultContent = readFileSync(vaultPath, 'utf-8');
    console.error(`✅ Read ${vaultContent.length} characters from VAULT.md`);

    return vaultContent;
  } catch (error) {
    console.error('⚠️ Error reading vault context:', error);
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
      console.error('🤖 Subagent session - skipping PAI context loading');
      process.exit(0);
    }

    // Record session start time for notification timing
    recordSessionStart();
    console.error('⏱️ Session start time recorded for notification timing');

    const paiDir = getPaiDir();
    const paiSkillPath = join(paiDir, 'skills/CORE/SKILL.md');

    // Verify PAI skill file exists
    if (!existsSync(paiSkillPath)) {
      console.error(`❌ PAI skill not found at: ${paiSkillPath}`);
      process.exit(1);
    }

    console.error('📚 Reading PAI core context from skill file...');

    // Read the PAI SKILL.md file content
    const paiContent = readFileSync(paiSkillPath, 'utf-8');

    console.error(`✅ Read ${paiContent.length} characters from PAI SKILL.md`);

    // Check for vault-specific context
    const vaultContent = await loadVaultContext();

    // Get current date/time to prevent confusion about dates
    const currentDate = await getCurrentDate();
    console.error(`📅 Current Date: ${currentDate}`);

    // Output the PAI content as a system-reminder
    // This will be injected into Claude's context at session start
    let contextMessage = `<system-reminder>
PAI CORE CONTEXT (Auto-loaded at Session Start)

📅 CURRENT DATE/TIME: ${currentDate}

The following GLOBAL context has been loaded from ${paiSkillPath}:

${paiContent}

---
`;

    // Append vault context if it exists
    if (vaultContent) {
      const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      contextMessage += `
📁 VAULT-SPECIFIC CONTEXT (Auto-loaded from current directory)

The following VAULT context has been loaded from ${join(projectDir, 'VAULT.md')}:

${vaultContent}

---
`;
      console.error('✅ Vault context will be injected into session');
    }

    contextMessage += `
This context is now active for this session. Follow all instructions, preferences, and guidelines contained above.
</system-reminder>`;

    // Write to stdout (will be captured by Claude Code)
    console.log(contextMessage);

    // Output success confirmation for Claude to acknowledge
    if (vaultContent) {
      console.log('\n✅ PAI Core + Vault Context successfully loaded...');
    } else {
      console.log('\n✅ PAI Context successfully loaded...');
    }

    // Check for active progress files and display them
    const activeProgress = await checkActiveProgress(paiDir);
    if (activeProgress) {
      console.log(activeProgress);
      console.error('📋 Active work found from previous sessions');
    }

    console.error('✅ PAI context injected into session');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in load-core-context hook:', error);
    process.exit(1);
  }
}

main();
