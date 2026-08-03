#!/usr/bin/env bun
/**
 * MemoryDirIntegrity.ts — Memory subsystem inventory drift checker
 *
 * PURPOSE:
 * Keeps the canonical "Directory Inventory" table in MemorySystem.md honest
 * by diffing it against the actual directory tree under LIFEOS/MEMORY/. Surfaces
 * drift in three directions:
 *   - on-disk dir not listed in inventory (unknown subsystem)
 *   - inventory row whose directory must already exist, with no on-disk dir
 *   - inventory row the table never classified (unrecognised status)
 *
 * The Status column decides whether absence is drift, and only a recognised
 * value grants silence. `active` and `pending` rows must exist; `on-demand` and
 * `reserved` rows may be absent; anything else — a typo, a value with a space
 * in it, a row added before this vocabulary existed — is reported rather than
 * exempted. Silence is a decision someone has to make on the record, because a
 * checker that quietly forgets a row cannot be distinguished from a clean tree.
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
  klass: string;      // "core" | "skill-private"
  status: string;     // as written in the table, verbatim — never normalised
}

/**
 * Statuses whose absence is normal, and which therefore grant silence:
 *   on-demand — a shipped writer creates it on first use
 *   reserved  — nothing creates it and nothing reads it (reason required)
 *
 * Statuses whose absence is reported:
 *   active    — guided setup creates it, so absence afterwards is real drift
 *   pending   — a shipped reader still consumes it and has no empty state yet;
 *               the warning is the debt, and it stands until the release that
 *               gives that reader an empty state reclassifies the row
 *
 * Any other value is neither: see UNRECOGNISED handling in computeDrift.
 */
const SILENT_WHEN_ABSENT = new Set(['on-demand', 'reserved']);
const WARN_WHEN_ABSENT = new Set(['active', 'pending']);
const KNOWN_STATUS = new Set([...SILENT_WHEN_ABSENT, ...WARN_WHEN_ABSENT]);

interface DriftItem {
  kind: 'unknown_on_disk' | 'missing_active' | 'unrecognised_status' | 'inventory_unparseable';
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
 * Cells are read positionally by splitting on `|` rather than matched with one
 * pattern over the whole row. The difference is not cosmetic: a single pattern
 * anchoring the status cell as one word silently DROPS any row whose status
 * contains a space, and a dropped row is invisible in both directions — its
 * absence stops being checked, and its directory on disk starts reporting as an
 * unknown subsystem. Reading the cell verbatim and judging it afterwards means
 * an unclassifiable row is reported as itself.
 *
 * Exported for tests; the parse contract is the thing most likely to break
 * silently.
 */
export function parseInventoryTable(content: string): InventoryRow[] | null {
  // Anchor on the section heading so we don't pick up other tables in the file.
  const sectionMarker = '## Directory Inventory';
  const sectionStart = content.indexOf(sectionMarker);
  if (sectionStart < 0) return null;

  const nextSection = content.indexOf('\n## ', sectionStart + sectionMarker.length);
  const section = nextSection > 0
    ? content.slice(sectionStart, nextSection)
    : content.slice(sectionStart);

  const rows: InventoryRow[] = [];
  for (const line of section.split('\n')) {
    const named = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (!named) continue;

    const name = named[1].replace(/\/$/, '');
    // `_<skill>/` and friends are convention rows: they document a naming rule
    // rather than a directory. The drift check recognises `_`-prefixed dirs by
    // that convention (see below), so a placeholder row has nothing to check.
    if (name.includes('<')) continue;

    const cells = line.split('|').slice(1).map((c) => c.trim());
    rows.push({ name, klass: cells[1] ?? '', status: cells[2] ?? '' });
  }

  return rows;
}

function parseInventory(): InventoryRow[] | null {
  if (!existsSync(INVENTORY_DOC)) {
    console.error(`${TAG} Inventory doc not found: ${INVENTORY_DOC}`);
    return null;
  }

  const rows = parseInventoryTable(readFileSync(INVENTORY_DOC, 'utf-8'));
  if (rows === null) {
    console.error(`${TAG} Could not find "## Directory Inventory" in inventory doc`);
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

/**
 * Diff the inventory against the on-disk tree. Pure — the whole drift policy,
 * independent of the filesystem, and the unit under test.
 *
 * One row yields at most one finding: a row nobody classified is reported as
 * unclassified rather than also as missing, because the remedy is the same
 * sentence either way and two lines for one row trains people to skim.
 */
export function computeDrift(inventory: InventoryRow[], onDisk: string[]): DriftItem[] {
  const inventoryByName = new Map<string, InventoryRow>();
  for (const row of inventory) inventoryByName.set(row.name, row);
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

  // Direction 2: rows the table never classified. Reported whether or not the
  // directory exists, because the row's absence policy is undefined until
  // someone writes a recognised value — and an unrecognised value that grants
  // silence is indistinguishable from a deliberate exemption.
  for (const row of inventory) {
    if (KNOWN_STATUS.has(row.status)) continue;
    drift.push({
      kind: 'unrecognised_status',
      detail: `Inventory row MEMORY/${row.name}/ has status "${row.status}", which is not one of `
        + `${[...KNOWN_STATUS].map((s) => `\`${s}\``).join(', ')}. `
        + `The row is not being enforced in either direction until it carries a recognised status. `
        + `See MemorySystem.md § Directory Inventory § Status.`,
    });
  }

  // Direction 3: rows whose directory must already exist but does not.
  for (const row of inventory) {
    if (!WARN_WHEN_ABSENT.has(row.status)) continue;
    if (onDiskSet.has(row.name)) continue;
    drift.push({
      kind: 'missing_active',
      detail: `MEMORY/${row.name}/ does not exist on disk and the row is \`${row.status}\`. `
        + `If setup should have created it, create it or re-run the Setup scaffold step. `
        + `If nothing in this install writes it, give the row the status that is true — `
        + `but a row whose directory still has a shipped reader must not be reclassified to silence it. `
        + `See MemorySystem.md § Directory Inventory.`,
    });
  }

  return drift;
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

  const onDisk = listMemoryDirsOnDisk();
  const drift = computeDrift(inventory, onDisk);

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
