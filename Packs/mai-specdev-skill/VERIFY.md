# Verification Checklist - mai-specdev-skill

## Automated Verification

```bash
bun test && bun run typecheck
```

## Manual Verification

### 1. CLI Help

```bash
bun run src/Tools/create-spec.ts --help
bun run src/Tools/create-design.ts --help
bun run src/Tools/quality-check.ts --help
```

### 2. Spec Generation

```typescript
import { generateSpecMarkdown } from 'mai-specdev-skill';
import { createSpecDocument } from 'mai-specdev-core';

const spec = createSpecDocument('Test', 'Author', 'Problem');
spec.sections.successCriteria = ['Done'];
spec.sections.approach = 'Build it';
spec.sections.securityImplications = ['None'];

const md = generateSpecMarkdown(spec);
console.log(md.includes('# Test - Specification')); // true
```

### 3. Design Generation

```typescript
import { generateDesignMarkdown } from 'mai-specdev-skill';
import { createDesignDocument } from 'mai-specdev-core';

const design = createDesignDocument('Test', 'Author', 'SPEC.md');
design.sections.componentIdentification = [{
  name: 'Component',
  type: 'module',
  description: 'Does things',
  responsibilities: ['Do'],
  dependencies: [],
  interfaces: [],
}];

const md = generateDesignMarkdown(design);
console.log(md.includes('# Test')); // true
```

### 4. Quality Check

```bash
cd /path/to/test-project
bun run ~/PAI/packages/mai-specdev-skill/src/Tools/quality-check.ts status
```

### 5. Workflows Present

Verify workflow files exist:
- `src/Workflows/CreateSpec.md`
- `src/Workflows/CreateDesign.md`
- `src/Workflows/QualityCheck.md`
- `src/Workflows/SecurityReview.md`

## Expected Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| tools.test.ts | 15+ | PASS |

## Sign-off

- [ ] All tests pass
- [ ] Type check passes
- [ ] mai-spec --help works
- [ ] mai-design --help works
- [ ] mai-quality --help works
- [ ] Workflows present and documented
- [ ] SKILL.md valid
