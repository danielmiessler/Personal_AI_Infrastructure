#!/usr/bin/env bun
// SkillHygieneGate.ts — deterministic code/data-separation gate for the skills tree.
//
// Verdict: is every skill (public AND private) publishable-clean code — no identity
// strings, no home paths, no vendored deps in git — with sensitive data living under
// LIFEOS/USER/ instead of inside the skill?
//
// "Dirty" is defined by the canonical release deny-list (skills/_LIFEOS/DENY_LIST.txt);
// this gate never forks that pattern set, so skill-clean ≡ release-clean by
// construction. Private skills reference LIFEOS/USER/ paths freely — that's the
// pattern, not a violation (the deny-list contains no LIFEOS/USER path patterns).
//
// Allowlist: LIFEOS/TOOLS/skill-hygiene-allowlist.json — file or dir-prefix entries,
// each with a reason. Entries are reviewed additions, never a bulk escape hatch.
// PATTERN_ALLOWLIST_FILES from hooks/lib/containment-zones.ts is honored too (those
// files embed patterns in order to detect them).
//
// Exit codes: 0 clean · 1 violations · 2 scan error (a broken gate never reads as clean).
// Usage: bun SkillHygieneGate.ts [--json] [--skill _NAME] [--root <dir>] [--max-detail N]
//
// Consumed by: IntegrityCheck.ts (/ic check "skill-hygiene"), sweep workflows, CreateSkill
// pre-flight. Report-only by design — this tool never modifies a file.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { PATTERN_ALLOWLIST_FILES } from "../../hooks/lib/containment-zones";

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const skillFilter = args.includes("--skill") ? args[args.indexOf("--skill") + 1] : null;
const rootArg = args.includes("--root") ? args[args.indexOf("--root") + 1] : null;
const maxDetail = args.includes("--max-detail") ? parseInt(args[args.indexOf("--max-detail") + 1], 10) : 8;

const CLAUDE_DIR = rootArg ?? join(homedir(), ".claude");
const SKILLS_DIR = join(CLAUDE_DIR, "skills");
const DENY_LIST_PATH = join(homedir(), ".claude", "LIFEOS", "USER", "SECURITY", "DENY_LIST.txt");
// Allowlist lives in the USER tree: every entry names a private `_*` skill path,
// and one entry (the customer skill) contains a deny-listed token — so the file is
// install-local, must be release-excluded, and SystemFileGuard must permit it to
// hold identity strings. All three hold only under LIFEOS/USER/.
const ALLOWLIST_PATH = join(CLAUDE_DIR, "LIFEOS", "USER", "CONFIG", "skill-hygiene-allowlist.json");

// Machine-local runtime dirs — never shipped (containment zone skill-runtime-data),
// regenerated on use, scanning them is noise. Tracked data/state dirs ARE scanned:
// tracked state with identity is exactly the class this gate exists to relocate.
const EXCLUDE_GLOBS = ["!**/node_modules/**", "!**/.playwright-cli/**", "!**/profile-data/**", "!**/.cache/**", "!**/*.png", "!**/*.jpg", "!**/*.mp3", "!**/*.mp4"];

interface Violation { file: string; line: number; pattern: string; excerpt: string }
interface AllowEntry { path: string; reason: string; added: string }

function fail(msg: string): never {
  if (jsonOutput) console.log(JSON.stringify({ ok: false, exitCode: 2, error: msg }));
  else console.error(`SCAN ERROR: ${msg}`);
  process.exit(2);
}

function loadDenyPatterns(): string[] {
  // The deny-list is identity DATA and lives under LIFEOS/USER/ (2026-07-25
  // relocation — it was inside skills/_LIFEOS/, reached across the boundary by
  // this public tool). USER/ is rebuilt from templates at release, so on a tree
  // with no personal data the file is legitimately absent: there is nothing to
  // deny yet. Skip loudly — never hard-fail, never silently pass a security gate.
  if (!existsSync(DENY_LIST_PATH)) {
    if (jsonOutput) console.log(JSON.stringify({ ok: true, skipped: true, reason: `no deny-list at ${DENY_LIST_PATH} — no personal data to protect yet` }));
    else console.error(`SKIP: no deny-list at ${DENY_LIST_PATH} — nothing to scan against (expected on a tree with no personal data).`);
    process.exit(0);
  }
  const patterns = readFileSync(DENY_LIST_PATH, "utf8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"));
  if (patterns.length < 20) fail(`deny-list suspiciously small (${patterns.length} patterns) — refusing to scan against a truncated list`);
  // Home-path shape patterns: ANY user-home literal is machine-bound and
  // unpublishable, beyond the principal-specific one the deny-list carries.
  // (?-i) keeps these case-sensitive inside the -i scan — macOS home paths are
  // literally "/Users/"; without it, generic REST-ish segments like
  // "orgs/projects/users/billing" false-positive (hit live on ISA/Examples).
  patterns.push(String.raw`(?-i)/Users/[a-z][a-z0-9_-]+/`, String.raw`(?-i)/home/[a-z][a-z0-9_-]+/`);
  return patterns;
}

