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

// ── Types ──

export type OutputTarget = "voice" | "telegram" | "ntfy" | "email" | "log"

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

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g, (_, name) => process.env[name] ?? "")
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
  const parsed = parse(raw) as { job?: Array<Record<string, unknown>> }
  return (parsed.job ?? []).map((j) => ({
    name: j.name as string,
    schedule: j.schedule as string,
    type: (j.type as "script" | "claude") ?? "script",
    command: j.command ? resolveEnvVars(j.command as string) : undefined,
    prompt: j.prompt as string | undefined,
    model: (j.model as string) ?? modelForEffort('medium'),
    output: (j.output ?? "log") as OutputTarget | OutputTarget[],
    enabled: (j.enabled as boolean) ?? true,
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
// the whole daemon down instead of skipping one job:
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

export function isDue(schedule: string, now: Date, lastRun?: number): boolean {
  if (!matchesCron(schedule, now)) return false
  if (lastRun === undefined) return true
  // Don't run more than once per minute
  return Math.floor(now.getTime() / 60_000) > Math.floor(lastRun / 60_000)
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
        await fetch("http://localhost:31337/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: output.slice(0, 500) }),
          signal: AbortSignal.timeout(timeout),
        })
        break

      case "telegram": {
        const token = process.env.TELEGRAM_BOT_TOKEN
        const chatId = process.env.TELEGRAM_PRINCIPAL_CHAT_ID
        if (!token || !chatId) {
          log("warn", "Telegram dispatch skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_PRINCIPAL_CHAT_ID")
          return
        }
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: output.slice(0, 4096), parse_mode: "Markdown" }),
          signal: AbortSignal.timeout(timeout),
        })
        break
      }

      case "email": {
        const recipient = process.env.GMAIL_USER
        if (!recipient) {
          log("warn", "Email dispatch skipped: missing GMAIL_USER")
          return
        }
        const subject = `LifeOS Pulse: ${jobName}`
        const gwsPath = Bun.which("gws") ?? "/opt/homebrew/bin/gws"
        const proc = Bun.spawn([gwsPath, "gmail", "+send", "--to", recipient, "--subject", subject, "--body", output.slice(0, 50_000)], {
          stdout: "pipe",
          stderr: "pipe",
          env: process.env,
        })
        const timer = setTimeout(() => proc.kill("SIGTERM"), 30_000)
        await proc.exited
        clearTimeout(timer)
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

export async function spawnScript(command: string, timeoutMs = 60_000): Promise<string> {
  const proc = Bun.spawn([BASH_PATH, "-c", command], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: join(process.env.HOME ?? "~", ".claude", "LIFEOS", "PULSE"),
    env: { ...process.env },
  })

  const timer = setTimeout(() => proc.kill("SIGTERM"), timeoutMs)
  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  clearTimeout(timer)

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`Script exited ${exitCode}: ${stderr.slice(0, 200)}`)
  }

  return output.trim()
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
  const timer = setTimeout(() => proc.kill("SIGTERM"), timeoutMs)
  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  clearTimeout(timer)

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`claude exited ${exitCode}: ${stderr.slice(0, 200)}`)
  }

  return output.trim()
}
