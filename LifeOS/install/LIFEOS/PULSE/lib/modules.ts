// ── Module registry ──
// ported from public PR #1748, @elhoim
//
// Every Pulse surface a human can switch off, and the default it ships with.
// Infrastructure the daemon needs in order to serve anything at all —
// observability (the dashboard itself), hooks, tab-freshness, menubar, siri,
// doctor — is deliberately absent: those are not modules you use, they are how
// Pulse runs, and a "disabled" one would leave a dashboard that cannot render.
//
// Keys are the tab/module name. `resolveModules()` layers these defaults, then
// the system PULSE.toml, then the user PULSE.user.toml (which wins) — and
// within each tier, the legacy per-section `[x].enabled` flags first, then the
// `[modules]` table. Existing installs keep working untouched.
//
// Every default below is the value the pre-[modules] code actually produced for
// a config with no such section, so an unchanged PULSE.toml resolves to exactly
// the module set it loaded before. That is why `imessage`, `syslog` and `da`
// are false: their old gates were truthy checks (`config.x?.enabled`) over a
// `{ enabled: false }` fallback, unlike everything else, whose gates were
// `!== false`.
export const MODULE_DEFAULTS: Record<string, boolean> = {
  telos: true, work: true, content: true, health: true, finances: true,
  business: true, growth: true, local: true, gear: true, atlas: true,
  memory: true, synapse: true, books: true, conduit: true, projects: true,
  ledger: true, upgrades: true, hypotheses: true, usage: true,
  performance: true, bunker: true, algorithm: true, evals: true,
  threatmodel: true, hermes: true, docs: true, voice: true,
  imessage: false, syslog: false, da: false,
}

// Legacy `[section].enabled` flags that predate the `[modules]` table, mapped to
// their module key. Honouring these is what keeps a pre-existing PULSE.toml
// working after an upgrade — notably `[local_intelligence]`, `[hypotheses]` and
// `[upgrades]`, whose flags were read by loadModules() but never plumbed
// through loadPulseConfig(), so setting any of them to false silently did
// nothing.
export const LEGACY_SECTION_KEYS: Record<string, string> = {
  local_intelligence: "local", hypotheses: "hypotheses", upgrades: "upgrades",
  telos: "telos", work: "work", content: "content", bunker: "bunker",
  performance: "performance", syslog: "syslog", voice: "voice",
  imessage: "imessage", da: "da",
}

// One config tier's worth of overrides: legacy `[section].enabled` flags first,
// then the `[modules]` table (which wins within the tier).
function applyTier(modules: Record<string, boolean>, parsed: Record<string, unknown>): void {
  for (const [section, key] of Object.entries(LEGACY_SECTION_KEYS)) {
    const enabled = (parsed[section] as { enabled?: boolean } | undefined)?.enabled
    if (typeof enabled === "boolean") modules[key] = enabled
  }
  const table = parsed.modules as Record<string, unknown> | undefined
  if (table) {
    for (const [key, value] of Object.entries(table)) {
      if (typeof value === "boolean") modules[key] = value
    }
  }
}

/**
 * Merge defaults ← system tier ← user tier into one map. Within each tier the
 * legacy section flags apply first, then that tier's `[modules]` table.
 *
 * The user tier (LIFEOS/USER/CONFIG/PULSE.user.toml, release-stripped) is where
 * machine-specific module choices live — the shipped PULSE.toml stays generic.
 * With no user file (`userParsed` absent) this resolves exactly as the old
 * single-argument form did, so fresh installs are byte-for-byte unchanged.
 */
export function resolveModules(
  systemParsed: Record<string, unknown>,
  userParsed?: Record<string, unknown>,
): Record<string, boolean> {
  const modules = { ...MODULE_DEFAULTS }
  applyTier(modules, systemParsed)
  if (userParsed) applyTier(modules, userParsed)
  return modules
}
