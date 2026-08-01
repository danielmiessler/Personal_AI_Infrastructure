#!/usr/bin/env bun

/**
 * SecurityFilter — Deterministic allowlist-based content sanitizer for Daemon.
 *
 * This is a CODE-LEVEL filter, not an LLM filter. Every field passes through
 * deterministic pattern matching. The LLM can assist in drafting content,
 * but this filter is the enforcement boundary.
 *
 * Usage:
 *   bun SecurityFilter.ts --input <json-file> [--contacts <contacts-file>] [--overrides <overrides-file>]
 *   echo '{"text": "..."}' | bun SecurityFilter.ts --stdin
 */

import { readFileSync, existsSync } from "fs";

// ─── Blocked Patterns (baseline — intentionally empty) ───
// Private blocked names are loaded at runtime from
// ~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Daemon/SecurityOverrides.md
// so no principal-specific identities ship in the public skill.
const BLOCKED_NAMES_BASELINE: string[] = [];

const BLOCKED_PATH_PATTERNS = [
  /\/Users\/\w+\//g,
  /~\/\.claude\//g,
  /~\/Cloud\//g,
  /~\/LocalProjects\//g,
  /(?:LIFEOS|PAI)\/USER\//g,
  /(?:LIFEOS|PAI)\/MEMORY\//g,
  /MEMORY\/WORK\//g,
  /MEMORY\/KNOWLEDGE\//g,
];

const BLOCKED_CREDENTIAL_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /ghp_[a-zA-Z0-9]{36,}/g,
  /\b[A-Z_]+_API_KEY\s*[=:]\s*\S+/g,
  /\b[A-Z_]+_TOKEN\s*[=:]\s*\S+/g,
  /\b[A-Z_]+_SECRET\s*[=:]\s*\S+/g,
  /CLOUDFLARE_API_TOKEN/g,
  /ANTHROPIC_API_KEY/g,
];

const BLOCKED_INTERNAL_PATTERNS = [
  /localhost:\d{4,5}/g,
  // Loopback by literal IP: LifeOS source now builds internal URLs from
  // PULSE_BASE (127.0.0.1) rather than "localhost", so redacting only the
  // hostname form would let the same endpoint through.
  // public issue #1618, @asdf8675309
  /127\.0\.0\.1:\d{4,5}/g,
  /\.hook\.ts/g,
  /hooks\/\w+/g,
  /PAI\/Algorithm\/v[\d.]+\.md/g,
  /Tools\/\w+\.ts/g,
  /Pulse\/\w+/g,
];

// Partner alias patterns (contextual — "B" alone is too common)
const PARTNER_ALIAS_PATTERNS = [
  /\bB's\s+(mind|brain|thought|life|dream)/gi,
  /\bme\s+and\s+B\b/gi,
  /\bmy\s+and\s+B's\b/gi,
  /\bB\s+and\s+(I|me)\b/gi,
];

// ─── Types ───

interface FilterResult {
  clean: string;
  redactions: Redaction[];
  passed: boolean;
}

interface Redaction {
  type: "name" | "path" | "credential" | "internal" | "alias";
  original: string;
  position: number;
}

interface FilterOptions {
  extraBlockedNames?: string[];
  extraBlockedPaths?: string[];
}

// ─── Core Filter ───

