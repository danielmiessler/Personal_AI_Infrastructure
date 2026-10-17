/**
 * InstallEngine — shared install logic for the LifeOS bare-skill installer.
 *
 * This is a standalone install engine, reshaped for the bare-skill context
 * from the now-retired pre-6.x GUI installer engine (detect logic + types):
 * no web/electron wizard, no separate types module, plus
 * the bare-skill extras the wizard never needed — harness detection (the skill
 * installs into Claude Code / Hermes / Cursor / OpenClaw / AdaL) and dev-tree refusal
 * (never mutate the author's source repo).
 *
 * All detection here is READ-ONLY and non-destructive. The 7 setup Tools import
 * from this one sibling module (flat 2-level skill structure forbids a lib/ dir).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// ── Types (inlined — the skill ships without the engine's types.ts) ──

export type Platform = "darwin" | "linux" | "windows";

export interface OsInfo {
  platform: Platform;
  arch: string;
  version: string;
  name: string;
}

export interface ToolInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

/**
 * Single source of truth for the harness set: detection facts for every harness
 * in ONE table. The `Harness` union, `KNOWN_HARNESSES`, and `detectHarness`'s
 * candidate list are ALL derived from it — adding a harness is one entry here
 * and nothing else (DetectEnv output, InstallHooks `--harness` validation, and
 * the hook-capability profile all key off this shape). Order is priority: on a
 * multi-harness machine the first root+bin match wins.
 */
const HARNESS_DEFS = [
  { name: "claude-code", envRoot: () => process.env.CLAUDE_CONFIG_DIR, dir: ".claude", skills: "skills", bin: "claude" },
  { name: "opencode", envRoot: () => process.env.OPENCODE_CONFIG_DIR, dir: join(".config", "opencode"), skills: "skills", bin: "opencode" },
  { name: "hermes", envRoot: () => undefined, dir: ".hermes", skills: "skills", bin: "hermes" },
  { name: "cursor", envRoot: () => undefined, dir: ".cursor", skills: "skills", bin: "cursor" },
  { name: "openclaw", envRoot: () => undefined, dir: ".openclaw", skills: "skills", bin: "openclaw" },
  // AdaL (adal-cli, https://docs.sylph.ai): config root ~/.adal, folder skills
  // at ~/.adal/skills, hooks in ~/.adal/settings.json. No documented config-dir
  // env override as of CLI v1.10 (verified: no ADAL_CONFIG* in the runtime), so
  // envRoot stays unset (unlike claude-code's CLAUDE_CONFIG_DIR).
  { name: "adal", envRoot: () => undefined, dir: ".adal", skills: "skills", bin: "adal" },
] as const;

export type Harness = (typeof HARNESS_DEFS)[number]["name"] | "unknown";

export const KNOWN_HARNESSES: readonly Harness[] = HARNESS_DEFS.map((d) => d.name);

export interface HarnessInfo {
  name: Harness;
  /** Where this harness loads skills from (absolute), if known. */
  skillsDir?: string;
  /** The config root the harness resolves (e.g. ~/.claude). */
  configRoot?: string;
  /**
   * "detected" = the harness binary was found on PATH; "assumed" = inferred
   * from a config dir alone, or the clean-machine default. The Setup workflow
   * must confirm an "assumed" harness with the user before branching (#1448 —
   * a leftover ~/.claude dir sent an OpenCode install down the Claude Code path).
   */
  confidence: "detected" | "assumed";
}

export interface EnvDetection {
  os: OsInfo;
  harness: HarnessInfo;
  /** Has a graphical session (vs headless/SSH) — gates GUI-dependent steps. */
  display: boolean;
  /** Running inside an SSH session. */
  ssh: boolean;
  bun: ToolInfo;
  git: ToolInfo;
  /**
   * A prior LifeOS install is present. Keyed on `<configRoot>/LIFEOS/VERSION`,
   * which only DeployCore writes — settings.json exists on any harness that has
   * ever run, LifeOS or not (public issue #1727, @rpriven).
   */
  existingInstall: boolean;
  /**
   * This IS the author's live source tree — refuse all mutation. Marker: the
   * private maintenance skill (`skills/_LIFEOS`) only exists in the source repo,
   * never in a public install.
   */
  isDevTree: boolean;
  settingsExists: boolean;
  claudeMdExists: boolean;
  homeDir: string;
  configRoot: string;
  timezone: string;
}

// ── Low-level probes (from engine detect.ts, unchanged) ──

function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, { timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  } catch {
    return null;
  }
}

export function detectOS(): OsInfo {
  const platform: Platform =
    process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "windows" : "linux";
  const arch = process.arch;
  let version = "";
  let name = "";
  if (platform === "darwin") {
    version = tryExec("sw_vers -productVersion") || "";
    name = `macOS ${version}`.trim();
  } else if (platform === "linux") {
    name = tryExec("cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'") || "Linux";
    version = tryExec("uname -r") || "";
  } else {
    name = "Windows";
    version = tryExec("ver") || "";
  }
  return { platform, arch, version, name };
}

