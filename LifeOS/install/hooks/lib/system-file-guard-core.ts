/**
 * system-file-guard-core.ts — pure classifier + deny-list scanner.
 *
 * Imported by:
 *   - hooks/SystemFileGuard.hook.ts (PreToolUse runtime gate)
 *   - LIFEOS/TOOLS/CheckFileBoundary.ts (on-demand CLI / CI gate)
 *   - hooks/SystemFileGuard.test.ts (unit tests)
 *
 * Pure functions; no fs writes, no process.exit, no logging side effects.
 * The hook adds the side effects on top.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { isContained, isPatternAllowlisted, relativeToClaudeRoot } from "./containment-zones";

const HOME = process.env.HOME ?? homedir();
const CLAUDE_ROOT = join(HOME, ".claude");
const DEFAULT_DENY_LIST_PATH = join(CLAUDE_ROOT, "LIFEOS/USER/SECURITY/DENY_LIST.txt");
// USER/SECURITY, not skills/_LIFEOS: on a public install, running the shipped
// DeriveDenyHashes used to CREATE skills/_LIFEOS/, whose existence is exactly
// the detectDevTree marker that disables seven installer tools (public issue
// #1689, @christauff).
const DEFAULT_HASHES_PATH = join(CLAUDE_ROOT, "LIFEOS/USER/SECURITY/DENY_HASHES.json");
const DEFAULT_ENV_PATH = join(CLAUDE_ROOT, ".env");
// Install-local allowlist (USER-tree, never ships): private-skill source files that
// legitimately embed deny tokens by function — release tooling that greps for the
// patterns, the customer skill's own directory name. Consulted by the private-skill
// write tooth below so those files stay editable.
const DEFAULT_HYGIENE_ALLOWLIST_PATH = join(CLAUDE_ROOT, "LIFEOS/USER/CONFIG/skill-hygiene-allowlist.json");

// Runtime-data segments under a skill: machine-bound, regenerated, never shipped
// (mirror the skill-runtime-data containment zone). A private-skill path containing
// one of these is NOT source — it stays USER-classified and is not deny-scanned.
const SKILL_RUNTIME_SEGMENTS = new Set([
  "node_modules", "profile-data", "state", "cache", ".playwright-cli", ".cache", ".sdk_bootstrap",
]);

/**
 * Is this a private-skill SOURCE file? (skills/_NAME/... excluding runtime-data dirs.)
 * The 2026-07-23 separation directive requires private skills to hold no identity, so
 * their source is deny-scanned even though the private-skills containment zone marks
 * the tree USER. Kept in evaluateWrite (not classifyTarget) so egress classification
 * and other classifyTarget consumers are unaffected.
 */
export function isPrivateSkillSource(rel: string): boolean {
  const parts = rel.split("/");
  if (parts.length < 3 || parts[0] !== "skills" || !parts[1].startsWith("_")) return false;
  return !parts.slice(2).some((seg) => SKILL_RUNTIME_SEGMENTS.has(seg));
}

let hygieneAllowlistCache: Set<string> | null = null;
export function loadHygieneAllowlist(path = DEFAULT_HYGIENE_ALLOWLIST_PATH): Set<string> {
  const isDefault = path === DEFAULT_HYGIENE_ALLOWLIST_PATH;
  if (isDefault && hygieneAllowlistCache) return hygieneAllowlistCache;
  let set: Set<string>;
  try {
    const arr = JSON.parse(readFileSync(path, "utf-8"));
    set = new Set(
      Array.isArray(arr) ? arr.map((e: { path?: string }) => e?.path).filter((p): p is string => typeof p === "string") : [],
    );
  } catch {
    set = new Set(); // fail-open: missing/broken allowlist never blocks
  }
  if (isDefault) hygieneAllowlistCache = set; // cache only the real file; injected test paths bypass
  return set;
}

export type GuardClassification = "system" | "user" | "out-of-tree";

export interface GuardHit {
  pattern: string;
  match: string;
  index: number;
}

export interface GuardDecision {
  classification: GuardClassification;
  filePath: string;
  relPath: string;
  /** Empty when classification != "system" or no patterns matched. */
  hits: GuardHit[];
  /** Convenience: hits.length > 0 && classification === "system". */
  block: boolean;
}

