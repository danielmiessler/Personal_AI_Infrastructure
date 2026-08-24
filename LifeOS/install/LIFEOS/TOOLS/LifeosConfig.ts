#!/usr/bin/env bun
/**
 * LifeosConfig.ts — typed user-config loader.
 *
 * The INTERFACE between SYSTEM code (this file ships in every LifeOS release) and
 * USER data (the actual values, sourced from LIFEOS/USER/CONFIG/LIFEOS_CONFIG.toml).
 *
 * Doctrine: system code reads identity, voice IDs, integration credentials,
 * and path roots through `loadLifeosConfig()`. No system file directly opens
 * any file under LIFEOS/USER/ for these values — the path-rooting happens here.
 *
 * Format decision (ISC-56.1): TOML.
 *   - Zero new dependencies (Bun 1.3+ native TOML via require()).
 *   - Human-editable with sections, comments, multi-line strings.
 *   - PULSE.user.toml already in user-config dir as precedent.
 *
 * See: LIFEOS/DOCUMENTATION/SystemUserBoundary.md § "The four allowed access patterns".
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

// Expand leading `~` (and `~/`) to the user's home directory. node:fs APIs do
// not expand tildes, so any path returned from this loader must be absolute.
//
// Exported because [launch] carries paths with the same semantics as [paths],
// and a second implementation would drift.
export function expandHome(p: string): string {
  if (!p) return p;
  if (p === "~") return DEFAULT_HOME;
  if (p.startsWith("~/")) return resolve(DEFAULT_HOME, p.slice(2));
  return p;
}

// ─────────── Types ───────────

export interface LifeosPrincipal {
  name: string;
  pronunciation?: string;
  timezone: string;
  hometown?: string;
  voiceCloneId?: string;
  // ISO 4217 code (e.g. "JPY", "EUR"). Optional — consumers (currently just
  // Pulse's Finances tab) default to "USD" when unset, so existing TOML files
  // need no edit.
  // ported from public PR #1777, @takanorinishida
  currency?: string;
}

export interface LifeosVoiceSettings {
  voiceId: string;
  voiceName?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
  useSpeakerBoost?: boolean;
  volume?: number;
}

export interface LifeosDa {
  name: string;
  fullName?: string;
  displayName?: string;
  color?: string;
  voices: {
    main: LifeosVoiceSettings;
  };
}

export interface LifeosIntegrations {
  google?: { credentialsFile?: string };
  cloudflare?: { accountId?: string; tokenEnvVar?: string };
  [key: string]: unknown;
}

export interface LifeosPaths {
  userDir: string;
  // memoryDir was removed 2026-07-18 (public issue #1526, @christauff): declared
  // since inception but never consumed — the memory root is derived by
  // hooks/lib/paths.ts getMemoryDir(), and a dead config knob that LOOKS live
  // is worse than no knob.
  projectsDir: string;
}

// Where a `lifeos` session starts.
//   config-root        cd to defaultDir (STOCK behaviour, and the default)
//   stay               stay in the launch directory, always
//   stay-if-permitted  stay when under a permitted root, else defaultDir
export type CwdMode = "config-root" | "stay" | "stay-if-permitted";

export interface LifeosLaunch {
  cwdMode: CwdMode;
  defaultDir: string;
  // Absolute, trailing-slash stripped, @-sentinels ALREADY EXPANDED. Expanding
  // at load is what lets the launcher's resolver stay pure.
  permittedRoots: string[];
}

export interface LifeosConfig {
  principal: LifeosPrincipal;
  da: LifeosDa;
  integrations: LifeosIntegrations;
  paths: LifeosPaths;
  launch: LifeosLaunch;
}

// ─────────── Resolution ───────────

const DEFAULT_HOME = process.env.HOME || homedir();
const DEFAULT_CONFIG_ROOT = resolve(DEFAULT_HOME, ".claude");
const DEFAULT_CONFIG_PATH = resolve(DEFAULT_HOME, ".claude/LIFEOS/USER/CONFIG/LIFEOS_CONFIG.toml");

let cache: { config: LifeosConfig; mtime: number; path: string } | null = null;

export function loadLifeosConfig(opts: { path?: string; force?: boolean } = {}): LifeosConfig {
  const path = opts.path ?? process.env.LIFEOS_CONFIG_PATH ?? DEFAULT_CONFIG_PATH;

  if (!existsSync(path)) {
    throw new Error(
      `LifeosConfig: config file not found at ${path}. ` +
        `Create it (see LIFEOS/USER/CONFIG/README.md) or set LIFEOS_CONFIG_PATH.`,
    );
  }

  const mtime = statSync(path).mtimeMs;
  if (!opts.force && cache && cache.path === path && cache.mtime === mtime) {
    return cache.config;
  }

  // Invalidate Bun's require cache so re-reads pick up mtime changes.
  try {
    const resolved = require.resolve(path);
    delete require.cache[resolved];
  } catch {
    // require.resolve can throw on first read; safe to ignore.
  }

  // Bun 1.3+ parses TOML via require() at any path ending in .toml.
  const raw = require(path) as unknown;
  const validated = validateAndNormalize(raw, path);
  cache = { config: validated, mtime, path };
  return validated;
}

export function clearLifeosConfigCache(): void {
  cache = null;
}

/**
 * Convenience helper for the most common consumer pattern: "give me the user
 * directory, fall back to the conventional location on fresh installs."
 * Used by Banner tools, HealthSnapshot, hooks/lib/identity, and any other
 * system module that needs to compose paths under the user zone.
 */
