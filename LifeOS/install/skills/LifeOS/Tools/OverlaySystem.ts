#!/usr/bin/env bun
/**
 * OverlaySystem.ts — the update-path counterpart to DeployCore: refresh SYSTEM-OWNED files
 * that already exist, which copyMissing by contract cannot do.
 *
 * Ported from public PR #1771, @bnkath2o (posted by "Abe" on Ben's behalf). Fixes #1770.
 * Adaptation on the way in: an operator's CLAUDE.md and system prompt are BACKED UP to a
 * timestamped file before they are overlaid, so hand-edits to the constitution are
 * recoverable rather than silently lost. See overlayFile()'s backupFirst path.
 *
 * DeployCore is additive: `copyMissing` writes only when the destination is absent, so a
 * populated install can receive NEW files but never an UPDATED one. That is the right
 * contract for a fresh install and the wrong one for an update — `Workflows/Update.md`
 * step 3 ("Re-overlay system") describes this tool, which did not previously exist.
 *
 * Scope is deliberately narrow. Only paths LifeOS owns are overwritten:
 *
 *   hooks/ · skills/ · agents/ · LIFEOS/{TOOLS,DOCUMENTATION,ALGORITHM,RULES,PULSE}/
 *   plus CLAUDE.md and LIFEOS/LIFEOS_SYSTEM_PROMPT.md
 *
 * Never touched: USER/ (the principal's tree), LIFEOS/MEMORY/ (per-install state),
 * settings.json (hook registrations — InstallHooks owns that merge), node_modules, .git.
 *
 * Nothing is ever DELETED. A file is written only where the payload ships one at the same
 * relative path, so operator-authored hooks, skills and tools survive untouched.
 *
 * VERSION is written LAST and only on a fully successful --apply, so a partial update can
 * never present as complete (the failure mode where the marker says the new version while
 * the machinery is still the old one).
 *
 * Dry-run by default (`--apply` to mutate); REFUSES the author's live source tree
 * (`--allow-dev` to override; exit 2), matching DeployCore's failure contract.
 *
 * Usage:
 *   bun OverlaySystem.ts [--config-root <dir>] [--skill-root <dir>] [--apply] [--allow-dev]
 */

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, type Stats } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { detectDevTree } from "./InstallEngine";

/** Directories inside a system tree that are never overlaid, at any depth. */
const SKIP_DIRS = new Set(["node_modules", ".git", "MEMORY", "USER", "out", ".next"]);

/**
 * System-owned trees: [payload-relative, configRoot-relative].
 * Anything not listed here is left alone — absence from this list is the safety property.
 */
const SYSTEM_TREES: Array<[string, string]> = [
  ["hooks", "hooks"],
  ["skills", "skills"],
  ["agents", "agents"],
  ["LIFEOS/TOOLS", "LIFEOS/TOOLS"],
  ["LIFEOS/DOCUMENTATION", "LIFEOS/DOCUMENTATION"],
  ["LIFEOS/ALGORITHM", "LIFEOS/ALGORITHM"],
  ["LIFEOS/RULES", "LIFEOS/RULES"],
  ["LIFEOS/PULSE", "LIFEOS/PULSE"],
];

/**
 * System-owned single files: [payload-relative, configRoot-relative, backupFirst].
 * backupFirst files are ones an operator is likely to have hand-edited (the constitution
 * and the system prompt), so we snapshot the existing copy before overwriting it.
 */
const SYSTEM_FILES: Array<[string, string, boolean]> = [
  ["LIFEOS/LIFEOS_SYSTEM_PROMPT.md", "LIFEOS/LIFEOS_SYSTEM_PROMPT.md", true],
  ["skills/LifeOS/install/CLAUDE.template.md", "CLAUDE.md", true],
];

function arg(a: string[], flag: string): string | undefined {
  const i = a.indexOf(flag);
  return i >= 0 && a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : undefined;
}

