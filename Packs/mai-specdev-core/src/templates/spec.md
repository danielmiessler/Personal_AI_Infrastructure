# {{title}} - Specification

**Version:** {{version}}
**Date:** {{date}}
**Author:** {{author}}
**Status:** {{status}}

---

## 1. Problem Statement

{{problemStatement}}

---

## 2. Success Criteria

{{#each successCriteria}}
- [ ] {{this}}
{{/each}}

---

## 3. Constraints

{{#if constraints.length}}
{{#each constraints}}
- {{this}}
{{/each}}
{{else}}
None specified.
{{/if}}

---

## 4. Approach

{{approach}}

---

## 5. Interfaces

{{#each interfaces}}
### 5.{{@index}}. {{name}}

**Type:** {{type}}

{{description}}

{{#if contract}}
```json
{{json contract}}
```
{{/if}}

{{/each}}

---

## 6. Security Implications

{{#each securityImplications}}
- {{this}}
{{/each}}

---

## 7. Open Questions

{{#if openQuestions.length}}
{{#each openQuestions}}
- [ ] {{this}}
{{/each}}
{{else}}
None at this time.
{{/if}}

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
