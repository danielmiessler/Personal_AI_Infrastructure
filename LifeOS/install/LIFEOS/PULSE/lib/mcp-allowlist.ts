/**
 * Deliberate, default-deny MCP loading for remote DA surfaces (public issue
 * #1553, @MatiasBarboza).
 *
 * The SDK's `settingSources` option does NOT cover MCP config — an SDK session
 * gets zero MCP servers unless `mcpServers` is passed explicitly, so remote
 * channels (iMessage, Siri) silently lost every MCP-backed capability and the
 * model confabulated plausible-but-wrong explanations for the failures.
 *
 * The fix is deliberately NOT "load everything": remote channels process
 * externally influenced text, so granting the full desktop MCP set would widen
 * the prompt-injection blast radius. Default remains zero servers; each server
 * is opted in by name via LIFEOS_REMOTE_MCP_ALLOWLIST (comma-separated names
 * matching ~/.claude.json `mcpServers` keys). What changes unconditionally is
 * honesty: the channel prompt now states exactly which MCP servers are loaded,
 * so the model reports "unavailable on this surface" instead of inventing a
 * cause.
 */

import { readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

export function loadRemoteMcpServers(): Record<string, unknown> {
  const allow = (process.env.LIFEOS_REMOTE_MCP_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (allow.length === 0) return {}
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".claude.json"), "utf8")) as {
      mcpServers?: Record<string, unknown>
    }
    const all = cfg?.mcpServers ?? {}
    return Object.fromEntries(Object.entries(all).filter(([name]) => allow.includes(name)))
  } catch {
    return {}
  }
}

export function mcpStatusPromptLine(loadedNames: string[]): string {
  return loadedNames.length > 0
    ? `MCP servers loaded on this channel: ${loadedNames.join(", ")}. Any OTHER MCP-backed capability is NOT available here — say so plainly if asked.`
    : `No MCP servers are loaded on this channel (remote surfaces are MCP-off by default; servers are opted in via LIFEOS_REMOTE_MCP_ALLOWLIST). If asked for an MCP-backed capability, say it is unavailable on this surface — do not guess at other causes.`
}
