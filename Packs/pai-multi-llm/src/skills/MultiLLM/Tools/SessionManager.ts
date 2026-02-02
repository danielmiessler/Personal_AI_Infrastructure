#!/usr/bin/env bun

/**
 * SessionManager - Manage LLM sessions for context efficiency
 *
 * Usage:
 *   import { SessionManager } from './SessionManager';
 *   const sm = new SessionManager();
 *   await sm.query(provider, "prompt");
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { $ } from "bun";
import { SESSIONS_DIR, SESSIONS_FILE } from "../lib/config";
import type { ActiveSession, ProviderConfig, QueryResult } from "../../../types/Provider";

export class SessionManager {
  private sessions: Map<string, ActiveSession> = new Map();

  constructor() {
    if (!existsSync(SESSIONS_DIR)) {
      mkdirSync(SESSIONS_DIR, { recursive: true });
    }
    this.loadSessions();
  }

  private loadSessions(): void {
    try {
      if (existsSync(SESSIONS_FILE)) {
        const data = JSON.parse(readFileSync(SESSIONS_FILE, "utf-8"));
        for (const [key, session] of Object.entries(data)) {
          this.sessions.set(key, session as ActiveSession);
        }
      }
    } catch {
      // Fresh start
    }
  }

  private saveSessions(): void {
    const data: Record<string, ActiveSession> = {};
    for (const [key, session] of this.sessions) {
      data[key] = session;
    }
    writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
  }

  getSession(providerName: string): ActiveSession | undefined {
    return this.sessions.get(providerName);
  }

  async query(
    provider: ProviderConfig,
    prompt: string,
    options: { continue_session?: boolean; session_id?: string } = {}
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const existingSession = this.sessions.get(provider.name);
    const shouldContinue =
      options.continue_session !== false && existingSession && provider.session.supported;

    const { cmd, sessionId: initialSessionId } = this.buildQueryCommand(
      provider,
      prompt,
      options,
      shouldContinue ? existingSession : undefined
    );

    const result = await this.executeCommand(cmd);
    const duration = Date.now() - startTime;

    // Extract or use existing session ID
    let sessionId = initialSessionId;
    if (!sessionId && provider.session.supported) {
      sessionId = this.extractSessionId(result, provider);
    }

    // Update session tracking
    if (sessionId) {
      this.sessions.set(provider.name, {
        provider: provider.name,
        session_id: sessionId,
        created_at: existingSession?.created_at || new Date().toISOString(),
        last_used: new Date().toISOString(),
        message_count: (existingSession?.message_count || 0) + 1,
      });
      this.saveSessions();
    }

    return { provider: provider.name, session_id: sessionId, response: result, duration_ms: duration };
  }

  private buildQueryCommand(
    provider: ProviderConfig,
    prompt: string,
    options: { session_id?: string },
    existingSession?: ActiveSession
  ): { cmd: string; sessionId?: string } {
    const escape = (s: string) => s.replace(/'/g, "'\\''");
    const build = (template: string, sid?: string) => {
      let cmd = template.replace("{prompt}", escape(prompt));
      if (sid) cmd = cmd.replace("{session_id}", sid);
      return cmd;
    };

    if (!existingSession) {
      return { cmd: build(provider.session.start) };
    }

    if (options.session_id) {
      return {
        cmd: build(provider.session.resume_by_id || provider.session.start, options.session_id),
        sessionId: options.session_id,
      };
    }

    if (provider.session.continue_last) {
      return { cmd: build(provider.session.continue_last), sessionId: existingSession.session_id };
    }

    if (provider.session.resume_by_id) {
      return {
        cmd: build(provider.session.resume_by_id, existingSession.session_id),
        sessionId: existingSession.session_id,
      };
    }

    return { cmd: build(provider.session.start) };
  }

  private async executeCommand(cmd: string): Promise<string> {
    try {
      const result = await $`sh -c ${cmd}`.quiet();
      return result.stdout.toString();
    } catch (error: any) {
      if (error.stdout) return error.stdout.toString();
      throw new Error(`Command failed: ${cmd}`);
    }
  }

  private extractSessionId(output: string, provider: ProviderConfig): string | undefined {
    const extraction = provider.session.session_id_extraction;
    if (!extraction || extraction.method === "none") return undefined;

    if (extraction.method === "json_field") {
      try {
        const json = JSON.parse(output);
        return json[extraction.pattern || "session_id"];
      } catch {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0])[extraction.pattern || "session_id"];
          } catch {}
        }
      }
    } else if (extraction.method === "regex" && extraction.pattern) {
      const match = output.match(new RegExp(extraction.pattern));
      return match?.[1];
    }

    return undefined;
  }

  listSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  clearSession(providerName: string): boolean {
    const deleted = this.sessions.delete(providerName);
    if (deleted) this.saveSessions();
    return deleted;
  }

  clearAllSessions(): void {
    this.sessions.clear();
    this.saveSessions();
  }
}

// CLI interface
async function main() {
  const { parseArgs } = await import("util");

  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      list: { type: "boolean", short: "l" },
      clear: { type: "string", short: "c" },
      "clear-all": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
SessionManager - Manage LLM sessions

USAGE:
  bun run SessionManager.ts [options]

OPTIONS:
  -l, --list       List all active sessions
  -c, --clear <p>  Clear session for provider
  --clear-all      Clear all sessions
  -h, --help       Show this help
`);
    return;
  }

  const sm = new SessionManager();

  if (values.list) {
    const sessions = sm.listSessions();
    if (sessions.length === 0) {
      console.log("No active sessions.");
    } else {
      console.log("Active Sessions:\n" + "─".repeat(60));
      for (const s of sessions) {
        console.log(`Provider: ${s.provider}\nSession:  ${s.session_id}\nMessages: ${s.message_count}\nLast:     ${s.last_used}\n${"─".repeat(60)}`);
      }
    }
    return;
  }

  if (values.clear) {
    console.log(sm.clearSession(values.clear) ? `Cleared session for ${values.clear}` : `No session found for ${values.clear}`);
    return;
  }

  if (values["clear-all"]) {
    sm.clearAllSessions();
    console.log("All sessions cleared.");
    return;
  }

  console.log(`${sm.listSessions().length} active session(s)`);
}

main().catch(console.error);
