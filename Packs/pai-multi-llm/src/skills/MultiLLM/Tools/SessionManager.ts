#!/usr/bin/env bun

/**
 * SessionManager - Manage LLM sessions for context efficiency
 *
 * Tracks active sessions per provider, enabling context reuse
 * instead of re-explaining context on every call.
 *
 * Usage:
 *   import { SessionManager } from './SessionManager';
 *   const sm = new SessionManager();
 *   await sm.query(provider, "prompt");
 *
 * @version 1.0.0
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { $ } from "bun";
import type {
  ActiveSession,
  ProviderConfig,
  QueryResult
} from "../../../types/Provider";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const SESSIONS_DIR = `${PAI_DIR}/multi-llm/sessions`;
const SESSIONS_FILE = `${SESSIONS_DIR}/active-sessions.json`;

export class SessionManager {
  private sessions: Map<string, ActiveSession> = new Map();

  constructor() {
    this.ensureDirectories();
    this.loadSessions();
  }

  private ensureDirectories(): void {
    if (!existsSync(SESSIONS_DIR)) {
      mkdirSync(SESSIONS_DIR, { recursive: true });
    }
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
    let cmd: string;
    let sessionId: string | undefined;

    const existingSession = this.sessions.get(provider.name);
    const shouldContinue =
      options.continue_session !== false &&
      existingSession &&
      provider.session.supported;

    if (shouldContinue && existingSession) {
      // CONTINUE existing session
      if (options.session_id) {
        // Resume specific session
        cmd = this.buildCommand(
          provider.session.resume_by_id || provider.session.start,
          prompt,
          options.session_id
        );
        sessionId = options.session_id;
      } else if (provider.session.continue_last) {
        // Continue last session
        cmd = this.buildCommand(provider.session.continue_last, prompt);
        sessionId = existingSession.session_id;
      } else if (provider.session.resume_by_id) {
        // Resume by stored ID
        cmd = this.buildCommand(
          provider.session.resume_by_id,
          prompt,
          existingSession.session_id
        );
        sessionId = existingSession.session_id;
      } else {
        // Fallback to new session
        cmd = this.buildCommand(provider.session.start, prompt);
      }
    } else {
      // START new session
      cmd = this.buildCommand(provider.session.start, prompt);
    }

    // Execute command
    const result = await this.executeCommand(cmd);
    const duration = Date.now() - startTime;

    // Extract session ID from new sessions
    if (!sessionId && provider.session.supported) {
      sessionId = this.extractSessionId(result, provider);
    }

    // Update session tracking
    if (sessionId) {
      const session: ActiveSession = {
        provider: provider.name,
        session_id: sessionId,
        created_at: existingSession?.created_at || new Date().toISOString(),
        last_used: new Date().toISOString(),
        message_count: (existingSession?.message_count || 0) + 1
      };
      this.sessions.set(provider.name, session);
      this.saveSessions();
    }

    return {
      provider: provider.name,
      session_id: sessionId,
      response: result,
      duration_ms: duration
    };
  }

  private buildCommand(
    template: string,
    prompt: string,
    sessionId?: string
  ): string {
    let cmd = template.replace("{prompt}", this.escapeForShell(prompt));
    if (sessionId) {
      cmd = cmd.replace("{session_id}", sessionId);
    }
    return cmd;
  }

  private escapeForShell(str: string): string {
    // Escape for shell command
    return str.replace(/'/g, "'\\''");
  }

  private async executeCommand(cmd: string): Promise<string> {
    try {
      const result = await $`sh -c ${cmd}`.quiet();
      return result.stdout.toString();
    } catch (error: any) {
      if (error.stdout) {
        return error.stdout.toString();
      }
      throw new Error(`Command failed: ${cmd}`);
    }
  }

  private extractSessionId(
    output: string,
    provider: ProviderConfig
  ): string | undefined {
    const extraction = provider.session.session_id_extraction;
    if (!extraction || extraction.method === "none") {
      return undefined;
    }

    switch (extraction.method) {
      case "json_field":
        try {
          const json = JSON.parse(output);
          return json[extraction.pattern || "session_id"];
        } catch {
          // Try to find JSON in output
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const json = JSON.parse(jsonMatch[0]);
              return json[extraction.pattern || "session_id"];
            } catch {
              return undefined;
            }
          }
        }
        break;

      case "regex":
        if (extraction.pattern) {
          const regex = new RegExp(extraction.pattern);
          const match = output.match(regex);
          return match ? match[1] : undefined;
        }
        break;

      case "file_based":
        // Session ID stored in file - handled by provider
        return undefined;
    }

    return undefined;
  }

  listSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  clearSession(providerName: string): boolean {
    const deleted = this.sessions.delete(providerName);
    if (deleted) {
      this.saveSessions();
    }
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

  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      list: { type: "boolean", short: "l" },
      clear: { type: "string", short: "c" },
      "clear-all": { type: "boolean" },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: true
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
      console.log("Active Sessions:");
      console.log("─".repeat(60));
      for (const session of sessions) {
        console.log(`Provider:      ${session.provider}`);
        console.log(`Session ID:    ${session.session_id}`);
        console.log(`Messages:      ${session.message_count}`);
        console.log(`Last Used:     ${session.last_used}`);
        console.log("─".repeat(60));
      }
    }
    return;
  }

  if (values.clear) {
    if (sm.clearSession(values.clear)) {
      console.log(`Cleared session for ${values.clear}`);
    } else {
      console.log(`No session found for ${values.clear}`);
    }
    return;
  }

  if (values["clear-all"]) {
    sm.clearAllSessions();
    console.log("All sessions cleared.");
    return;
  }

  // Default: list
  const sessions = sm.listSessions();
  console.log(`${sessions.length} active session(s)`);
}

main().catch(console.error);
