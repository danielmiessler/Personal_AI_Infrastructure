#!/usr/bin/env bun
/**
 * Health — one deterministic read of whether the Hermes sidecar is actually up.
 *
 * The sidecar is a separate process tree with its own supervisor, so "is it
 * running" has three independent answers that can disagree, and the disagreement
 * is the interesting part:
 *
 *   1. the supervisor (launchd/systemd) thinks it has a job
 *   2. `gateway_state.json` says a pid was running as of some timestamp
 *   3. that pid is, right now, alive
 *
 * A gateway in a crash loop satisfies (1) and (2) continuously while being down
 * essentially all the time — which is exactly how it went unnoticed on
 * 2026-07-30, when a leftover `launchctl submit` restarter (KeepAlive defaults
 * to true for submitted jobs) SIGTERM'd the gateway every ~30s for hours. So
 * this probe reads the start log and reports FLAPPING as its own state rather
 * than letting a momentary "running" pid pass for health, and it names the
 * looping restarter directly, because that is the known cause.
 *
 * Read-only: it inspects state files and asks the supervisor. It never starts,
 * stops, or restarts anything — remediation is a human's call.
 *
 * Install-generic: no home paths, no usernames. `HERMES_HOME` wins when set.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const GATEWAY_LABEL = "ai.hermes.gateway";
/** The one-shot restarter that ships with a KeepAlive footgun; see header. */
export const RESTARTER_LABEL = "ai.hermes.gateway-restarter";

/** Starts within this window that exceed FLAP_THRESHOLD mean a crash loop. */
const FLAP_WINDOW_MS = 10 * 60 * 1000;
const FLAP_THRESHOLD = 4;

/** Beyond this, `gateway_state.json` is describing a world that no longer exists. */
const STATE_STALE_MS = 15 * 60 * 1000;

export type HermesStatus =
  | "absent" // not installed on this machine
  | "down" // installed, no live gateway process
  | "flapping" // restarting repeatedly — up only between kills
  | "degraded" // process alive, but a platform or the state file is unhealthy
  | "up";