export function paiUserDir(): string {
  try {
    return loadLifeosConfig().paths.userDir;
  } catch {
    return resolve(DEFAULT_HOME, ".claude/LIFEOS/USER");
  }
}

/**
 * The [launch] block, with the built-in defaults when there is no config file
 * at all. Mirrors paiUserDir()'s shape: a fresh install that has not scaffolded
 * LIFEOS_CONFIG.toml yet must still launch, and the defaults reproduce stock
 * behaviour exactly.
 *
 * A config file that EXISTS but carries a malformed [launch] block still
 * throws. Only ABSENCE is tolerated here, never a typo.
 */
export function loadLifeosLaunch(): LifeosLaunch {
  const path = process.env.LIFEOS_CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
  if (!existsSync(path)) {
    return defaultLaunchConfig();
  }
  return loadLifeosConfig().launch;
}

/** Built-in [launch] defaults: cd to the config root, exactly as stock does. */
export function defaultLaunchConfig(): LifeosLaunch {
  return normalizeLaunchBlock(undefined, defaultSentinelContext([]), process.env);
}

function defaultSentinelContext(settingsAllow: string[]): LaunchSentinelContext {
  return {
    configRoot: DEFAULT_CONFIG_ROOT,
    userDir: resolve(DEFAULT_HOME, ".claude/LIFEOS/USER"),
    projectsDir: resolve(DEFAULT_HOME, "Projects"),
    settingsAllow,
  };
}

// ─────────── Validation ───────────

