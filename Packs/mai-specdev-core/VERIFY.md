# Verification Checklist - mai-specdev-core

## Automated Verification

```bash
bun test && bun run typecheck
```

## Manual Verification

### 1. Spec Document Creation

```typescript
import { createSpecDocument, validateSpec } from 'mai-specdev-core';

const spec = createSpecDocument('Test', 'Author', 'Problem statement');
spec.sections.successCriteria = ['Done'];
spec.sections.approach = 'Build it';
spec.sections.securityImplications = ['None'];

const { valid, errors } = validateSpec(spec);
console.log(valid); // true
console.log(errors); // []
```

### 2. Design Document Creation

```typescript
import { createDesignDocument, addComponent } from 'mai-specdev-core';

const design = createDesignDocument('Test Design', 'Author', 'SPEC-001');
const updated = addComponent(design, {
  name: 'Component',
  description: 'Does things',
  type: 'module',
  responsibilities: ['Do thing'],
  dependencies: [],
  interfaces: [],
});

console.log(updated.sections.componentIdentification.length); // 1
```

### 3. Quality Gate Config

```typescript
import { createBunQualityConfig } from 'mai-specdev-core';

const config = createBunQualityConfig();
console.log(config.linting.tool); // 'biome'
console.log(config.coverage.threshold); // 80
```

### 4. Security Checklist

```typescript
import { createSecurityChecklist } from 'mai-specdev-core';

const checklist = createSecurityChecklist('build');
console.log(checklist.phase); // 'build'
console.log(checklist.items.length > 0); // true
```

### 5. Templates

```typescript
import { getBlankSpecMarkdown } from 'mai-specdev-core';

const markdown = getBlankSpecMarkdown('Test', 'Author', 'Problem');
console.log(markdown.includes('# Test - Specification')); // true
```

## Expected Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| types.test.ts | 20+ | PASS |

## Sign-off

- [ ] All tests pass
- [ ] Type check passes
- [ ] Spec document CRUD works
- [ ] Design document CRUD works
- [ ] Quality gate config works
- [ ] Security checklists work
- [ ] Templates render correctly
