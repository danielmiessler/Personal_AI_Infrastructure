// ── Module registry ──
// Every Pulse surface a human can switch off, and the default they ship with.
// Infrastructure the daemon needs in order to serve anything at all —
// observability (the dashboard itself), hooks, tab-freshness, menubar, siri,
// doctor — is deliberately absent: those are not modules you use, they are how
// Pulse runs, and a "disabled" one would leave a dashboard that cannot render.
//
// Keys are the tab/module name. `resolveModules()` layers three sources so
// existing installs keep working untouched: these defaults, then the legacy
// per-section `[x].enabled` flags, then the `[modules]` table (which wins).
export const MODULE_DEFAULTS: Record<string, boolean> = {
  telos: true, work: true, content: true, health: true, finances: true,
  business: true, growth: true, local: true, gear: true, atlas: true,
  memory: true, synapse: true, books: true, conduit: true, projects: true,
  ledger: true, upgrades: true, hypotheses: true, usage: true,
  performance: true, bunker: true, algorithm: true, evals: true,
  threatmodel: true, hermes: true, docs: true,
  voice: true, imessage: false, syslog: false, da: true,
}

// Legacy `[section].enabled` flags that predate the `[modules]` table, mapped to
// their module key. Honouring these is what keeps a pre-existing PULSE.toml
// working after an upgrade — notably `[local_intelligence]`, whose flag was
// read by loadModules() but never plumbed through loadPulseConfig(), so setting
// it to false silently did nothing.
const LEGACY_SECTION_KEYS: Record<string, string> = {
  local_intelligence: "local", hypotheses: "hypotheses", upgrades: "upgrades",
  telos: "telos", work: "work", content: "content", bunker: "bunker",
  performance: "performance", syslog: "syslog", voice: "voice",
  imessage: "imessage", da: "da",
}

/** Merge defaults ← legacy section flags ← `[modules]` table into one map. */
export function resolveModules(parsed: Record<string, unknown>): Record<string, boolean> {
  const modules = { ...MODULE_DEFAULTS }
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
  return modules
}
