/**
 * PostCompactRecovery.test.ts — Output shape validation for compact recovery hook
 *
 * Imports buildRecoveryBlock() directly from hooks/lib/recovery-block.ts so
 * tests always reflect actual hook behavior — no logic drift from duplication.
 *
 * Run: bun test ./.claude/tests/PostCompactRecovery.test.ts
 */

import { test, expect, describe } from 'bun:test';
import { buildRecoveryBlock } from '../hooks/lib/recovery-block';

describe('PostCompactRecovery', () => {

  // ── Required header and identity ──
  test('recovery block has correct header',
    () => expect(buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'UTC' }))
      .toContain('## POST-COMPACTION CONTEXT RECOVERY'));

  test('recovery block contains DA name',
    () => expect(buildRecoveryBlock({ daName: 'TestDA', principalName: 'User', timezone: 'UTC' }))
      .toContain('You are TestDA'));

  test('recovery block contains principal name',
    () => expect(buildRecoveryBlock({ daName: 'DA', principalName: 'TestUser', timezone: 'UTC' }))
      .toContain('**Principal:** TestUser'));

  test('recovery block contains timezone',
    () => expect(buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'America/Los_Angeles' }))
      .toContain('America/Los_Angeles'));

  test('recovery block contains algorithm version',
    () => expect(buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'UTC' }))
      .toContain('v3.8.0'));

  // ── Mode format ──
  test('recovery block contains all three modes', () => {
    const block = buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'UTC' });
    expect(block).toContain('ALGORITHM');
    expect(block).toContain('NATIVE');
    expect(block).toContain('MINIMAL');
  });

  // ── Behavioral rules ──
  test('recovery block contains behavioral rules section',
    () => expect(buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'UTC' }))
      .toContain('Critical behavioral rules restored after compaction'));

  // ── Algorithm state (optional) ──
  test('includes algorithm state when provided', () => {
    const block = buildRecoveryBlock({
      daName: 'DA', principalName: 'User', timezone: 'UTC',
      algorithmState: { phase: 'execute', effort: 'extended', prd_path: 'MEMORY/WORK/test/PRD.md' },
    });
    expect(block).toContain('Phase: EXECUTE');
    expect(block).toContain('Effort: extended');
    expect(block).toContain('PRD: MEMORY/WORK/test/PRD.md');
  });

  test('omits algorithm state when not provided',
    () => expect(buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'UTC' }))
      .not.toContain('Current Algorithm state'));

  test('phase is uppercased in algorithm state', () => {
    const block = buildRecoveryBlock({
      daName: 'DA', principalName: 'User', timezone: 'UTC',
      algorithmState: { phase: 'observe', effort: 'standard', prd_path: 'MEMORY/WORK/x/PRD.md' },
    });
    expect(block).toContain('Phase: OBSERVE');
    expect(block).not.toContain('Phase: observe');
  });

  // ── Hook output shape ──
  test('output is valid hook JSON with additionalContext', () => {
    const block = buildRecoveryBlock({ daName: 'DA', principalName: 'User', timezone: 'UTC' });
    const parsed = JSON.parse(JSON.stringify({ additionalContext: block }));
    expect(parsed).toHaveProperty('additionalContext');
    expect(typeof parsed.additionalContext).toBe('string');
    expect(parsed.additionalContext.length).toBeGreaterThan(100);
  });
});
