/**
 * LifeOS Pulse — Discord Module
 *
 * Supervised Discord interface matching the Telegram module pattern.
 * REST polling → command routing → Claude Agent SDK (same query() call as telegram.ts).
 * Crash isolation via Pulse supervise().
 *
 * Config lives in PULSE.toml [discord] — the interactive bot. This is a
 * different concern from [notifications.discord], which configures a one-way
 * outbound webhook for notification routing.
 *
 * bot_token is expected to be "${DISCORD_BOT_TOKEN}" in the config; lib.ts
 * parseConfigToml() expands it from the environment at load time, so no
 * credential is ever written to the file.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { join } from "path";
import {
  fetchMessages,
  sendMessage,
  addReaction,
  sendTyping,
  type DiscordMessage,
} from "./rest";
import { parseCommand, isCommand } from "./router";
import { askOllama, listModels, formatModelList } from "./ollama";
import { loadState, saveState, type DiscordBotState } from "./state";

// ── Billing guard — inherited from Pulse env, strip independently for safety ──
delete process.env.ANTHROPIC_API_KEY;

const HOME = process.env.HOME ?? "";
const CWD = join(HOME, ".claude");

// ── Module-level state ──
let running = false;
let lastSessionId: string | undefined;
let startedAt: Date | null = null;
let lastError: string | null = null;
let messagesHandled = 0;
let config: DiscordConfig | null = null;

export interface DiscordConfig {
  enabled: boolean;
  bot_token: string;
  channel_id: string;
  poll_interval_ms?: number;
  max_turns?: number;
  sdk_timeout_ms?: number;
  ollama_url?: string;
  ollama_model?: string;
  [key: string]: unknown;
}

// ── SDK: ask DA via Claude Agent SDK ──

interface PulseResponse {
  text: string;
  sessionId?: string;
  durationMs: number;
  numTurns?: number;
  costUsd?: number;
}

async function askDA(
  prompt: string,
  userId: string,
  username: string,
  cfg: DiscordConfig
): Promise<PulseResponse> {
  const startTime = Date.now();
  const maxTurns = cfg.max_turns ?? 25;
  const timeoutMs = cfg.sdk_timeout_ms ?? 120_000;

  const sdkOptions: Record<string, unknown> = {
    cwd: CWD,
    tools: { type: "preset", preset: "claude_code" },
    settingSources: ["user", "project"],
    maxTurns,
    includePartialMessages: true,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: `\n\n## DISCORD MODE OVERRIDE (highest priority — overrides CLAUDE.md format rules)

You are {{DA_NAME}}, responding via Discord. {{PRINCIPAL_NAME}} is messaging you from Discord.

CRITICAL RULES FOR DISCORD MODE:
- IGNORE all ALGORITHM/NATIVE/MINIMAL format templates from CLAUDE.md. Those are for terminal sessions only.
- NO format headers (no ════, no 🗒️, no ━━━, no ISC criteria, no phase markers)
- NO emoji prefixes, NO bullet formatting
- Speak as {{DA_NAME}} — first person, natural, conversational, like talking to a friend
- Keep responses under 300 words (Discord has more space than Telegram)
- Use code blocks when showing code, but keep them minimal
- NEVER use voice notification curls (no http://localhost:31337/notify calls)
- You have ALL PAI capabilities — skills, email, calendar, lights, everything
- When doing tasks, do them and confirm briefly what you did
- Platform: Discord | User: ${username} (${userId})`,
    },
  };

  if (lastSessionId) sdkOptions.resume = lastSessionId;

  const conversation = query({ prompt, options: sdkOptions as any });

  let fullText = "";
  let numTurns: number | undefined;
  let costUsd: number | undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for await (const message of conversation) {
      if (controller.signal.aborted) break;

      const msg = message as any;

      if (msg.type === "system" && msg.subtype === "init" && msg.session_id) {
        lastSessionId = msg.session_id;
        console.log(`[discord] Session initialized: ${lastSessionId}`);
      }

      if (
        msg.type === "stream_event" &&
        msg.event?.type === "content_block_delta" &&
        msg.event?.delta?.type === "text_delta" &&
        msg.event.delta.text
      ) {
        fullText += msg.event.delta.text;
      }

      if (msg.type === "assistant" && Array.isArray(msg.message?.content)) {
        for (const block of msg.message.content) {
          if (block.type === "text" && block.text && !fullText) {
            fullText = block.text;
          }
        }
      }

      if (msg.type === "result") {
        if (msg.subtype === "success" && msg.result) fullText = msg.result;
        if (msg.session_id) lastSessionId = msg.session_id;
        numTurns = msg.num_turns;
        costUsd = msg.total_cost_usd;
        console.log(
          `[discord] Response complete: ${Date.now() - startTime}ms, ${numTurns} turns, $${costUsd?.toFixed(4) ?? "0.0000"}`
        );
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  if (!fullText) fullText = "Sorry, I wasn't able to generate a response. Try again?";

  return { text: fullText, sessionId: lastSessionId, durationMs: Date.now() - startTime, numTurns, costUsd };
}

// ── Message processing ──

function shouldRespond(msg: DiscordMessage, state: DiscordBotState): boolean {
  if (msg.author.bot) return false;
  if (state.botUserId && msg.mentions.some((m) => m.id === state.botUserId)) return true;
  if (isCommand(msg.content)) return true;
  return false;
}

function extractPrompt(msg: DiscordMessage, state: DiscordBotState): string {
  let content = msg.content;
  if (state.botUserId) {
    content = content.replace(new RegExp(`<@!?${state.botUserId}>`, "g"), "").trim();
  }
  return content;
}

async function processMessage(
  msg: DiscordMessage,
  state: DiscordBotState,
  cfg: DiscordConfig
): Promise<void> {
  const token = cfg.bot_token;
  const channelId = cfg.channel_id;
  const ollamaUrl = cfg.ollama_url ?? "http://localhost:11434";
  const ollamaModel = cfg.ollama_model ?? "qwen3-coder-next";

  console.log(`[discord] Processing ${msg.id} from ${msg.author.username}: ${msg.content.slice(0, 80)}`);

  await sendTyping(token, channelId);
  const typingInterval = setInterval(() => {
    sendTyping(token, channelId).catch(() => {});
  }, 8_000);

  try {
    const cmd = parseCommand(msg.content);

    if (cmd?.backend === "clear") {
      clearInterval(typingInterval);
      lastSessionId = undefined;
      state.pulseSessionId = null;
      await sendMessage(token, channelId, "Conversation session cleared.");
      await addReaction(token, channelId, msg.id);
      return;
    }

    if (cmd?.backend === "models") {
      clearInterval(typingInterval);
      const models = await listModels(ollamaUrl);
      await sendMessage(token, channelId, formatModelList(models));
      await addReaction(token, channelId, msg.id);
      return;
    }

    if (cmd?.backend === "ollama") {
      const response = await askOllama(ollamaUrl, ollamaModel, [], cmd.model);
      clearInterval(typingInterval);
      await sendMessage(token, channelId, `**[${response.model}]**\n${response.output}`);
      await addReaction(token, channelId, msg.id);
      console.log(`[discord] Ollama (${response.model}) responded (${response.durationMs}ms)`);
      return;
    }

    const prompt = cmd?.backend === "claude" ? cmd.prompt : extractPrompt(msg, state);
    const response = await askDA(prompt, msg.author.id, msg.author.username, cfg);
    clearInterval(typingInterval);

    state.pulseSessionId = response.sessionId ?? state.pulseSessionId;
    messagesHandled++;

    await sendMessage(token, channelId, response.text);
    await addReaction(token, channelId, msg.id);
    console.log(`[discord] DA responded (${response.durationMs}ms, ${response.numTurns} turns)`);
  } catch (err) {
    clearInterval(typingInterval);
    const errMsg = err instanceof Error ? err.message : String(err);
    lastError = errMsg;
    console.log(`[discord] CATCH BLOCK FIRED for ${msg.id}: ${errMsg}`);
    console.error(`[discord] Error processing ${msg.id}:`, err);
    await sendMessage(
      cfg.bot_token,
      cfg.channel_id,
      "Sorry, I encountered an error processing that request."
    ).catch(() => {});
  }
}

// ── Module lifecycle ──

export async function startDiscord(cfg: DiscordConfig): Promise<void> {
  // Fail loudly on a missing credential. An unresolved "${DISCORD_BOT_TOKEN}"
  // expands to "" (parseConfigToml semantics), and an empty token would
  // otherwise be sent as `Authorization: Bot ` — Discord answers 401 on every
  // poll forever, with the only trace being generic poll-error spam. Refusing
  // to start makes the misconfiguration self-evident and mirrors the
  // "dispatch skipped: missing TELEGRAM_BOT_TOKEN" pattern in lib.ts.
  if (!cfg.bot_token) {
    lastError = "missing bot_token — set DISCORD_BOT_TOKEN in the environment";
    console.error(
      "[discord] Not starting: bot_token is empty. PULSE.toml [discord].bot_token " +
        'is "${DISCORD_BOT_TOKEN}" and that variable is unset in Pulse\'s environment.'
    );
    return;
  }

  if (!cfg.channel_id) {
    lastError = "missing channel_id";
    console.error("[discord] Not starting: PULSE.toml [discord].channel_id is empty.");
    return;
  }

  config = cfg;
  running = true;
  startedAt = new Date();

  const pollInterval = cfg.poll_interval_ms ?? 5_000;

  console.log(`[discord] Starting (channel: ${cfg.channel_id}, poll: ${pollInterval}ms)`);

  const state = loadState();
  if (state.pulseSessionId) {
    lastSessionId = state.pulseSessionId;
    console.log(`[discord] Session restored: ${lastSessionId}`);
  }

  while (running) {
    try {
      const messages = await fetchMessages(cfg.bot_token, cfg.channel_id, state.lastMessageId);

      if (messages.length > 0) {
        console.log(`[discord] Fetched ${messages.length} new message(s)`);

        for (const msg of messages) {
          if (shouldRespond(msg, state)) {
            await processMessage(msg, state, cfg);
          }
          state.lastMessageId = msg.id;
        }

        await saveState(state);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      lastError = errMsg;
      console.error("[discord] Poll error:", err);
    }

    await Bun.sleep(pollInterval);
  }

  console.log("[discord] Module stopped");
}

export function stopDiscord(): void {
  console.log("[discord] Stopping...");
  running = false;
}

export function discordHealth(): Record<string, unknown> {
  const cfg = config;
  return {
    status: running ? "running" : "stopped",
    startedAt: startedAt?.toISOString() ?? null,
    channel: cfg?.channel_id ?? null,
    session: lastSessionId ? "active" : "none",
    messagesHandled,
    lastError,
  };
}

// ── HTTP handler: /api/discord/send ──

export async function handleRequest(path: string, body: unknown): Promise<Response> {
  if (path === "/send" || path === "") {
    if (!config || !running) {
      return new Response(JSON.stringify({ error: "Discord module not running" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = body as { channelId?: string; message?: string };
    const channelId = payload.channelId ?? config.channel_id;
    const message = payload.message;

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await sendMessage(config.bot_token, channelId, message);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
