#!/usr/bin/env bun
/**
 * FormatEnforcer.hook.ts - Response Format Injection (UserPromptSubmit)
 *
 * PURPOSE:
 * Ensures consistent response formatting by injecting the response format
 * specification as a <system-reminder> before EVERY response generation.
 * This "self-healing" mechanism keeps the format rules fresh in context,
 * preventing format drift in long conversations.
 *
 * TRIGGER: UserPromptSubmit
 *
 * INPUT:
 * - Environment: PAI_DIR, CLAUDE_PROJECT_DIR
 * - Files: skills/CORE/SYSTEM/RESPONSEFORMAT.md
 *
 * OUTPUT:
 * - stdout: <system-reminder> with condensed format specification
 * - stderr: Error messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Reads format specification file
 * - Reads identity configuration for placeholder replacement
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: LoadContext (identity must be loaded for placeholder replacement)
 * - COORDINATES WITH: None (standalone format enforcement)
 * - MUST RUN BEFORE: None (context injection order doesn't matter)
 * - MUST RUN AFTER: LoadContext (needs identity configuration)
 *
 * FORMAT RULES INJECTED:
 * - Voice line requirement (🗣️ line spoken aloud)
 * - Full vs minimal format selection
 * - 16-word maximum for voice lines
 * - Factual summary style (not conversational)
 *
 * SELF-HEALING MECHANISM:
 * Unlike LoadContext which runs once at session start, FormatEnforcer runs
 * on every prompt submission. This ensures format rules remain visible even
 * in long conversations where the original context may be compressed.
 *
 * ERROR HANDLING:
 * - Missing format spec: Logs error, exits gracefully
 * - Read failures: Logs error, exits gracefully
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <10ms
 * - Skipped for subagents: Yes (they have different format needs)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getPaiDir } from './lib/paths';
import { getIdentity, getPrincipal } from './lib/identity';

const FORMAT_SPEC_PATH = join(getPaiDir(), 'skills/CORE/SYSTEM/RESPONSEFORMAT.md');

function main() {
  try {
    // Check if this is a subagent session - subagents don't need format enforcement
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      process.exit(0);
    }

    // Read format spec
    if (!existsSync(FORMAT_SPEC_PATH)) {
      console.error('[FormatEnforcer] Format spec not found');
      process.exit(0);
    }

    const formatSpec = readFileSync(FORMAT_SPEC_PATH, 'utf-8');
    const identity = getIdentity();

    // Replace placeholders with actual identity
    const principal = getPrincipal();
    const personalizedSpec = formatSpec
      .replace(/\{daidentity\.name\}/g, identity.name)
      .replace(/\{principal\.name\}/g, principal.name);

    // Extract just the essential format section (not the whole doc)
    const essentialFormat = `
## RESPONSE FORMAT REMINDER

**You MUST follow this format for EVERY response.**

### Voice Line (REQUIRED)
🗣️ ${identity.name}: [16 words max - factual summary of what was done]

This line is spoken aloud. Without it, your response is SILENT.

### Full Format (for tasks)
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
📊 STATUS: [Current state]
➡️ NEXT: [Next steps]
🗣️ ${identity.name}: [16 words max - factual, not conversational]

### Minimal Format (for simple responses)
📋 SUMMARY: [Brief summary]
🗣️ ${identity.name}: [Your response]

### Voice Line Rules
- WRONG: "Done." / "Ready." / "Happy to help!"
- RIGHT: "Fixed auth bug by adding null check. All 47 tests passing."
`;

    // Output as system-reminder - this gets injected into context
    console.log(`<system-reminder>
${essentialFormat}
</system-reminder>`);

    process.exit(0);
  } catch (error) {
    console.error('[FormatEnforcer] Error:', error);
    process.exit(0);
  }
}

main();
