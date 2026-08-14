#!/usr/bin/env bun
/**
 * MemoryDirIntegrity.ts — Memory subsystem inventory drift checker
 *
 * PURPOSE:
 * Keeps the canonical "Directory Inventory" table in MemorySystem.md honest
 * by diffing it against the actual directory tree under LIFEOS/MEMORY/. Surfaces
 * drift in three directions:
 *   - on-disk dir not listed in inventory (unknown subsystem)
 *   - inventory row whose Status says it must exist, with no on-disk dir
 *   - inventory row carrying a Status this checker does not recognise
 *
 * The Status column decides whether absence is drift, and only a recognised
 * value grants silence. `active` rows must exist; `on-demand`, `reserved` and
 * `dormant archive` rows may be absent. Anything else is REPORTED, not exempted
 * — previously every value other than `active` bought silence, so a typo and a
 * deliberate exemption were indistinguishable.
 *
 * TRIGGER: SessionEnd hook (called from DocIntegrity.hook.ts)
 *
 * READS:
 *   LIFEOS/DOCUMENTATION/Memory/MemorySystem.md (Directory Inventory table)
 *   LIFEOS/MEMORY/                                (one level deep)
 *
 * WRITES:
 *   stderr (audit log with [MemoryDirIntegrity] tag)
 *   STATE/events.jsonl (typed event: doc.integrity.memory_dir, via hooks/lib/events.ts)
 *     Full finding set on every completed check, empty set included — that is what
 *     lets the SessionStart readback show a fixed problem disappearing.
 *
 * SIDE EFFECTS:
 *   None — read-only check. Drift is a soft warning. The hook never blocks.
 *
 * Ported from public PR #1759, @anikinsasha (parse + status allowlist) and
 * public PR #1758, @anikinsasha (finding-set emission).
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { paiPath, getLifeosDir } from '../lib/paths';
import { emitFindingSet } from '../lib/events';

const TAG = '[MemoryDirIntegrity]';
const LIFEOS_DIR = getLifeosDir();
const MEMORY_DIR = join(LIFEOS_DIR, 'MEMORY');
const INVENTORY_DOC = paiPath('DOCUMENTATION/Memory/MemorySystem.md');

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
 * Statuses whose absence from disk is normal, and which therefore grant silence:
 *   on-demand      — a shipped writer creates it on first use
 *   reserved       — nothing creates it and nothing reads it (reason required)
 *   dormant archive — kept for recall; its writers are retired, nothing appends
 *
 * `active` is the one status that requires the directory to exist. Any value
 * NOT in this set and not `active` is reported as unclassified rather than
 * silently exempted.
 */
const MAY_BE_ABSENT = new Set(['on-demand', 'reserved', 'dormant archive']);
const MUST_EXIST = new Set(['active']);
const KNOWN_STATUS = new Set([...MUST_EXIST, ...MAY_BE_ABSENT]);

/**
 * One drift finding. `key` is its identity across runs — the SessionStart
 * readback compares key sets to decide whether anything changed, so it holds
 * the subsystem name and nothing that churns (no counts, no timestamps).
 */
interface DriftItem {
  kind: 'unknown_on_disk' | 'missing_active' | 'unclassified_status' | 'inventory_unparseable';
  key: string;
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
 * Cells are read POSITIONALLY by splitting on `|` rather than matched with one
 * pattern over the whole row. The difference is not cosmetic: the old pattern
 * anchored the status cell as a single `[\w-]+` word, which silently DROPPED
 * any row whose status contains a space — and a dropped row is invisible in
 * both directions. `RELATIONSHIP/` (status `dormant archive`) fell out of the
 * parse entirely, so its absence stopped being checked AND its directory on
 * disk started reporting as an unknown subsystem on every single run.
 * Reading the cell verbatim and judging it afterwards means an unrecognised
 * status is a REPORT, never a disappearance.
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

  // Bind to the inventory TABLE, not to the whole section. The section also
  // contains prose tables (§ Status defines the Status vocabulary in a table of
  // its own), and a whole-section scan reads those rows as inventory rows —
  // caught live on 2026-08-05, when the § Status table's own `active` row was
  // reported as a memory subsystem with an unrecognised status.
  const lines = section.split('\n');
  const headerIdx = lines.findIndex((l) => /^\|\s*Directory\s*\|\s*Class\s*\|\s*Status\s*\|/.test(l.trim()));
  if (headerIdx < 0) return null;