export function filterContent(
  text: string,
  options: FilterOptions = {}
): FilterResult {
  const redactions: Redaction[] = [];
  let clean = text;

  // 1. Remove blocked names (case-insensitive word boundary match)
  const allNames = [
    ...BLOCKED_NAMES_BASELINE,
    ...(options.extraBlockedNames || []),
  ];

  for (const name of allNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(clean)) !== null) {
      redactions.push({
        type: "name",
        original: match[0],
        position: match.index,
      });
    }
    clean = clean.replace(regex, "[REDACTED]");
  }

  // 2. Remove partner aliases
  for (const pattern of PARTNER_ALIAS_PATTERNS) {
    let match: RegExpExecArray | null;
    const testClean = clean;
    while ((match = pattern.exec(testClean)) !== null) {
      redactions.push({
        type: "alias",
        original: match[0],
        position: match.index,
      });
    }
    clean = clean.replace(pattern, "[REDACTED]");
  }

  // 3. Remove private paths
  const allPathPatterns = [...BLOCKED_PATH_PATTERNS];
  if (options.extraBlockedPaths) {
    for (const p of options.extraBlockedPaths) {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      allPathPatterns.push(new RegExp(escaped, "g"));
    }
  }

  for (const pattern of allPathPatterns) {
    let match: RegExpExecArray | null;
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    while ((match = freshPattern.exec(clean)) !== null) {
      redactions.push({
        type: "path",
        original: match[0],
        position: match.index,
      });
    }
    clean = clean.replace(new RegExp(pattern.source, pattern.flags), "[PATH_REDACTED]");
  }

  // 4. Remove credentials
  for (const pattern of BLOCKED_CREDENTIAL_PATTERNS) {
    let match: RegExpExecArray | null;
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    while ((match = freshPattern.exec(clean)) !== null) {
      redactions.push({
        type: "credential",
        original: match[0].slice(0, 10) + "...",
        position: match.index,
      });
    }
    clean = clean.replace(new RegExp(pattern.source, pattern.flags), "[CREDENTIAL_REDACTED]");
  }

  // 5. Remove internal architecture references
  for (const pattern of BLOCKED_INTERNAL_PATTERNS) {
    let match: RegExpExecArray | null;
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    while ((match = freshPattern.exec(clean)) !== null) {
      redactions.push({
        type: "internal",
        original: match[0],
        position: match.index,
      });
    }
    clean = clean.replace(new RegExp(pattern.source, pattern.flags), "[INTERNAL_REDACTED]");
  }

  // Clean up multiple consecutive [REDACTED] markers
  clean = clean.replace(/(\[(?:REDACTED|PATH_REDACTED|CREDENTIAL_REDACTED|INTERNAL_REDACTED)\]\s*){2,}/g, "[REDACTED] ");

  return {
    clean: clean.trim(),
    redactions,
    passed: redactions.length === 0,
  };
}

/**
 * Filter a structured daemon data object. Applies filterContent to every string field.
 */
export function filterDaemonData(
  data: Record<string, unknown>,
  options: FilterOptions = {}
): { data: Record<string, unknown>; totalRedactions: number; redactionsBySection: Record<string, number> } {
  let totalRedactions = 0;
  const redactionsBySection: Record<string, number> = {};

  function filterValue(value: unknown, section: string): unknown {
    if (typeof value === "string") {
      const result = filterContent(value, options);
      if (result.redactions.length > 0) {
        totalRedactions += result.redactions.length;
        redactionsBySection[section] = (redactionsBySection[section] || 0) + result.redactions.length;
      }
      return result.clean;
    }
    if (Array.isArray(value)) {
      return value.map((item) => filterValue(item, section));
    }
    if (value && typeof value === "object") {
      const filtered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        filtered[k] = filterValue(v, section);
      }
      return filtered;
    }
    return value;
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    filtered[key] = filterValue(value, key);
  }

  return { data: filtered, totalRedactions, redactionsBySection };
}

/**
 * Load extra blocked names from a contacts file (one name per line, or markdown list).
 */