export function detectTool(name: string, versionCmd: string): ToolInfo {
  const path = tryExec(`command -v ${name}`);
  if (!path) return { installed: false };
  const out = tryExec(versionCmd);
  const m = out?.match(/(\d+\.\d+[.\d]*)/);
  return { installed: true, version: m?.[1] || out || undefined, path };
}

// ── Harness detection (NEW — bare-skill needs to know where it landed) ──

/**
 * Detect which harness is hosting this install and where it loads skills from.
 * Signal strength (#1448): config dir + harness binary on PATH beats config dir
 * alone beats binary alone — a leftover ~/.claude dir on a machine without the
 * claude CLI must not out-rank a live OpenCode install. Anything short of a
 * binary match is reported as confidence "assumed", never as fact.
 */
export function detectHarness(home: string): HarnessInfo {
  const candidates = HARNESS_DEFS.map((d) => ({
    name: d.name,
    root: d.envRoot() || join(home, d.dir),
    skills: d.skills,
    bin: d.bin,
  }));
  const hasBin = (c: (typeof candidates)[number]) => !!tryExec(`command -v ${c.bin}`);
  const info = (c: (typeof candidates)[number], confidence: HarnessInfo["confidence"]): HarnessInfo => ({
    name: c.name,
    configRoot: c.root,
    skillsDir: join(c.root, c.skills),
    confidence,
  });
  for (const c of candidates) {
    if (existsSync(c.root) && hasBin(c)) return info(c, "detected");
  }
  for (const c of candidates) {
    if (existsSync(c.root)) return info(c, "assumed");
  }
  for (const c of candidates) {
    if (hasBin(c)) return info(c, "detected");
  }
  // Default assumption when nothing is present yet (a clean machine pre-bootstrap).
  return { name: "claude-code", configRoot: join(home, ".claude"), skillsDir: join(home, ".claude", "skills"), confidence: "assumed" };
}

/**
 * Infer the harness from a config root path — the fallback when InstallHooks is
 * called without --harness. Matches each harness's canonical dir; returns
 * "claude-code" when nothing matches (which also covers CLAUDE_CONFIG_DIR-style
 * custom roots — a custom root is still a Claude Code install, just relocated).
 */
export function inferHarnessFromRoot(configRoot: string, home: string): Harness {
  const resolved = resolve(configRoot);
  const match = HARNESS_DEFS.find((d) => resolve(join(home, d.dir)) === resolved);
  return (match?.name ?? "claude-code") as Harness;
}

/**
 * Dev-tree refusal marker. The private maintenance skill (`skills/_LIFEOS`) exists
 * ONLY in the author's source repo — never in a public install (release tooling
 * strips all `_ALLCAPS` skills). Its presence means "this is the live source;
 * do not mutate." A `.git` remote check is a secondary signal but `<your-release-skill>` alone
 * is decisive and cheap.
 */
export function detectDevTree(configRoot: string): boolean {
  return existsSync(join(configRoot, "skills", "_LIFEOS"));
}

// ── Composite env detection (the DetectEnv Tool payload) ──