function loadAllowlist(): AllowEntry[] {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
    if (!Array.isArray(parsed)) fail("allowlist is not an array");
    return parsed;
  } catch (e: any) { fail(`allowlist unreadable: ${e.message}`); }
}

// path entries are repo-relative; a trailing "/" means dir-prefix.
function isAllowed(relPath: string, allow: AllowEntry[]): boolean {
  if (PATTERN_ALLOWLIST_FILES.includes(relPath)) return true;
  return allow.some(a => (a.path.endsWith("/") ? relPath.startsWith(a.path) : relPath === a.path));
}

function runRg(patternFile: string): Violation[] {
  const rgArgs = ["-i", "--no-heading", "-n", "--with-filename", "-f", patternFile];
  // Skill include MUST precede the excludes: ripgrep applies -g in order, last match
  // wins, so a positive `_SKILL/**` after `!**/node_modules/**` would re-include the
  // skill's on-disk deps (the 2026-07-23 --skill _BROADCAST false-positive).
  if (skillFilter) rgArgs.push("-g", `${skillFilter}/**`);
  for (const g of EXCLUDE_GLOBS) rgArgs.push("-g", g);
  rgArgs.push(".");
  let out = "";
  try {
    out = execFileSync("rg", rgArgs, { cwd: SKILLS_DIR, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch (e: any) {
    if (e.status === 1) return []; // rg: no matches
    fail(`rg failed: ${e.message}`);
  }
  const violations: Violation[] = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    const m = line.match(/^(.+?):(\d+):(.*)$/);
    if (!m) continue;
    const file = m[1].replace(/^\.\//, "");
    violations.push({ file, line: parseInt(m[2], 10), pattern: "deny-list", excerpt: m[3].slice(0, 160) });
  }
  return violations;
}

// Vendored dependencies tracked in git are a structural violation (deps are
// installed, never committed). Disk-only node_modules is fine (runtime artifact).
function trackedVendoredDeps(): string[] {
  try {
    const out = execFileSync("git", ["-C", CLAUDE_DIR, "ls-files", "--", "skills/"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });
    const dirs = new Set<string>();
    for (const f of out.split("\n")) {
      const i = f.indexOf("/node_modules/");
      if (i > 0) dirs.add(f.slice(0, i + "/node_modules".length));
    }
    return [...dirs];
  } catch { return []; } // not a git repo (fixture mode) — skip this check
}

if (!existsSync(SKILLS_DIR)) fail(`skills dir missing at ${SKILLS_DIR}`);
const patterns = loadDenyPatterns();
const allow = loadAllowlist();
const tmp = mkdtempSync(join(tmpdir(), "shg-"));
const patternFile = join(tmp, "patterns.txt");
writeFileSync(patternFile, patterns.join("\n") + "\n");

let raw: Violation[] = [];
let vendored: string[] = [];
try {
  raw = runRg(patternFile);
  vendored = trackedVendoredDeps().filter(d => !skillFilter || d.startsWith(`skills/${skillFilter}/`));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const violations = raw.filter(v => !isAllowed(`skills/${v.file}`, allow));
const allowedCount = raw.length - violations.length;

const bySkill = new Map<string, Violation[]>();
for (const v of violations) {
  const skill = v.file.split("/")[0];
  if (!bySkill.has(skill)) bySkill.set(skill, []);
  bySkill.get(skill)!.push(v);
}

const total = violations.length + vendored.length;
const exitCode = total > 0 ? 1 : 0;

if (jsonOutput) {
  console.log(JSON.stringify({
    ok: exitCode === 0,
    exitCode,
    totalViolations: violations.length,
    allowedHits: allowedCount,
    vendoredDeps: vendored,
    skills: [...bySkill.entries()].map(([skill, vs]) => ({
      skill,
      count: vs.length,
      files: [...new Set(vs.map(v => v.file))].length,
      detail: vs.slice(0, maxDetail),
    })).sort((a, b) => b.count - a.count),
  }, null, 2));
} else {
  console.log(`\n🧼 Skill Hygiene Gate — deny-list: ${patterns.length} patterns · allowlist: ${allow.length} entries (+${PATTERN_ALLOWLIST_FILES.length} containment)`);
  console.log("─".repeat(64));
  if (bySkill.size === 0 && vendored.length === 0) {
    console.log("CLEAN — zero non-allowlisted violations in skills/");
  } else {
    for (const [skill, vs] of [...bySkill.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`✗ ${skill.padEnd(32)} ${String(vs.length).padStart(5)} hits in ${new Set(vs.map(v => v.file)).size} files`);
      for (const v of vs.slice(0, maxDetail)) console.log(`    ${v.file}:${v.line}  ${v.excerpt.trim().slice(0, 100)}`);
      if (vs.length > maxDetail) console.log(`    … ${vs.length - maxDetail} more (use --json or --skill ${skill})`);
    }
    for (const d of vendored) console.log(`✗ VENDORED DEPS tracked in git: ${d}`);
  }
  console.log("─".repeat(64));
  console.log(`Verdict: ${total === 0 ? "CLEAN" : `${total} violations`} (${allowedCount} allowlisted hits suppressed)\n`);
}
process.exit(exitCode);
