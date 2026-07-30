/**
 * flat-tool-header.ts — parser + registry renderer for the flat-tool tier
 *
 * PURPOSE:
 * Single source of truth for reading a flat tool's leading header block and
 * judging it against the element contract in `DOCUMENTATION/Tools/Tools.md`
 * § Placement doctrine (identity line, purpose prose, usage-or-library-marked).
 * Also renders the generated registry table (`DOCUMENTATION/Tools/FlatTools.md`).
 * Consumed by `LIFEOS/TOOLS/ToolsRegistry.ts`. Pure functions, no side effects;
 * the pointer element (@see) is judgment-scoped ("where a governing doc exists")
 * and deliberately NOT machine-enforced.
 *
 * TRIGGER: n/a (shared lib — no stdin, no registration)
 *
 * USAGE:
 *   import { parseFlatToolHeader, checkHeaderContract, renderFlatTools } from './lib/flat-tool-header';
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

export interface FlatHeader {
  /** Leading doc-comment lines (shebang + env-preamble skipped). */
  headerLines: string[];
  style: 'jsdoc' | 'line' | 'none';
  /** `<Name>.ts — one-liner` (or ALL-CAPS banner) identity line, if found. */
  identity: string | null;
  /** One-line purpose extracted from the identity line (text after the dash). */
  purpose: string | null;
  hasUsage: boolean;
  /** Header self-declares library shape ("not a CLI" / "Consumed by:"). */
  libMarked: boolean;
  /** Header self-declares daemon shape (a `com.lifeos.*.plist` schedule). */
  daemonMarked: boolean;
  /** First @see target, if any. */
  pointer: string | null;
}

/** Regex-escape a filename stem for embedding. */
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extract the leading header block: shebang skipped, the #1404 env-normalization
 * preamble (comment + for-loop) skipped, comment blocks collected until the
 * first real code line.
 */
