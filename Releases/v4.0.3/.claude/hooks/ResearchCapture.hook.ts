#!/usr/bin/env bun
/**
 * ResearchCapture.hook.ts — PostToolUse hook for research agent output capture
 *
 * Event: PostToolUse (matcher: Task)
 * Fires: After each Task tool call completes (agent returns)
 *
 * Detects research-worthy agent outputs and writes them to MEMORY/RESEARCH/YYYY-MM/
 * following the format specified in MEMORYSYSTEM.md:
 *   YYYY-MM-DD-HHMMSS_AGENT-{type}_{description-slug}.md
 *
 * Scope: Captures Task-based (agent-spawning) research only; QuickResearch (inline,
 *   no Task tool call) is an intentional non-goal.
 *
 * Architecture: v4.0.3 standalone hook file (not StopOrchestrator)
 * Security: Sanitizes content (strips control tags), path-safe filenames, 50KB cap
 * Idempotency: Atomic exclusive write (flag: 'wx') — tool_use_id in filename prevents collisions
 *
 * Addresses: MEMORY/RESEARCH/ gap — documented in MEMORYSYSTEM.md but never implemented.
 * Prior art: v2.3 AgentOutputCapture.hook.ts (SubagentStop event — no longer available).
 *
 * GitHub Issue: #844 (danielmiessler/Personal_AI_Infrastructure)
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, sep } from 'path';
import { getPaiDir } from './lib/paths';
import { getYearMonth, getFilenameTimestamp, getISOTimestamp } from './lib/time';

// --- Configuration ---

const RESEARCH_AGENT_TYPES = new Set([
  'ClaudeResearcher',
  'PerplexityResearcher',
  'GeminiResearcher',
  'GrokResearcher',
  'CodexResearcher',
]);

const RESEARCH_KEYWORDS = [
  'research', 'investigate', 'investigation',
  'source', 'sources', 'citation', 'cite',
  'web search', 'landscape', 'market research',
];

const MAX_CAPTURE_BYTES = 50 * 1024; // 50KB hard cap — web content could be large
const TRUNCATION_NOTE = '\n\n[TRUNCATED: exceeded 50KB capture limit]';

// Lazy quantifier (0,100000) prevents ReDoS; self-closing form covers <tag/> variants
// that bypass paired open/close matching
const CONTROL_TAG_PATTERN = /<(?:system-reminder|task-notification|user-prompt-submit-hook)(?:[^>]*)(?:\/>|>[\s\S]{0,100000}?<\/(?:system-reminder|task-notification|user-prompt-submit-hook)>)/gi;

// --- Types ---

interface HookPayload {
  tool_use_id?: string;
  tool_name?: string;
  tool_input?: { subagent_type?: string; description?: string; prompt?: string };
  tool_response?: { content?: unknown; totalTokens?: number | string; totalDurationMs?: number | string };
  session_id?: string;
}

// --- Helpers ---

/** Safely extract a string from an unknown value — avoids String(object) → "[object Object]" */
function readString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

/** Sanitize a metadata header field — strips newlines to prevent markdown structure injection */
function sanitizeHeaderField(text: string, maxLen: number, stripTabs = false): string {
  const pattern = stripTabs ? /[\r\n\t]+/g : /[\r\n]+/g;
  return text.replace(pattern, ' ').trim().slice(0, maxLen);
}

function sanitizeContent(text: string): string {
  // Strip Claude control tags — web-sourced content persisted to disk is a prompt injection vector
  let cleaned = text.replace(CONTROL_TAG_PATTERN, '[REDACTED:control-tag]');
  // Hard 50KB cap — reserve space for truncation note so final file stays at or under limit
  // Buffer truncation avoids splitting multi-byte chars
  if (Buffer.byteLength(cleaned, 'utf-8') > MAX_CAPTURE_BYTES) {
    const noteBytes = Buffer.byteLength(TRUNCATION_NOTE, 'utf-8');
    const maxContentBytes = Math.max(0, MAX_CAPTURE_BYTES - noteBytes);
    const buf = Buffer.from(cleaned, 'utf-8').subarray(0, maxContentBytes);
    cleaned = buf.toString('utf-8') + TRUNCATION_NOTE;
  }
  return cleaned;
}

function isResearchWorthy(subagentType: string, description: string): boolean {
  if (RESEARCH_AGENT_TYPES.has(subagentType)) return true;
  const lc = (description || '').toLowerCase();
  return RESEARCH_KEYWORDS.some(kw => lc.includes(kw));
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block: unknown) => {
        if (typeof block === 'string') return block;
        // Skip image blocks — base64 payloads would blow past the 50KB cap
        if (block && typeof block === 'object' && 'type' in block &&
            (block as { type: string }).type === 'image') return '';
        if (block && typeof block === 'object' && 'text' in block) {
          return String((block as { text: unknown }).text);
        }
        if (block && typeof block === 'object') {
          return JSON.stringify(block);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content === 'object') {
    return JSON.stringify(content, null, 2);
  }
  return '';
}

// --- Main ---

