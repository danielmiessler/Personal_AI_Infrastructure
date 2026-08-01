#!/usr/bin/env bun

/**
 * SettingsBackport.ts — propagate direct edits on the GENERATED settings.json
 * back into the SOURCE overlay so SessionStart regeneration never steps on them.
 *
 * settings.json is a generated artifact: MergeSettings.ts merges
 * settings.system.json + settings.user.json at SessionStart. Any value edited
 * directly in settings.json is therefore wiped on the next merge. This tool
 * closes that loop: it diffs the live settings.json against the SNAPSHOT of
 * the last merge output (written by MergeSettings) and writes every divergent
 * value into settings.user.json (the overlay always wins conflicts, so a
 * backported value survives every future merge).
 *
 * Three-way base, not two-way: drift is computed against the last-merge
 * snapshot, NEVER against a freshly computed merge of the current sources.
 * Diffing against a fresh merge made un-merged SOURCE edits look like
 * settings.json drift and clobbered them back into the overlay (2026-07-11
 * hooks-BPE incident). With the snapshot base, source edits are invisible
 * here and flow through the MergeSettings run that follows. No snapshot on
 * disk → skip cleanly (never guess).
 *
 * Key DELETIONS backport too, by removing the key from the overlay. This is the
 * only representation the merge format has for "absent" — there is no delete
 * annotation — so it works exactly when the overlay is what supplied the key.
 * A key still supplied by settings.system.json survives the merge regardless;
 * that case is un-backportable, the overlay entry is restored untouched, and
 * the tool warns per key (fix it by hand in settings.system.json). Deleting the
 * key is how the harness records "use the default" — /model picking the default
 * model deletes $.model rather than pinning it, and before deletions were
 * backported that choice silently reverted at every SessionStart (2026-07-27:
 * a stale $.model overlay pin resurrected itself for weeks).
 *
 * Limit: arrays backport as whole-array replacements into the user overlay.
 *
 * Usage:
 *   bun SettingsBackport.ts            # default ~/.claude paths
 *   bun SettingsBackport.ts --dry-run  # report drift, write nothing
 */

import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { mergeSettings, deepEqual, parseJsonFileOrThrow, MERGE_SNAPSHOT_PATH } from "./MergeSettings";
import { atomicWriteText } from "../PULSE/lib/atomic-write";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SYSTEM_PATH = path.join(CLAUDE_DIR, "settings.system.json");
const USER_PATH = path.join(CLAUDE_DIR, "LIFEOS", "USER", "CONFIG", "settings.user.json");
const GENERATED_PATH = path.join(CLAUDE_DIR, "settings.json");

type Drift =
  | { kind: "changed"; segments: string[]; value: any }
  | { kind: "deleted"; segments: string[] };

function isObjectRecord(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Walks expected (merge output) vs actual (live settings.json) and collects
 * the minimal set of paths whose ACTUAL value should be written to the user
 * overlay. Recurses only while both sides are plain objects; everything else
 * (scalars, arrays, type changes) backports as a whole-value replacement.
 */
export function collectDrift(expected: any, actual: any, segments: string[] = []): Drift[] {
  if (deepEqual(expected, actual)) {
    return [];
  }

  if (isObjectRecord(expected) && isObjectRecord(actual)) {
    const drift: Drift[] = [];
    for (const key of Object.keys(actual)) {
      const childSegments = [...segments, key];
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        drift.push({ kind: "changed", segments: childSegments, value: actual[key] });
      } else {
        drift.push(...collectDrift(expected[key], actual[key], childSegments));
      }
    }
    for (const key of Object.keys(expected)) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        drift.push({ kind: "deleted", segments: [...segments, key] });
      }
    }
    return drift;
  }

  return [{ kind: "changed", segments, value: actual }];
}

