import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

// v7 layout: per-module state lives under LIFEOS/PULSE/state/<module>/, matching
// telegram.ts:71 and imessage.ts:66. The v6 original wrote a bare
// discord-bot-state.json into the ~/.claude root, which is both off-convention
// and the kind of stray root-level artifact tracked by issue #1530.
const STATE_DIR = join(homedir(), ".claude", "LIFEOS", "PULSE", "state", "discord");
const STATE_PATH = join(STATE_DIR, "state.json");

export interface DiscordBotState {
  lastMessageId: string | null;
  botUserId: string | null;
  pulseSessionId?: string | null;
}

const DEFAULT_STATE: DiscordBotState = {
  lastMessageId: null,
  botUserId: null,
  pulseSessionId: null,
};

export function loadState(): DiscordBotState {
  try {
    if (existsSync(STATE_PATH)) {
      const text = readFileSync(STATE_PATH, "utf-8");
      return { ...DEFAULT_STATE, ...JSON.parse(text) };
    }
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
