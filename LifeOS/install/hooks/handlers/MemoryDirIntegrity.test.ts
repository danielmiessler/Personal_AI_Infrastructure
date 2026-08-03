/**
 * MemoryDirIntegrity.test.ts — inventory parse contract and drift scoping.
 *
 * Run: bun test LifeOS/install/hooks/handlers/MemoryDirIntegrity.test.ts
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseInventoryTable, computeDrift } from './MemoryDirIntegrity';

const SHIPPED_DOC = join(import.meta.dir, '../../LIFEOS/DOCUMENTATION/Memory/MemorySystem.md');

/** DeployCore.ts MEMORY_SUBDIRS — the directories guided setup creates. */
const DEPLOY_CORE_DIRS = ['WORK', 'KNOWLEDGE', 'LEARNING', 'STATE', 'OBSERVABILITY', 'SKILLS'];

function table(rows: string[]): string {
  return [
    '## Directory Inventory (authoritative)',
    '',
    '| Directory | Class | Status | Purpose | Primary writers |',
    '|-----------|-------|--------|---------|-----------------|',
    ...rows,
    '',
    '## Next Section',
  ].join('\n');
}

describe('parseInventoryTable', () => {
  test('reads name, class and status', () => {
    const rows = parseInventoryTable(table(['| `WORK/` | core | active | Purpose | Writer |']));
    expect(rows).toEqual([{ name: 'WORK', klass: 'core', status: 'active' }]);
  });

  test('a status with a space in it is read verbatim, not dropped', () => {
    // The regression this whole parse rewrite exists for. A row-wide pattern
    // anchoring the status as one word does not match this line at all, so the
    // row silently leaves the inventory — and a row that is not in the
    // inventory is enforced in neither direction.
    const rows = parseInventoryTable(table(['| `RELATIONSHIP/` | core | dormant archive | P | W |']))!;
    expect(rows.map((r) => r.name)).toEqual(['RELATIONSHIP']);
    expect(rows[0].status).toBe('dormant archive');
  });

  test('a placeholder row documents a convention and is not a directory', () => {
    const rows = parseInventoryTable(table([
      '| `_<skill>/` | skill-private | on-demand | Per-skill private state | the owning skill |',
      '| `WORK/` | core | active | P | W |',
    ]))!;
    expect(rows.map((r) => r.name)).toEqual(['WORK']);
  });

  test('returns null when the section heading is absent', () => {
    expect(parseInventoryTable('# Some other doc\n\nNo inventory here.')).toBeNull();
  });

  test('ignores the separator row and non-row lines', () => {
    const rows = parseInventoryTable(table(['| `A/` | core | active | P | W |', 'prose line', '']))!;
    expect(rows.length).toBe(1);
  });

  test('stops at the next section so other tables in the file are not read', () => {
    const doc = table(['| `A/` | core | active | P | W |'])
      + '\n| `NOT_A_ROW/` | core | active | different table | W |\n';
    expect(parseInventoryTable(doc)!.map((r) => r.name)).toEqual(['A']);
  });
});

describe('computeDrift — status scoping', () => {
  const rows = (status: string, klass = 'core') => [{ name: 'X', klass, status }];

  test('active rows warn when absent', () => {
    expect(computeDrift(rows('active'), []).map((d) => d.kind)).toEqual(['missing_active']);
  });

  test('pending rows warn when absent — a live reader with no empty state stays loud', () => {
    expect(computeDrift(rows('pending'), []).map((d) => d.kind)).toEqual(['missing_active']);
  });

  test('on-demand rows are silent when absent', () => {
    expect(computeDrift(rows('on-demand'), [])).toEqual([]);
  });

  test('reserved rows are silent when absent', () => {
    expect(computeDrift(rows('reserved'), [])).toEqual([]);
  });

  test('a present directory never warns', () => {
    expect(computeDrift(rows('active'), ['X'])).toEqual([]);
  });

  test('an unrecognised status is reported, never exempted', () => {
    // Today an unrecognised value is indistinguishable from a deliberate
    // exemption, because enforcement is `status === "active"` and everything
    // else falls through to silence. A typo is not a decision.
    const drift = computeDrift(rows('activee'), []);
    expect(drift.map((d) => d.kind)).toEqual(['unrecognised_status']);
    expect(drift[0].detail).toContain('"activee"');
  });

  test('an unrecognised status is reported even when the directory exists', () => {
    // The row's absence policy is undefined either way, and the fresh install
    // that has not created the directory yet is the one that needs telling.
    expect(computeDrift(rows('dormant archive'), ['X']).map((d) => d.kind)).toEqual(['unrecognised_status']);
  });

  test('one row yields at most one finding', () => {
    expect(computeDrift(rows('dormant archive'), []).length).toBe(1);
  });

  test('a dir on disk with no row is still reported', () => {
    const drift = computeDrift(rows('active'), ['X', 'MYSTERY']);
    expect(drift.map((d) => d.kind)).toEqual(['unknown_on_disk']);
    expect(drift[0].detail).toContain('MEMORY/MYSTERY/');
  });

  test('`_`-prefixed dirs on disk are recognised by convention, not by row', () => {
    expect(computeDrift(rows('active'), ['X', '_NETWORK'])).toEqual([]);
  });

  test('a row whose status the parse could not classify keeps its directory recognised', () => {
    // The second half of the dropped-row failure: the old parse removed the row
    // from the inventory entirely, so an install that HAS the directory started
    // reporting it as an unknown subsystem. Reading the row keeps that quiet
    // while the status itself is what gets reported.
    const drift = computeDrift(rows('dormant archive'), ['X']);
    expect(drift.some((d) => d.kind === 'unknown_on_disk')).toBe(false);
  });

  test('the missing remedy does not propose flipping the row to silence it', () => {
    const detail = computeDrift(rows('active'), [])[0].detail;
    expect(detail).not.toContain("change the row's status to reserved");
    expect(detail).toContain('must not be reclassified to silence it');
  });
});

