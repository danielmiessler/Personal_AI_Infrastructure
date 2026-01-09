/**
 * Template exports for mai-specdev-core
 *
 * Provides Handlebars-style templates for spec and design documents.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the spec document template
 */
export function getSpecTemplate(): string {
  return readFileSync(join(__dirname, 'spec.md'), 'utf-8');
}

/**
 * Get the design document template
 */
export function getDesignTemplate(): string {
  return readFileSync(join(__dirname, 'design.md'), 'utf-8');
}

/**
 * Simple template variable replacement
 * For simple cases only - use a proper template engine for complex cases
 */
export function renderSimpleTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Get a blank spec document in markdown
 */
export function getBlankSpecMarkdown(
  title: string,
  author: string,
  problemStatement: string
): string {
  return `# ${title} - Specification

**Version:** 0.1.0
**Date:** ${new Date().toISOString().split('T')[0]}
**Author:** ${author}
**Status:** draft

---

## 1. Problem Statement

${problemStatement}

---

## 2. Success Criteria

- [ ] (Define at least one success criterion)

---

## 3. Constraints

None specified.

---

## 4. Approach

(Describe the approach to solving the problem)

---

## 5. Interfaces

(Define interfaces if applicable)

---

## 6. Security Implications

- (Document security considerations)

---

## 7. Open Questions

- [ ] (List any open questions)

---

## Approval

*Pending approval*
`;
}

/**
 * Get a blank design document in markdown
 */
export function getBlankDesignMarkdown(
  title: string,
  author: string,
  specRef: string
): string {
  return `# ${title} - Design Document

**Version:** 0.1.0
**Date:** ${new Date().toISOString().split('T')[0]}
**Author:** ${author}
**Status:** draft
**Spec Reference:** ${specRef}

---

## 1. Component Identification

### 1.1. Component Name

**Type:** module

Description of the component.

**Responsibilities:**
- (List responsibilities)

**Dependencies:**
None

**Interfaces:**
- (List interfaces)

---

## 2. Interface Definitions

(Define interfaces based on spec)

---

## 3. Data Flow

Description of data flow.

### Nodes

| ID | Name | Type |
|----|------|------|
| n1 | Source | source |
| n2 | Process | process |
| n3 | Store | store |

### Edges

| From | To | Label |
|------|-----|-------|
| n1 | n2 | input |
| n2 | n3 | output |

---

## 4. Test Strategy

### 4.1 Unit Tests

- **Framework:** bun:test
- **Coverage Target:** 80%

**Patterns:**
- (Define test patterns)

### 4.2 Integration Tests

- **Framework:** bun:test

**Scope:**
- (Define integration test scope)

---

## 5. Security Controls

| ID | Name | Type | Implementation |
|----|------|------|----------------|
| sc-1 | Input Validation | preventive | (Implementation details) |

---

## Approval

*Pending approval*
`;
}
