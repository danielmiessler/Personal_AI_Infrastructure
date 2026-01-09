# Verification Checklist - mai-project-skill

## Automated Verification

```bash
bun test && bun run typecheck
```

## Manual Verification

### 1. CLI Help

```bash
bun run src/Tools/mai-init.ts --help
bun run src/Tools/mai-gate.ts --help
```

Both should show usage information.

### 2. Project Generation (Programmatic)

```typescript
import { generateClaudeMd, createProject } from 'mai-project-skill';

const config = {
  type: 'software' as const,
  name: 'Test Project',
  location: '/tmp/test-project',
  owner: 'Joey',
  problemStatement: 'Testing the skill',
  successCriteria: ['Tests pass'],
  constraints: [],
  typeSpecific: {},
};

console.log(generateClaudeMd(config));
// Should output valid CLAUDE.md content
```

### 3. Gate Management

```bash
# In a project directory with CLAUDE.md:
bun run src/Tools/mai-gate.ts init
bun run src/Tools/mai-gate.ts status
bun run src/Tools/mai-gate.ts current
```

### 4. Workflows Present

Verify workflow files exist:
- `src/Workflows/CreateProject.md`
- `src/Workflows/ProjectStatus.md`
- `src/Workflows/UpdateProject.md`
- `src/Workflows/GateManagement.md`

### 5. SKILL.md Valid

Check that SKILL.md contains:
- Valid frontmatter (name, description, version)
- Trigger patterns
- Workflow routing

## Expected Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| mai-init.test.ts | 15+ | PASS |

## Integration Tests

### Create and Verify Project

```bash
# Create test project
cd /tmp
bun run ~/PAI/packages/mai-project-skill/src/Tools/mai-init.ts

# Verify files created
ls -la /tmp/test-project/
# Should have: CLAUDE.md, .gitignore, tasks.yaml

# Initialize gates
cd /tmp/test-project
bun run ~/PAI/packages/mai-project-skill/src/Tools/mai-gate.ts init

# Check status
bun run ~/PAI/packages/mai-project-skill/src/Tools/mai-gate.ts status
```

## Sign-off

- [ ] All tests pass
- [ ] Type check passes
- [ ] mai-init --help works
- [ ] mai-gate --help works
- [ ] Workflows present and documented
- [ ] SKILL.md valid
