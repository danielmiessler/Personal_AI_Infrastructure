/**
 * Pulse provisioning must never destroy an existing install's config.
 *
 * Doctrine: LIFEOS/DOCUMENTATION/Testing/TestingDoctrine.md — parallel test/
 * tree mirroring the source path, zero external deps, no time waits.
 *
 * setup.ts resolves its install paths from HOME at module load, so HOME is
 * pointed at a temp dir before the dynamic import below. Nothing here spawns a
 * subprocess, so paiTestEnv is not in play.
 */

import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

const REAL_HOME = process.env.HOME
const FAKE_HOME = mkdtempSync(join(tmpdir(), "lifeos-pulse-setup-"))
process.env.HOME = FAKE_HOME

const CLAUDE_DIR = join(FAKE_HOME, ".claude")
const PULSE_DIR = join(CLAUDE_DIR, "LIFEOS", "PULSE")
const PULSE_TOML = join(PULSE_DIR, "PULSE.toml")
const ENV_FILE = join(CLAUDE_DIR, ".env")

const { backupPathFor, generateConfigs, writeConfigPreserving } = await import(
  "../../LIFEOS/PULSE/setup.ts"
)

/** A live daemon config, of the shape Pulse actually runs on. */
const LIVE_CONFIG = `# LifeOS Pulse — Unified Daemon Configuration

[voice]
enabled = true

[telegram]
enabled = true

[observability.server]
port = 31337
enabled = true

[da]
heartbeat = "*/15 * * * *"
cost_ceiling_usd = 12.5

[[job]]
name = "evening-diary"
schedule = "0 21 * * *"
type = "claude"
enabled = true
`

function setupOpts(overrides: Record<string, unknown> = {}) {
  return {
    name: "echo",
    description: "research specialist",
    appId: "111111",
    installationId: "222222",
    privateKeyPath: join(FAKE_HOME, "key.pem"),
    repos: ["your-org/your-repo"],
    botToken: "",
    chatId: "",
    specialization: ["research"],
    ...overrides,
  }
}

function backupsOf(path: string): string[] {
  const dir = join(path, "..")
  const base = path.split("/").pop()!
  return readdirSync(dir).filter((f) => f.startsWith(`${base}.backup-`))
}

beforeEach(() => {
  rmSync(CLAUDE_DIR, { recursive: true, force: true })
  mkdirSync(PULSE_DIR, { recursive: true })
})

afterAll(() => {
  rmSync(FAKE_HOME, { recursive: true, force: true })
  if (REAL_HOME === undefined) delete process.env.HOME
  else process.env.HOME = REAL_HOME
})

describe("writeConfigPreserving", () => {
  test("creates the file when it is absent", async () => {
    const path = join(PULSE_DIR, "absent.toml")

    const result = await writeConfigPreserving(path, "new = true\n")

    expect(result.outcome).toBe("created")
    expect(result.backupPath).toBeUndefined()
    expect(readFileSync(path, "utf8")).toBe("new = true\n")
  })

  test("leaves an existing file untouched and takes no backup", async () => {
    const path = join(PULSE_DIR, "present.toml")
    writeFileSync(path, LIVE_CONFIG)

    const result = await writeConfigPreserving(path, "clobbered = true\n")

    expect(result.outcome).toBe("preserved")
    expect(readFileSync(path, "utf8")).toBe(LIVE_CONFIG)
    expect(backupsOf(path)).toEqual([])
  })

  test("force announces and backs up before anything on disk changes", async () => {
    const path = join(PULSE_DIR, "present.toml")
    writeFileSync(path, LIVE_CONFIG)
    const seen: Array<{ contentAtAnnounce: string; backupExistedYet: boolean }> = []

    const result = await writeConfigPreserving(path, "replaced = true\n", {
      force: true,
      onOverwrite: ({ backupPath }) => {
        seen.push({
          contentAtAnnounce: readFileSync(path, "utf8"),
          backupExistedYet: existsSync(backupPath),
        })
      },
    })

    expect(seen).toEqual([{ contentAtAnnounce: LIVE_CONFIG, backupExistedYet: false }])
    expect(result.outcome).toBe("overwritten")
    expect(readFileSync(path, "utf8")).toBe("replaced = true\n")
    expect(readFileSync(result.backupPath!, "utf8")).toBe(LIVE_CONFIG)
  })

  test("backup path is the target plus a sortable timestamp", () => {
    const path = join(PULSE_DIR, "PULSE.toml")

    const backup = backupPathFor(path, new Date("2026-01-02T03:04:05.678Z"))

    expect(backup).toBe(`${path}.backup-2026-01-02T03-04-05-678Z`)
  })
})

describe("generateConfigs", () => {
  test("writes a starter config on a fresh install", async () => {
    await generateConfigs(setupOpts())

    const written = readFileSync(PULSE_TOML, "utf8")
    expect(written).toContain(`name = "echo"`)
    expect(written).toContain(`[[job]]`)
    expect(backupsOf(PULSE_TOML)).toEqual([])
  })

  test("preserves an existing config with every value intact", async () => {
    writeFileSync(PULSE_TOML, LIVE_CONFIG)

    await generateConfigs(setupOpts())

    expect(readFileSync(PULSE_TOML, "utf8")).toBe(LIVE_CONFIG)
    expect(backupsOf(PULSE_TOML)).toEqual([])
  })

  test("Anti: provisioning does not replace a live config with the worker template", async () => {
    writeFileSync(PULSE_TOML, LIVE_CONFIG)

    await generateConfigs(setupOpts())

    const onDisk = readFileSync(PULSE_TOML, "utf8")
    expect(onDisk).toContain("port = 31337")
    expect(onDisk).toContain("cost_ceiling_usd = 12.5")
    expect(onDisk).toContain("evening-diary")
    expect(onDisk).not.toContain("[worker]")
    expect(onDisk).not.toContain("github-work")
  })

  test("force replaces the config, but only after backing it up", async () => {
    writeFileSync(PULSE_TOML, LIVE_CONFIG)

    await generateConfigs(setupOpts({ force: true }))

    expect(readFileSync(PULSE_TOML, "utf8")).toContain("[worker]")
    const backups = backupsOf(PULSE_TOML)
    expect(backups).toHaveLength(1)
    expect(readFileSync(join(PULSE_DIR, backups[0]!), "utf8")).toBe(LIVE_CONFIG)
  })

  test("appends to an existing .env rather than replacing it", async () => {
    writeFileSync(ENV_FILE, "ELEVENLABS_API_KEY=keep-me\n")

    await generateConfigs(setupOpts())

    const env = readFileSync(ENV_FILE, "utf8")
    expect(env).toContain("ELEVENLABS_API_KEY=keep-me")
    expect(env).toContain("GITHUB_APP_ID=111111")
  })
})