export interface PlatformHealth {
  name: string;
  state: string;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface HermesHealth {
  status: HermesStatus;
  /** One line fit for a status card or a menu row. */
  summary: string;
  installed: boolean;
  home: string | null;
  /** Supervisor's view: is a job loaded, and does it hold a pid? */
  supervised: boolean;
  pid: number | null;
  pidAlive: boolean;
  uptimeSeconds: number | null;
  activeAgents: number | null;
  platforms: PlatformHealth[];
  /** Gateway launches inside FLAP_WINDOW_MS. */
  recentStarts: number;
  /** Everything wrong right now, most structural first. */
  problems: string[];
  stateUpdatedAt: string | null;
  checkedAt: string;
}

function hermesHome(): string {
  return process.env.HERMES_HOME || join(homedir(), ".hermes");
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Seconds the process has actually been alive, from `ps -o etime` (macOS has no
 * `etimes`). This has to come from the process, not from how recently the state
 * file was written: a gateway that is killed and relaunched every 30s keeps
 * rewriting state, so state age reads as healthy uptime forever.
 *
 * etime format: `[[dd-]hh:]mm:ss`.
 */
function processUptimeSeconds(pid: number): number | null {
  try {
    const out = Bun.spawnSync(["ps", "-o", "etime=", "-p", String(pid)]).stdout.toString().trim();
    if (!out) return null;
    const [days, clock] = out.includes("-") ? out.split("-") : ["0", out];
    const parts = clock.split(":").map(Number);
    if (parts.some((n) => !Number.isFinite(n))) return null;
    const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
    return Number(days) * 86400 + h * 3600 + m * 60 + s;
  } catch {
    return null;
  }
}

/**
 * Ask the platform supervisor whether a labelled job is loaded. macOS is the
 * primary path; the systemd branch is additive so a Linux install reports
 * something better than "unknown" without touching the macOS path.
 */
function supervisorHasJob(label: string): boolean {
  try {
    if (process.platform === "darwin") {
      const out = Bun.spawnSync(["launchctl", "list"]).stdout.toString();
      return out.split("\n").some((line) => line.endsWith(`\t${label}`) || line.trim().endsWith(label));
    }
    if (process.platform === "linux") {
      const r = Bun.spawnSync(["systemctl", "--user", "is-enabled", `${label}.service`]);
      return r.exitCode === 0;
    }
  } catch {
    /* supervisor absent or unreadable — treated as no job */
  }
  return false;
}

/** Gateway launches recorded in the last FLAP_WINDOW_MS, from the start log. */
function countRecentStarts(home: string): number {
  const log = join(home, "gateway-starts.log");
  if (!existsSync(log)) return 0;
  const cutoffSeconds = (Date.now() - FLAP_WINDOW_MS) / 1000;
  return readFileSync(log, "utf8")
    .split("\n")
    .map((line) => Number.parseFloat(line.trim()))
    .filter((ts) => Number.isFinite(ts) && ts >= cutoffSeconds).length;
}

function readPlatforms(state: Record<string, unknown> | null): PlatformHealth[] {
  const raw = state?.platforms;
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, Record<string, unknown>>).map(([name, p]) => ({
    name,
    state: String(p?.state ?? "unknown"),
    errorCode: (p?.error_code as string) ?? null,
    errorMessage: (p?.error_message as string) ?? null,
  }));
}

export function checkHermesHealth(): HermesHealth {
  const checkedAt = new Date().toISOString();
  const home = hermesHome();

  if (!existsSync(home)) {
    return {
      status: "absent",
      summary: "Hermes sidecar not installed",
      installed: false,
      home: null,
      supervised: false,
      pid: null,
      pidAlive: false,
      uptimeSeconds: null,
      activeAgents: null,
      platforms: [],
      recentStarts: 0,
      problems: [],
      stateUpdatedAt: null,
      checkedAt,
    };
  }

  const state = readJson(join(home, "gateway_state.json"));
  const pid = typeof state?.pid === "number" ? (state.pid as number) : null;
  const pidAlive = pid !== null && isAlive(pid);
  const supervised = supervisorHasJob(GATEWAY_LABEL);
  const recentStarts = countRecentStarts(home);
  const platforms = readPlatforms(state);
  const stateUpdatedAt = (state?.updated_at as string) ?? null;
  const activeAgents = typeof state?.active_agents === "number" ? (state.active_agents as number) : null;

  const stateAgeMs = stateUpdatedAt ? Date.now() - Date.parse(stateUpdatedAt) : null;
  const uptimeSeconds = pidAlive && pid !== null ? processUptimeSeconds(pid) : null;

  const problems: string[] = [];
  if (supervisorHasJob(RESTARTER_LABEL)) {
    problems.push(
      `${RESTARTER_LABEL} is loaded — it kills the gateway on a loop; remove it with \`launchctl remove ${RESTARTER_LABEL}\``,
    );
  }
  if (!supervised) problems.push(`no ${GATEWAY_LABEL} job registered with the supervisor`);
  if (!pidAlive) problems.push(pid === null ? "no gateway pid recorded" : `recorded pid ${pid} is not running`);
  if (recentStarts >= FLAP_THRESHOLD) problems.push(`${recentStarts} gateway starts in the last 10 minutes`);
  if (pidAlive && stateAgeMs !== null && stateAgeMs > STATE_STALE_MS) {
    problems.push(`gateway_state.json last written ${Math.round(stateAgeMs / 60000)}m ago`);
  }
  for (const p of platforms) {
    if (p.state === "fatal") problems.push(`${p.name}: ${p.errorMessage || p.errorCode || "fatal"}`);
  }

  const connected = platforms.filter((p) => p.state === "connected");
  const status: HermesStatus =
    recentStarts >= FLAP_THRESHOLD
      ? "flapping"
      : !pidAlive
        ? "down"
        : platforms.some((p) => p.state === "fatal") || problems.length > 0
          ? "degraded"
          : "up";

  const channels = platforms.length ? `${connected.length}/${platforms.length} channels` : "no channels";
  const summary =
    status === "up"
      ? `gateway up · ${channels}`
      : status === "flapping"
        ? `gateway crash-looping · ${recentStarts} starts/10m`
        : status === "down"
          ? "gateway down"
          : `gateway up · ${channels} · ${problems.length} issue${problems.length === 1 ? "" : "s"}`;

  return {
    status,
    summary,
    installed: true,
    home,
    supervised,
    pid,
    pidAlive,
    uptimeSeconds,
    activeAgents,
    platforms,
    recentStarts,
    problems,
    stateUpdatedAt,
    checkedAt,
  };
}

/**
 * States that mean "the sidecar is doing its job." `degraded` is in the set on
 * purpose: it is usually a standing config gap (a channel that was never given
 * credentials), and paging on a condition nobody intends to fix today is how a
 * monitor gets muted. `absent` passes too, so a LifeOS install with no sidecar
 * is green rather than permanently red.
 */
export const LIVE_STATUSES: ReadonlySet<HermesStatus> = new Set<HermesStatus>(["up", "degraded", "absent"]);

if (import.meta.main) {
  const health = checkHermesHealth();

  // Assertion modes for Bunker's ISA Test Strategy: silent, exit code is the
  // whole result. Kept as flags rather than shell-grepping the JSON so the
  // pass/fail rule lives here, next to the states it names.
  if (process.argv.includes("--assert-live")) {
    if (LIVE_STATUSES.has(health.status)) process.exit(0);
    console.error(`hermes ${health.status}: ${health.summary}`);
    process.exit(1);
  }
  if (process.argv.includes("--assert-no-restarter")) {
    const looping = health.problems.find((p) => p.startsWith(RESTARTER_LABEL));
    if (!looping) process.exit(0);
    console.error(looping);
    process.exit(1);
  }

  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(health, null, 2) + "\n");
  } else {
    const icon = { up: "🟢", degraded: "🟡", flapping: "🟠", down: "🔴", absent: "⚪" }[health.status];
    console.log(`${icon} Hermes — ${health.summary}`);
    if (health.pid) console.log(`   pid ${health.pid}${health.pidAlive ? "" : " (dead)"}`);
    for (const p of health.platforms) console.log(`   ${p.name}: ${p.state}`);
    for (const problem of health.problems) console.log(`   ! ${problem}`);
  }
  process.exit(health.status === "up" || health.status === "absent" ? 0 : 1);
}
