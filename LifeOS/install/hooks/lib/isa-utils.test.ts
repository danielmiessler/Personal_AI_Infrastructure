import { test, expect } from 'bun:test';
import { appendDecisionRow } from './isa-utils';

// Regression (2026-09-01 incident): the auto-rewind appended its Decisions row
// with a STRING replacement built from the existing Decisions body. That body is
// full of literal dollar amounts, and String.replace treats `$1`/`$2`/`$&` in a
// replacement string as regex backreferences — so `$14,000` expanded to
// `<capture-group-1>4,000`, duplicating the `## Decisions` header and shredding
// the section. The fix uses a function replacer, whose return value is inserted
// verbatim with no `$` interpretation.
test('appendDecisionRow preserves dollar amounts and does not duplicate the section', () => {
  // Synthetic amounts chosen so their leading digits are `$1`/`$2`/`$3`/`$4` —
  // exactly the prefixes String.replace would misread as backreferences.
  const content =
    '---\nphase: complete\n---\n' +
    '## Decisions\n' +
    '- 2026-01-02: inflow +$12,000; net −$23,456.78; item $3,999; total $45,678.90\n' +
    '## Learning\n- note\n';

  const out = appendDecisionRow(content, '2026-09-01T00:00:00Z', 3);

  // Every dollar amount survives intact (the `$1`/`$2`/`$3` prefixes are the trap).
  for (const amt of ['$12,000', '$23,456.78', '$3,999', '$45,678.90']) {
    expect(out).toContain(amt);
  }
  // Exactly one Decisions heading — no backref-driven duplication.
  expect(out.match(/## Decisions/g)?.length).toBe(1);
  // The auto-rewind row was appended under Decisions, above Learning.
  expect(out).toContain('- D-auto-2026-09-01T00:00:00Z:');
  expect(out.indexOf('D-auto-')).toBeLessThan(out.indexOf('## Learning'));
  // No stray fragment line beginning with the tail of a split amount ($12,000 → 2,000).
  expect(out).not.toMatch(/^2,000/m);
  expect(out).not.toMatch(/^## Decisions[^\n]/m);
});
