/**
 * LifeOS Pulse — Shared Utilities
 *
 * Cron matching, state I/O, config loading, output dispatch, process spawning.
 * Extracted from Monitor's proven code, stripped to essentials.
 */

import { parse } from "smol-toml"
import { join } from "path"
import { existsSync } from "fs"
import { rename } from "fs/promises"
import { modelForEffort } from "../TOOLS/models.ts"
import { PULSE_BASE } from "./endpoint"

export { PULSE_BASE }

// ── Types ──

export type OutputTarget = "voice" | "ntfy" | "email" | "log"

export type JobSource = "system" | "user"

export interface Job {
  name: string
  schedule: string
  type: "script" | "claude"
  command?: string
  prompt?: string
  model?: string
  output: OutputTarget | OutputTarget[]
  enabled: boolean
  /**
   * Optional per-job execution timeout in ms (script jobs). Defaults to the
   * spawnScript 60s when absent. Long-running gathers (e.g. AI-assisted
   * local-intelligence refresh) need minutes, not seconds.
   */
  timeout_ms?: number
  /**
   * Where this job was loaded from. Not persisted to TOML — set by the
   * loader after parsing. Used by the dashboard to render the source
   * badge and by the API to route writes (always to the user file).
   *
   * - "system": from LIFEOS/PULSE/PULSE.toml (ships in public release)
   * - "user":   from LIFEOS/USER/CONFIG/PULSE.user.toml (private, stripped at release)
   */
  _source?: JobSource
  /**
   * Why this job's schedule was rejected, if it was. Set by loadConfig() when
   * validateCron() refuses the expression. A job carrying this is force-
   * disabled and never evaluated by the scheduler — it stays in the list so
   * the dashboard can show the operator what needs fixing.
   * public PR #1644, @elhoim
   */
  scheduleError?: string
}

export interface DaemonConfig {
  jobs: Job[]
}

// ── User-file path helpers ──
//
// USER_CRON_PATH points inside LIFEOS/USER/**, which is already declared a
// containment-deletion zone in hooks/lib/containment-zones.ts:24. Anything
// written here is automatically stripped from shadow releases. That's the
// structural privacy lever — no separate scrub policy needed.

export const USER_CRON_PATH = join(
  process.env.HOME ?? "~",
  ".claude", "LIFEOS", "USER", "CONFIG", "PULSE.user.toml",
)

export interface JobState {
  lastRun: number
  lastResult: "ok" | "error"
  consecutiveFailures: number
}

export interface DaemonState {
  version: 1
  jobs: Record<string, JobState>
  startedAt: number
}

// ── Env Var Resolution ──
//
// (public PR #1544, @m8ryx) Historically this was applied to exactly one field
// (a job's `command`), so every other `${VAR}` in PULSE.toml was a dead
// literal. Expansion is now applied to every string value in the parsed config
// (see parseConfigToml), so secrets can live in the environment instead of in
// the file. Substitution semantics are deliberately unchanged from the
// original single-field behaviour — both `$VAR` and `${VAR}` are recognised,
// and an undefined variable resolves to the empty string.
//
// Backward compatibility: the regex only matches a `$` followed by an
// uppercase identifier, so a plain literal value ("ntfy.sh", a cron
// expression, a prose prompt) is returned byte-identical and existing installs
// keep working across an upgrade.

export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g, (_, name) => process.env[name] ?? "")
}

// Recursively expand env vars in every string reachable from a parsed TOML
// document. Non-string scalars (numbers, booleans, dates) pass through
// untouched; object keys are never rewritten, only values.
function resolveEnvVarsDeep<T>(value: T): T {
  if (typeof value === "string") return resolveEnvVars(value) as unknown as T
  if (Array.isArray(value)) return value.map(resolveEnvVarsDeep) as unknown as T
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveEnvVarsDeep(v)
    }
    return out as unknown as T
  }
  return value
}

/**
 * Parse a Pulse TOML document and expand `${VAR}` / `$VAR` references in all
 * string values against the process environment.
 *
 * This is the single entry point for reading PULSE.toml — both the job loader
 * here and loadPulseConfig() in pulse.ts go through it, so env expansion is a
 * property of the config layer rather than of any one consumer.
 */
export function parseConfigToml(raw: string): Record<string, unknown> {
  return resolveEnvVarsDeep(parse(raw) as Record<string, unknown>)
}

