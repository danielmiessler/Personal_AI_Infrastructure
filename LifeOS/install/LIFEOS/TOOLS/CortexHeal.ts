#!/usr/bin/env bun
/**
 * CortexHeal — repairs the per-note problems Cortex.ts would otherwise skip, so the archive stays whole.
 * Cortex.ts itself stays read-only; this is the separate writer.
 *
 * Fixes only what has one right answer; anything else is quarantined (moved, never deleted) so the corpus stays clean
 * and the note stays recoverable. Structure and size problems (symlinks, file-count limit) are reported, never touched.
 *   updated-before-created            -> updated := created
 *   valid_from/valid_until "null"/"~" -> line removed (the field means "open-ended")
 *   duplicate-id                      -> later file (path order) gets a new id derived from its path
 *   control-char                      -> control characters stripped
 *   bad-created/-updated/-valid_*, validity-window, utf8 -> quarantined (a date or text we cannot infer)
 * Dry-run by default. `--apply` first copies every touched file to <corpus>/_heal/<stamp>/, with a manifest.json.
 * `--revert <stamp>` restores from that folder. `_heal` is underscore-prefixed, so Cortex.ts and the scan never read it.
 * Usage: bun CortexHeal.ts [--memory-root DIR] [--apply] [--revert STAMP]
 */
import { createHash } from "crypto";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { corpusRoot, scan, type Finding } from "./CortexIntegrityScan";

export interface Action { path: string; cls: string; action: "fix" | "quarantine"; detail: string }
const NULLISH = /^(null|~|none|nil|)$/i;
const FRONT = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;

/** Rewrites one frontmatter line. Returns null when the note has no frontmatter or the key is absent. */
function editFront(text: string, edit: (lines: string[]) => string[] | null): string | null {
  const m = text.match(FRONT);
  if (!m) return null;
  const lines = edit(m[2].split(/\r?\n/));
  return lines ? m[1] + lines.join("\n") + m[3] + text.slice(m[0].length) : null;
}
const keyOf = (line: string) => line.match(/^([A-Za-z0-9_]+):/)?.[1];
const valueOf = (lines: string[], keys: string[]) => { for (const l of lines) { const k = keyOf(l); if (k && keys.includes(k)) return l.replace(/^[^:]+:\s*/, ""); } return undefined; };