function sameBytes(a: string, b: string): boolean {
  try {
    const x = readFileSync(a);
    const y = readFileSync(b);
    return x.length === y.length && x.equals(y);
  } catch {
    return false;
  }
}

/** Timestamp safe for a filename: 2026-08-06T05-59-00-000Z. */
function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

interface OverlayResult {
  what: string;
  src: string;
  dst: string;
  present: boolean;
  /** existed and differed → rewritten */
  updated: number;
  /** already byte-identical → untouched */
  current: number;
  /** absent → created */
  created: number;
  /** path of the backup written before an operator-owned file was overlaid, if any */
  backupPath?: string;
  failures: string[];
}

/**
 * Walk the payload tree and write each file to the matching relative path under dst.
 * Updates and creations are both performed; deletions never are.
 */
function overlayTree(src: string, dst: string, what: string, apply: boolean): OverlayResult {
  const r: OverlayResult = { what, src, dst, present: existsSync(src), updated: 0, current: 0, created: 0, failures: [] };
  if (!r.present) return r;

  const walk = (s: string, d: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(s);
    } catch (err) {
      r.failures.push(`readdir ${s}: ${String(err)}`);
      return;
    }
    for (const name of entries) {
      const sp = join(s, name);
      const dp = join(d, name);
      let st: Stats;
      try {
        st = lstatSync(sp);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue; // never follow or replace symlinks (USER is one)
      if (st.isDirectory()) {
        if (SKIP_DIRS.has(name)) continue;
        walk(sp, dp);
        continue;
      }
      if (!st.isFile()) continue;
      if (existsSync(dp)) {
        if (sameBytes(sp, dp)) {
          r.current++;
          continue;
        }
        if (apply) {
          try {
            cpSync(sp, dp);
          } catch (err) {
            r.failures.push(`copy ${sp}: ${String(err)}`);
            continue;
          }
        }
        r.updated++;
      } else {
        if (apply) {
          try {
            mkdirSync(dirname(dp), { recursive: true });
            cpSync(sp, dp);
          } catch (err) {
            r.failures.push(`copy ${sp}: ${String(err)}`);
            continue;
          }
        }
        r.created++;
      }
    }
  };

  walk(src, dst);
  return r;
}

function overlayFile(src: string, dst: string, what: string, apply: boolean, backupFirst: boolean): OverlayResult {
  const r: OverlayResult = { what, src, dst, present: existsSync(src), updated: 0, current: 0, created: 0, failures: [] };
  if (!r.present) return r;
  const exists = existsSync(dst);
  if (exists && sameBytes(src, dst)) {
    r.current = 1;
    return r;
  }
  if (apply) {
    // Preserve an operator's hand-edited file before overwriting it (adaptation from the
    // ported PR): CLAUDE.md especially is expected to carry local edits, and the overlay
    // restores it from the template. A recoverable snapshot beats a silent clobber.
    if (exists && backupFirst) {
      const bak = `${dst}.pre-overlay-${stamp()}.bak`;
      try {
        cpSync(dst, bak);
        r.backupPath = bak;
      } catch (err) {
        r.failures.push(`backup ${dst}: ${String(err)}`);
        return r;
      }
    }
    try {
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(src, dst);
    } catch (err) {
      r.failures.push(`copy ${src}: ${String(err)}`);
      return r;
    }
  }
  if (exists) r.updated = 1;
  else r.created = 1;
  return r;
}