// ── Config Loading ──
//
// Loads PULSE.toml (system) and LIFEOS/USER/CONFIG/PULSE.user.toml (user)
// and merges them into a single Job[]. User-tier jobs override system-tier
// jobs by name (same-name override pattern). Each Job carries a _source
// tag so downstream code can render badges and route writes correctly.
//
// Missing user file is non-fatal — fresh LifeOS installs have system-only
// jobs until the user adds something via the API.

function jobsFromToml(raw: string, source: JobSource): Job[] {
  // parseConfigToml already expanded env vars in every string, including
  // `command` — which is why there is no per-field resolveEnvVars call here
  // any more.
  const parsed = parseConfigToml(raw) as { job?: Array<Record<string, unknown>> }
  return (parsed.job ?? []).map((j) => ({
    name: j.name as string,
    schedule: j.schedule as string,
    type: (j.type as "script" | "claude") ?? "script",
    command: j.command as string | undefined,
    prompt: j.prompt as string | undefined,
    model: (j.model as string) ?? modelForEffort('medium'),
    output: (j.output ?? "log") as OutputTarget | OutputTarget[],
    enabled: (j.enabled as boolean) ?? true,
    timeout_ms: typeof j.timeout_ms === "number" ? j.timeout_ms : undefined,
    _source: source,
  }))
}

export async function loadConfig(daemonDir: string): Promise<DaemonConfig> {
  const systemRaw = await Bun.file(join(daemonDir, "PULSE.toml")).text()
  const systemJobs = jobsFromToml(systemRaw, "system")

  let userJobs: Job[] = []
  if (existsSync(USER_CRON_PATH)) {
    try {
      const userRaw = await Bun.file(USER_CRON_PATH).text()
      userJobs = jobsFromToml(userRaw, "user")
    } catch (err) {
      log("error", "Failed to parse user cron file", { path: USER_CRON_PATH, error: String(err) })
    }
  }

  // Merge: user overrides system by name. Order: system first (in
  // PULSE.toml order), then user-only jobs (in USER file order).
  const userByName = new Map(userJobs.map((j) => [j.name, j]))
  const userOverrideNames = new Set<string>()
  const merged: Job[] = []

  for (const sys of systemJobs) {
    const override = userByName.get(sys.name)
    if (override) {
      userOverrideNames.add(sys.name)
      merged.push(override)
    } else {
      merged.push(sys)
    }
  }

  for (const usr of userJobs) {
    if (!userOverrideNames.has(usr.name)) merged.push(usr)
  }

  return { jobs: merged.map(checkSchedule) }
}

// Schedules are validated once, here, as the config is read — not on every
// scheduler tick. One bad expression disables exactly one job; the rest of
// the config keeps running. Silently dropping the job would be worse than the
// crash it replaces, so the reason, the job name and the expression are all
// logged, and the reason rides along on the job for the dashboard.
// public PR #1644, @elhoim
function checkSchedule(job: Job): Job {
  const problem = validateCron(job.schedule)
  if (!problem) return job

  log("error", `Disabling cron job ${job.name}: invalid schedule "${job.schedule}" — ${problem}`, {
    job: job.name,
    schedule: job.schedule,
    reason: problem,
    source: job._source,
    subsystem: "cron",
  })
  return { ...job, enabled: false, scheduleError: problem }
}

// ── Cron Matching (from Monitor/cron/scheduler.ts) ──
//
// The parser is total: every expression either produces fields or an Error
// naming what is wrong with it. It never spins. Two user typos used to take
// the whole daemon down instead of skipping one job (public PR #1644, @elhoim):
//
//   "0 9 * *"     — four fields. The throw escaped the scheduler loop into
//                   main().catch → process.exit(1), and the supervisors
//                   restart on a 30s throttle, so a typo became a crash cycle.
//   "*/0 * * * *" — zero step. `for (i = start; i <= end; i += 0)` never
//                   advanced while the values array grew without bound: event
//                   loop blocked, process OOM'd.
//
// Callers should prefer validateCron() at config-read time; matchesCron()
// still throws so a schedule that slipped through is loud rather than silent.

interface CronField {
  type: "any" | "values"
  values: number[]
}

interface CronFieldSpec {
  name: string
  min: number
  max: number
}

const CRON_FIELD_SPECS: CronFieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day-of-month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day-of-week", min: 0, max: 6 },
]

// An expression that enumerates every legal value of every field is ~356
// chars. The cap rejects pathological input (long comma-separated lists of
// ranges expand roughly 12x) and leaves anything a person would write alone.
const MAX_CRON_LENGTH = 512