/**
 * Classify a target file path. SYSTEM files are everything under CLAUDE_ROOT
 * that does NOT live in a containment zone AND is not pattern-allowlisted.
 * USER files are anything inside a containment zone OR pattern-allowlisted.
 * Out-of-tree files (outside ~/.claude) are never blocked.
 */
export function classifyTarget(
  absolutePath: string,
  claudeRoot = CLAUDE_ROOT,
): { classification: GuardClassification; relPath: string } {
  if (!absolutePath || !absolutePath.startsWith(claudeRoot + "/") && absolutePath !== claudeRoot) {
    return { classification: "out-of-tree", relPath: absolutePath };
  }
  const rel = relativeToClaudeRoot(absolutePath, claudeRoot);
  if (isContained(absolutePath, claudeRoot)) return { classification: "user", relPath: rel };
  if (isPatternAllowlisted(rel)) return { classification: "user", relPath: rel };
  return { classification: "system", relPath: rel };
}

/**
 * Read the deny-list and compile each non-comment line into a RegExp.
 * Patterns are case-insensitive (matches ripgrep `-i` used by DenyListCheck.ts).
 * Returns the compiled list plus the raw source line for each (for hit reporting).
 */
let warnedNoDenyList = false;
export function loadPatterns(
  denyListPath = DEFAULT_DENY_LIST_PATH,
): Array<{ source: string; regex: RegExp }> {
  if (!existsSync(denyListPath)) {
    // Deliberate fail-open: public installs ship no private deny-list, so the
    // corpus scan is inactive there by design. Say so once instead of looking
    // active while scanning nothing (public issue #1504, @tzioup).
    if (!warnedNoDenyList) {
      warnedNoDenyList = true;
      console.error(`[SystemFileGuard] no deny-list at ${denyListPath} — private-corpus scan inactive (expected on public installs)`);
    }
    return [];
  }
  const raw = readFileSync(denyListPath, "utf-8");
  const out: Array<{ source: string; regex: RegExp }> = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    try {
      out.push({ source: line, regex: new RegExp(line, "i") });
    } catch {
      // Pattern that won't compile as JS regex (rare) — skip silently.
    }
  }
  return out;
}

/**
 * Scan content for the first match of any pattern. Returns null when clean.
 * Stops at first hit — the hook only needs to know whether to block.
 */
export function scanForFirstHit(
  content: string,
  patterns: ReadonlyArray<{ source: string; regex: RegExp }>,
): GuardHit | null {
  if (!content) return null;
  for (const { source, regex } of patterns) {
    const m = regex.exec(content);
    if (m) return { pattern: source, match: m[0], index: m.index };
  }
  return null;
}

/**
 * Salted-hash filter — the PRIVACY-PRESERVING half of the guard (added 2026-07-07).
 * DeriveDenyHashes.ts turns the principal's private corpus into salted hashes of its
 * distinctive tokens; here we reproduce the same hashing at scan time. The filter
 * never contains the principal's data in the clear, and the salt lives in .env
 * (never ships), so a leaked hash file is opaque. Catches NOVEL private tokens (a
 * new device/contact/place) with no hand-maintenance, unlike the literal deny-list.
 */
export interface HashContext { hashes: Set<string>; salt: string; ngramSizes: number[]; minLen: number; hexLen: number }

