# mai-specdev-core

Core types and templates for spec-first software development in the PAI methodology.

## Features

- **Spec Document Types**: Structured specification documents with validation
- **Design Document Types**: Design documents linked to specifications
- **Quality Gate Configuration**: Linting, type checking, formatting, coverage settings
- **Security Checklists**: Phase-based security review checklists
- **Document Templates**: Markdown templates for specs and designs

## Installation

```bash
bun add mai-specdev-core
```

## Usage

### Spec Documents

```typescript
import {
  createSpecDocument,
  validateSpec,
  approveSpec,
} from 'mai-specdev-core';

// Create a new spec
const spec = createSpecDocument(
  'Authentication System',
  'Joey',
  'Users need to authenticate securely'
);

// Add required fields
spec.sections.successCriteria = ['Users can log in', 'Sessions expire'];
spec.sections.approach = 'JWT-based authentication';
spec.sections.securityImplications = ['Token storage', 'HTTPS required'];

// Validate
const { valid, errors } = validateSpec(spec);

// Approve when ready
const approved = approveSpec(spec, 'Charles', 'Ready to implement');
```

### Design Documents

```typescript
import {
  createDesignDocument,
  addComponent,
  validateDesign,
} from 'mai-specdev-core';

const design = createDesignDocument(
  'Auth System Design',
  'Joey',
  'SPEC-001'
);

const withComponent = addComponent(design, {
  name: 'AuthService',
  description: 'Handles authentication',
  type: 'service',
  responsibilities: ['Validate credentials', 'Issue tokens'],
  dependencies: ['UserRepository'],
  interfaces: ['IAuthService'],
});
```

### Quality Gates

```typescript
import {
  createBunQualityConfig,
  createQualityReport,
  allQualityGatesPassed,
} from 'mai-specdev-core';

const config = createBunQualityConfig();
// { linting: { tool: 'biome', ... }, typeChecking: { tool: 'tsc', ... } }

const results = [
  { gate: 'lint', status: 'passed' },
  { gate: 'types', status: 'passed' },
];

const report = createQualityReport('MyProject', results);
if (allQualityGatesPassed(report)) {
  console.log('All gates passed!');
}
```

### Security Checklists

```typescript
import {
  createSecurityChecklist,
  updateSecurityCheck,
  createSecurityReport,
  phaseSecurityPassed,
} from 'mai-specdev-core';

// Create checklist for build phase
const checklist = createSecurityChecklist('build');

// Update check status
const updated = updateSecurityCheck(
  checklist,
  'build-1',
  'pass',
  'npm audit clean'
);

// Generate report
const report = createSecurityReport('MyProject', updated);

if (phaseSecurityPassed(report)) {
  console.log('Ready to proceed!');
}
```

### Templates

```typescript
import {
  getBlankSpecMarkdown,
  getBlankDesignMarkdown,
} from 'mai-specdev-core';

// Get blank spec document
const specMd = getBlankSpecMarkdown(
  'My Feature',
  'Joey',
  'Need to implement this feature'
);

// Get blank design document
const designMd = getBlankDesignMarkdown(
  'My Feature Design',
  'Joey',
  'SPEC-001'
);
```

## Security Phases

Security checklists are available for each phase:

| Phase | Focus |
|-------|-------|
| `spec` | Data sensitivity, auth/authz requirements, compliance |
| `design` | Input validation, encryption, rate limiting |
| `build` | Dependencies, secrets, static analysis |
| `test` | Auth bypass, injection, XSS |
| `ship` | Debug code, env vars, security headers |

## Dependencies

- `mai-project-core`: Base project types

## License

MIT
