#!/usr/bin/env bun
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { homedir } from "node:os";
import { parseFrontmatter } from "../lib/frontmatter";
import { MODULE_DEFAULTS, LEGACY_SECTION_KEYS } from "../lib/modules";

const args = process.argv.slice(2);
const stagingArg = args.find((a) => !a.startsWith("--"));
if (!stagingArg || args.includes("--help")) {
  console.log(`Usage: bun ReleaseAudit.ts <path-to-staged-release> [--strict]

Audits a staged LifeOS release for:
  1. USER/ files with provenance != template (or missing provenance) — must be excluded
  2. PULSE_DATA/ contents (must be absent entirely)
  3. Prohibited identity strings loaded from a USER-zone config file
     (the audit tool ships generic; the strings are user-specific and never ship)

Exit 0 if clean. Exit 1 if any violations.`);
  process.exit(stagingArg ? 0 : 1);
}

const STAGING = resolve(stagingArg);
if (!existsSync(STAGING)) {
  console.error(`error: staging dir does not exist: ${STAGING}`);
  process.exit(1);
}

// Load PROHIBITED_STRINGS from USER-zone config (never ships publicly).
// File format: JSON array of strings. If missing or invalid, default to empty —
// audit then only enforces the provenance + PULSE_DATA checks (still useful).
// Public LifeOS users populate their own list; the principal populates with
// principal-bound names (surname, partner names, phonetics, etc.).
function loadProhibitedStrings(): string[] {
  const candidates = [
    process.env.LIFEOS_RELEASE_AUDIT_STRINGS,
    join(homedir(), ".config/LIFEOS/USER/CONFIG/release-audit-strings.json"),
    join(homedir(), ".claude/LIFEOS/USER/CONFIG/release-audit-strings.json"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }
  return [];
}

const PROHIBITED_STRINGS = loadProhibitedStrings();

interface Issue {
  path: string;
  rule: string;
  detail: string;
}

const issues: Issue[] = [];

const codeExtAll = (p: string): boolean => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith(".git")) continue;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(STAGING);
const allBasenames = new Set(files.map((f) => f.slice(f.lastIndexOf("/") + 1)));
console.log(`Auditing ${files.length} file(s) in ${STAGING}…\n`);