/** Deep-set a value into an object, creating intermediate objects as needed. */
export function deepSet(target: Record<string, any>, segments: string[], value: any): void {
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    if (!isObjectRecord(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
}

/**
 * Deep-delete a key from an object. Returns true when the key was present and
 * removed. Intermediate objects left behind by the delete are kept: pruning an
 * emptied parent would itself be an unrequested overlay change.
 */
export function deepDelete(target: Record<string, any>, segments: string[]): boolean {
  let cursor: any = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    cursor = cursor[segments[i]];
    if (!isObjectRecord(cursor)) return false;
  }
  const leaf = segments[segments.length - 1];
  if (!isObjectRecord(cursor) || !Object.prototype.hasOwnProperty.call(cursor, leaf)) return false;
  delete cursor[leaf];
  return true;
}

function formatPath(segments: string[]): string {
  return `$.${segments.join(".")}`;
}

/** Deep-read a value at a path; undefined when any segment is missing. */
function getAtPath(target: any, segments: string[]): any {
  let cursor = target;
  for (const key of segments) {
    if (!isObjectRecord(cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

async function run(dryRun: boolean): Promise<number> {
  const system = await parseJsonFileOrThrow(SYSTEM_PATH);
  const user = await parseJsonFileOrThrow(USER_PATH);
  const actual = await parseJsonFileOrThrow(GENERATED_PATH);

  // Three-way base: the last merge output. Without it we cannot distinguish
  // "user edited settings.json" from "sources changed since the last merge",
  // so we skip rather than risk backporting stale generated values.
  if (!existsSync(MERGE_SNAPSHOT_PATH)) {
    console.log(
      `no merge snapshot at ${MERGE_SNAPSHOT_PATH} — skipping backport (next MergeSettings run writes it)`,
    );
    return 0;
  }
  const snapshot = await parseJsonFileOrThrow(MERGE_SNAPSHOT_PATH);

  const drift = collectDrift(snapshot, actual);

  if (drift.length === 0) {
    console.log("settings.json matches the last merge snapshot — nothing to backport");
    return 0;
  }

  const changes = drift.filter((d): d is Extract<Drift, { kind: "changed" }> => d.kind === "changed");
  const deletions = drift.filter((d): d is Extract<Drift, { kind: "deleted" }> => d.kind === "deleted");

  for (const d of changes) {
    console.log(`backport ${formatPath(d.segments)} = ${JSON.stringify(d.value)}`);
  }
  for (const d of deletions) {
    console.log(`backport DELETE ${formatPath(d.segments)}`);
  }

  if (dryRun) {
    console.log(`dry run: ${changes.length + deletions.length} change(s) NOT written`);
    return 0;
  }

  for (const d of changes) {
    deepSet(user, d.segments, d.value);
  }

  // A deletion is expressed by removing the overlay entry — the merge format has
  // no delete annotation. Remember what was removed so an un-backportable
  // deletion (settings.system.json still supplies the key) can be put back
  // rather than silently dropping a distinct overlay value.
  const removed = deletions
    .map((d) => ({ segments: d.segments, previous: getAtPath(user, d.segments) }))
    .filter((r) => deepDelete(user, r.segments));

  // Atomic: settings.user.json is a merge SOURCE — truncating it takes out the
  // next MergeSettings run too, not just this one. public PR #1643, @elhoim
  atomicWriteText(USER_PATH, `${JSON.stringify(user, null, 2)}\n`);
  console.log(`wrote ${changes.length + removed.length} change(s) to ${USER_PATH}`);

  // Verify per backported path: each value must survive the merge (overlay
  // wins conflicts), and each deleted path must stay absent. A global
  // merge-vs-actual compare is wrong under the three-way base — un-merged
  // SOURCE edits legitimately differ from the live file and are resolved by the
  // MergeSettings run that follows.
  let verified = mergeSettings(system, user);
  const remaining = changes.filter((d) => !deepEqual(getAtPath(verified, d.segments), d.value));

  // Deletions the system half resurrects: restore the overlay entry and warn.
  const resurrected = removed.filter((r) => getAtPath(verified, r.segments) !== undefined);
  if (resurrected.length > 0) {
    for (const r of resurrected) {
      if (r.previous !== undefined) deepSet(user, r.segments, r.previous);
      console.error(
        `⚠️  ${formatPath(r.segments)} was DELETED in settings.json but settings.system.json still ` +
          `supplies it — the overlay entry was restored; remove it from settings.system.json by hand.`,
      );
    }
    atomicWriteText(USER_PATH, `${JSON.stringify(user, null, 2)}\n`);
    verified = mergeSettings(system, user);
  }

  // Deletions of a key no overlay entry ever supplied: nothing to remove.
  for (const d of deletions) {
    if (!removed.some((r) => deepEqual(r.segments, d.segments))) {
      console.error(
        `⚠️  ${formatPath(d.segments)} was DELETED in settings.json but is not an overlay key — ` +
          `remove it from settings.system.json by hand.`,
      );
    }
  }

  if (remaining.length > 0) {
    console.error(`❌ verification failed — ${remaining.length} backported value(s) did not survive the merge:`);
    for (const d of remaining) {
      console.error(`   ${formatPath(d.segments)}`);
    }
  }

  const failed = remaining.length + resurrected.length + (deletions.length - removed.length);
  if (failed > 0) return 1;
  console.log("verified: every backported change survives merge(system, user)");
  return 0;
}

if (import.meta.main) {
  const dryRun = Bun.argv.includes("--dry-run");
  // Fresh-install guard (audit 20260702 F-001): the system+user settings layer only
  // exists once established. A fresh skill-only install has no root settings.system.json
  // (it is placed AS settings.json) and no settings.user.json yet — nothing to backport.
  // No-op cleanly instead of throwing on the missing input.
  if (!existsSync(SYSTEM_PATH) || !existsSync(USER_PATH)) {
    console.log("settings-layer not present (no settings.system.json / settings.user.json) — nothing to backport");
    process.exit(0);
  }
  try {
    process.exit(await run(dryRun));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
