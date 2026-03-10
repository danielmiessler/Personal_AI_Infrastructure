#!/usr/bin/env bun
/**
 * GitHubWriteGuard.hook.ts - Require explicit confirmation for GitHub write operations
 *
 * TRIGGER: PreToolUse (Bash only)
 *
 * PURPOSE:
 * Deven has owner access on repos. This hook intercepts all GitHub-mutating
 * commands and blocks them until Deven explicitly approves via the token mechanism.
 *
 * BLOCKED OPERATIONS:
 *   - git push (all variants, including --force)
 *   - gh pr create / merge / close / edit / review / comment
 *   - gh issue create / close / edit / delete / comment
 *   - gh release create / edit / delete / upload
 *   - gh repo delete / archive / rename / transfer
 *   - gh branch delete
 *   - git push --delete (remote branch deletion)
 *
 * ALLOWED: All read-only operations (gh pr list/view, gh issue list/view, git status, etc.)
 *
 * APPROVAL FLOW (when blocked):
 *   1. Hook blocks command, explains what was blocked
 *   2. Claude uses AskUserQuestion to confirm with Deven
 *   3. After "yes": Claude runs `bun ~/.claude/hooks/lib/github-approve.ts "command"`
 *   4. Claude re-runs the original command
 *   5. Hook sees approval token, allows command, deletes token
 *
 * Token location: MEMORY/STATE/github-approvals/{hash}.json (TTL: 60s)
 */

import { existsSync, readFileSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

const BASE_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const APPROVALS_DIR = join(BASE_DIR, 'MEMORY', 'STATE', 'github-approvals');
const APPROVE_SCRIPT = join(BASE_DIR, 'hooks', 'lib', 'github-approve.ts');

interface HookInput {
  tool_name?: string;
  tool_input?: {
    command?: string;
  };
}

// GitHub write patterns — regex-tested against the command
const WRITE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // git push (all variants)
  { pattern: /\bgit\s+push\b/, description: 'git push (remote write)' },

  // gh pr mutations
  { pattern: /\bgh\s+pr\s+(create|merge|close|edit|review|comment|reopen)\b/, description: 'gh pr mutation' },

  // gh issue mutations
  { pattern: /\bgh\s+issue\s+(create|close|edit|delete|comment|reopen|transfer|lock|unlock)\b/, description: 'gh issue mutation' },

  // gh release mutations
  { pattern: /\bgh\s+release\s+(create|edit|delete|upload)\b/, description: 'gh release mutation' },

  // gh repo mutations
  { pattern: /\bgh\s+repo\s+(delete|archive|rename|transfer|edit)\b/, description: 'gh repo mutation' },

  // gh branch/label/workflow mutations
  { pattern: /\bgh\s+(label|workflow)\s+(create|edit|delete|run)\b/, description: 'gh label/workflow mutation' },

  // git remote branch deletion
  { pattern: /\bgit\s+push\s+.*--delete\b/, description: 'remote branch deletion' },
];

function isGitHubWriteCommand(command: string): { write: boolean; description: string } {
  for (const { pattern, description } of WRITE_PATTERNS) {
    if (pattern.test(command)) {
      return { write: true, description };
    }
  }
  return { write: false, description: '' };
}

function commandHash(command: string): string {
  return createHash('sha256').update(command.trim()).digest('hex').slice(0, 12);
}

function checkApprovalToken(command: string): boolean {
  if (!existsSync(APPROVALS_DIR)) return false;

  const hash = commandHash(command);
  const tokenPath = join(APPROVALS_DIR, `${hash}.json`);

  if (!existsSync(tokenPath)) return false;

  try {
    const token = JSON.parse(readFileSync(tokenPath, 'utf-8'));

    // Check TTL
    if (Date.now() > token.expires_at) {
      unlinkSync(tokenPath);
      console.error(`[GitHubWriteGuard] Token expired for: ${command.slice(0, 60)}`);
      return false;
    }

    // Valid — consume the token (one-shot)
    unlinkSync(tokenPath);
    console.error(`[GitHubWriteGuard] Token consumed. Allowing: ${command.slice(0, 60)}`);
    return true;
  } catch {
    return false;
  }
}

// Clean up expired tokens (opportunistic — runs occasionally)
function cleanExpiredTokens(): void {
  if (!existsSync(APPROVALS_DIR)) return;
  try {
    const now = Date.now();
    for (const file of readdirSync(APPROVALS_DIR)) {
      if (!file.endsWith('.json')) continue;
      const filePath = join(APPROVALS_DIR, file);
      try {
        const token = JSON.parse(readFileSync(filePath, 'utf-8'));
        if (now > token.expires_at) unlinkSync(filePath);
      } catch {
        // Corrupt token — delete it
        try { unlinkSync(filePath); } catch {}
      }
    }
  } catch {}
}

async function main() {
  try {
    const raw = await Promise.race([
      Bun.stdin.text(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]).catch(() => '{}');

    const input: HookInput = JSON.parse(raw || '{}');
    const command = input.tool_input?.command || '';

    if (!command) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Clean expired tokens opportunistically (1-in-10 chance to avoid overhead)
    if (Math.random() < 0.1) cleanExpiredTokens();

    // Allow the approval script itself — it contains "git push" in its args but is not a write op
    if (command.includes('github-approve.ts')) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const { write, description } = isGitHubWriteCommand(command);

    if (!write) {
      // Not a GitHub write operation — allow immediately
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // GitHub write detected — check for approval token
    if (checkApprovalToken(command)) {
      // Approved — allow
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // No approval — block and explain
    const shortCmd = command.slice(0, 120);
    const hash = commandHash(command);
    const reason = [
      `🔒 GITHUB WRITE BLOCKED: ${description}`,
      `Command: ${shortCmd}`,
      ``,
      `This operation requires Deven's explicit confirmation (owner access protection).`,
      ``,
      `TO PROCEED:`,
      `1. Use AskUserQuestion to confirm with Deven: "Confirm GitHub operation: ${shortCmd}?"`,
      `2. After Deven approves, run: bun ${APPROVE_SCRIPT} "${shortCmd}"`,
      `3. Re-run the original command (token valid 60s)`,
      ``,
      `Token hash: ${hash}`,
    ].join('\n');

    console.log(JSON.stringify({ decision: 'block', reason }));
    console.error(`[GitHubWriteGuard] Blocked (${description}): ${shortCmd}`);
    process.exit(0);
  } catch (err) {
    console.error(`[GitHubWriteGuard] Error: ${err}`);
    // Fail-open: don't block operations on hook errors
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();
