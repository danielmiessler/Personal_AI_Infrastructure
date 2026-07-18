import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

// v7 layout: per-module state lives under LIFEOS/PULSE/state/<module>/, matching
// telegram.ts:71 and imessage.ts:66. The v6 original wrote a bare
// discord-bot-state.json into the ~/.claude root, which is both off-convention
// and the kind of stray root-level artifact tracked by issue #1530.
const STATE_DIR = join(homedir(), ".claude", "LIFEOS", "PULSE", "state", "discord");
const STATE_PATH = join(STATE_DIR, "state.json");

// The pre-v7 location. Installs upgrading from v6 still have their real state
// here; loadState() carries it across on first run (see migrateLegacyState).
const LEGACY_STATE_PATH = join(homedir(), ".claude", "discord-bot-state.json");

export interface DiscordBotState {
  lastMessageId: string | null;
  botUserId: string | null;
  pulseSessionId?: string | null;
}

/**
 * Path pair, injectable so the migration can be tested without touching a real
 * home directory. Production callers use the defaults.
 */
export interface StatePaths {
  statePath: string;
  legacyPath: string;
}

const DEFAULT_PATHS: StatePaths = { statePath: STATE_PATH, legacyPath: LEGACY_STATE_PATH };

const DEFAULT_STATE: DiscordBotState = {
  lastMessageId: null,
  botUserId: null,
  pulseSessionId: null,
};

function writeStateSync(path: string, state: DiscordBotState): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, path);
}

/**
 * Carry pre-v7 state across to the new location, once.
 *
 * Copy, not move: the legacy file is deliberately left on disk so a bad
 * migration is recoverable. Returns null when there is nothing to migrate, or
 * when the legacy file is unreadable or malformed — both of which are
 * non-fatal and fall through to default state rather than crashing startup.
 */
function migrateLegacyState(paths: StatePaths): DiscordBotState | null {
  if (!existsSync(paths.legacyPath)) return null;

  let migrated: DiscordBotState;
  try {
    migrated = { ...DEFAULT_STATE, ...JSON.parse(readFileSync(paths.legacyPath, "utf-8")) };
  } catch (err) {
    console.error(
      `[discord/state] Legacy state at ${paths.legacyPath} is unreadable or malformed; ` +
        "starting from default state and leaving it untouched:",
      err
    );
    return null;
  }

  try {
    writeStateSync(paths.statePath, migrated);
    // Logged once, only on the run that actually migrates — subsequent loads
    // take the existsSync(statePath) path above and never reach here.
    console.log(
      `[discord/state] Migrated bot state ${paths.legacyPath} → ${paths.statePath} ` +
        "(legacy file left in place)"
    );
  } catch (err) {
    // Migration is best-effort: if the new path can't be written we still run
    // with the recovered state rather than losing the bot's place.
    console.error(`[discord/state] Could not write migrated state to ${paths.statePath}:`, err);
  }

  return migrated;
}

export function loadState(paths: StatePaths = DEFAULT_PATHS): DiscordBotState {
  try {
    // Newer state always wins — the migration must never overwrite it.
    if (existsSync(paths.statePath)) {
      const text = readFileSync(paths.statePath, "utf-8");
      return { ...DEFAULT_STATE, ...JSON.parse(text) };
    }

    const migrated = migrateLegacyState(paths);
    if (migrated) return migrated;
  } catch (err) {
    console.error("[discord/state] Failed to load state, using defaults:", err);
  }
  return { ...DEFAULT_STATE };
}

export async function saveState(state: DiscordBotState): Promise<void> {
  const dir = dirname(STATE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = STATE_PATH + ".tmp";
  await Bun.write(tmpPath, JSON.stringify(state, null, 2));

  const fs = await import("fs/promises");
  await fs.rename(tmpPath, STATE_PATH);
}
