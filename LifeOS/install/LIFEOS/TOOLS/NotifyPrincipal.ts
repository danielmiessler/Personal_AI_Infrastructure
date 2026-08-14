#!/usr/bin/env bun
/**
 * NotifyPrincipal — send a short SMS to the PRINCIPAL, and no one else, ever.
 *
 * The destination is not a parameter. It is read from `TWILIO_TO_NUMBER` in the
 * install's env file, in-process, and there is no flag, argument, or env
 * override in this tool's interface that changes it. That property is the
 * point: any caller — including an agent session that has read untrusted
 * content — can at worst deliver a message to the principal himself, which is
 * reporting, not exfiltration. This is what makes the tool safe to invoke from
 * a Hermes sidecar session where arbitrary-destination senders are refused.
 *
 * Credentials are read and used in this process's memory and never echoed;
 * the command line that invokes this tool carries no secret and no path to one.
 *
 * Usage:
 *   bun LIFEOS/TOOLS/NotifyPrincipal.ts "build finished, all tests green"
 *   bun LIFEOS/TOOLS/NotifyPrincipal.ts --type error "gateway down"
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const ENV_FILE = join(CLAUDE_DIR, ".env");
const LOG_DIR = join(CLAUDE_DIR, "LIFEOS", "MEMORY", "OBSERVABILITY");
const LOG_FILE = join(LOG_DIR, "notify-principal.jsonl");
const MAX_CHARS = 320; // two SMS segments

const TYPES: Record<string, string> = {
  success: "✅",
  warning: "⚠️",
  error: "🚨",
  info: "ℹ️",
  update: "🔄",
  security: "🔐",
};

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_FILE)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  let type = "info";
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--type") {
      type = argv[++i] ?? "info";
    } else {
      words.push(argv[i]!);
    }
  }
  const message = words.join(" ").trim();
  if (!message) {
    console.error("usage: NotifyPrincipal.ts [--type success|warning|error|info|update|security] <message>");
    return 2;
  }

  const env = loadEnv();
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const to = env.TWILIO_TO_NUMBER; // the principal. Not overridable by design.
  if (!sid || !token || !to) {
    console.error("❌ Twilio env incomplete (need TWILIO_ACCOUNT_SID/AUTH_TOKEN/TO_NUMBER)");
    return 1;
  }
  const auth = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;

  // FROM is the account's own number, discovered from Twilio when the env
  // doesn't name one — installs routinely lack TWILIO_FROM_NUMBER and every
  // sender that hard-required it failed silently.
  let from = env.TWILIO_FROM_NUMBER ?? "";
  if (!from) {
    const nums = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PageSize=1`,
      { headers: { Authorization: auth } },
    );
    const list = (await nums.json().catch(() => ({}))) as {
      incoming_phone_numbers?: Array<{ phone_number?: string }>;
    };
    from = list.incoming_phone_numbers?.[0]?.phone_number ?? "";
  }
  if (!from) {
    console.error("❌ no Twilio sending number: set TWILIO_FROM_NUMBER or provision a number on the account");
    return 1;
  }

  const emoji = TYPES[type] ?? TYPES.info;
  let body = `${emoji} ${message}`;
  if (body.length > MAX_CHARS) body = `${body.slice(0, MAX_CHARS - 1)}…`;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };

  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(
      LOG_FILE,
      JSON.stringify({
        ts: new Date().toISOString(),
        type,
        chars: body.length,
        ok: Boolean(json.sid),
        sid: json.sid ?? null,
        error: json.sid ? null : (json.message ?? `http ${res.status}`),
      }) + "\n",
    );
  } catch {
    /* the send matters more than the log line */
  }

  if (json.sid) {
    console.log(`✅ sent to principal — ${json.sid}`);
    return 0;
  }
  console.error(`❌ send failed: ${json.message ?? `http ${res.status}`}`);
  return 1;
}

process.exit(await main());