export function detectEnv(): EnvDetection {
  const home = homedir();
  const os = detectOS();
  const harness = detectHarness(home);
  const configRoot = harness.configRoot || join(home, ".claude");
  const settingsPath = join(configRoot, "settings.json");
  const claudeMdPath = join(configRoot, "CLAUDE.md");
  const ssh = !!(process.env.SSH_CONNECTION || process.env.SSH_TTY || process.env.SSH_CLIENT);
  // GUI session: macOS always has one locally; Linux needs DISPLAY/WAYLAND and not pure-SSH.
  const display =
    os.platform === "darwin" ? !ssh : !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY) && !ssh;

  return {
    os,
    harness,
    display,
    ssh,
    bun: detectTool("bun", "bun --version"),
    git: detectTool("git", "git --version"),
    // public issue #1727, @rpriven — LifeOS-specific marker, not settings.json.
    existingInstall: existsSync(join(configRoot, "LIFEOS", "VERSION")),
    isDevTree: detectDevTree(configRoot),
    settingsExists: existsSync(settingsPath),
    claudeMdExists: existsSync(claudeMdPath),
    homeDir: home,
    configRoot,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// ── Existing-content + API-key scan (from engine detect.ts, inlined types) ──

export interface ApiKeyScan {
  elevenLabs?: string;
  anthropic?: string;
  openai?: string;
  google?: string;
  perplexity?: string;
}

/**
 * Scan shell rc files + config dirs for API-key VALUES. Returns provider → key.
 * Only well-formed assignments are accepted (no `$VAR` indirection, no
 * obvious placeholders). Read-only.
 */
export function scanApiKeys(home: string, configDir: string): ApiKeyScan {
  const candidates = [
    join(home, ".zshenv"),
    join(home, ".zshrc"),
    join(home, ".zprofile"),
    join(home, ".bashrc"),
    join(home, ".bash_profile"),
    join(home, ".profile"),
    join(configDir, ".env"),
    join(configDir, "credentials.env"),
    join(home, ".config", "LIFEOS", ".env"),
  ];
  const patterns: Array<[keyof ApiKeyScan, RegExp]> = [
    ["elevenLabs", /(?:^|\n)\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s#]+)/],
    ["anthropic", /(?:^|\n)\s*(?:export\s+)?ANTHROPIC_API_KEY\s*=\s*["']?([^"'\s#]+)/],
    ["openai", /(?:^|\n)\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*["']?([^"'\s#]+)/],
    ["google", /(?:^|\n)\s*(?:export\s+)?(?:GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENAI_API_KEY)\s*=\s*["']?([^"'\s#]+)/],
    ["perplexity", /(?:^|\n)\s*(?:export\s+)?PERPLEXITY_API_KEY\s*=\s*["']?([^"'\s#]+)/],
  ];
  const placeholder = /^(your-key-here|sk-xxxxxxxx|xxxxx|REPLACE_ME|TODO)/i;
  const found: ApiKeyScan = {};
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    for (const [provider, regex] of patterns) {
      if (found[provider]) continue;
      const m = content.match(regex);
      if (!m) continue;
      const value = m[1];
      if (value.startsWith("$")) continue;
      if (placeholder.test(value)) continue;
      if (value.length < 12) continue;
      found[provider] = value;
    }
  }
  return found;
}

function fileExists(root: string, rel: string): boolean {
  return existsSync(join(root, rel));
}

export interface ExistingUserContent {
  telosPresent: boolean;
  identityPresent: boolean;
  contactsPresent: boolean;
  projectsPresent: boolean;
  /** True if the user config tree already holds real (non-template) content. */
  populated: boolean;
}

/**
 * Read-only scan of a user config tree for already-present content, so setup
 * can branch on "populated tree" vs "fresh scaffold" without overwriting.
 */
export function detectExistingUserContent(paiUserDir: string): ExistingUserContent {
  // Covers both the current single-file schema (TELOS/TELOS.md) and the legacy
  // split layout (TELOS/MISSION.md, TELOS/GOALS.md).
  const telosPresent =
    fileExists(paiUserDir, "TELOS/TELOS.md") ||
    fileExists(paiUserDir, "TELOS/MISSION.md") ||
    fileExists(paiUserDir, "TELOS/GOALS.md");
  const identityPresent =
    fileExists(paiUserDir, "PRINCIPAL/PRINCIPAL_IDENTITY.md") ||
    fileExists(paiUserDir, "PRINCIPAL_IDENTITY.md") ||
    fileExists(paiUserDir, "DIGITAL_ASSISTANT/DA_IDENTITY.md");
  const contactsPresent = fileExists(paiUserDir, "CONTACTS.md");
  const projectsPresent = fileExists(paiUserDir, "PROJECTS.md");
  return {
    telosPresent,
    identityPresent,
    contactsPresent,
    projectsPresent,
    populated: telosPresent || identityPresent,
  };
}

// ── Settings.json hook inspection (read-only; InstallHooks does the writes) ──

export interface SettingsHookScan {
  exists: boolean;
  hookEventCount: number;
  hookEntryCount: number;
}

/**
 * Read-only count of existing hooks in a harness settings.json, so ScanConflicts
 * can report what's already wired before InstallHooks proposes a merge.
 */
export function scanSettingsHooks(settingsPath: string): SettingsHookScan {
  if (!existsSync(settingsPath)) return { exists: false, hookEventCount: 0, hookEntryCount: 0 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return { exists: true, hookEventCount: 0, hookEntryCount: 0 };
  }
  if (typeof parsed !== "object" || parsed === null) return { exists: true, hookEventCount: 0, hookEntryCount: 0 };
  const hooks = (parsed as Record<string, unknown>).hooks;
  if (typeof hooks !== "object" || hooks === null) return { exists: true, hookEventCount: 0, hookEntryCount: 0 };
  const events = Object.keys(hooks as Record<string, unknown>);
  let entries = 0;
  for (const ev of events) {
    const bucket = (hooks as Record<string, unknown>)[ev];
    if (Array.isArray(bucket)) entries += bucket.length;
  }
  return { exists: true, hookEventCount: events.length, hookEntryCount: entries };
}

// ════════════════════════════════════════════════════════════════════
//  Mutating helpers (used by ScaffoldUser / LinkUser / ActivateImports /
//  InstallHooks). Each is purpose-built for the bare-skill installer but
//  follows the proven logic from the legacy engine actions.ts.
// ════════════════════════════════════════════════════════════════════

import { cpSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Extended 2026-07-25 (Forge finding, v7.15.0 re-audit). The set stopped at .ts,
// so every Pulse component and the built Next bundle were invisible to
// substitution — a fresh install shipped a dashboard rendering
// `desc="scored against TELOS — is this good for what {{PRINCIPAL_NAME}} is
// actually doing?"` to the user, both in src and in the served
// out/_next/static chunk. .css carries them too (Valkyrie voice notes).
const TEMPLATE_EXTENSIONS = new Set([
  ".md", ".json", ".txt", ".ts", ".toml", ".yaml", ".yml", ".sh",
  ".tsx", ".jsx", ".js", ".css",
]);
const SKIP_DIRS = new Set(["node_modules", ".git", "MEMORY"]);

/**
 * Extension of a path's BASENAME, lowercased; "" when there is none.
 *
 * Was `filePath.slice(filePath.lastIndexOf("."))`, which searches the whole path:
 * for `~/.claude/skills/Fabric/Patterns/raycast/yt` that returns
 * ".claude/skills/Fabric/Patterns/raycast/yt" — the dot in `.claude`. Harmless by
 * accident (no such key in the set, so extension-less files were skipped), but it
 * would have mis-typed any file under a dotted directory the moment the set grew.
 */
function fileExtension(filePath: string): string {
  const base = filePath.slice(filePath.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot).toLowerCase();
}

/**
 * Recursive, existsSync-GUARDED copy. Copies only files/dirs absent at dst —
 * NEVER overwrites a populated target. Returns count + any failures. (Ported
 * from engine actions.ts copyMissing.)
 */
export function copyMissing(src: string, dst: string): { copied: number; failures: string[] } {
  const failures: string[] = [];
  let copied = 0;
  const walk = (s: string, d: string): void => {
    if (!existsSync(s)) return;
    const stat = lstatSync(s);
    if (stat.isFile()) {
      if (!existsSync(d)) {
        try {
          mkdirSync(dirname(d), { recursive: true });
          cpSync(s, d);
          copied++;
        } catch (err) {
          failures.push(`${s} → ${d}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return;
    }
    for (const entry of readdirSync(s, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const sp = join(s, entry.name);
      const dp = join(d, entry.name);
      if (entry.isDirectory()) {
        if (!existsSync(dp)) mkdirSync(dp, { recursive: true });
        walk(sp, dp);
      } else if (entry.isFile() && !existsSync(dp)) {
        try {
          cpSync(sp, dp);
          copied++;
        } catch (err) {
          failures.push(`${sp} → ${dp}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  };
  walk(src, dst);
  return { copied, failures };
}

export interface TemplateVars {
  [placeholder: string]: string;
}

/**
 * Walk a tree and replace `{{PLACEHOLDER}}` tokens in template-extension files.
 * Atomic per-file (tmp + rename). Skips node_modules/.git/LIFEOS_INSTALL/MEMORY.
 * (Simplified from engine actions.ts substituteTemplates.)
 */
export function substituteTree(rootDir: string, vars: TemplateVars): { scanned: number; modified: number; applied: number } {
  let scanned = 0;
  let modified = 0;
  let applied = 0;
  const entries = Object.entries(vars);
  const processFile = (filePath: string): void => {
    if (!TEMPLATE_EXTENSIONS.has(fileExtension(filePath))) return;
    scanned++;
    const before = readFileSync(filePath, "utf-8");
    let after = before;
    for (const [placeholder, value] of entries) {
      // Only substitute properly-delimited {{TOKEN}} placeholders. A caller
      // passing a bare key (e.g. "HOME") would otherwise rewrite every HOME
      // substring across settings AND source — `const HOME` became
      // `const /home/<user>` and corrupted 146 .ts files on one install
      // (public issue #1484, @docxology).
      if (!/^\{\{[A-Z0-9_]+\}\}$/.test(placeholder)) continue;
      const parts = after.split(placeholder);
      applied += parts.length - 1;
      after = parts.join(value);
    }
    if (after !== before) {
      // Preserve the original mode: writeFileSync creates the tmp at umask
      // default (0644) and renameSync replaces the inode, so without this every
      // substituted hook lost its exec bit — 10 wired hooks silently dead on a
      // fresh install (public issue #1803, @mark-219).
      const mode = statSync(filePath).mode & 0o7777;
      const tmp = filePath + ".lifeos.tmp";
      writeFileSync(tmp, after, { mode });
      renameSync(tmp, filePath);
      modified++;
    }
  };
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      // Never substitute into the redistribution payload: rendering the nested
      // skills/LifeOS/install/ copy bakes THIS user's identity into ~121
      // template files that must stay generic for the next install.
      // (public issue #1828, @Piroshki, root cause @DRAZY)
      if (entry.name === "install" && dir.endsWith(join("skills", "LifeOS"))) continue;
      const child = join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) processFile(child);
    }
  };
  if (existsSync(rootDir) && lstatSync(rootDir).isFile()) processFile(rootDir);
  else walk(rootDir);
  return { scanned, modified, applied };
}

/**
 * Identity placeholders the release sanitizer emits and `substituteTree` is
 * expected to fill. Scoped deliberately: the payload legitimately contains other
 * `{{TOKEN}}` forms (Art's thumbnail templating, Fabric pattern bodies, prose
 * about placeholders), so a blanket `{{[A-Z_]+}}` sweep is noise, not a signal.
 */
const IDENTITY_PLACEHOLDERS = [
  "{{DA_NAME}}", "{{DA_FULL_NAME}}", "{{PRINCIPAL_NAME}}", "{{PRINCIPAL_FULL_NAME}}",
  "{{PRIMARY_VOICE_ID}}", "{{SECONDARY_VOICE_ID}}", "{{LIFEOS_VERSION}}",
] as const;

/**
 * Post-substitution verification: report any identity placeholder still present
 * in the installed tree.
 *
 * Why this exists (Forge finding D, 2026-07-25 v7.15.0 audit): `substituteTree`
 * has no code caller. The install is AI-driven by design — `Workflows/Setup.md`
 * step 34 instructs the agent to call it — so a skipped or mis-rooted step ships
 * a system that addresses its owner as `{{PRINCIPAL_NAME}}` with nothing failing.
 * The old engine's `runSurvivingPlaceholdersCheck` covered this and was lost when
 * `engine/actions.ts` was retired; this restores it against the current engine.
 * Verification, not mutation: the caller decides whether to re-run substitution
 * or abort.
 */
export function checkSurvivingPlaceholders(rootDir: string): {
  passed: boolean; files: Array<{ file: string; placeholder: string; count: number }>; total: number;
} {
  const files: Array<{ file: string; placeholder: string; count: number }> = [];
  let total = 0;
  const processFile = (filePath: string): void => {
    if (!TEMPLATE_EXTENSIONS.has(fileExtension(filePath))) return;
    let src: string;
    try { src = readFileSync(filePath, "utf-8"); } catch { return; }
    for (const placeholder of IDENTITY_PLACEHOLDERS) {
      const count = src.split(placeholder).length - 1;
      if (count > 0) { files.push({ file: filePath, placeholder, count }); total += count; }
    }
  };
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const child = join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) processFile(child);
    }
  };
  if (existsSync(rootDir) && lstatSync(rootDir).isFile()) processFile(rootDir);
  else walk(rootDir);
  return { passed: total === 0, files, total };
}

/**
 * Establish the system/user separation contract: the live `<configRoot>/LIFEOS/USER`
 * becomes a SYMLINK to `<configDir>/USER` (the private user-data home). Copies any
 * live USER content into the data home first (existsSync-guarded), then replaces
 * the live dir with a symlink. Idempotent — a correct symlink is left untouched.
 * EXDEV (cross-filesystem) rename falls back to cp + rm. (Ported from engine.)
 */
/** Byte-compare two files; treats unreadable as "differs" (conservative). */
function filesDiffer(a: string, b: string): boolean {
  try {
    return !readFileSync(a).equals(readFileSync(b));
  } catch {
    return true;
  }
}

/**
 * Merge `src` into `dst` with LIVE-WINS semantics for the USER migration: a
 * missing dst file is copied; a byte-identical one is skipped; a DIFFERING one
 * is overwritten with src AFTER the displaced dst file is preserved aside as
 * `<file>.replaced-<stamp>`. Lossless in every direction — nothing is removed
 * without a recoverable copy. Symlinked entries are skipped (Dirent semantics).
 */
function mergeTree(src: string, dst: string, stamp: string): { copied: number; overwritten: number; preserved: number; failures: string[] } {
  let copied = 0;
  let overwritten = 0;
  let preserved = 0;
  const failures: string[] = [];
  const walk = (s: string, d: string): void => {
    if (!existsSync(s)) return;
    if (lstatSync(s).isFile()) {
      if (!existsSync(d)) {
        try { mkdirSync(dirname(d), { recursive: true }); cpSync(s, d); copied++; }
        catch (err) { failures.push(`${s} → ${d}: ${err instanceof Error ? err.message : String(err)}`); }
      } else if (filesDiffer(s, d)) {
        try { cpSync(d, `${d}.replaced-${stamp}`); cpSync(s, d); overwritten++; preserved++; }
        catch (err) { failures.push(`${s} → ${d}: ${err instanceof Error ? err.message : String(err)}`); }
      }
      return;
    }
    for (const entry of readdirSync(s, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const sp = join(s, entry.name);
      const dp = join(d, entry.name);
      if (entry.isDirectory()) { if (!existsSync(dp)) mkdirSync(dp, { recursive: true }); walk(sp, dp); }
      else if (entry.isFile()) walk(sp, dp);
    }
  };
  walk(src, dst);
  return { copied, overwritten, preserved, failures };
}

export function setupUserSeparation(
  configRoot: string,
  configDir: string,
): { action: "already-linked" | "linked" | "scaffolded-linked" | "link-repair-failed"; target: string; copied: number; overwritten?: number; preserved?: number; backup?: string; error?: string } {
  const liveUserDir = join(configRoot, "LIFEOS", "USER");
  const dataUserDir = join(configDir, "USER");

  // Same path on both sides (configDir resolves inside configRoot) — nothing to
  // separate; the rename-aside branch below would EEXIST on its own symlink and
  // strand the backup tree. Public issue #1694, @dissembler21-png.
  if (resolve(liveUserDir) === resolve(dataUserDir)) {
    return { action: "already-linked", target: dataUserDir, copied: 0 };
  }

  // Branch (a): inspect any symlink occupying liveUserDir. lstatSync does NOT
  // follow the link, so it sees a DANGLING link (target moved, deleted, or
  // restored from backup) that existsSync — which follows — reports as absent.
  // Without this, a dangling link fell through every branch to symlinkSync on an
  // occupied path, EEXIST'd, and returned a success-shaped "scaffolded-linked"
  // action with the error buried in it. (Forge cross-vendor audit 2026-08-11, [C])
  const liveLstat = lstatSync(liveUserDir, { throwIfNoEntry: false });
  if (liveLstat?.isSymbolicLink()) {
    let dest: string | null = null;
    try { dest = readlinkSync(liveUserDir); } catch { /* unreadable link → treat as stale */ }
    if (dest === dataUserDir && existsSync(liveUserDir)) {
      // Correct link, target present → genuine no-op.
      return { action: "already-linked", target: dataUserDir, copied: 0 };
    }
    // Wrong target, or dangling (target missing) → remove the stale link so the
    // rebuild branches below recreate it. Unlinking a symlink never touches the
    // target's contents.
    try {
      unlinkSync(liveUserDir);
    } catch (err) {
      return { action: "link-repair-failed", target: dataUserDir, copied: 0, error: `could not remove stale/dangling USER symlink at ${liveUserDir}: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  mkdirSync(dataUserDir, { recursive: true });
  let copied = 0;

  // Branch (b): live USER is a real dir → migrate into the data home LOSSLESSLY,
  // then symlink. We RENAME the live dir aside (never rm) so the user's real tree
  // ALWAYS survives, then merge it into the data home with live-wins so real
  // content beats any template stub ScaffoldUser placed first. The backup is
  // retained and reported; recovery is always possible, including if the symlink
  // step itself fails. This fixes the prior copyMissing-then-rm data-loss path
  // where a divergent dest stub was kept and the user's real file destroyed.
  if (existsSync(liveUserDir) && lstatSync(liveUserDir).isDirectory()) {
    const stamp = String(Date.now());
    const backupDir = `${liveUserDir}.pre-link-backup-${stamp}`;
    try {
      renameSync(liveUserDir, backupDir);
    } catch (err) {
      return { action: "linked", target: dataUserDir, copied: 0, error: `could not move live USER aside before symlink: ${err instanceof Error ? err.message : String(err)}` };
    }
    const merged = mergeTree(backupDir, dataUserDir, stamp);
    copied = merged.copied;
    try {
      mkdirSync(dirname(liveUserDir), { recursive: true });
      // public issue #1730, @umair-a11y — "junction" lets Windows link a dir without
      // elevation; the arg is ignored on POSIX.
      symlinkSync(dataUserDir, liveUserDir, "junction");
      return { action: "linked", target: dataUserDir, copied, overwritten: merged.overwritten, preserved: merged.preserved, backup: backupDir };
    } catch (err) {
      return { action: "linked", target: dataUserDir, copied, overwritten: merged.overwritten, preserved: merged.preserved, backup: backupDir, error: `symlink creation failed (live USER preserved at ${backupDir}): ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // Branch (c): fresh install — scaffold the data home (if empty) + symlink.
  try {
    mkdirSync(dirname(liveUserDir), { recursive: true });
    // public issue #1730, @umair-a11y — see junction note above.
    symlinkSync(dataUserDir, liveUserDir, "junction");
    return { action: "scaffolded-linked", target: dataUserDir, copied };
  } catch (err) {
    return { action: "scaffolded-linked", target: dataUserDir, copied, error: `symlink creation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Validate the symlink contract: `<configRoot>/LIFEOS/USER` is a symlink → `<configDir>/USER`.
 * (Ported from engine validate.ts runSymlinkContractCheck.)
 */
export function checkSymlinkContract(configRoot: string, configDir: string): { passed: boolean; detail: string } {
  const liveUserDir = join(configRoot, "LIFEOS", "USER");
  const expected = join(configDir, "USER");
  if (!existsSync(liveUserDir)) return { passed: false, detail: `missing: ${liveUserDir}` };
  const st = lstatSync(liveUserDir);
  if (!st.isSymbolicLink()) return { passed: false, detail: `${liveUserDir} is not a symlink (system/user separation broken)` };
  let target: string;
  try {
    target = readlinkSync(liveUserDir);
  } catch (err) {
    return { passed: false, detail: `readlink failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (target !== expected) return { passed: false, detail: `symlink points to ${target}, expected ${expected}` };
  return { passed: true, detail: `${liveUserDir} → ${expected}` };
}

// ── Hooks merge (InstallHooks core — the one genuinely-new piece) ──

export type HookEntry = { type?: string; command?: string; url?: string; [k: string]: unknown };
export type MatcherGroup = { matcher?: string; hooks?: HookEntry[]; [k: string]: unknown };
export type HooksMap = Record<string, MatcherGroup[]>;

/**
 * Normalize a hook command for dedup: collapse the harness/PAI path-var forms to
 * a single canonical token and squeeze whitespace, so the same hook expressed as
 * `${LIFEOS_DIR}/x`, `$LIFEOS_DIR/x`, or `~/.claude/x` dedupes to one.
 */
function normalizeCommand(cmd: string): string {
  return cmd
    .replace(/\$\{?LIFEOS_DIR\}?|\$\{?CLAUDE_PROJECT_DIR\}?|\$\{?CLAUDE_PLUGIN_ROOT\}?|~\/\.claude|\$HOME\/\.claude|\$\{HOME\}\/\.claude/g, "§ROOT§")
    .replace(/\s+/g, " ")
    .trim();
}

/** Identity key for a hook entry: http → url, else normalized command. */
function hookKey(h: HookEntry): string {
  if (h.type === "http" && h.url) return `http:${h.url}`;
  if (h.command) return `cmd:${normalizeCommand(h.command)}`;
  return `raw:${JSON.stringify(h)}`;
}

/**
 * Additively merge `incoming` hooks into `existing` settings.hooks, per matcher
 * bucket, idempotent by normalized-command (and url for http). NEVER removes or
 * reorders a foreign entry. Returns the merged map + counts. Pure (no I/O).
 */
export function mergeHooks(existing: HooksMap, incoming: HooksMap): { merged: HooksMap; added: number; skipped: number } {
  // Deep-clone existing so we never mutate the caller's object.
  const merged: HooksMap = JSON.parse(JSON.stringify(existing ?? {}));
  let added = 0;
  let skipped = 0;

  for (const [event, incomingGroups] of Object.entries(incoming ?? {})) {
    if (!Array.isArray(merged[event])) merged[event] = [];
    const eventBucket = merged[event];

    for (const inGroup of incomingGroups) {
      const matcher = inGroup.matcher ?? "";
      const inHooks = Array.isArray(inGroup.hooks) ? inGroup.hooks : [];
      // Find a same-matcher group already present.
      let target = eventBucket.find((g) => (g.matcher ?? "") === matcher);
      if (!target) {
        // New matcher bucket — append a fresh group, then fill it (counts each hook as added).
        target = { matcher, hooks: [] };
        eventBucket.push(target);
      }
      if (!Array.isArray(target.hooks)) target.hooks = [];
      const present = new Set(target.hooks.map(hookKey));
      for (const h of inHooks) {
        const key = hookKey(h);
        if (present.has(key)) {
          skipped++;
        } else {
          target.hooks.push(h);
          present.add(key);
          added++;
        }
      }
    }
  }
  return { merged, added, skipped };
}

/**
 * Hook-event capability profiles for harnesses that accept a SUBSET of the
 * Claude Code hook set. A harness absent from this map is assumed to accept
 * everything the payload wires (the payload is authored for Claude Code).
 *
 * AdaL (verified against https://docs.sylph.ai/customize/lifecycle-hooks, CLI
 * v1.10) defines exactly six events and — deliberately, so a typo cannot
 * silently disable a guardrail — REJECTS an unknown event name or invalid hook
 * shape at startup. It also only supports `type: "command"` hooks (no `http`,
 * `prompt`, or `agent` types). So merging the Claude Code payload verbatim into
 * `~/.adal/settings.json` would make every AdaL launch fail until hand-repaired:
 * the payload also wires SessionStart, SessionEnd, TaskCreated, ConfigChange,
 * and StopFailure, and carries `type: "http"` entries. InstallHooks filters
 * through `filterHooksForHarness` before merging — never write what the target
 * harness would reject.
 */
export const HARNESS_SUPPORTED_HOOK_EVENTS: Partial<Record<Harness, readonly string[]>> = {
  adal: [
    "PreToolUse", "PostToolUse", "PostToolUseFailure",
    "UserPromptSubmit", "PermissionRequest", "Stop",
  ],
};

export interface HarnessHookFilter {
  /** The incoming map reduced to what the harness can actually load. */
  filtered: HooksMap;
  /** Event names removed wholesale — the harness does not define them. */
  droppedEvents: string[];
  /** Non-command entries dropped INSIDE supported events, per event (e.g. http). */
  droppedEntries: Record<string, number>;
}

/**
 * Reduce an incoming hooks map to what `harness` can load. Pass-through (with
 * empty drop reports) for any harness without a restricted profile, so the
 * Claude Code path is byte-identical to the pre-filter behavior. Within a
 * supported event, only explicit `type: "command"` entries survive (AdaL's
 * schema requires `type` and only accepts `"command"`); matcher groups that
 * filter to empty are dropped, and an event whose groups all drop is omitted.
 * Pure — no I/O, no mutation of the input.
 */
export function filterHooksForHarness(incoming: HooksMap, harness: Harness): HarnessHookFilter {
  const supported = HARNESS_SUPPORTED_HOOK_EVENTS[harness];
  if (!supported) return { filtered: incoming ?? {}, droppedEvents: [], droppedEntries: {} };
  const allowed = new Set(supported);
  const filtered: HooksMap = {};
  const droppedEvents: string[] = [];
  const droppedEntries: Record<string, number> = {};
  for (const [event, groups] of Object.entries(incoming ?? {})) {
    if (!allowed.has(event)) {
      droppedEvents.push(event);
      continue;
    }
    let dropped = 0;
    const keptGroups = (Array.isArray(groups) ? groups : [])
      .map((g) => {
        // Malformed matcher groups are counted as dropped entries, never thrown
        // on — a corrupt payload must not crash the trust-gate mid-install.
        if (!g || typeof g !== "object") { dropped += 1; return null; }
        const hooks = Array.isArray(g.hooks) ? g.hooks : [];
        // Only explicit `type: "command"` survives: the sole restricted profile
        // today is AdaL, whose schema REQUIRES `type` and accepts only
        // "command" (Claude Code defaults a missing type to command, but the
        // claude-code path takes the pass-through branch above and is never
        // filtered — and the canonical payload always sets type explicitly).
        const kept = hooks.filter((h) => !!h && h.type === "command");
        dropped += hooks.length - kept.length;
        return { ...g, hooks: kept };
      })
      .filter((g) => g !== null && Array.isArray(g.hooks) && g.hooks.length > 0);
    if (dropped > 0) droppedEntries[event] = dropped;
    if (keptGroups.length > 0) filtered[event] = keptGroups;
  }
  return { filtered, droppedEvents, droppedEntries };
}

/**
 * Uncomment the identity `@`-imports in a CLAUDE.md, each guarded by existsSync
 * of its symlink-resolved target under configRoot. Lines shipped as
 * `<!-- @LIFEOS/USER/... -->` are activated to `@LIFEOS/USER/...` only when the target
 * resolves. Returns which imports were activated vs left commented.
 */
export function activateImports(claudeMdPath: string, configRoot: string): { activated: string[]; skipped: string[] } {
  const activated: string[] = [];
  const skipped: string[] = [];
  if (!existsSync(claudeMdPath)) return { activated, skipped };
  const lines = readFileSync(claudeMdPath, "utf-8").split("\n");
  // Two dormant-import conventions: the public CLAUDE.md ships `# @LIFEOS/USER/...`
  // (hash-prefixed so the @ isn't at line-start and Claude Code skips it); the
  // older form is `<!-- @LIFEOS/USER/... -->`. Activation strips the prefix so the
  // import sits at line-start and resolves.
  const commented = /^\s*#\s+(@[\w./-]+)\s*$|^\s*<!--\s*(@[\w./-]+)\s*-->\s*$/;
  const out = lines.map((line) => {
    const m = line.match(commented);
    if (!m) return line;
    const importPath = m[1] || m[2]; // e.g. @LIFEOS/USER/TELOS/PRINCIPAL_TELOS.md
    const rel = importPath.replace(/^@/, "");
    if (existsSync(join(configRoot, rel))) {
      activated.push(importPath);
      return importPath;
    }
    skipped.push(importPath);
    return line;
  });
  if (activated.length > 0) writeFileSync(claudeMdPath, out.join("\n"));
  return { activated, skipped };
}

export { resolve };