export function loadContactNames(contactsPath: string): string[] {
  if (!existsSync(contactsPath)) return [];
  const content = readFileSync(contactsPath, "utf-8");
  const names: string[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^[-*]\s+(.+)/);
    if (match) {
      const name = match[1].trim();
      if (name && name.length > 1 && !name.startsWith("#")) {
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * Load security overrides from SKILLCUSTOMIZATIONS.
 */
export function loadSecurityOverrides(overridesPath: string): FilterOptions {
  if (!existsSync(overridesPath)) return {};
  const content = readFileSync(overridesPath, "utf-8");
  const extraNames: string[] = [];
  const extraPaths: string[] = [];

  let currentSection = "";
  for (const line of content.split("\n")) {
    if (line.startsWith("## Additional Blocked Names")) {
      currentSection = "names";
    } else if (line.startsWith("## Additional Excluded Paths")) {
      currentSection = "paths";
    } else if (line.startsWith("##")) {
      currentSection = "";
    } else if (currentSection === "names") {
      const match = line.match(/^[-*]\s+(.+)/);
      if (match) extraNames.push(match[1].trim());
    } else if (currentSection === "paths") {
      const match = line.match(/^[-*]\s+(.+)/);
      if (match) extraPaths.push(match[1].trim());
    }
  }

  return {
    extraBlockedNames: extraNames.length > 0 ? extraNames : undefined,
    extraBlockedPaths: extraPaths.length > 0 ? extraPaths : undefined,
  };
}

// ─── CLI ───

if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
SecurityFilter — Deterministic content sanitizer for Daemon

Usage:
  bun SecurityFilter.ts --input <json-file>     Filter a JSON data file
  bun SecurityFilter.ts --text "some text"       Filter a text string
  bun SecurityFilter.ts --test                   Run self-test with known patterns

Options:
  --contacts <file>    Load additional blocked names from file
  --overrides <file>   Load security overrides (extra names/paths)
  --verbose            Show each redaction detail
`);
    process.exit(0);
  }

  if (args.includes("--test")) {
    console.log("Running SecurityFilter self-test...\n");

    const testCases = [
      { input: "my and B's minds into digital format", expectRedactions: true, desc: "Partner alias" },
      { input: "File at /Users/example/.claude/LIFEOS/hooks/test.ts", expectRedactions: true, desc: "Private path" },
      { input: "Token: sk-abc123def456ghi789jkl012mno345", expectRedactions: true, desc: "API key" },
      { input: "Building open source tools for everyone", expectRedactions: false, desc: "Clean text" },
      { input: "localhost:31337 pulse server", expectRedactions: true, desc: "Internal endpoint" },
    ];

    let passed = 0;
    for (const tc of testCases) {
      const result = filterContent(tc.input);
      const ok = tc.expectRedactions ? result.redactions.length > 0 : result.redactions.length === 0;
      console.log(`${ok ? "PASS" : "FAIL"}: ${tc.desc}`);
      if (!ok) {
        console.log(`  Input: "${tc.input}"`);
        console.log(`  Expected redactions: ${tc.expectRedactions}, Got: ${result.redactions.length}`);
      } else {
        passed++;
      }
    }

    console.log(`\n${passed}/${testCases.length} tests passed`);
    process.exit(passed === testCases.length ? 0 : 1);
  }

  const textIdx = args.indexOf("--text");
  if (textIdx !== -1 && args[textIdx + 1]) {
    const result = filterContent(args[textIdx + 1]);
    console.log("Clean:", result.clean);
    if (result.redactions.length > 0) {
      console.log(`Redactions: ${result.redactions.length}`);
      for (const r of result.redactions) {
        console.log(`  [${r.type}] "${r.original}" at position ${r.position}`);
      }
    }
    process.exit(0);
  }

  const inputIdx = args.indexOf("--input");
  if (inputIdx !== -1 && args[inputIdx + 1]) {
    const inputFile = args[inputIdx + 1];
    const data = JSON.parse(readFileSync(inputFile, "utf-8"));

    let options: FilterOptions = {};
    const contactsIdx = args.indexOf("--contacts");
    if (contactsIdx !== -1 && args[contactsIdx + 1]) {
      options.extraBlockedNames = loadContactNames(args[contactsIdx + 1]);
    }
    const overridesIdx = args.indexOf("--overrides");
    if (overridesIdx !== -1 && args[overridesIdx + 1]) {
      options = { ...options, ...loadSecurityOverrides(args[overridesIdx + 1]) };
    }

    const result = filterDaemonData(data, options);
    console.log(JSON.stringify(result.data, null, 2));

    if (args.includes("--verbose")) {
      console.error(`\nTotal redactions: ${result.totalRedactions}`);
      for (const [section, count] of Object.entries(result.redactionsBySection)) {
        console.error(`  ${section}: ${count} redactions`);
      }
    }
    process.exit(0);
  }

  console.error("No input specified. Use --help for usage.");
  process.exit(1);
}