function main() {
  // Read stdin directly — matches PRDSync/QuestionAnswered PostToolUse pattern
  // (readHookInput() is Stop-hook specific with 500ms timeout)
  // Bun/Node fs.readFileSync(fd) reads pipes until EOF (not a single read syscall) —
  // validated empirically: delayed multi-chunk stdin returns full payload.
  let payload: HookPayload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    process.stderr.write('[ResearchCapture] No hook input received\n');
    process.exit(0);
  }

  // Extract tool input
  const toolInput = payload.tool_input ?? {};
  const subagentType = readString(toolInput.subagent_type);
  const description = readString(toolInput.description) || readString(toolInput.prompt);
  const toolUseId = readString(payload.tool_use_id);

  // Check if this is a research-worthy agent
  if (!isResearchWorthy(subagentType, description)) {
    process.stderr.write(`[ResearchCapture] Skipped non-research agent: ${subagentType}\n`);
    process.exit(0);
  }

  // Extract agent output from tool_response.content
  // tool_response is an object with { content: ContentBlock[], status, totalTokens, ... }
  const toolResponse = payload.tool_response ?? {};
  const rawContent = toolResponse.content;  // ContentBlock[] — { type: "text", text: "..." }
  const outputText = contentToText(rawContent);

  if (!outputText || !outputText.trim()) {
    // Empty output on a research-classified agent is unexpected — may indicate a payload
    // schema change in a future Claude Code version. Log to help diagnose.
    process.stderr.write('[ResearchCapture] Research-classified agent returned empty content; possible payload schema change, skipping\n');
    process.exit(0);
  }

  if (outputText.length < 50) {
    process.stderr.write(`[ResearchCapture] Output too short (${outputText.length} chars), skipping\n`);
    process.exit(0);
  }

  // Build file path: MEMORY/RESEARCH/YYYY-MM/YYYY-MM-DD-HHMMSS_AGENT-{type}_{slug}.md
  // Use lib/time helpers so yearMonth, filename timestamp, and captured-at all use the same
  // configured timezone — avoids UTC/local mismatch around month boundaries
  const yearMonth = getYearMonth();
  const timestamp = getFilenameTimestamp();
  const capturedAt = getISOTimestamp();
  const agentLabel = subagentType || 'unknown';
  const slug = sanitizeSlug(description) || 'untitled';
  // tool_use_id suffix prevents filename collision when two agents complete in the same second
  const idSuffix = toolUseId ? `_${sanitizeSlug(toolUseId).slice(0, 12)}` : '';
  const filename = `${timestamp}_AGENT-${sanitizeSlug(agentLabel)}_${slug}${idSuffix}.md`;

  const paiDir = getPaiDir();
  const monthDir = join(paiDir, 'MEMORY', 'RESEARCH', yearMonth);

  // Verify resolved path stays under MEMORY/RESEARCH/ — guards against symlink escape
  const resolvedDir = resolve(monthDir);
  const researchBase = resolve(join(paiDir, 'MEMORY', 'RESEARCH'));
  if (!resolvedDir.startsWith(researchBase + sep) && resolvedDir !== researchBase) {
    process.stderr.write(`[ResearchCapture] Rejected unsafe dir path: ${monthDir}\n`);
    process.exit(0);
  }

  // Create directory (self-healing — works even without installer creating it)
  try {
    mkdirSync(monthDir, { recursive: true });
  } catch (err) {
    process.stderr.write(`[ResearchCapture] Failed to create dir ${monthDir}: ${err}\n`);
    process.exit(0);
  }

  // writeFileSync handles EACCES/ENOSPC directly — no separate accessSync needed (TOCTOU)

  const filePath = join(monthDir, filename);
  const resolvedFile = resolve(filePath);
  if (!resolvedFile.startsWith(researchBase + sep)) {
    process.stderr.write(`[ResearchCapture] Rejected unsafe file path: ${filePath}\n`);
    process.exit(0);
  }

  // Sanitize header fields — newlines in any field would create arbitrary markdown structure
  const safeTitle = sanitizeHeaderField(description, 120);
  const safeAgentLabel = sanitizeHeaderField(agentLabel, 60, true);
  const safeToolUseId = toolUseId.replace(/[\r\n\t]+/g, '').slice(0, 80);

  // Pre-compute numeric fields to avoid repeated Number() calls in template literal
  const totalTokens = Number(toolResponse.totalTokens) || 0;
  const durationMs = Number(toolResponse.totalDurationMs) || 0;
  const duration = durationMs > 0 ? `${Math.round(durationMs / 1000)}s` : '0s';

  // Sanitize content
  const cleanedOutput = sanitizeContent(outputText);

  const content = [
    `# ${safeTitle}`,
    '',
    `**Agent:** ${safeAgentLabel}`,
    `**Captured:** ${capturedAt}`,
    `**Tool Use ID:** ${safeToolUseId}`,
    `**Tokens:** ${totalTokens}`,
    `**Duration:** ${duration}`,
    `**Source:** PostToolUse hook capture`,
    '',
    '---',
    '',
    cleanedOutput,
  ].join('\n');

  try {
    // Atomic exclusive create — 'wx' fails with EEXIST if file already written (idempotent)
    writeFileSync(filePath, content, { encoding: 'utf-8', flag: 'wx' });
    process.stderr.write(`[ResearchCapture] Captured: ${filename}\n`);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') {
      // Same tool_use_id already captured — exit silently
      process.exit(0);
    }
    // Catches EACCES (not writable), ENOSPC, etc.
    process.stderr.write(`[ResearchCapture] Failed to write ${filename} (${code}): ${err}\n`);
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  process.stderr.write(`[ResearchCapture] Unhandled error: ${err}\n`);
  process.exit(0); // Never block other hooks
}