export function parseFlatToolHeader(source: string, filename: string): FlatHeader {
  const stem = filename.replace(/\.(ts|sh|py)$/, '');
  const hashComments = filename.endsWith('.sh') || filename.endsWith('.py');
  const lines = source.split('\n');
  const LIMIT = Math.min(lines.length, 80);
  let i = 0;
  if (lines[0]?.startsWith('#!')) i = 1;

  const blocks: string[][] = [];
  let cur: string[] = [];
  let sawJsdoc = false;
  while (i < LIMIT) {
    const l = lines[i].trim();
    if (l.startsWith('//') || (l.startsWith('#') && hashComments)) {
      cur.push(l);
      i++;
    } else if (l.startsWith('/*') || (l.startsWith('"""') && filename.endsWith('.py'))) {
      if (cur.length) { blocks.push(cur); cur = []; }
      const close = l.startsWith('/*') ? '*/' : '"""';
      const js: string[] = [];
      const first = i;
      while (i < LIMIT) {
        js.push(lines[i].trim());
        if (lines[i].includes(close) && !(i === first && lines[i].trim() === close)) { i++; break; }
        i++;
      }
      blocks.push(js);
      sawJsdoc = true;
    } else if (l === '') {
      if (cur.length) { blocks.push(cur); cur = []; }
      i++;
    } else if (/^for \(const __k of/.test(l)) {
      if (cur.length) { blocks.push(cur); cur = []; }
      let depth = (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length;
      i++;
      while (i < LIMIT && depth > 0) {
        depth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
        i++;
      }
    } else {
      break;
    }
  }
  if (cur.length) blocks.push(cur);

  const real = blocks.filter(b => !/Normalize env path vars/.test(b.join('\n')));
  const headerLines = real.flat();
  const h = headerLines.join('\n');
  const style: FlatHeader['style'] = headerLines.length === 0 ? 'none' : sawJsdoc ? 'jsdoc' : 'line';

  const content = headerLines
    .map(l => l.replace(/^\/\*+|\*+\/$|^\/\/+|^#+|^\*+/g, '').trim())
    .filter(l => l.length > 0);

  // Identity: a line leading with the stem + a dash separator, or an ALL-CAPS
  // banner line naming the stem. An ASCII hyphen must be followed by a space,
  // so a usage line (`algorithm -m loop …`) is not mistaken for the identity.
  const sep = '(?:[—–]|-(?=\\s))\\s*';
  const idRe = new RegExp(`^${esc(stem)}(\\.(ts|sh|py))?\\s*${sep}`, 'i');
  const bannerRe = new RegExp(`^${esc(stem.toUpperCase())}\\b\\s*${sep}`);
  let identity: string | null = null;
  let purpose: string | null = null;
  for (const l of content) {
    const m = idRe.exec(l) ?? bannerRe.exec(l);
    if (m) {
      identity = l;
      purpose = l.slice(m[0].length).trim() || null;
      break;
    }
  }

  const hasUsage =
    /USAGE\s*:/.test(h) || /Usage\s*:/i.test(h) || /Subcommands\s*:/i.test(h) ||
    /bun\s+\S*\.ts/.test(h) || new RegExp(`${esc(stem)}\\.(ts|sh|py)\\s+(\\w|<|\\[|-)`).test(h);
  const libMarked = /not a CLI/i.test(h) || /Consumed by\s*:/i.test(h);
  // A launchd-scheduled tool names its own plist in the header — either as an
  // explicit `Trigger:` line or as prose ("Triggered by …com.lifeos.x.plist").
  const daemonMarked = /Trigger\s*:.*com\.lifeos\./i.test(h) || /com\.lifeos\.[\w.-]+\.plist/i.test(h);
  const pointer = h.match(/@see\s+(\S+)/)?.[1] ?? null;

  return { headerLines, style, identity, purpose, hasUsage, libMarked, daemonMarked, pointer };
}

/**
 * Machine-checkable subset of the element contract. Returns missing-element
 * names; empty array = compliant. The @see pointer is not checked (requires
 * judging whether a governing doc exists).
 */
export function checkHeaderContract(header: FlatHeader): string[] {
  const missing: string[] = [];
  if (!header.identity) missing.push('identity line');
  // Purpose prose: at least one content line beyond the identity line.
  const prose = header.headerLines
    .map(l => l.replace(/^\/\*+|\*+\/$|^\/\/+|^#+|^\*+/g, '').trim())
    .filter(l => l.length > 20);
  if (header.identity && prose.length < 2) missing.push('purpose prose');
  if (!header.hasUsage && !header.libMarked) missing.push('usage (or library marker)');
  return missing;
}

export interface RenderOptions {
  /** Directory holding the flat tools. */
  toolsRoot: string;
  /** Files exempt from the header-contract audit (still listed in the table). */
  deferred?: string[];
  /** Class overrides for files whose headers cannot carry a marker yet. */
  classOverrides?: Record<string, string>;
}

/** Enumerate the flat tier: root *.ts (excluding *.test.ts), *.sh and *.py. */
export function listFlatTools(toolsRoot: string): string[] {
  return readdirSync(toolsRoot)
    .filter(f => /\.(ts|sh|py)$/.test(f) && !f.endsWith('.test.ts'))
    .filter(f => {
      try { return statSync(join(toolsRoot, f)).isFile(); } catch { return false; }
    })
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

/** Class a flat tool from what its own header declares. */
export function classifyFlatTool(filename: string, header: FlatHeader): string {
  if (filename.startsWith('Install')) return 'installer';
  if (header.daemonMarked) return 'daemon';
  if (header.libMarked) return header.hasUsage ? 'dual' : 'library';
  return 'cli';
}

/** Render the FlatTools.md registry. Deterministic: no timestamps. */
export function renderFlatTools(opts: RenderOptions): string {
  const deferred = new Set(opts.deferred ?? []);
  const overrides = opts.classOverrides ?? {};

  const rows: string[] = [];
  let gaps = 0;
  for (const f of listFlatTools(opts.toolsRoot)) {
    const header = parseFlatToolHeader(readFileSync(join(opts.toolsRoot, f), 'utf-8'), f);
    if (!deferred.has(f) && checkHeaderContract(header).length) gaps++;
    const cls = overrides[f] ?? classifyFlatTool(f, header);
    const purpose = (header.purpose ?? '—').replace(/\|/g, '\\|');
    const docs = header.pointer ? header.pointer.replace(/\|/g, '\\|') : 'header';
    rows.push(`| ${f} | ${cls} | ${purpose} | ${docs} |`);
  }

  const gapLine = gaps === 0
    ? 'Every header meets the element contract.'
    : `${gaps} header${gaps === 1 ? '' : 's'} short of the element contract — \`ToolsRegistry.ts --audit\` lists them.`;

  return [
    '# Flat Tools — generated registry',
    '',
    '> Generated by `LIFEOS/TOOLS/ToolsRegistry.ts` from the tools\' own headers — do not hand-edit.',
    '> Regenerate: `bun ~/.claude/LIFEOS/TOOLS/ToolsRegistry.ts`. Contract: `Tools.md` § Placement doctrine.',
    '',
    `${rows.length} tools in the LIFEOS/TOOLS root. ${gapLine}`,
    '',
    '| Tool | Class | Purpose | Docs |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}
