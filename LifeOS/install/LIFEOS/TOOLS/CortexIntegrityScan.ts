#!/usr/bin/env bun
/**
 * CortexIntegrityScan — reports every canonical-record problem that makes Cortex.ts fail closed,
 * all at once, instead of one error per run.
 *
 * Mirrors the rules in Cortex.ts (validTimestamp, validateRecord, duplicate IDs, MAX_FILES, UTF-8/control chars)
 * and the corpus walk (skips `_`/`.` prefixed names; uses KNOWLEDGE/ when present).
 * Usage: bun CortexIntegrityScan.ts [--memory-root DIR]   exit 0 clean, 1 findings.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from "fs";
import { homedir } from "os";
import { join, relative } from "path";

export const MAX_FILES = 10_000;
export interface Finding { cls: string; path: string; detail: string }

const TS = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;
export function validTimestamp(v: string): boolean {
  const m = v.match(TS);
  if (!m || !Number.isFinite(Date.parse(v))) return false;
  const y = +m[1], mo = +m[2], d = +m[3], c = new Date(Date.UTC(y, mo - 1, d));
  if (c.getUTCFullYear() !== y || c.getUTCMonth() !== mo - 1 || c.getUTCDate() !== d) return false;
  return m[4] === undefined || (+m[4] <= 23 && +m[5] <= 59 && +(m[6] ?? 0) <= 59);
}

const scalar = (s: string) => s.trim().replace(/^["']|["']$/g, "");
function fields(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/), out: Record<string, string> = {};
  if (m) for (const line of m[1].split(/\r?\n/)) { const f = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/); if (f) out[f[1]] = scalar(f[2]); }
  return out;
}

export function corpusRoot(root: string): string {
  const k = join(root, "KNOWLEDGE"), nested = join(root, "MEMORY/KNOWLEDGE");
  return existsSync(k) ? k : existsSync(nested) ? nested : root;
}

export function scan(root: string, maxFiles = MAX_FILES): { files: number; findings: Finding[] } {
  const real = realpathSync(root), base = corpusRoot(real), findings: Finding[] = [];
  const ids = new Map<string, string[]>(); let files = 0;
  const add = (cls: string, p: string, detail: string) => findings.push({ cls, path: relative(real, p), detail });
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isSymbolicLink()) { add("symlink", p, "symlinks are forbidden under the root"); continue; }
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith(".md") && !e.name.endsWith(".jsonl")) continue;
      files++;
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(p)); } catch { add("utf8", p, "not valid UTF-8"); continue; }
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(text) || /[\uD800-\uDFFF]/u.test(text)) add("control-char", p, "control or malformed Unicode");
      if (!e.name.endsWith(".md")) continue;
      const f = fields(text), c = f.created || f.date || f.ts, u = f.updated || f.last_updated || c;
      if (c && !validTimestamp(c)) add("bad-created", p, c);
      if (u && !validTimestamp(u)) add("bad-updated", p, u);
      if (c && u && validTimestamp(c) && validTimestamp(u) && Date.parse(u) < Date.parse(c)) add("updated-before-created", p, `created=${c} updated=${u}`);
      for (const k of ["valid_from", "valid_until"]) if (f[k] && !validTimestamp(f[k])) add(`bad-${k}`, p, f[k]);
      if (f.valid_from && f.valid_until && validTimestamp(f.valid_from) && validTimestamp(f.valid_until) && Date.parse(f.valid_from) >= Date.parse(f.valid_until)) add("validity-window", p, `${f.valid_from} >= ${f.valid_until}`);
      if (f.id) ids.set(f.id, [...(ids.get(f.id) ?? []), p]);
    }
  };
  walk(base);
  for (const [id, ps] of ids) if (ps.length > 1) for (const p of ps) add("duplicate-id", p, id);
  if (files > maxFiles) add("file-limit", base, `${files} files exceeds ${maxFiles}`);
  return { files, findings };
}

if (import.meta.main) {
  const i = process.argv.indexOf("--memory-root");
  const root = i > 0 ? process.argv[i + 1] : join(homedir(), ".claude/LIFEOS/MEMORY");
  const { files, findings } = scan(root);
  const byClass: Record<string, number> = {};
  for (const f of findings) byClass[f.cls] = (byClass[f.cls] ?? 0) + 1;
  for (const f of findings.slice(0, 50)) console.log(`${f.cls}\t${f.path}\t${f.detail}`);
  console.log(JSON.stringify({ files, headroom: MAX_FILES - files, findings: findings.length, byClass }));
  process.exit(findings.length ? 1 : 0);
}
