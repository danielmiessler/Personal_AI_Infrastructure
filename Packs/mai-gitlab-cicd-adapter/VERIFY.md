# GitLab CI/CD Adapter Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] Pack directory exists with required files
- [ ] `src/` contains `GitLabCICDAdapter.ts` and `index.ts`
- [ ] `tests/` contains test file
- [ ] `adapter.yaml` defines the adapter metadata

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter"

echo "Checking pack structure..."
ls -la "$PACK_DIR/"
echo ""
echo "Source files:"
ls "$PACK_DIR/src/"
echo ""
echo "Test files:"
ls "$PACK_DIR/tests/"
```

**Expected:**
- `adapter.yaml`, `package.json`, `tsconfig.json` in root
- `GitLabCICDAdapter.ts`, `index.ts` in `src/`
- `GitLabCICDAdapter.test.ts` in `tests/`

---

## Dependencies

- [ ] Dependencies installed via bun

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter
bun install && echo "Dependencies installed"
```

---

## TypeScript Compilation

- [ ] No TypeScript errors

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter
bun run typecheck && echo "TypeScript check passed"
```

---

## Unit Tests

- [ ] All tests pass

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter
bun test
```

**Expected:** All tests pass (constructor, listPipelines, listRuns, status mapping, listJobs, triggerRun, healthCheck, encodeProject)

---

## GitLab API Connectivity (Optional)

Requires a GitLab token. Skip if you don't have one configured.

### Token Setup

Store token in macOS Keychain:

```bash
# Option 1: Keychain (recommended)
security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-your_token_here"

# Option 2: Environment variable
export GITLAB_TOKEN="glpat-your_token_here"
```

### Token Verification

- [ ] Token accessible

```bash
security find-generic-password -s "gitlab-token" -a "claude-code" -w 2>/dev/null && echo "Token found in Keychain" || echo "Token not in Keychain (check GITLAB_TOKEN env var)"
```

### Live API Test

- [ ] Health check succeeds

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter

bun -e "
import { GitLabCICDAdapter } from './src/index.ts';

const adapter = new GitLabCICDAdapter({ host: 'gitlab.com' });
const health = await adapter.healthCheck();
console.log(JSON.stringify(health, null, 2));
"
```

**Expected (with valid token):**
```json
{
  "healthy": true,
  "message": "GitLab API is accessible",
  "latencyMs": <number>,
  "details": { "host": "gitlab.com" }
}
```

---

## Adapter Metadata

- [ ] `adapter.yaml` correctly defines the adapter

```bash
cat /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter/adapter.yaml
```

**Expected fields:**
- `name: gitlab`
- `domain: cicd`
- `interface: CICDProvider`
- `config.required: [host]`

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Dependencies installed | |
| TypeScript compilation | |
| Unit tests pass | |
| Token accessible (optional) | |
| Live API test (optional) | |
| Adapter metadata valid | |

**Core checks (1-4) must pass for installation to be complete.**
**API checks (5-6) are optional - only needed if you plan to use the adapter with a real GitLab instance.**

---

## Quick Full Test

Run all core verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-gitlab-cicd-adapter"

echo "=== GitLab CI/CD Adapter Verification ==="
echo ""

echo "1. Structure..."
[ -f "$PACK_DIR/src/GitLabCICDAdapter.ts" ] && [ -f "$PACK_DIR/adapter.yaml" ] && echo "Structure OK" || echo "Structure FAILED"
echo ""

echo "2. Dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "Dependencies OK" || echo "Dependencies FAILED"
echo ""

echo "3. TypeScript..."
cd "$PACK_DIR" && bun run typecheck && echo "TypeScript OK" || echo "TypeScript FAILED"
echo ""

echo "4. Tests..."
cd "$PACK_DIR" && bun test && echo "Tests OK" || echo "Tests FAILED"
echo ""

echo "=== Verification Complete ==="
```