export function fixText(cls: string, text: string, detail: string, path: string): string | null {
  if (cls === "updated-before-created") return editFront(text, (lines) => {
    const created = valueOf(lines, ["created", "date", "ts"]);
    return created === undefined ? null : lines.map((l) => ["updated", "last_updated"].includes(keyOf(l) ?? "") ? `${keyOf(l)}: ${created}` : l);
  });
  if (cls === "bad-valid_from" || cls === "bad-valid_until") {
    const key = cls.slice(4);
    return editFront(text, (lines) => {
      const v = valueOf(lines, [key])?.trim().replace(/^["']|["']$/g, "");
      return v !== undefined && NULLISH.test(v) ? lines.filter((l) => keyOf(l) !== key) : null;
    });
  }
  if (cls === "duplicate-id") return editFront(text, (lines) => {
    const old = valueOf(lines, ["id"])?.trim().replace(/^["']|["']$/g, "");
    if (!old) return null;
    const prefix = old.match(/^([a-z]+)_/)?.[1] ?? "id";
    return lines.map((l) => keyOf(l) === "id" ? `id: ${prefix}_${createHash("sha256").update(path).digest("hex").slice(0, 12)}` : l);
  });
  if (cls === "control-char") return text.toWellFormed().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu, "");
  return null;
}

export function plan(root: string): { actions: Action[]; untouched: Finding[]; files: number } {
  root = realpathSync(root);
  const { files, findings } = scan(root);
  const actions: Action[] = [], untouched: Finding[] = [], seen = new Set<string>();
  // duplicate-id findings list every holder; only the later ones in path order change.
  const dupFirst = new Map<string, string>();
  for (const f of [...findings].filter((x) => x.cls === "duplicate-id").sort((a, b) => a.path.localeCompare(b.path))) if (!dupFirst.has(f.detail)) dupFirst.set(f.detail, f.path);
  for (const f of findings) {
    if (["symlink", "file-limit"].includes(f.cls)) { untouched.push(f); continue; }
    if (f.cls === "duplicate-id" && dupFirst.get(f.detail) === f.path) continue;
    const key = f.cls + "\0" + f.path;
    if (seen.has(key)) continue;
    seen.add(key);
    const abs = join(root, f.path);
    let text = ""; try { text = readFileSync(abs, "utf8"); } catch { /* unreadable -> quarantine */ }
    const fixed = text ? fixText(f.cls, text, f.detail, f.path) : null;
    actions.push({ path: f.path, cls: f.cls, action: fixed === null ? "quarantine" : "fix", detail: f.detail });
  }
  return { actions, untouched, files };
}

export function apply(root: string, actions: Action[], stamp = new Date().toISOString().replace(/[:.]/g, "-")): string {
  root = realpathSync(root);
  const heal = join(corpusRoot(root), "_heal", stamp), done: Action[] = [];
  mkdirSync(heal, { recursive: true });
  // Several findings can hit one file, so group by path: back up once, apply fixes in order, quarantine wins.
  const byPath = new Map<string, Action[]>();
  for (const a of actions) byPath.set(a.path, [...(byPath.get(a.path) ?? []), a]);
  for (const [path, list] of byPath) {
    const abs = join(root, path), backup = join(heal, "original", path);
    mkdirSync(dirname(backup), { recursive: true });
    copyFileSync(abs, backup);
    let text = readFileSync(abs, "utf8"), quarantine = list.some((a) => a.action === "quarantine");
    if (!quarantine) {
      for (const a of list) { const next = fixText(a.cls, text, a.detail, path); if (next === null) { quarantine = true; break; } text = next; }
    }
    if (quarantine) {
      const dest = join(heal, "quarantine", path);
      mkdirSync(dirname(dest), { recursive: true });
      renameSync(abs, dest);
    } else writeFileSync(abs, text);
    done.push(...list.map((a) => ({ ...a, action: quarantine ? "quarantine" as const : "fix" as const })));
  }
  writeFileSync(join(heal, "manifest.json"), JSON.stringify({ root, stamp, actions: done }, null, 1));
  return heal;
}

export function revert(root: string, stamp: string): number {
  root = realpathSync(root);
  const heal = join(corpusRoot(root), "_heal", stamp), man = JSON.parse(readFileSync(join(heal, "manifest.json"), "utf8")) as { actions: Action[] };
  let n = 0;
  for (const path of new Set(man.actions.map((a) => a.path))) {
    const abs = join(root, path);
    mkdirSync(dirname(abs), { recursive: true });
    copyFileSync(join(heal, "original", path), abs);
    n++;
  }
  return n;
}

if (import.meta.main) {
  const arg = (n: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const root = arg("--memory-root") ?? join(homedir(), ".claude/LIFEOS/MEMORY");
  const stamp = arg("--revert");
  if (stamp) { console.log(JSON.stringify({ restored: revert(root, stamp), stamp })); process.exit(0); }
  const { actions, untouched, files } = plan(root);
  const doApply = process.argv.includes("--apply");
  const heal = doApply && actions.length ? apply(root, actions) : null;
  for (const a of actions) console.log(`${doApply ? "" : "would "}${a.action}\t${a.cls}\t${a.path}\t${a.detail}`);
  for (const u of untouched) console.log(`untouched\t${u.cls}\t${u.path}\t${u.detail}`);
  console.log(JSON.stringify({ files, fix: actions.filter((a) => a.action === "fix").length, quarantine: actions.filter((a) => a.action === "quarantine").length, untouched: untouched.length, applied: doApply, healDir: heal }));
  process.exit(untouched.length ? 1 : 0);
}
