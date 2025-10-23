#!/usr/bin/env bun

/**
 * load-core-context.ts
 *
 * Automatically loads your PAI skill context at session start by reading and injecting
 * the PAI SKILL.md file contents directly into Claude's context as a system-reminder.
 *
 * Purpose:
 * - Read PAI SKILL.md file content
 * - Output content as system-reminder for Claude to process
 * - Ensure complete context (contacts, preferences, security, identity) available at session start
 * - Bypass skill activation logic by directly injecting context
 *
 * Setup:
 * 1. Customize your ~/.claude/skills/PAI/SKILL.md with your personal context
 * 2. Add this hook to settings.json SessionStart hooks
 * 3. Ensure PAI_DIR environment variable is set (defaults to $HOME/.claude)
 *
 * How it works:
 * - Runs at the start of every Claude Code session
 * - Skips execution for subagent sessions (they don't need PAI context)
 * - Reads your PAI SKILL.md file
 * - Injects content as <system-reminder> which Claude processes automatically
 * - Gives your AI immediate access to your complete personal context
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

async function main() {
  try {
    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // Subagent sessions don't need PAI context loading
      console.error('🤖 Subagent session - skipping PAI context loading');
      process.exit(0);
    }

    // Get plugin directory from environment
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

    if (!pluginRoot) {
      console.error(`❌ CLAUDE_PLUGIN_ROOT environment variable not set`);
      console.error(`💡 This should be set automatically by Claude Code when the plugin is loaded`);
      process.exit(1);
    }

    const paiSkillPath = join(pluginRoot, 'skills/PAI/SKILL.md');

    // Verify PAI skill file exists
    if (!existsSync(paiSkillPath)) {
      console.error(`❌ PAI skill not found at: ${paiSkillPath}`);
      console.error(`💡 Ensure the plugin is properly installed with the PAI skill`);
      process.exit(1);
    }

    console.error('📚 Reading PAI core context from skill file...');

    // Read the PAI SKILL.md file content
    const paiContent = readFileSync(paiSkillPath, 'utf-8');

    console.error(`✅ Read ${paiContent.length} characters from PAI SKILL.md`);

    // Output the PAI content as a system-reminder
    // This will be injected into Claude's context at session start
    const message = `<system-reminder>
PAI CORE CONTEXT (Auto-loaded at Session Start)

The following context has been loaded from ${paiSkillPath}:

---
${paiContent}
---

This context is now active for this session. Follow all instructions, preferences, and guidelines contained above.
</system-reminder>`;

    // Write to stdout (will be captured by Claude Code)
    console.log(message);

    console.error('✅ PAI context injected into session');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in load-core-context hook:', error);
    process.exit(1);
  }
}

main();