function main(): void {
  const a = process.argv.slice(2);
  const apply = a.includes("--apply");
  const allowDev = a.includes("--allow-dev");
  const configRoot = arg(a, "--config-root") || process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  const skillRoot = arg(a, "--skill-root") || join(configRoot, "skills", "LifeOS");
  const payloadInstall = join(skillRoot, "install");

  if (!allowDev && detectDevTree(configRoot)) {
    console.log(JSON.stringify({ ok: false, refused: "dev-tree", detail: `${configRoot} is a source tree — refusing to overlay.` }, null, 2));
    process.exit(2);
  }
  if (!existsSync(payloadInstall)) {
    console.log(JSON.stringify({ ok: false, blockers: [`payload absent: ${payloadInstall}`] }, null, 2));
    process.exit(1);
  }

  // Payload-completeness preflight. On an installed system, skills/LifeOS/install/ holds
  // only the bootstrap files (install.sh, templates) — the full system payload exists there
  // only right after the bootstrap has fetched a release. Overlaying from a bootstrap-only
  // dir would report every tree absent and exit ok:true having refreshed nothing, which
  // presents a no-op as a successful update. Refuse instead, and say what to do.
  const missingTrees = SYSTEM_TREES.map(([ps]) => ps).filter((ps) => !existsSync(join(payloadInstall, ps)));
  if (missingTrees.length === SYSTEM_TREES.length) {
    console.log(JSON.stringify({
      ok: false,
      blockers: [
        `payload at ${payloadInstall} is bootstrap-only (no system trees: ${missingTrees.join(", ")}) — run \`bash ${join(skillRoot, "install", "install.sh")}\` to fetch the full release payload, then re-run this overlay`,
      ],
    }, null, 2));
    process.exit(1);
  }
  if (missingTrees.length > 0) {
    console.log(JSON.stringify({
      ok: false,
      blockers: [`payload at ${payloadInstall} is incomplete — missing system tree(s): ${missingTrees.join(", ")}. Re-fetch the release payload before overlaying.`],
    }, null, 2));
    process.exit(1);
  }

  const results: OverlayResult[] = [];
  for (const [ps, ds] of SYSTEM_TREES) {
    results.push(overlayTree(join(payloadInstall, ps), join(configRoot, ds), ps, apply));
  }
  for (const [ps, ds, backup] of SYSTEM_FILES) {
    results.push(overlayFile(join(payloadInstall, ps), join(configRoot, ds), ps, apply, backup));
  }

  const failures = results.flatMap((r) => r.failures);
  const ok = failures.length === 0;
  const updated = results.reduce((n, r) => n + r.updated, 0);
  const created = results.reduce((n, r) => n + r.created, 0);
  const current = results.reduce((n, r) => n + r.current, 0);
  const backups = results.map((r) => r.backupPath).filter((p): p is string => Boolean(p));

  // VERSION last, and only when everything else succeeded — a partial update must never
  // leave a marker claiming the new version.
  const version: { from: string | null; to: string | null; written: boolean } = { from: null, to: null, written: false };
  const versionSrc = join(payloadInstall, "LIFEOS", "VERSION");
  const versionDst = join(configRoot, "LIFEOS", "VERSION");
  if (existsSync(versionSrc)) {
    version.to = readFileSync(versionSrc, "utf8").trim();
    version.from = existsSync(versionDst) ? readFileSync(versionDst, "utf8").trim() : null;
    if (apply && ok) {
      try {
        writeFileSync(versionDst, version.to);
        version.written = true;
      } catch (err) {
        failures.push(`write VERSION: ${String(err)}`);
      }
    }
  }

  const notes: string[] = [];
  if (!apply) notes.push("dry-run — re-run with --apply to overlay (VERSION is written only on a successful apply)");
  notes.push("USER/, LIFEOS/MEMORY/ and settings.json are never touched; nothing is ever deleted");
  if (backups.length) {
    notes.push(
      `backed up ${backups.length} operator file(s) before overlay: ${backups.join(", ")} — reconcile any hand-edits from the .bak, then run ActivateImports.ts --apply and read CLAUDE.md back to confirm the identity imports resolve`,
    );
  }

  console.log(JSON.stringify({
    ok: failures.length === 0,
    dryRun: !apply,
    configRoot,
    payloadInstall,
    updated,
    created,
    alreadyCurrent: current,
    backups,
    version,
    failures,
    results,
    note: notes.join(" | "),
  }, null, 2));
  process.exit(failures.length === 0 ? 0 : 1);
}

main();
