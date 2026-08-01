#!/usr/bin/env bun
/**
 * @version 1.0.1
 * AtlasEventCapture.hook.ts — mutation hints for the Atlas asset graph.
 *
 * TRIGGER: PostToolUse (Bash, Write, Edit, MultiEdit)
 *
 * When a tool call mutates something Atlas tracks (a deploy, a DNS change, an edit
 * to a registry file), append a HINT to the Atlas events file. Hints never write
 * graph facts — `atlas tick` (launchd, WatchPaths on the events file) runs a
 * targeted re-collect of the hinted source, and the collector re-pulls truth from
 * the source of authority. A missed or malformed hint costs nothing: hourly full
 * reconciliation heals everything. (Atlas doctrine: hint, never fact.)
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ATLAS_DIR = join(homedir(), ".local/state/lifeos/atlas");
const EVENTS_PATH = join(ATLAS_DIR, "events.jsonl");

let input: { tool_name?: string; tool_input?: { command?: string; file_path?: string } };
try {
  input = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  process.exit(0);
}

const tool = input.tool_name ?? "";
const cmd = input.tool_input?.command ?? "";
const filePath = input.tool_input?.file_path ?? "";

/** (source, matcher) pairs — first match wins per category, multiple sources can fire. */
const sources = new Set<string>();

if (tool === "Bash") {
  if (/wrangler(@\S+)?\s+(deploy|delete|pages\s+deploy)|deploy\.sh|CfEnv\.ts\s+deploy/.test(cmd)) sources.add("cloudflare");
  if (/\bdns_records\b|zones\/.*\/dns/.test(cmd)) sources.add("cloudflare");
  if (/\bgh\s+repo\s+(create|delete|rename|archive)/.test(cmd)) sources.add("github");
  if (/launchctl\s+(load|unload|bootstrap|bootout)/.test(cmd)) sources.add("launchd");
} else if (["Write", "Edit", "MultiEdit"].includes(tool)) {
  if (/\/PROJECTS\.md$/.test(filePath)) sources.add("projects");
  if (/\/GEAR\.md$/.test(filePath)) sources.add("gear");
  if (/infra-inventory\.ts$/.test(filePath)) sources.add("infra-inventory");
  if (/Library\/LaunchAgents\/com\.(lifeos|pai)\./.test(filePath)) sources.add("launchd");
}

if (sources.size > 0) {
  try {
    mkdirSync(ATLAS_DIR, { recursive: true });
    const ts = new Date().toISOString();
    for (const source of sources) {
      appendFileSync(EVENTS_PATH, `${JSON.stringify({ ts, source, tool })}\n`);
    }
  } catch {
    // Never block the tool call over a hint. Reconciliation heals.
  }
}
process.exit(0);
