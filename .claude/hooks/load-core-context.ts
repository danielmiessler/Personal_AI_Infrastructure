#!/usr/bin/env bun

/**
 * load-core-context.ts
 *
 * Automatically loads shared base context + orchestrator context at session start.
 *
 * Purpose:
 * - Dynamically load ALL .md files from LOAD_AT_SESSION_START/ directory
 * - Load ORCHESTRATORS/AITO/PERSONALITY.md (orchestrator-specific context)
 * - Load delegation patterns (critical orchestrator behavior)
 * - Skip for subagent sessions (they get shared context via @import)
 *
 * Setup:
 * 1. Add this hook to settings.json SessionStart hooks
 * 2. Reads from ~/MY_AI_AGENTS/DEFINE_AGENTS/
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// Path to LLM-agnostic agent definitions
const AGENT_DEFS = join(process.env.HOME || '', 'MY_AI_AGENTS/DEFINE_AGENTS');

async function main() {
  try {
    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // Subagent sessions don't need orchestrator context loading
      console.error('🤖 Subagent session - skipping orchestrator context loading');
      process.exit(0);
    }

    // Dynamically load ALL .md files from LOAD_AT_SESSION_START directory
    const sessionStartDir = join(AGENT_DEFS, 'SHARED_BY_ALL_AGENTS/LOAD_AT_SESSION_START');

    console.error('📚 Dynamically loading all markdown files from LOAD_AT_SESSION_START...');

    let sessionStartContent = '';
    const loadedFiles: string[] = [];

    if (existsSync(sessionStartDir)) {
      // Get all .md files and sort alphabetically for predictability
      const sessionStartFiles = readdirSync(sessionStartDir)
        .filter(f => f.endsWith('.md'))
        .sort();

      console.error(`📂 Found ${sessionStartFiles.length} markdown files to load`);

      // Load each file
      for (const file of sessionStartFiles) {
        const filePath = join(sessionStartDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          sessionStartContent += `\n=== ${file} ===\n${content}\n`;
          loadedFiles.push(file);
          console.error(`✅ Loaded ${file} (${content.length} characters)`);
        } catch (error) {
          console.error(`⚠️ Failed to read ${file}: ${error}`);
        }
      }

      console.error(`✅ Successfully loaded ${loadedFiles.length} session start files: ${loadedFiles.join(', ')}`);
    } else {
      console.error(`⚠️ Session start directory not found at: ${sessionStartDir}`);
    }

    // Path to orchestrator agent definition
    const orchestratorPath = join(AGENT_DEFS, 'ORCHESTRATORS/AITO/PERSONALITY.md');
    // Path to delegation patterns (critical for orchestrator behavior)
    const delegationPath = join(AGENT_DEFS, 'ORCHESTRATORS/AITO/CAPABILITIES/delegation-patterns.md');

    // Read orchestrator context
    let orchestratorContent = '';
    if (existsSync(orchestratorPath)) {
      console.error('📚 Reading orchestrator context...');
      orchestratorContent = readFileSync(orchestratorPath, 'utf-8');
      console.error(`✅ Read ${orchestratorContent.length} characters from ORCHESTRATORS/AITO/PERSONALITY.md`);
    } else {
      console.error(`⚠️ Orchestrator context not found at: ${orchestratorPath}`);
    }

    // Read delegation patterns (critical for orchestrator behavior)
    let delegationContent = '';
    if (existsSync(delegationPath)) {
      console.error('📚 Reading delegation patterns...');
      delegationContent = readFileSync(delegationPath, 'utf-8');
      console.error(`✅ Read ${delegationContent.length} characters from delegation-patterns.md`);
    } else {
      console.error(`⚠️ Delegation patterns not found at: ${delegationPath}`);
    }

    // Output the combined content as a system-reminder
    const message = `<system-reminder>
AITO CONTEXT (Auto-loaded at Session Start)

📅 CURRENT DATE/TIME: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} PST

=== SESSION START CONTEXT (${loadedFiles.length} files loaded) ===
${sessionStartContent}

=== ORCHESTRATOR CONTEXT (AITO) ===
${orchestratorContent}

=== DELEGATION PATTERNS (CONSTITUTIONAL) ===
${delegationContent}

This context is now active for this session. Follow all instructions, preferences, and guidelines contained above.
</system-reminder>`;

    // Write to stdout (will be captured by Claude Code)
    console.log(message);

    console.error('✅ Context injected into session');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in load-base-context hook:', error);
    process.exit(1);
  }
}

main();
