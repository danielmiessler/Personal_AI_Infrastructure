#!/usr/bin/env bun
/**
 * ToolsRegistry.ts — regenerate the flat-tool registry (FlatTools.md) from headers.
 *
 * Scans the LIFEOS/TOOLS root, parses each flat tool's leading header block
 * against the element contract, and writes the generated registry table to
 * DOCUMENTATION/Tools/FlatTools.md. The headers are the single source of
 * truth; the registry is derived and never hand-edited. Deterministic output
 * (no timestamps) — regeneration on an unchanged tree is a zero diff.
 *
 * Usage:
 *   bun ~/.claude/LIFEOS/TOOLS/ToolsRegistry.ts             (write FlatTools.md)
 *   bun ~/.claude/LIFEOS/TOOLS/ToolsRegistry.ts --check     (exit 1 + report if stale; writes nothing)
 *   bun ~/.claude/LIFEOS/TOOLS/ToolsRegistry.ts --stdout    (print, write nothing)
 *   bun ~/.claude/LIFEOS/TOOLS/ToolsRegistry.ts --audit     (per-file contract report for the whole tier)
 *
 * @see ~/.claude/LIFEOS/DOCUMENTATION/Tools/Tools.md
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getLifeosDir } from '../../hooks/lib/paths';
import {
  renderFlatTools,
  listFlatTools,
  parseFlatToolHeader,
  checkHeaderContract,
} from '../../hooks/lib/flat-tool-header';

const LIFEOS = getLifeosDir();
const TOOLS_ROOT = join(LIFEOS, 'TOOLS');
const REGISTRY = join(LIFEOS, 'DOCUMENTATION', 'Tools', 'FlatTools.md');

const args = new Set(process.argv.slice(2));

if (args.has('--audit')) {
  let bad = 0;
  for (const f of listFlatTools(TOOLS_ROOT)) {
    const header = parseFlatToolHeader(readFileSync(join(TOOLS_ROOT, f), 'utf-8'), f);
    const missing = checkHeaderContract(header);
    if (missing.length) {
      bad++;
      console.log(`${f}: missing ${missing.join(', ')}`);
    }
  }
  console.log(bad === 0 ? 'audit: all flat tools contract-compliant' : `audit: ${bad} non-compliant`);
  process.exit(bad === 0 ? 0 : 1);
}

const rendered = renderFlatTools({ toolsRoot: TOOLS_ROOT });

if (args.has('--stdout')) {
  console.log(rendered);
  process.exit(0);
}

if (args.has('--check')) {
  const onDisk = existsSync(REGISTRY) ? readFileSync(REGISTRY, 'utf-8') : null;
  if (onDisk === rendered) {
    console.log('FlatTools.md: current');
    process.exit(0);
  }
  console.log(onDisk === null ? 'FlatTools.md: missing — run ToolsRegistry.ts' : 'FlatTools.md: stale — run ToolsRegistry.ts');
  process.exit(1);
}

writeFileSync(REGISTRY, rendered);
console.log(`wrote ${REGISTRY}`);