function validateAndNormalize(raw: unknown, path: string): LifeosConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error(`LifeosConfig: ${path} did not parse to an object`);
  }
  const root = raw as Record<string, any>;

  const principal = root.principal ?? {};
  if (typeof principal.name !== "string" || !principal.name) {
    throw new Error(`LifeosConfig: [principal] requires a non-empty name — see ${path}`);
  }
  if (typeof principal.timezone !== "string" || !principal.timezone) {
    throw new Error(`LifeosConfig: [principal] requires a non-empty timezone — see ${path}`);
  }

  const da = root.da ?? {};
  if (typeof da.name !== "string" || !da.name) {
    throw new Error(`LifeosConfig: [da] requires a non-empty name — see ${path}`);
  }
  const daVoices = da.voices ?? {};
  if (!daVoices.main || typeof (daVoices.main.voice_id ?? daVoices.main.voiceId) !== "string") {
    throw new Error(`LifeosConfig: [da.voices.main] requires a voice_id — see ${path}`);
  }

  const paths: LifeosPaths = {
    userDir: expandHome(
      root.paths?.userDir ?? root.paths?.user_dir ?? resolve(DEFAULT_HOME, ".claude/LIFEOS/USER"),
    ),
    projectsDir: expandHome(
      root.paths?.projectsDir ?? root.paths?.projects_dir ?? resolve(DEFAULT_HOME, "Projects"),
    ),
  };

  // settings.json is only read when @settings-allow is actually referenced --
  // the stock default set does not include it, so the common path pays nothing.
  const rawRoots =
    root.launch?.permitted_roots ?? root.launch?.permittedRoots ?? DEFAULT_PERMITTED_ROOTS;
  const settingsAllow =
    Array.isArray(rawRoots) && rawRoots.includes("@settings-allow") ? readSettingsAllow() : [];

  const launch = normalizeLaunchBlock(
    root.launch,
    {
      configRoot: DEFAULT_CONFIG_ROOT,
      userDir: paths.userDir,
      projectsDir: paths.projectsDir,
      settingsAllow,
    },
    process.env,
  );

  return {
    principal: {
      name: principal.name,
      pronunciation: principal.pronunciation,
      timezone: principal.timezone,
      hometown: principal.hometown,
      voiceCloneId: principal.voice_clone_id ?? principal.voiceCloneId,
      currency: principal.currency,
    },
    da: {
      name: da.name,
      fullName: da.full_name ?? da.fullName,
      displayName: da.display_name ?? da.displayName,
      color: da.color,
      voices: {
        main: normalizeVoice(daVoices.main),
      },
    },
    integrations: {
      ...root.integrations,
      // Normalize snake_case TOML keys like the principal/da fields above. The
      // spread stays FIRST — spreading after would clobber the normalized shape
      // with the raw TOML object (credentials_file vs credentialsFile).
      google: root.integrations?.google
        ? {
            ...root.integrations.google,
            credentialsFile:
              root.integrations.google.credentials_file ?? root.integrations.google.credentialsFile,
          }
        : undefined,
      cloudflare: root.integrations?.cloudflare,
    },
    paths,
    launch,
  };
}

function normalizeVoice(v: any): LifeosVoiceSettings {
  return {
    voiceId: v.voice_id ?? v.voiceId,
    voiceName: v.voice_name ?? v.voiceName,
    stability: v.stability,
    similarityBoost: v.similarity_boost ?? v.similarityBoost,
    style: v.style,
    speed: v.speed,
    useSpeakerBoost: v.use_speaker_boost ?? v.useSpeakerBoost,
    volume: v.volume,
  };
}

// ----------- [launch] validation -----------
//
// The whole block is validated at LOAD, regardless of which mode is active, so
// a typo in permitted_roots surfaces at the next launch rather than weeks later
// when the mode changes. This file validates SYNTAX, naming the offending key;
// the launcher's chdir() validates REALITY. Existence stays out of load-time
// validation so a default_dir on an automounted or network path does not fail
// while it is legitimately absent.

const CWD_MODES: readonly string[] = ["config-root", "stay", "stay-if-permitted"];

// Environment variables a [launch] path may reference. All three are set by
// settings.system.json's env block; an open allowlist would let a launch path
// depend on whatever happened to be exported.
const LAUNCH_ENV_ALLOWLIST: readonly string[] = ["HOME", "LIFEOS_DIR", "PROJECTS_DIR"];

const LAUNCH_SENTINELS: readonly string[] = ["@config-root", "@config-paths", "@settings-allow"];

// Matches the default in the shipped TOML template. Sentinels, not paths --
// they expand through the same code path a user-written entry does.
const DEFAULT_PERMITTED_ROOTS: readonly string[] = ["@config-root", "@config-paths"];

