# {{title}} - Design Document

**Version:** {{version}}
**Date:** {{date}}
**Author:** {{author}}
**Status:** {{status}}
**Spec Reference:** {{specRef}}

---

## 1. Component Identification

{{#each componentIdentification}}
### 1.{{@index}}. {{name}}

**Type:** {{type}}

{{description}}

**Responsibilities:**
{{#each responsibilities}}
- {{this}}
{{/each}}

**Dependencies:**
{{#if dependencies.length}}
{{#each dependencies}}
- {{this}}
{{/each}}
{{else}}
None
{{/if}}

**Interfaces:**
{{#each interfaces}}
- {{this}}
{{/each}}

{{/each}}

---

## 2. Interface Definitions

{{#each interfaceDefinitions}}
### 2.{{@index}}. {{name}}

**Type:** {{type}}

{{description}}

{{#if contract}}
```json
{{json contract}}
```
{{/if}}

{{/each}}

---

## 3. Data Flow

{{dataFlow.description}}

### Nodes

| ID | Name | Type |
|----|------|------|
{{#each dataFlow.nodes}}
| {{id}} | {{name}} | {{type}} |
{{/each}}

### Edges

| From | To | Label |
|------|-----|-------|
{{#each dataFlow.edges}}
| {{from}} | {{to}} | {{label}} |
{{/each}}

---

## 4. Test Strategy

### 4.1 Unit Tests

- **Framework:** {{testStrategy.unitTests.framework}}
- **Coverage Target:** {{testStrategy.unitTests.coverage}}%

**Patterns:**
{{#each testStrategy.unitTests.patterns}}
- {{this}}
{{/each}}

### 4.2 Integration Tests

- **Framework:** {{testStrategy.integrationTests.framework}}

**Scope:**
{{#each testStrategy.integrationTests.scope}}
- {{this}}
{{/each}}

{{#if testStrategy.e2eTests}}
### 4.3 E2E Tests

- **Framework:** {{testStrategy.e2eTests.framework}}

**Scenarios:**
{{#each testStrategy.e2eTests.scenarios}}
- {{this}}
{{/each}}
{{/if}}

---

## 5. Security Controls

| ID | Name | Type | Implementation |
|----|------|------|----------------|
{{#each securityControls}}
| {{id}} | {{name}} | {{type}} | {{implementation}} |
{{/each}}

---

## Approval

{{#if approval}}
**Approver:** {{approval.approver}}
**Date:** {{approval.date}}
{{#if approval.comments}}
**Comments:** {{approval.comments}}
{{/if}}
{{else}}
*Pending approval*
{{/if}}