  const rows: InventoryRow[] = [];
  // Consume the contiguous run of table lines and stop at the first line that
  // is not one — the table ends where the table ends.
  for (const line of lines.slice(headerIdx + 1)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) break;

    // Split on the pipes, drop the empty edges. Cells stay verbatim.
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;

    // Column 1 identifies the row: a backtick-wrapped dir name, trailing slash
    // optional. Anything else is a header, a separator, or prose in a table.
    const nameMatch = cells[0].match(/^`([\w_]+)\/?`$/);
    if (!nameMatch) continue;

    rows.push({ name: nameMatch[1], klass: cells[1], status: cells[2] });
  }

  return rows;
}

/** Read the shipped doc and parse it. The IO half; the parse above is pure. */
function parseInventory(): InventoryRow[] | null {
  if (!existsSync(INVENTORY_DOC)) {
    console.error(`${TAG} Inventory doc not found: ${INVENTORY_DOC}`);
    return null;
  }
  const rows = parseInventoryTable(readFileSync(INVENTORY_DOC, 'utf-8'));
  if (rows === null) {
    console.error(`${TAG} Could not find a parseable "## Directory Inventory" table in ${INVENTORY_DOC}`);
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
 * independent of the filesystem, and the unit a test can drive directly.
 *
 * One row yields at most one finding: a row nobody classified is reported as
 * unclassified rather than ALSO as missing, because the remedy is the same
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
        key: `unknown_on_disk:${dir}`,
        detail: `MEMORY/${dir}/ exists but is not listed in MemorySystem.md Directory Inventory. Either add a row or remove the directory.`,
      });
    }
  }

  // Direction 2: rows nobody classified — reported whether or not the directory
  // exists, because the row's absence policy is undefined until someone writes a
  // recognised value, and an unrecognised value that grants silence is
  // indistinguishable from a deliberate exemption.
  //
  // Direction 3: rows whose Status says the directory must already be there.
  // Statuses in MAY_BE_ABSENT are allowed to be missing — a fresh install has
  // run nothing yet, and a dormant archive may never have existed here.
  for (const row of inventory) {
    if (!KNOWN_STATUS.has(row.status)) {
      drift.push({
        kind: 'unclassified_status',
        key: `unclassified_status:${row.name}`,
        detail: `Inventory row MEMORY/${row.name}/ has Status "${row.status}", which is not one of ${[...KNOWN_STATUS].map((v) => `\`${v}\``).join(', ')}. The row is enforced in neither direction until it carries a recognised Status — an unrecognised value is not an exemption. See MemorySystem.md § Directory Inventory § Status.`,
      });
      continue;
    }
    if (MUST_EXIST.has(row.status) && !onDiskSet.has(row.name)) {
      drift.push({
        kind: 'missing_active',
        key: `missing_active:${row.name}`,
        detail: `MEMORY/${row.name}/ does not exist on disk and the row is \`${row.status}\`. Create it, or give the row the Status that is actually true — but a row whose directory still has a shipped reader must not be reclassified to silence it (MemorySystem.md § Governance — reclassification).`,
      });
    }
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
      key: 'inventory_unparseable:doc',
      detail: `Failed to parse Directory Inventory from ${INVENTORY_DOC}. Drift check skipped.`,
    };
    console.error(`${TAG} [WARN] ${drift.detail}`);
    emitFindingSet({
      type: 'doc.integrity.memory_dir',
      source: 'MemoryDirIntegrity',
      findings: [drift],
    });
    return;
  }

  if (inventory.length === 0) {
    console.error(`${TAG} [WARN] Inventory table parsed but contains zero rows. Check the table format in MemorySystem.md.`);
    emitFindingSet({
      type: 'doc.integrity.memory_dir',
      source: 'MemoryDirIntegrity',
      findings: [{
        kind: 'inventory_unparseable',
        key: 'inventory_unparseable:zero_rows',
        detail: 'Inventory parsed with zero rows',
      }],
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

  // Emitted on every completed check, empty set included — see the emission
  // contract in hooks/lib/events.ts. Silence here would mean "not checked".
  emitFindingSet({
    type: 'doc.integrity.memory_dir',
    source: 'MemoryDirIntegrity',
    findings: drift,
    extra: {
      on_disk_count: onDisk.length,
      inventory_count: inventory.length,
    },
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