export interface LaunchSentinelContext {
  configRoot: string;
  userDir: string;
  projectsDir: string;
  /** Raw `permissions.allow` entries from the MERGED settings.json. */
  settingsAllow: string[];
}

// Trailing "/" is stripped on load and re-appended for prefix comparison, so
// "~/Projects" and "~/Projects/" are the same entry. "/" itself is preserved --
// normalising it to "" would turn the root into a prefix that matches nothing.
function stripTrailingSlash(p: string): string {
  if (p === "/") {
    return p;
  }
  return p.replace(/\/+$/, "") || "/";
}

function expandLaunchVars(
  value: string,
  key: string,
  env: Record<string, string | undefined>,
): string {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_match, braced: string | undefined, bare: string | undefined) => {
      const name = braced ?? bare ?? "";
      if (!LAUNCH_ENV_ALLOWLIST.includes(name)) {
        throw new Error(
          `LifeosConfig: [launch].${key} references $${name}, which is not an allowed variable ` +
            `(allowed: ${LAUNCH_ENV_ALLOWLIST.join(", ")})`,
        );
      }
      const resolved = env[name];
      if (!resolved) {
        // Naive expansion of an unset var yields "", turning "${LIFEOS_DIR}/x"
        // into "/x" -- a root-level prefix that matches nearly everything.
        // Never empty-expand; fail loudly instead.
        throw new Error(
          `LifeosConfig: [launch].${key} references $${name}, which is unset or empty -- ` +
            `refusing to expand it to "" (that would yield a root-level path)`,
        );
      }
      return resolved;
    },
  );
}

/**
 * Normalize one [launch] path to an absolute, trailing-slash-free path.
 *
 * Pure: `env` arrives as an argument rather than being read from process.env.
 * `key` exists only to name the offending entry in errors.
 */
export function normalizeLaunchPath(
  value: unknown,
  key: string,
  env: Record<string, string | undefined>,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`LifeosConfig: [launch].${key} must be a non-empty string`);
  }
  if (value.includes("*")) {
    throw new Error(
      `LifeosConfig: [launch].${key} contains "*" (got "${value}") -- globbing is not supported`,
    );
  }

  const expanded = expandLaunchVars(value, key, env);

  // Checked BEFORE expandHome: expandHome uses resolve(), which silently
  // COLLAPSES ".." segments, leaving nothing to detect afterwards.
  if (expanded.split("/").includes("..")) {
    throw new Error(
      `LifeosConfig: [launch].${key} contains a ".." segment (got "${value}") -- not allowed`,
    );
  }

  const absolute = expandHome(expanded);
  if (!absolute.startsWith("/")) {
    throw new Error(
      `LifeosConfig: [launch].${key} is a relative path (got "${value}") -- relative to what? ` +
        `Use "/...", "~/...", or \${HOME}/\${LIFEOS_DIR}/\${PROJECTS_DIR}`,
    );
  }
  return stripTrailingSlash(absolute);
}

// Roots implied by settings.json `permissions.allow`. Matches an Edit rule whose
// path is ROOTED -- it begins with "~/" or "/" -- so Edit(/tmp/**) counts as
// well as the "~/" forms.
//
// A rule with a wildcard anywhere other than the trailing "/**" is SKIPPED: a
// leading "**/" is a pattern, not a rooted path. Relative rules are skipped for
// the same reason.
//
// The input is the MERGED settings.json rather than settings.user.json, since
// the effective permission set is what the user experiences.
export function parseSettingsAllowRoots(allow: readonly string[]): string[] {
  const roots: string[] = [];
  for (const rule of allow) {
    if (typeof rule !== "string") {
      continue;
    }
    const match = /^Edit\((.+)\/\*\*\)$/.exec(rule);
    if (!match) {
      continue;
    }
    const path = match[1];
    if (path.includes("*")) {
      continue;
    }
    if (!path.startsWith("~/") && !path.startsWith("/")) {
      continue;
    }
    roots.push(stripTrailingSlash(expandHome(path)));
  }
  return roots;
}