// One comma-separated term: "*", "N", or "N-M", each optionally "/STEP".
// Anything else — names like MON, negative numbers, empty terms, stray
// characters — fails here rather than becoming a silent NaN that can never match.
const CRON_TERM = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/

function parseField(field: string, spec: CronFieldSpec): CronField {
  if (field === "*") return { type: "any", values: [] }

  const values: number[] = []

  for (const term of field.split(",")) {
    const matched = CRON_TERM.exec(term)
    if (!matched) throw new Error(`${spec.name} field: cannot parse "${term}"`)

    const [, base, stepStr] = matched
    const step = stepStr === undefined ? 1 : Number(stepStr)
    if (step < 1) throw new Error(`${spec.name} field: step must be 1 or more in "${term}"`)

    let start = spec.min
    let end = spec.max
    if (base !== "*") {
      const [from, to] = base.split("-").map(Number)
      start = from
      // A bare number with a step has always meant "from N to the end of the
      // field" here ("5/10" → 5, 15, 25, …); a bare number alone is just itself.
      if (to !== undefined) end = to
      else if (stepStr === undefined) end = from
    }

    if (start < spec.min || start > spec.max || end < spec.min || end > spec.max) {
      throw new Error(`${spec.name} field: "${term}" is outside ${spec.min}-${spec.max}`)
    }
    if (start > end) throw new Error(`${spec.name} field: range "${term}" starts after it ends`)

    for (let i = start; i <= end; i += step) values.push(i)
  }

  return { type: "values", values }
}

function parseCron(expression: string): CronField[] {
  if (typeof expression !== "string" || expression.trim() === "") {
    throw new Error("schedule is empty")
  }
  if (expression.length > MAX_CRON_LENGTH) {
    throw new Error(`too long (${expression.length} chars, limit ${MAX_CRON_LENGTH})`)
  }

  const parts = expression.trim().split(/\s+/)
  if (parts.length !== CRON_FIELD_SPECS.length) {
    throw new Error(
      `need 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}`,
    )
  }

  return CRON_FIELD_SPECS.map((spec, i) => parseField(parts[i], spec))
}

/**
 * Check an expression without evaluating it. Returns null when it is usable,
 * or a human-readable reason when it is not. Never throws, never loops — this
 * is the function config loading and any future job-editing API should use.
 */