describe('the shipped Directory Inventory', () => {
  const doc = readFileSync(SHIPPED_DOC, 'utf-8');
  const inventory = parseInventoryTable(doc)!;

  test('parses', () => {
    expect(inventory).not.toBeNull();
    expect(inventory.length).toBeGreaterThan(20);
  });

  test('every row carries a recognised status', () => {
    const drift = computeDrift(inventory, []).filter((d) => d.kind === 'unrecognised_status');
    expect(drift.map((d) => d.detail)).toEqual([]);
  });

  test('exactly the six DeployCore directories are `active`', () => {
    const active = inventory.filter((r) => r.status === 'active').map((r) => r.name).sort();
    expect(active).toEqual([...DEPLOY_CORE_DIRS].sort());
  });

  /** The table's own pending set. Read, never hard-coded: a `pending` row is a
   *  debt cleared by the release that gives its reader an empty state, so the
   *  set shrinks by design. Pinning the names here would make doing that
   *  correctly break this suite, and omitting it cost nothing — exactly the
   *  wrong way round. */
  const pending = inventory.filter((r) => r.status === 'pending').map((r) => r.name).sort();

  test('the pending set is the one this table documents as pending', () => {
    // Keyed on the invariant that survives a flip: the table and the governance
    // paragraph that explains it say the same thing. A rebaser who flips a
    // Status cell without updating the paragraph gets told here; one who
    // updates both stays green.
    const governance = doc.match(/\*\*Governance — reclassification\.\*\*[\s\S]*?\n\n/)![0];
    const named = [...governance.matchAll(/`(\w+)\/`/g)].map((m) => m[1]).sort();
    expect(named).toEqual(pending);
  });

  test('a fresh install before setup warns about the active and pending rows only', () => {
    const active = inventory.filter((r) => r.status === 'active');
    const drift = computeDrift(inventory, []);
    expect(drift.every((d) => d.kind === 'missing_active')).toBe(true);
    expect(drift.length).toBe(active.length + pending.length);
  });

  test('after guided setup the perpetual warnings drop to the pending rows', () => {
    // The measured symptom this change exists to fix: 14 permanent warnings on
    // a fresh guided install at v7.28.3. What remains is deliberate — each
    // pending row is cleared by the change that gives its reader an empty state.
    const drift = computeDrift(inventory, DEPLOY_CORE_DIRS);
    expect(drift.length).toBe(pending.length);
    expect(drift.every((d) => pending.some((n) => d.detail.includes(`MEMORY/${n}/`)))).toBe(true);
  });

  test('an upgraded install that already has the pending directories is silent', () => {
    // The install that has been running since v6 has these trees on disk. It
    // should see nothing at all — neither a missing-row warning nor the
    // unknown-subsystem warning a dropped row produces.
    expect(computeDrift(inventory, [...DEPLOY_CORE_DIRS, ...pending])).toEqual([]);
  });

  test('every reserved row states a reason in its Purpose cell', () => {
    for (const row of inventory.filter((r) => r.status === 'reserved')) {
      const line = doc.split('\n').find((l) => l.includes(`\`${row.name}/\``) && l.includes('| reserved |'));
      expect(line).toBeDefined();
      const purpose = line!.split('|').slice(1).map((c) => c.trim())[3] ?? '';
      expect(purpose.length).toBeGreaterThan(20);
    }
  });

  test('no Primary writers cell names a component the payload does not ship', () => {
    // The phantom-writer class: a writer cell naming something that exists in
    // no shipped file. Scoped to the writer cell rather than the whole row on
    // purpose — a Purpose cell may legitimately name a retired component while
    // explaining that it is retired, and that sentence is the opposite of the
    // defect. Checked against the names this PR corrected, so a future edit
    // that puts one back into a writer cell is caught here.
    const phantoms = ['SecurityPipeline', 'TeammateIdle', 'HomeSensorDetector', 'Speedtest', 'RelationshipMemory', 'RelationshipReflect', 'OpinionTracker', 'ShadowRelease'];
    for (const line of doc.split('\n')) {
      if (!/^\|\s*`[^`]+`\s*\|/.test(line)) continue;
      const writers = line.split('|').slice(1).map((c) => c.trim())[4] ?? '';
      for (const name of phantoms) expect(writers).not.toContain(name);
    }
  });
});
