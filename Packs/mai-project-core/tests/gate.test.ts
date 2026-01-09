import { describe, test, expect } from 'bun:test';
import {
  createGatesForProject,
  approveGate,
  rejectGate,
  allGatesApproved,
  getNextPendingGate,
  getCurrentPhase,
  GATE_CONFIGS,
  type Gate,
} from '../src/types/gate.ts';

describe('Gate', () => {
  describe('GATE_CONFIGS', () => {
    test('has software gates', () => {
      expect(GATE_CONFIGS.software).toContain('SPEC_APPROVED');
      expect(GATE_CONFIGS.software).toContain('TESTS_EXIST');
    });

    test('has physical gates', () => {
      expect(GATE_CONFIGS.physical).toContain('BUDGET_APPROVED');
      expect(GATE_CONFIGS.physical).toContain('SAFETY_REVIEW');
    });
  });

  describe('createGatesForProject', () => {
    test('creates software gates', () => {
      const gates = createGatesForProject('software');

      expect(gates).toHaveLength(6);
      expect(gates[0].name).toBe('SPEC_APPROVED');
      expect(gates[0].status).toBe('pending');
      expect(gates[0].id).toBe('spec-approved');
    });

    test('creates physical gates', () => {
      const gates = createGatesForProject('physical');

      expect(gates).toHaveLength(4);
      expect(gates[0].name).toBe('DESIGN_APPROVED');
    });

    test('defaults to software for unknown type', () => {
      const gates = createGatesForProject('unknown');

      expect(gates).toHaveLength(6);
    });
  });

  describe('approveGate', () => {
    test('sets approved status', () => {
      const gate: Gate = {
        id: 'test',
        name: 'TEST_GATE',
        description: 'Test',
        status: 'pending',
      };

      const approved = approveGate(gate, 'Joey', 'Looks good');

      expect(approved.status).toBe('approved');
      expect(approved.approver).toBe('Joey');
      expect(approved.comments).toBe('Looks good');
      expect(approved.approvedAt).toBeDefined();
    });
  });

  describe('rejectGate', () => {
    test('sets rejected status', () => {
      const gate: Gate = {
        id: 'test',
        name: 'TEST_GATE',
        description: 'Test',
        status: 'pending',
      };

      const rejected = rejectGate(gate, 'Joey', 'Needs more work');

      expect(rejected.status).toBe('rejected');
      expect(rejected.approver).toBe('Joey');
      expect(rejected.comments).toBe('Needs more work');
      expect(rejected.rejectedAt).toBeDefined();
    });
  });

  describe('allGatesApproved', () => {
    test('returns true when all approved', () => {
      const gates: Gate[] = [
        { id: 'a', name: 'A', description: 'A', status: 'approved' },
        { id: 'b', name: 'B', description: 'B', status: 'approved' },
      ];

      expect(allGatesApproved(gates)).toBe(true);
    });

    test('returns false when any pending', () => {
      const gates: Gate[] = [
        { id: 'a', name: 'A', description: 'A', status: 'approved' },
        { id: 'b', name: 'B', description: 'B', status: 'pending' },
      ];

      expect(allGatesApproved(gates)).toBe(false);
    });
  });

  describe('getNextPendingGate', () => {
    test('returns first pending gate', () => {
      const gates: Gate[] = [
        { id: 'a', name: 'A', description: 'A', status: 'approved' },
        { id: 'b', name: 'B', description: 'B', status: 'pending' },
        { id: 'c', name: 'C', description: 'C', status: 'pending' },
      ];

      const next = getNextPendingGate(gates);

      expect(next?.name).toBe('B');
    });

    test('returns undefined when all approved', () => {
      const gates: Gate[] = [
        { id: 'a', name: 'A', description: 'A', status: 'approved' },
      ];

      expect(getNextPendingGate(gates)).toBeUndefined();
    });
  });

  describe('getCurrentPhase', () => {
    test('returns SPEC when no gates approved', () => {
      const gates = createGatesForProject('software');

      expect(getCurrentPhase(gates)).toBe('SPEC');
    });

    test('returns DESIGN after SPEC_APPROVED', () => {
      const gates = createGatesForProject('software');
      gates[0].status = 'approved';

      expect(getCurrentPhase(gates)).toBe('DESIGN');
    });

    test('returns BUILD after DESIGN_APPROVED', () => {
      const gates = createGatesForProject('software');
      gates[0].status = 'approved';
      gates[1].status = 'approved';

      expect(getCurrentPhase(gates)).toBe('BUILD');
    });

    test('returns COMPLETE when all approved', () => {
      const gates = createGatesForProject('software');
      gates.forEach(g => g.status = 'approved');

      expect(getCurrentPhase(gates)).toBe('COMPLETE');
    });
  });
});
