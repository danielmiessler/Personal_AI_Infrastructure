#!/usr/bin/env bun
/**
 * RebuildArchSummary.ts - Regenerate DOCUMENTATION/ARCHITECTURE_SUMMARY.md when system files change
 *
 * PURPOSE:
 * Watches LifeOS system docs, hooks, Algorithm spec, Tools, user config, and security
 * policy for mtime changes. When any tracked file is newer than the current
 * DOCUMENTATION/ARCHITECTURE_SUMMARY.md, invokes Tools/ArchitectureSummaryGenerator.ts to
 * regenerate it.
 *
 * TRIGGER: called from DocIntegrity.hook.ts on SessionEnd.
 *
 * DESIGN:
 * - No Components dir tracking (deprecated pipeline removed in v5.0).
 * - No build-script rebuilds of CLAUDE.md / SKILL.md — both are directly edited.
 * - Single responsibility: keep the auto-generated architecture summary current.
 */

import { statSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { getLifeosDir, getClaudeDir } from "../lib/paths";

export async function handleRebuildArchSummary(): Promise<void> {
  const paiDir = getLifeosDir();
  const claudeDir = getClaudeDir();
  // Both paths were wrong, in ways that hid each other.
  //   1. The generator writes ARCHITECTURE_SUMMARY.md (ArchitectureSummaryGenerator.ts
  //      SUMMARY_OUTPUT), never LIFEOS_ARCHITECTURE_SUMMARY.md. The old name could not
  //      exist, so statting it always returned null, the mtime freshness check was dead
  //      code, and every Stop hook took the "missing - regenerating" branch and spawned
  //      an unconditional regeneration subprocess.
  //   2. The directory is TOOLS, not Tools. existsSync only resolved on case-insensitive
  //      macOS; on Linux — which install.sh explicitly supports — the guard below
  //      returned early and the summary was never regenerated, silently.
  const output = join(paiDir, "DOCUMENTATION", "ARCHITECTURE_SUMMARY.md");
  const generator = join(paiDir, "TOOLS/ArchitectureSummaryGenerator.ts");

  if (!existsSync(generator)) return;

  try {
    const outputStat = existsSync(output) ? statSync(output) : null;
    if (!outputStat) {
      console.error("[RebuildArchSummary] Architecture summary missing - regenerating");
      await rebuild(generator, paiDir);
      return;
    }

    const trackedDirs = [
      join(paiDir, ""),
      join(paiDir, "DOCUMENTATION"),
      join(claudeDir, "hooks"),
      join(paiDir, "ALGORITHM"),
      join(paiDir, "TOOLS"),
      join(paiDir, "USER", "CONFIG"),
      join(paiDir, "USER", "SECURITY"),
    ];

    const trackedExtensions = new Set([".ts", ".md", ".yaml", ".yml", ".sh", ".json"]);

    let newestSystemFile = "";
    let newestMtime = 0;

    for (const dir of trackedDirs) {
      if (!existsSync(dir)) continue;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const ext = entry.name.slice(entry.name.lastIndexOf("."));
          if (!trackedExtensions.has(ext)) continue;
          const filePath = join(dir, entry.name);
          const mtime = statSync(filePath).mtimeMs;
          if (mtime > newestMtime) {
            newestMtime = mtime;
            newestSystemFile = filePath;
          }
        }
      } catch {
        /* dir not readable — skip */
      }
    }

    for (const f of [join(claudeDir, "settings.json"), join(claudeDir, "CLAUDE.md")]) {
      if (existsSync(f)) {
        const mtime = statSync(f).mtimeMs;
        if (mtime > newestMtime) {
          newestMtime = mtime;
          newestSystemFile = f;
        }
      }
    }

    if (newestMtime > outputStat.mtimeMs) {
      const rel = newestSystemFile.replace(claudeDir + "/", "");
      console.error(`[RebuildArchSummary] System file changed (${rel}) - regenerating`);
      await rebuild(generator, paiDir);
    } else {
      console.error("[RebuildArchSummary] DOCUMENTATION/ARCHITECTURE_SUMMARY.md is current");
    }
  } catch (error) {
    console.error("[RebuildArchSummary] Error checking architecture summary:", error);
  }
}

/**
 * Wall-clock ceiling for the generator subprocess.
 *
 * This runs LAST on the SessionEnd path, after the cross-ref handler. The
 * harness kills the whole hook at 30s and reports only "Hook cancelled" — the
 * hook cannot self-report, so an unbounded child here surfaced as an
 * unexplained cancellation rather than as a slow generator. Bounded so the
 * failure is legible and the remaining budget is never consumed silently.
 * public PR #1682, @pkumaschow
 */
const REBUILD_TIMEOUT_MS = 8000;

async function rebuild(generator: string, cwd: string): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn("bun", [generator, "generate"], { cwd, stdio: "pipe" });

    let stderr = "";
    let settled = false;
    const finish = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };

    const timer = setTimeout(() => {
      console.error(`[RebuildArchSummary] Generator exceeded ${REBUILD_TIMEOUT_MS}ms — killed. Summary left unchanged.`);
      try { proc.kill("SIGKILL"); } catch { /* already gone */ }
      finish();
    }, REBUILD_TIMEOUT_MS);

    proc.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        console.error("[RebuildArchSummary] Regenerated DOCUMENTATION/ARCHITECTURE_SUMMARY.md");
      } else if (!settled) {
        console.error(`[RebuildArchSummary] Regeneration failed (exit ${code}): ${stderr.trim()}`);
      }
      finish();
    });

    proc.on("error", (err) => {
      console.error("[RebuildArchSummary] Spawn error:", err);
      finish();
    });
  });
}
