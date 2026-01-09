/**
 * Tool Tests for mai-specdev-skill
 */

import { describe, test, expect } from 'bun:test';
import { createSpecDocument, createDesignDocument, type SpecDocument, type DesignDocument } from 'mai-specdev-core';
import { generateSpecMarkdown } from '../src/Tools/create-spec.ts';
import { generateDesignMarkdown } from '../src/Tools/create-design.ts';

describe('generateSpecMarkdown', () => {
  function createTestSpec(): SpecDocument {
    const spec = createSpecDocument('Test Feature', 'Joey', 'Need to test the markdown generation');
    spec.sections.successCriteria = ['Tests pass', 'Markdown is valid'];
    spec.sections.approach = 'Use template-based generation';
    spec.sections.securityImplications = ['No sensitive data exposed'];
    spec.sections.constraints = ['Must work with Bun'];
    spec.sections.openQuestions = ['What about edge cases?'];
    return spec;
  }

  test('includes title', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('# Test Feature - Specification');
  });

  test('includes metadata', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('**Author:** Joey');
    expect(md).toContain('**Status:** draft');
  });

  test('includes problem statement', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('## 1. Problem Statement');
    expect(md).toContain('Need to test the markdown generation');
  });

  test('includes success criteria with checkboxes', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('## 2. Success Criteria');
    expect(md).toContain('- [ ] Tests pass');
    expect(md).toContain('- [ ] Markdown is valid');
  });

  test('includes constraints', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('## 3. Constraints');
    expect(md).toContain('- Must work with Bun');
  });

  test('shows "None specified" for empty constraints', () => {
    const spec = createTestSpec();
    spec.sections.constraints = [];
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('None specified.');
  });

  test('includes approach', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('## 4. Approach');
    expect(md).toContain('Use template-based generation');
  });

  test('includes security implications', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('## 6. Security Implications');
    expect(md).toContain('- No sensitive data exposed');
  });

  test('includes open questions', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('## 7. Open Questions');
    expect(md).toContain('- [ ] What about edge cases?');
  });

  test('shows "None at this time" for empty questions', () => {
    const spec = createTestSpec();
    spec.sections.openQuestions = [];
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('None at this time.');
  });

  test('includes pending approval', () => {
    const spec = createTestSpec();
    const md = generateSpecMarkdown(spec);
    expect(md).toContain('*Pending approval*');
  });
});

describe('generateDesignMarkdown', () => {
  function createTestDesign(): DesignDocument {
    const design = createDesignDocument('Test Design', 'Joey', 'SPEC-001');
    design.sections.componentIdentification = [{
      name: 'Parser',
      type: 'module',
      description: 'Parses input data',
      responsibilities: ['Parse JSON', 'Validate schema'],
      dependencies: ['zod'],
      interfaces: ['IParser'],
    }];
    return design;
  }

  test('includes title', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('# Test Design');
  });

  test('includes spec reference', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('**Spec Reference:** SPEC-001');
  });

  test('includes components', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('## 1. Component Identification');
    expect(md).toContain('### 1. Parser');
    expect(md).toContain('**Type:** module');
    expect(md).toContain('Parses input data');
  });

  test('includes responsibilities', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('**Responsibilities:**');
    expect(md).toContain('- Parse JSON');
    expect(md).toContain('- Validate schema');
  });

  test('includes dependencies', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('**Dependencies:**');
    expect(md).toContain('- zod');
  });

  test('includes test strategy section', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('## 4. Test Strategy');
    expect(md).toContain('**Framework:** bun:test');
    expect(md).toContain('**Coverage Target:** 80%');
  });

  test('includes security controls section', () => {
    const design = createTestDesign();
    const md = generateDesignMarkdown(design);
    expect(md).toContain('## 5. Security Controls');
  });
});