export function loadHashContext(
  hashesPath = DEFAULT_HASHES_PATH,
  envPath = DEFAULT_ENV_PATH,
): HashContext | null {
  if (!existsSync(hashesPath) || !existsSync(envPath)) return null;
  try {
    const m = /^DENYLIST_SALT=(.+)$/m.exec(readFileSync(envPath, "utf-8"));
    if (!m) return null;
    const salt = m[1].trim().replace(/^["']|["']$/g, "");
    const data = JSON.parse(readFileSync(hashesPath, "utf-8"));
    if (!Array.isArray(data.hashes) || data.hashes.length === 0) return null;
    const hashes: Set<string> = new Set(data.hashes);
    return { hashes, salt, ngramSizes: data.ngramSizes ?? [1, 2], minLen: data.minLen ?? 4, hexLen: data.hashes[0].length };
  } catch {
    return null; // fail-open: a broken hash file never breaks writes
  }
}

function saltedHash(token: string, salt: string, hexLen: number): string {
  return createHash("sha256").update(`${salt}:${token}`).digest("hex").slice(0, hexLen);
}

/** Tokenize content the SAME way DeriveDenyHashes derives — 1/2-grams + emails/domains. */
export function contentTokens(content: string, minLen: number, ngramSizes: number[]): string[] {
  const lower = content.toLowerCase();
  const words = lower.match(/[a-z0-9'’-]+/g) ?? [];
  const out: string[] = [];
  if (ngramSizes.includes(1)) for (const w of words) if (w.length >= minLen) out.push(w);
  if (ngramSizes.includes(2)) for (let i = 0; i + 1 < words.length; i++) out.push(`${words[i]} ${words[i + 1]}`);
  for (const em of lower.matchAll(/\b([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)\b/g)) { out.push(em[1]); out.push(em[2]); }
  for (const dm of lower.matchAll(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/g)) out.push(dm[0]);
  return out;
}

/** First content token whose salted hash is in the derived set. Match text is the
 * token from the WRITE's own content (echoing the user's input — reveals nothing new). */
export function scanForHashHit(content: string, ctx: HashContext): GuardHit | null {
  if (!content) return null;
  for (const tok of contentTokens(content, ctx.minLen, ctx.ngramSizes)) {
    if (ctx.hashes.has(saltedHash(tok, ctx.salt, ctx.hexLen))) {
      return { pattern: "derived:private-token (salted-hash)", match: tok, index: content.toLowerCase().indexOf(tok) };
    }
  }
  return null;
}

/**
 * The full decision: classify + (if SYSTEM) scan content + (if hit) block.
 * USER zone writes are never blocked even if content matches patterns.
 * Scans the literal deny-list FIRST, then the salted-hash filter (if present).
 */
export function evaluateWrite(
  absolutePath: string,
  newContent: string,
  opts: { denyListPath?: string; claudeRoot?: string; hashesPath?: string; envPath?: string; hygieneAllowlistPath?: string } = {},
): GuardDecision {
  const { classification, relPath } = classifyTarget(absolutePath, opts.claudeRoot ?? CLAUDE_ROOT);
  // Private-skill SOURCE files are deny-scanned even when the containment zone marks
  // them USER (2026-07-23 separation tooth) — unless the file is hygiene-allowlisted
  // (release tooling / the customer skill's own name) or pattern-allowlisted.
  const gateAsPrivateSkill =
    classification === "user" &&
    isPrivateSkillSource(relPath) &&
    !loadHygieneAllowlist(opts.hygieneAllowlistPath ?? DEFAULT_HYGIENE_ALLOWLIST_PATH).has(relPath) &&
    !isPatternAllowlisted(relPath);
  if (classification !== "system" && !gateAsPrivateSkill) {
    return { classification, filePath: absolutePath, relPath, hits: [], block: false };
  }
  const patterns = loadPatterns(opts.denyListPath ?? DEFAULT_DENY_LIST_PATH);
  let hit = scanForFirstHit(newContent, patterns);
  if (!hit) {
    const hctx = loadHashContext(opts.hashesPath ?? DEFAULT_HASHES_PATH, opts.envPath ?? DEFAULT_ENV_PATH);
    if (hctx) hit = scanForHashHit(newContent, hctx);
  }
  if (!hit) return { classification, filePath: absolutePath, relPath, hits: [], block: false };
  return { classification, filePath: absolutePath, relPath, hits: [hit], block: true };
}

/**
 * Extract new content from a Write/Edit/MultiEdit tool_input shape.
 * Unknown shapes return empty string (the hook treats empty as nothing-to-scan).
 */
export function extractNewContent(toolInput: unknown): string {
  if (!toolInput || typeof toolInput !== "object") return "";
  const ti = toolInput as {
    content?: unknown;
    new_string?: unknown;
    edits?: unknown;
  };
  if (typeof ti.content === "string") return ti.content;
  if (typeof ti.new_string === "string") return ti.new_string;
  if (Array.isArray(ti.edits)) {
    return ti.edits
      .map((e) => (e && typeof e === "object" && typeof (e as { new_string?: unknown }).new_string === "string"
        ? (e as { new_string: string }).new_string
        : ""))
      .join("\n");
  }
  return "";
}
