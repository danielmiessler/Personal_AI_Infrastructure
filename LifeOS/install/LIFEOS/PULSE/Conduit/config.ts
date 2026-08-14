/**
 * Conduit configuration — lives under USER (config.json). Self-initializing:
 * first read writes defaults so a fresh install is stable with zero setup.
 *
 * Per-source opt-in is a first-class field: privacy is granular by construction.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG_PATH } from "./paths.ts";

export interface ConduitConfig {
  /** Master switch. When false, capture is a no-op. */
  enabled: boolean;
  /** Seconds between capture polls (launchd StartInterval should match). */
  pollIntervalSec: number;
  /** Per-source opt-in. Disable any source without touching code. */
  sources: {
    appFocus: boolean;
    git: boolean;
    claudeSession: boolean;
    /** GitHub activity (remote commits + PRs authored by you). Off by default. */
    github: boolean;
  };
  /** Absolute repo paths watched for new commits. Empty by default. */
  repos: string[];
  /**
   * GitHub login whose commit/PR activity the github source captures. Empty →
   * the adapter resolves it from `gh api user` (the authenticated account).
   */
  githubUser?: string;
  /**
   * Optional GH_CONFIG_DIR for the `gh` calls the github source makes — set this
   * when the account that owns the GitHub auth differs from the OS user running
   * Conduit (e.g. a service account). Empty → ambient `gh` auth.
   *
   * There is deliberately no knob for the `gh` binary itself: it resolves from
   * PATH, so this config can point the CLI at a different identity but can never
   * name what gets executed.
   */
  githubConfigDir?: string;
  /** Days of raw event logs retained after rollup. */
  retentionDays: number;
}

export const DEFAULT_CONFIG: ConduitConfig = {
  enabled: true,
  pollIntervalSec: 120,
  sources: { appFocus: true, git: true, claudeSession: true, github: false },
  repos: [],
  retentionDays: 30,
};

/**
 * Coerce + clamp a raw (untrusted) config over defaults. Pure. A parseable-but-malformed
 * config (pollIntervalSec 0/negative/"120", negative retention) can otherwise produce
 * NaN/zeroed minutes and an invalid launchd StartInterval — so every field is validated.
 */
export function clampConfig(raw: Partial<ConduitConfig>): ConduitConfig {
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    enabled: raw.enabled !== false,
    pollIntervalSec: Math.max(15, Math.floor(num(raw.pollIntervalSec, DEFAULT_CONFIG.pollIntervalSec))),
    sources: {
      appFocus: raw.sources?.appFocus !== false,
      git: raw.sources?.git !== false,
      claudeSession: raw.sources?.claudeSession !== false,
      github: raw.sources?.github === true, // opt-in: off unless explicitly enabled
    },
    repos: Array.isArray(raw.repos) ? raw.repos.filter((r) => typeof r === "string") : [],
    githubUser: typeof raw.githubUser === "string" && raw.githubUser.trim() ? raw.githubUser.trim() : undefined,
    githubConfigDir: typeof raw.githubConfigDir === "string" && raw.githubConfigDir.trim() ? raw.githubConfigDir.trim() : undefined,
    retentionDays: Math.max(0, Math.floor(num(raw.retentionDays, DEFAULT_CONFIG.retentionDays))),
  };
}

/** Load config, writing defaults on first run. Never throws — falls back to defaults. */
export function loadConfig(): ConduitConfig {
  try {
    if (!existsSync(CONFIG_PATH)) {
      mkdirSync(dirname(CONFIG_PATH), { recursive: true });
      writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG };
    }
    return clampConfig(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
