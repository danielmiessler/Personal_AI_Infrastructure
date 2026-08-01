#!/usr/bin/env bun
/**
 * MemoryDirIntegrity.ts — Memory subsystem inventory drift checker
 *
 * PURPOSE:
 * Keeps the canonical "Directory Inventory" table in MemorySystem.md honest
 * by diffing it against the actual directory tree under LIFEOS/MEMORY/. Surfaces
 * drift in two directions:
 *   - on-disk dir not listed in inventory (unknown subsystem)
 *   - inventory row marked "active" with no on-disk dir (missing subsystem)
 *
 * "reserved"-status rows are allowed to be empty or absent.
 *
 * TRIGGER: SessionEnd hook (called from DocIntegrity.hook.ts)
 *
 * READS:
 *   LIFEOS/DOCUMENTATION/Memory/MemorySystem.md (Directory Inventory table)
 *   LIFEOS/MEMORY/                                (one level deep)
 *
 * WRITES:
 *   stderr (audit log with [MemoryDirIntegrity] tag)
 *   STATE/events.jsonl (typed event: doc.integrity.memory_dir)
 *
 * SIDE EFFECTS:
 *   None — read-only check. Drift is a soft warning. The hook never blocks.
 */

import { readFileSync, readdirSync, existsSync, statSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { paiPath, getLifeosDir } from '../lib/paths';

const TAG = '[MemoryDirIntegrity]';
const LIFEOS_DIR = getLifeosDir();
const MEMORY_DIR = join(LIFEOS_DIR, 'MEMORY');
const INVENTORY_DOC = paiPath('DOCUMENTATION/Memory/MemorySystem.md');
const EVENTS_FILE = join(MEMORY_DIR, 'STATE', 'events.jsonl');

function emitEvent(payload: Record<string, unknown>): void {
  try {
    mkdirSync(join(MEMORY_DIR, 'STATE'), { recursive: true });
    const event = { timestamp: new Date().toISOString(), ...payload };
    appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8');
  } catch {
    // Event log is best-effort — never let drift checking fail because of telemetry.
  }
}

// Directories that exist on disk but are not subsystems and should be ignored.
const IGNORED_NAMES = new Set(['.DS_Store', '.git', 'node_modules']);

// Files at the MEMORY/ root that are not directories — README, etc.
const IGNORED_FILES = new Set(['README.md', '.DS_Store']);

interface InventoryRow {
  name: string;       // e.g., "KNOWLEDGE" or "LEARNING"
  klass: string;      // "core" | "skill-private" | "reserved"
  status: string;     // "active" | "reserved"
}

interface DriftItem {
  kind: 'unknown_on_disk' | 'missing_active' | 'inventory_unparseable';
  detail: string;
}

/**
 * Parse the Directory Inventory table out of MemorySystem.md.
 *
 * Table format expected (from the canonical doc):
 *
 *   | Directory | Class | Status | Purpose | Primary writers |
 *   |-----------|-------|--------|---------|-----------------|
 *   | `KNOWLEDGE/` | core | active | ... | ... |
 *
 * Each row's first column is a backtick-wrapped directory name with a
 * trailing slash. Class column is core/skill-private/reserved. Status is
 * active/reserved. We only care about the directory name, class, and status
 * for the drift check.
 */
function parseInventory(): InventoryRow[] | null {
  if (!existsSync(INVENTORY_DOC)) {
    console.error(`${TAG} Inventory doc not found: ${INVENTORY_DOC}`);
    return null;
  }

  const content = readFileSync(INVENTORY_DOC, 'utf-8');

  // Find the inventory section. We anchor on the section heading so we don't
  // accidentally pick up the auto-memory-coexistence table further down.
  const sectionMarker = '## Directory Inventory';
  const sectionStart = content.indexOf(sectionMarker);
  if (sectionStart < 0) {
    console.error(`${TAG} Could not find "${sectionMarker}" in inventory doc`);
    return null;
  }

  const nextSection = content.indexOf('\n## ', sectionStart + sectionMarker.length);
  const section = nextSection > 0
    ? content.slice(sectionStart, nextSection)
    : content.slice(sectionStart);

  // Match rows: `| `NAME/` | class | status | ... | ... |`
  // Tolerate variations in whitespace and the trailing slash being optional.
  const rowRegex = /^\|\s*`([\w_]+)\/?`\s*\|\s*([\w-]+)\s*\|\s*([\w-]+)\s*\|/gm;

  const rows: InventoryRow[] = [];
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(section)) !== null) {
    rows.push({
      name: match[1],
      klass: match[2].trim(),
      status: match[3].trim(),
    });
  }

  return rows;
}