/**
 * Expand one @-sentinel to the set of roots it stands for.
 *
 * "@" is RESERVED as a prefix: a literal path beginning with "@" is not
 * supported. An unknown sentinel is a HARD ERROR rather than a skip -- a
 * silently-dropped typo would narrow the permitted set invisibly and change
 * where sessions land.
 */
export function expandLaunchSentinel(sentinel: string, ctx: LaunchSentinelContext): string[] {
  switch (sentinel) {
    case "@config-root":
      return [stripTrailingSlash(ctx.configRoot)];
    case "@config-paths":
      return [stripTrailingSlash(ctx.userDir), stripTrailingSlash(ctx.projectsDir)];
    case "@settings-allow":
      return parseSettingsAllowRoots(ctx.settingsAllow);
    default:
      throw new Error(
        `LifeosConfig: [launch].permitted_roots has unknown sentinel "${sentinel}" -- ` +
          `valid sentinels are ${LAUNCH_SENTINELS.join(", ")}`,
      );
  }
}

/**
 * Validate and normalize the raw [launch] table. Pure with respect to the
 * filesystem: everything it needs arrives through `ctx` and `env`.
 *
 * An absent block, or an absent cwd_mode, yields stock behaviour: cd to the
 * config root.
 */
export function normalizeLaunchBlock(
  raw: unknown,
  ctx: LaunchSentinelContext,
  env: Record<string, string | undefined>,
): LifeosLaunch {
  const block = (raw ?? {}) as Record<string, any>;

  const rawMode = block.cwd_mode ?? block.cwdMode;
  let cwdMode: CwdMode = "config-root";
  if (rawMode !== undefined) {
    if (typeof rawMode !== "string" || !CWD_MODES.includes(rawMode)) {
      throw new Error(
        `LifeosConfig: [launch].cwd_mode is "${rawMode}" -- valid modes are ${CWD_MODES.join(", ")}`,
      );
    }
    cwdMode = rawMode as CwdMode;
  }

  const rawDefaultDir = block.default_dir ?? block.defaultDir;
  const defaultDir =
    rawDefaultDir === undefined
      ? stripTrailingSlash(ctx.configRoot)
      : normalizeLaunchPath(rawDefaultDir, "default_dir", env);

  const rawRoots = block.permitted_roots ?? block.permittedRoots ?? DEFAULT_PERMITTED_ROOTS;
  if (!Array.isArray(rawRoots)) {
    throw new Error(`LifeosConfig: [launch].permitted_roots must be an array of strings`);
  }

  const permittedRoots: string[] = [];
  for (const entry of rawRoots) {
    if (typeof entry !== "string") {
      throw new Error(`LifeosConfig: [launch].permitted_roots entries must be strings`);
    }
    if (entry.startsWith("@")) {
      permittedRoots.push(...expandLaunchSentinel(entry, ctx));
    } else {
      permittedRoots.push(normalizeLaunchPath(entry, "permitted_roots", env));
    }
  }

  return { cwdMode, defaultDir, permittedRoots: [...new Set(permittedRoots)] };
}

// Absent or malformed settings are treated as an empty allow list rather than an
// error: a Core-only install may legitimately not have the file, and
// @settings-allow is opt-in.
function readSettingsAllow(): string[] {
  const settingsPath = resolve(DEFAULT_CONFIG_ROOT, "settings.json");
  try {
    if (!existsSync(settingsPath)) {
      return [];
    }
    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8")) as any;
    const allow = parsed?.permissions?.allow;
    if (!Array.isArray(allow)) {
      return [];
    }
    return allow.filter((rule: unknown): rule is string => typeof rule === "string");
  } catch {
    return [];
  }
}

// ─────────── CLI entry ───────────

if (import.meta.main) {
  try {
    const cfg = loadLifeosConfig();
    console.log(JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