// Shipped Pulse template must stay generic (ratchet, 2026-08-13): the 7.38.x
// cut shipped the maintainer's machine-specific `syslog = true` — plus
// maintainer-voice comments — as the stock default every install boots.
// Machine-specific module choices belong in PULSE.user.toml (release-
// stripped); the template ships the MODULE_DEFAULTS posture.
//   (a) no opt-in-off module (default false in MODULE_DEFAULTS — currently
//       imessage/syslog/da, read live so the list never rots) may ship
//       enabled, via [modules] or the legacy [section] enabled = true;
//   (b) no maintainer-voice phrase may ship in comments.
function auditShippedPulseTemplate(rel: string, content: string): void {
  const offByDefault = new Set(
    Object.entries(MODULE_DEFAULTS).filter(([, on]) => on === false).map(([k]) => k),
  );
  const offSections = new Set(
    Object.entries(LEGACY_SECTION_KEYS).filter(([, mod]) => offByDefault.has(mod)).map(([sec]) => sec),
  );
  const VOICE: Array<[RegExp, string]> = [
    [/\bthis tree\b/i, '"this tree"'],
    [/\bon here\b/i, '"on here"'],
    [/\bmy\b/i, '"my"'],
    [/\bmine\b/i, '"mine"'],
    [/\bI\b(?!\/O)/, 'first-person "I"'],
    [/\bthis machine\b/i, '"this machine"'],
  ];
  let section = "";
  content.split("\n").forEach((line, i) => {
    const lineNo = i + 1;
    const header = line.match(/^\s*\[\[?([A-Za-z0-9_.-]+)\]\]?\s*(?:#.*)?$/);
    if (header) { section = header[1]!; return; }
    const hashIdx = line.indexOf("#");
    if (hashIdx >= 0) {
      const comment = line.slice(hashIdx);
      for (const [re, name] of VOICE) {
        if (re.test(comment)) {
          issues.push({ path: rel, rule: "template-maintainer-voice", detail: `line ${lineNo}: comment carries maintainer voice ${name} — genericize before shipping` });
          break;
        }
      }
    }
    const code = hashIdx >= 0 ? line.slice(0, hashIdx) : line;
    if (section === "modules") {
      const m = code.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*true\b/);
      if (m && offByDefault.has(m[1]!)) {
        issues.push({ path: rel, rule: "template-module-default", detail: `line ${lineNo}: [modules] ${m[1]} = true — opt-in-off module shipped enabled; machine-specific choices belong in PULSE.user.toml` });
      }
    } else if (offSections.has(section) && /^\s*enabled\s*=\s*true\b/.test(code)) {
      issues.push({ path: rel, rule: "template-module-default", detail: `line ${lineNo}: [${section}] enabled = true — opt-in-off module shipped enabled; machine-specific choices belong in PULSE.user.toml` });
    }
  });
}

for (const file of files) {
  const rel = relative(STAGING, file);

  if (/(?:^|\/)LIFEOS\/PULSE\/PULSE\.toml$/.test(rel.replace(/^install\//, ""))) {
    auditShippedPulseTemplate(rel, readFileSync(file, "utf8"));
  }

  if (rel.startsWith("LIFEOS/MEMORY/PULSE_DATA/") || rel.includes("/MEMORY/PULSE_DATA/")) {
    issues.push({ path: rel, rule: "containment", detail: "PULSE_DATA/ contents must not ship" });
    continue;
  }

  if (rel.startsWith("LIFEOS/USER/") && (rel.endsWith(".md") || rel.endsWith(".markdown"))) {
    if (rel.startsWith("LIFEOS/USER/_TEMPLATES/")) continue;
    try {
      const fm = parseFrontmatter(readFileSync(file, "utf8"));
      const prov = fm.data.provenance;
      if (prov !== "template") {
        issues.push({ path: rel, rule: "provenance", detail: `frontmatter provenance is "${prov ?? "(missing)"}" — only "template" may ship` });
      }
    } catch (e) {
      issues.push({ path: rel, rule: "parse", detail: `frontmatter parse failed: ${(e as Error).message}` });
    }
  }

  if (rel.endsWith(".md") || rel.endsWith(".markdown") || codeExtAll(rel) || rel.endsWith(".json") || rel.endsWith(".toml")) {
    if (rel.startsWith("LIFEOS/USER/_TEMPLATES/")) continue;
    // Public-repo attribution is not a leak. A github.com/<owner>/<repo> URL is
    // the canonical link for the owner's OPEN-SOURCE tools (fabric, SecLists,
    // LifeOS…) and legitimately ships inside those skills' own docs — a LifeOS
    // release audit flagging Fabric's own repo link is noise, not a finding.
    // Strip these org URL paths before the identity scan so the repo link stops
    // reading as a leak, while a bare surname or personal domain still flags.
    // Same-class benign URL contexts (triaged identically on the 7.23.0/1/2
    // cuts): shields.io badge paths and GitHub API repo paths carry the owner
    // slug exactly like a clone URL does.
    const content = readFileSync(file, "utf8")
      .replace(/(?:raw\.githubusercontent\.com|github\.com|api\.github\.com\/repos)\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/g, "")
      .replace(/img\.shields\.io\/[^\s"')]+/g, "");
    // Files whose PURPOSE requires the identity string — each with its reason,
    // scoped to this one rule (every other rule still scans them). Standing
    // triage encoded 2026-07-30 after three cuts re-adjudicated the same hits.
    const PROHIBITED_EXEMPT: Record<string, string> = {
      "hooks/SystemFileGuard.test.ts": "the leak guard's own fixtures must contain the patterns it catches",
      "LIFEOS/DOCUMENTATION/LifeOs/RenameMap.json": "PAI→LifeOS rename history maps public repo slugs",
      "LIFEOS/TOOLS/DeriveDenyHashes.ts": "public repo slug kept as attribution allowlist token (documented in-file)",
      "README.md": "the author's public repo front page — his site, handle, and slug are the attribution, by design",
      "LIFEOS/TOOLS/GenerateStarHistory.ts": "default CLI arg is the public repo's own slug (star chart of this repo)",
      "skills/Fabric/Patterns/recommend_artists/system.md": "vendored verbatim upstream fabric pattern — its example artists are already public in the fabric repo; scrubbing would drift the vendored copy (ScrubTargets: upstream OSS content class)",
    };
    // The emitted LifeOS/ payload nests the tree under install/ — normalize so
    // the exemptions reach BOTH audit lanes (staging .claude/ and emitted
    // payload; Max audit 2026-07-30 live-probed the payload lane re-flagging
    // the sanctioned hits the map was built to retire).
    const relForExempt = rel.replace(/^install\//, "");
    if (!(relForExempt in PROHIBITED_EXEMPT)) {
      for (const s of PROHIBITED_STRINGS) {
        if (content.includes(s)) {
          issues.push({ path: rel, rule: "prohibited-string", detail: `contains "${s}"` });
          break;
        }
      }
    }
    // Dead legacy-doc pointers (Max audit ratchet, 2026-08-01 v7.26.0 cut):
    // backticked ALLCAPS .md references like `MEMORYSYSTEM.md` are pre-rename
    // pointer rot — bare basenames evade G7's path-based ref integrity, and the
    // MEMORYSYSTEM.md one steered fresh installs to the memory system's
    // pre-Cortex identity. Scoped to backticked all-caps basenames (6+ letters)
    // whose basename exists nowhere in the audited tree; plain-prose historical
    // changelog mentions (no backticks) are deliberately not matched.
    // Same rot class in CODE (Max 7.28.0 audit: a log message named THEHOOKSYSTEM.md
    // after the path join was fixed — string sweeps must cover code, not just docs).
    // change-detection.ts is exempt: its legacy-name MATCHERS exist to classify
    // historical paths and are match-only by design.
    // Hardening (Forge+Max 7.28.1, future-only): cover every JS/TS extension, not
    // just .ts/.js; and exempt only THIS rule's own known literals in ReleaseAudit.ts
    // rather than blanket-exempting the whole file (which would blind the rule to a
    // real dead pointer added elsewhere in it later).
    const codeExt = /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel);
    const isChangeDetection = rel.endsWith("hooks/lib/change-detection.ts");
    if (codeExt && !isChangeDetection) {
      // Self-reference guard: this file names smushed patterns in its own comments
      // and examples; those are the rule describing itself, not dead pointers. Skip
      // lines that are comments in ReleaseAudit.ts only.
      const isSelf = rel.endsWith("Tools/ReleaseAudit.ts");
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (isSelf && /^\s*(\/\/|\*)/.test(line)) continue;
        for (const m of line.matchAll(/([A-Z][A-Z0-9]*(?:SYSTEM|SUBSYSTEM|THESIS|SCHEMA)\.md)/g)) {
          const base = m[1]!;
          if (!allBasenames.has(base)) {
            issues.push({ path: rel, rule: "dead-legacy-doc-pointer", detail: `${base} referenced in code but exists nowhere in the tree — fix the string` });
          }
        }
      }
    }
    // Pasted live run-state in shipped docs (Max audit ratchet, 2026-08-03 v7.29.0
    // cut): point-in-time tool output pasted into DOCUMENTATION markdown carries the
    // operator's real machine state (corpus sizes, log volumes, latency numbers).
    // Deterministic signature: a NON-ZERO-millisecond ISO timestamp in body text —
    // synthetic examples use .000Z, generators stamp only frontmatter, but pasted
    // live output virtually always carries real fractional ms. Frontmatter is
    // stripped before the scan; FreshnessSystem.md is exempt (its purpose is
    // documenting stamp examples).
    // Behavioral-telemetry ratings in shipped docs (Max audit ratchet, 2026-08-03
    // v7.29.1 cut): decimal N.N/10 literals in ALGORITHM/DOCUMENTATION markdown are
    // measured satisfaction/severity telemetry from the operator's install (the
    // N.N/10 principal-rating class) — timestampless, so the live-output timestamp
    // signature below cannot see them. Integer scale mentions (10/10, 8/10) and
    // +-prefixed rubric thresholds (≥ +0.5/10) are deliberately not matched.
    const isTelemetryScope = /(?:^|\/)LIFEOS\/(?:DOCUMENTATION|ALGORITHM|RULES)\/.+\.(?:md|markdown)$/.test(relForExempt);
    if (isTelemetryScope) {
      const body = readFileSync(file, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
      for (const m of body.matchAll(/(^|[^+\d.])(\d+\.\d+\/10)\b/gm)) {
        issues.push({ path: rel, rule: "rating-telemetry-in-docs", detail: `decimal rating literal "${m[2]}" — measured install telemetry must be generalized before shipping` });
        break;
      }
    }
    // Same telemetry class in CODE COMMENTS (Max 7.29.3 audit ratchet: the md-scoped
    // rules above were blind to .ts comments by construction — one of which was this
    // very rule's own example literal, hence the self-reference guard). Scans only
    // comment lines of shipped code for decimal ratings and corpus-size figures
    // ("~N,NNN notes" class); skips comment lines of ReleaseAudit.ts itself, where
    // pattern descriptions are the rule talking about itself.
    if (codeExtAll(rel)) {
      const isSelfAudit = rel.endsWith("Tools/ReleaseAudit.ts");
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!/^\s*(\/\/|\/?\*)/.test(line)) continue;
        if (isSelfAudit) continue;
        const rating = line.match(/(?:^|[^+\d.])(\d+\.\d+\/10)\b/);
        const corpus = line.match(/~?\d{1,3},\d{3}\s+(?:notes|records|sessions|entries)\b/);
        if (rating || corpus) {
          issues.push({ path: rel, rule: "telemetry-in-code-comments", detail: `comment carries install telemetry "${(rating?.[1] ?? corpus?.[0])}" — generalize before shipping` });
          break;
        }
      }
    }
    const isDocMd = /(?:^|\/)LIFEOS\/DOCUMENTATION\/.+\.(?:md|markdown)$/.test(relForExempt);
    if (isDocMd && !relForExempt.endsWith("Freshness/FreshnessSystem.md")) {
      const raw = readFileSync(file, "utf8");
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
      for (const m of body.matchAll(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.(\d+)Z/g)) {
        if (/[1-9]/.test(m[1]!)) {
          issues.push({ path: rel, rule: "live-run-state-in-docs", detail: `body carries live-output timestamp ${m[0]} — pasted point-in-time run state must be generalized before shipping` });
          break;
        }
      }
    }
    if (rel.endsWith(".md") || rel.endsWith(".markdown")) {
      // Scoped to the pre-rename smushed convention (FOOSYSTEM.md / LIFEOSTHESIS.md
      // etc.) — ordinary ALLCAPS single-word names (PREFERENCES.md, CHANGELOG.md,
      // TASKLIST.md) are template conventions or runtime-generated and stay exempt.
      for (const m of readFileSync(file, "utf8").matchAll(/`([A-Z][A-Z0-9]*(?:SYSTEM|SUBSYSTEM|THESIS|SCHEMA)\.md)`/g)) {
        const base = m[1]!;
        if (!allBasenames.has(base)) {
          issues.push({ path: rel, rule: "dead-legacy-doc-pointer", detail: `\`${base}\` exists nowhere in the tree — fix the reference to the real path` });
        }
      }
    }
  }
}

if (issues.length === 0) {
  console.log("✓ release clean");
  process.exit(0);
}

console.error(`✗ ${issues.length} violation(s):\n`);
for (const i of issues) console.error(`  [${i.rule}] ${i.path} → ${i.detail}`);
process.exit(1);