function listMemoryDirsOnDisk(): string[] {
  if (!existsSync(MEMORY_DIR)) {
    console.error(`${TAG} MEMORY dir does not exist: ${MEMORY_DIR}`);
    return [];
  }

  const entries = readdirSync(MEMORY_DIR);
  const dirs: string[] = [];
  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry)) continue;
    if (IGNORED_FILES.has(entry)) continue;
    const fullPath = join(MEMORY_DIR, entry);
    try {
      if (statSync(fullPath).isDirectory()) dirs.push(entry);
    } catch {
      // skip unreadable entries
    }
  }
  return dirs.sort();
}

export async function handleMemoryDirIntegrity(): Promise<void> {
  const startTime = Date.now();
  console.error(`${TAG} === Starting memory inventory drift check ===`);

  const inventory = parseInventory();
  if (inventory === null) {
    const drift: DriftItem = {
      kind: 'inventory_unparseable',
      detail: `Failed to parse Directory Inventory from ${INVENTORY_DOC}. Drift check skipped.`,
    };
    console.error(`${TAG} [WARN] ${drift.detail}`);
    emitEvent({
      type: 'doc.integrity.memory_dir',
      source: 'MemoryDirIntegrity',
      drift: [drift],
      ok: false,
    });
    return;
  }

  if (inventory.length === 0) {
    console.error(`${TAG} [WARN] Inventory table parsed but contains zero rows. Check the table format in MemorySystem.md.`);
    emitEvent({
      type: 'doc.integrity.memory_dir',
      source: 'MemoryDirIntegrity',
      drift: [{ kind: 'inventory_unparseable', detail: 'Inventory parsed with zero rows' }],
      ok: false,
    });
    return;
  }

  const inventoryByName = new Map<string, InventoryRow>();
  for (const row of inventory) inventoryByName.set(row.name, row);

  const onDisk = listMemoryDirsOnDisk();
  const onDiskSet = new Set(onDisk);

  const drift: DriftItem[] = [];

  // Direction 1: dirs on disk not in inventory.
  for (const dir of onDisk) {
    // Skill-private dirs are recognized by CONVENTION, not by enumeration: any
    // `_`-prefixed dir is owned by the skill named `_<dir>` (see the `_X`
    // convention in MemorySystem.md). They are deliberately NOT listed by name
    // in the shipping inventory — naming each private skill in a public doc is
    // a leak, and enumerating them here just duplicates the convention. Their
    // internal schema is the owning skill's responsibility, not core memory's.
    if (dir.startsWith('_')) continue;
    if (!inventoryByName.has(dir)) {
      drift.push({
        kind: 'unknown_on_disk',
        detail: `MEMORY/${dir}/ exists but is not listed in MemorySystem.md Directory Inventory. Either add a row or remove the directory.`,
      });
    }
  }

  // Direction 2: active inventory rows missing on disk. Non-active rows
  // (reserved = not-yet-built; on-demand = created when the owning skill/tool
  // first runs) are allowed to be absent — a fresh install has run nothing yet.
  for (const row of inventory) {
    if (row.status === 'active' && !onDiskSet.has(row.name)) {
      drift.push({
        kind: 'missing_active',
        detail: `Inventory lists MEMORY/${row.name}/ as ${row.status} but directory does not exist on disk. Either create it or change the row's status to reserved/on-demand.`,
      });
    }
  }

  // Report.
  if (drift.length === 0) {
    console.error(`${TAG} [OK] ${onDisk.length} dirs on disk, ${inventory.length} inventory rows, no drift.`);
  } else {
    console.error(`${TAG} [DRIFT] ${drift.length} drift item(s) found:`);
    for (const item of drift) {
      console.error(`${TAG}   - ${item.kind}: ${item.detail}`);
    }
  }

  emitEvent({
    type: 'doc.integrity.memory_dir',
    source: 'MemoryDirIntegrity',
    on_disk_count: onDisk.length,
    inventory_count: inventory.length,
    drift_count: drift.length,
    drift,
    ok: drift.length === 0,
  });

  const elapsed = Date.now() - startTime;
  console.error(`${TAG} === Check complete (${elapsed}ms, drift=${drift.length}) ===`);
}

// Allow running standalone for verification.
if (import.meta.main) {
  handleMemoryDirIntegrity().catch((err) => {
    console.error(`${TAG} Fatal:`, err);
    process.exit(1);
  });
}