export function validateCron(expression: string): string | null {
  try {
    parseCron(expression)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

export function matchesCron(expression: string, date: Date): boolean {
  let fields: CronField[]
  try {
    fields = parseCron(expression)
  } catch (err) {
    throw new Error(`Invalid cron "${expression}": ${err instanceof Error ? err.message : String(err)}`)
  }

  const actuals = [date.getMinutes(), date.getHours(), date.getDate(), date.getMonth() + 1, date.getDay()]

  return fields.every((f, i) => f.type === "any" || f.values.includes(actuals[i]))
}

/**
 * Most recent minute at/before `now` matching the schedule, bounded by
 * `lookbackMs`. Minute-resolution backward scan — cron fields are cheap to
 * test and the bound keeps the worst case (~10k iterations at 7 days) trivial.
 */
export function mostRecentOccurrence(schedule: string, now: Date, lookbackMs: number): number | null {
  const nowMinute = Math.floor(now.getTime() / 60_000) * 60_000
  const floorMs = now.getTime() - lookbackMs
  for (let t = nowMinute; t >= floorMs; t -= 60_000) {
    if (matchesCron(schedule, new Date(t))) return t
  }
  return null
}

/** How far back a missed calendar job is still worth catching up. */
const CATCHUP_LOOKBACK_MS = 7 * 24 * 60 * 60_000

export function isDue(schedule: string, now: Date, lastRun?: number): boolean {
  if (matchesCron(schedule, now)) {
    if (lastRun === undefined) return true
    // Don't run more than once per minute
    return Math.floor(now.getTime() / 60_000) > Math.floor(lastRun / 60_000)
  }
  // Catch-up (public issue #1513, @xmasyx): an exact-minute match misses every
  // calendar job whose scheduled minute passed while the machine was off or
  // asleep — on a laptop that sleeps overnight, nightly jobs silently never
  // run again. If the most recent scheduled occurrence falls after the last
  // run, the job was missed: run it now. No lastRun means no baseline to
  // detect a miss against (first boot) — exact-match only, so a fresh install
  // doesn't stampede every calendar job at once.
  if (lastRun === undefined) return false
  const occurrence = mostRecentOccurrence(schedule, now, CATCHUP_LOOKBACK_MS)
  return occurrence !== null && occurrence > lastRun
}

// ── State I/O (atomic write-to-tmp + rename) ──

export async function readState(path: string): Promise<DaemonState> {
  try {
    const file = Bun.file(path)
    if (await file.exists()) return await file.json() as DaemonState
  } catch {}
  return { version: 1, jobs: {}, startedAt: Date.now() }
}

export async function writeState(path: string, state: DaemonState): Promise<void> {
  const tmp = path + ".tmp"
  await Bun.write(tmp, JSON.stringify(state, null, 2))
  await rename(tmp, path)
}

// ── Logging ──

export function log(level: string, msg: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, msg, ...data }
  if (level === "error") {
    console.error(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

// ── Output Dispatch ──

export async function dispatch(output: string, target: OutputTarget | OutputTarget[], jobName: string): Promise<void> {
  const targets = Array.isArray(target) ? target : [target]
  await Promise.allSettled(targets.map((t) => dispatchSingle(output, t, jobName)))
}

async function dispatchSingle(output: string, target: OutputTarget, jobName: string): Promise<void> {
  const timeout = 10_000

  try {
    switch (target) {
      case "voice":
        await fetch(`${PULSE_BASE}/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: output.slice(0, 500) }),
          signal: AbortSignal.timeout(timeout),
        })
        break

      case "email": {
        const recipient = process.env.GMAIL_USER
        if (!recipient) {
          log("warn", "Email dispatch skipped: missing GMAIL_USER")
          return
        }
        const subject = `LifeOS Pulse: ${jobName}`
        // Fail loud when the Google Workspace CLI is absent (public issue #1537,
        // @anikinsasha): `gws` is not bundled with LifeOS, so without this guard
        // the spawn fails with an opaque ENOENT. Email output requires installing
        // and authenticating gws separately.
        const gwsPath = Bun.which("gws") ?? "/opt/homebrew/bin/gws"
        if (!(await Bun.file(gwsPath).exists())) {
          log("warn", `Email dispatch skipped for ${jobName}: 'gws' CLI not installed — the email output channel requires the Google Workspace CLI (install + auth it, or switch this job's output to log/ntfy/voice)`)
          return
        }
        const proc = Bun.spawn([gwsPath, "gmail", "+send", "--to", recipient, "--subject", subject, "--body", output.slice(0, 50_000)], {
          stdout: "pipe",
          stderr: "pipe",
          env: process.env,
        })
        // Deadline-raced drain (public issue #1546): same held-pipe hang class
        // as spawnScript/spawnClaude.
        await collectProc(proc, 30_000)
        break
      }

      case "ntfy": {
        const topic = process.env.NTFY_TOPIC
        if (!topic) {
          log("warn", "ntfy dispatch skipped: missing NTFY_TOPIC")
          return
        }
        await fetch(`https://ntfy.sh/${topic}`, {
          method: "POST",
          headers: { Title: `LifeOS: ${jobName}`, Priority: "3" },
          body: output.slice(0, 4096),
          signal: AbortSignal.timeout(timeout),
        })
        break
      }

      case "log":
        break
    }
  } catch (err) {
    log("error", `Dispatch to ${target} failed for ${jobName}`, { error: String(err) })
  }
}

// ── Sentinel Check ──

const SENTINELS = ["NO_ACTION", "NO_URGENT", "NO_EVENTS", "HEARTBEAT_OK"]

export function isSentinel(output: string): boolean {
  const trimmed = output.trim()
  return !trimmed || SENTINELS.includes(trimmed)
}

// ── Process Spawning ──

// Resolve bash absolutely so cron-spawned children don't hit ENOENT when the
// inherited PATH is sparse (observed on Linux when Pulse runs under a
// minimal-env service manager). /bin/bash is the POSIX fallback — present on
// macOS natively and on every mainstream Linux distro.
const BASH_PATH = Bun.which("bash") ?? "/bin/bash"

// Drain a child's pipes and await exit under a hard deadline (public issue
// #1546, @jacobo-ortiz). A bare `await new Response(proc.stdout).text()` after
// SIGTERM can hang forever: a grandchild that inherited the pipe keeps it open,
// or a SIGTERM-immune child never exits — and Pulse's sequential cron loop
// freezes with it. The race guarantees the await always resolves: SIGTERM at
// timeoutMs, SIGKILL at +10s, and a rejecting deadline at +20s that unblocks
// the loop even if a third process still holds the pipe.
type CollectedProc = { stdout: string; stderr: string; exitCode: number; timedOut: boolean }
export async function collectProc(
  proc: { stdout: ReadableStream<Uint8Array>; stderr: ReadableStream<Uint8Array>; exited: Promise<number>; kill: (sig?: number | NodeJS.Signals) => void },
  timeoutMs: number,
): Promise<CollectedProc> {
  let timedOut = false
  const termTimer = setTimeout(() => { timedOut = true; try { proc.kill("SIGTERM") } catch { /* already gone */ } }, timeoutMs)
  const killTimer = setTimeout(() => { try { proc.kill("SIGKILL") } catch { /* already gone */ } }, timeoutMs + 10_000)
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => reject(new Error(`pipe drain deadline exceeded (${timeoutMs + 20_000}ms) — a child or grandchild is holding stdout/stderr open`)), timeoutMs + 20_000)
  })
  try {
    const [stdout, stderr, exitCode] = await Promise.race([
      Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]),
      deadline,
    ])
    return { stdout, stderr, exitCode, timedOut }
  } finally {
    clearTimeout(termTimer); clearTimeout(killTimer); if (deadlineTimer) clearTimeout(deadlineTimer)
  }
}

