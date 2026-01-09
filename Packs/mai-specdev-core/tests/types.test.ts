/**
 * Type Tests for mai-specdev-core
 */

import { describe, test, expect } from 'bun:test';
import {
  // Spec types
  createSpecDocument,
  validateSpec,
  updateSpecStatus,
  approveSpec,
  // Design types
  createDesignDocument,
  validateDesign,
  addComponent,
  approveDesign,
  // Quality types
  createDefaultQualityConfig,
  createBunQualityConfig,
  createQualityReport,
  allQualityGatesPassed,
  getFailedGates,
  // Security types
  createSecurityChecklist,
  updateSecurityCheck,
  createSecurityReport,
  phaseSecurityPassed,
  getSecurityFailures,
} from '../src/index.ts';

describe('Spec Document', () => {
  test('createSpecDocument creates draft spec', () => {
    const spec = createSpecDocument('Test Spec', 'Joey', 'Need to test things');

    expect(spec.metadata.title).toBe('Test Spec');
    expect(spec.metadata.author).toBe('Joey');
    expect(spec.metadata.status).toBe('draft');
    expect(spec.sections.problemStatement).toBe('Need to test things');
  });

  test('validateSpec returns errors for empty spec', () => {
    const spec = createSpecDocument('', '', '');
    const result = validateSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
    expect(result.errors).toContain('Problem statement is required');
  });

  test('validateSpec passes for valid spec', () => {
    const spec = createSpecDocument('Test', 'Joey', 'Problem');
    spec.sections.successCriteria = ['Done'];
    spec.sections.approach = 'Build it';
    spec.sections.securityImplications = ['None expected'];

    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  test('updateSpecStatus changes status', () => {
    const spec = createSpecDocument('Test', 'Joey', 'Problem');
    const updated = updateSpecStatus(spec, 'review');

    expect(updated.metadata.status).toBe('review');
    expect(spec.metadata.status).toBe('draft'); // Original unchanged
  });

  test('approveSpec sets approval info', () => {
    const spec = createSpecDocument('Test', 'Joey', 'Problem');
    const approved = approveSpec(spec, 'Charles', 'Looks good');

    expect(approved.metadata.status).toBe('approved');
    expect(approved.approval?.approver).toBe('Charles');
    expect(approved.approval?.comments).toBe('Looks good');
    expect(approved.approval?.date).toBeTruthy();
  });
});

describe('Design Document', () => {
  test('createDesignDocument creates draft design', () => {
    const design = createDesignDocument('Test Design', 'Joey', 'SPEC-001');

    expect(design.metadata.title).toBe('Test Design');
    expect(design.metadata.specRef).toBe('SPEC-001');
    expect(design.metadata.status).toBe('draft');
  });

  test('validateDesign returns errors for empty design', () => {
    const design = createDesignDocument('', '', '');
    const result = validateDesign(design);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
    expect(result.errors).toContain('Spec reference is required');
  });

  test('addComponent adds component to design', () => {
    const design = createDesignDocument('Test', 'Joey', 'SPEC-001');
    const updated = addComponent(design, {
      name: 'Parser',
      description: 'Parses input',
      type: 'module',
      responsibilities: ['Parse input'],
      dependencies: [],
      interfaces: ['IParser'],
    });

    expect(updated.sections.componentIdentification).toHaveLength(1);
    expect(updated.sections.componentIdentification[0].name).toBe('Parser');
  });

  test('approveDesign sets approval info', () => {
    const design = createDesignDocument('Test', 'Joey', 'SPEC-001');
    const approved = approveDesign(design, 'Charles');

    expect(approved.metadata.status).toBe('approved');
    expect(approved.approval?.approver).toBe('Charles');
  });
});

describe('Quality Gates', () => {
  test('createDefaultQualityConfig returns valid config', () => {
    const config = createDefaultQualityConfig();

    expect(config.linting.tool).toBe('eslint');
    expect(config.typeChecking.tool).toBe('tsc');
    expect(config.formatting.tool).toBe('prettier');
    expect(config.coverage.threshold).toBe(80);
  });

  test('createBunQualityConfig uses biome', () => {
    const config = createBunQualityConfig();

    expect(config.linting.tool).toBe('biome');
    expect(config.formatting.tool).toBe('biome');
  });

  test('createQualityReport calculates summary', () => {
    const results = [
      { gate: 'lint', status: 'passed' as const },
      { gate: 'types', status: 'passed' as const },
      { gate: 'format', status: 'failed' as const },
      { gate: 'coverage', status: 'skipped' as const },
    ];

    const report = createQualityReport('Test Project', results);

    expect(report.summary.total).toBe(4);
    expect(report.summary.passed).toBe(2);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.skipped).toBe(1);
  });

  test('allQualityGatesPassed returns false when failures exist', () => {
    const results = [
      { gate: 'lint', status: 'passed' as const },
      { gate: 'types', status: 'failed' as const },
    ];
    const report = createQualityReport('Test', results);

    expect(allQualityGatesPassed(report)).toBe(false);
  });

  test('allQualityGatesPassed returns true when all pass', () => {
    const results = [
      { gate: 'lint', status: 'passed' as const },
      { gate: 'types', status: 'passed' as const },
    ];
    const report = createQualityReport('Test', results);

    expect(allQualityGatesPassed(report)).toBe(true);
  });

  test('getFailedGates returns failed gates', () => {
    const results = [
      { gate: 'lint', status: 'passed' as const },
      { gate: 'types', status: 'failed' as const, message: 'Type error' },
      { gate: 'format', status: 'failed' as const, message: 'Bad format' },
    ];
    const report = createQualityReport('Test', results);

    const failed = getFailedGates(report);
    expect(failed).toHaveLength(2);
    expect(failed[0].gate).toBe('types');
  });
});

describe('Security Checklists', () => {
  test('createSecurityChecklist creates checklist for phase', () => {
    const checklist = createSecurityChecklist('spec');

    expect(checklist.phase).toBe('spec');
    expect(checklist.items.length).toBeGreaterThan(0);
    expect(checklist.items[0].status).toBe('pending');
  });

  test('updateSecurityCheck updates item status', () => {
    const checklist = createSecurityChecklist('build');
    const itemId = checklist.items[0].id;

    const updated = updateSecurityCheck(checklist, itemId, 'pass', 'Checked manually');

    const item = updated.items.find(i => i.id === itemId);
    expect(item?.status).toBe('pass');
    expect(item?.notes).toBe('Checked manually');
  });

  test('createSecurityReport calculates summary', () => {
    const checklist = createSecurityChecklist('design');
    checklist.items[0].status = 'pass';
    checklist.items[1].status = 'fail';
    checklist.items[2].status = 'na';

    const report = createSecurityReport('Test', checklist);

    expect(report.summary.passed).toBe(1);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.notApplicable).toBe(1);
  });

  test('phaseSecurityPassed returns false with failures', () => {
    const checklist = createSecurityChecklist('build');
    checklist.items[0].status = 'fail';

    const report = createSecurityReport('Test', checklist);
    expect(phaseSecurityPassed(report)).toBe(false);
  });

  test('getSecurityFailures sorts by severity', () => {
    const checklist = createSecurityChecklist('build');

    // Set various failures with different severities
    for (const item of checklist.items) {
      item.status = 'fail';
    }

    const failures = getSecurityFailures(checklist);

    // Critical should come first
    const criticalIndex = failures.findIndex(f => f.severity === 'critical');
    const lowIndex = failures.findIndex(f => f.severity === 'low');

    if (criticalIndex !== -1 && lowIndex !== -1) {
      expect(criticalIndex).toBeLessThan(lowIndex);
    }
  });

  test('different phases have different checks', () => {
    const specChecklist = createSecurityChecklist('spec');
    const buildChecklist = createSecurityChecklist('build');

    expect(specChecklist.items[0].id).not.toBe(buildChecklist.items[0].id);
  });
});