export async function spawnScript(command: string, timeoutMs = 60_000): Promise<string> {
  const proc = Bun.spawn([BASH_PATH, "-c", command], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: join(process.env.HOME ?? "~", ".claude", "LIFEOS", "PULSE"),
    env: { ...process.env },
  })

  const { stdout, stderr, exitCode, timedOut } = await collectProc(proc, timeoutMs)

  if (timedOut) throw new Error(`Script timed out after ${timeoutMs}ms: ${stderr.slice(0, 200)}`)
  if (exitCode !== 0) throw new Error(`Script exited ${exitCode}: ${stderr.slice(0, 200)}`)

  return stdout.trim()
}

export async function spawnClaude(prompt: string, opts: { model: string; timeoutMs?: number }): Promise<string> {
  // BILLING: Use subscription via OAuth, NOT API key. Two requirements:
  //   1. Remove --bare flag — `--bare` forces ANTHROPIC_API_KEY auth and skips
  //      OAuth/keychain entirely. That was the root cause of the Apr 2026 Haiku
  //      $22.66 line item on the Anthropic invoice (heartbeat + tasks + memory
  //      consolidation all used --bare, all billed API).
  //   2. Strip ANTHROPIC_API_KEY from env — bun auto-loads ~/.claude/.env, and if the
  //      key is present `claude` CLI prefers it over subscription even without
  //      --bare. Mirrors LIFEOS/TOOLS/Inference.ts:114.
  // Flag set mirrors Inference.ts: --tools '' and --setting-sources '' keep the
  // subprocess lightweight (no hooks, no CLAUDE.md auto-discovery), so we still
  // get the cost-reduction benefit --bare was intended to provide.
  const args = [
    "--print",
    "--model", opts.model,
    "--tools", "",
    "--output-format", "text",
    "--setting-sources", "",
    "--system-prompt", "",
  ]
  const claudePath = Bun.which("claude") ?? join(process.env.HOME ?? "~", ".local", "bin", "claude")

  const env: Record<string, string> = { ...process.env, HOME: process.env.HOME ?? "" } as Record<string, string>
  // Strip BOTH keys — Anthropic's precedence chain ranks ANTHROPIC_API_KEY and
  // ANTHROPIC_AUTH_TOKEN above CLAUDE_CODE_OAUTH_TOKEN, so either one in env
  // silently overrides OAuth. Mirrors LIFEOS/TOOLS/Inference.ts:116-117.
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN

  const proc = Bun.spawn([claudePath, ...args], {
    stdin: new Blob([prompt]),
    stdout: "pipe",
    stderr: "pipe",
    env,
  })

  const timeoutMs = opts.timeoutMs ?? 300_000
  const { stdout: output, stderr, exitCode, timedOut } = await collectProc(proc, timeoutMs)

  if (timedOut) throw new Error(`claude timed out after ${timeoutMs}ms: ${stderr.slice(0, 200)}`)
  if (exitCode !== 0) {
    throw new Error(`claude exited ${exitCode}: ${stderr.slice(0, 200)}`)
  }

  return output.trim()
}
