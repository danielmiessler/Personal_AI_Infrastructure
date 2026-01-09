# GitHub CI/CD Adapter Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `package.json` exists
- [ ] `adapter.yaml` exists
- [ ] `tsconfig.json` exists
- [ ] `src/GitHubCICDAdapter.ts` exists
- [ ] `src/index.ts` exists
- [ ] `tests/GitHubCICDAdapter.test.ts` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-github-cicd-adapter"

echo "Checking directory structure..."
ls -la "$PACK_DIR/"
echo ""
echo "Source files:"
ls "$PACK_DIR/src/"
echo ""
echo "Test files:"
ls "$PACK_DIR/tests/"
```

---

## Dependencies

- [ ] `node_modules/` exists (or run `bun install`)
- [ ] `mai-cicd-core` is linked

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-github-cicd-adapter"

echo "Checking dependencies..."
cd "$PACK_DIR" && bun install
echo ""
echo "Verifying mai-cicd-core link:"
ls -la "$PACK_DIR/node_modules/mai-cicd-core" 2>/dev/null || echo "mai-cicd-core not linked - run: bun install"
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-github-cicd-adapter"

echo "Running TypeScript type check..."
cd "$PACK_DIR" && bun run typecheck
```

**Expected:** No output (success) or specific type errors to fix.

---

## Unit Tests

- [ ] All unit tests pass

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-github-cicd-adapter"

echo "Running unit tests..."
cd "$PACK_DIR" && bun test
```

**Expected:**
```
bun test v1.x.x
...
 PASS  tests/GitHubCICDAdapter.test.ts
```

---

## Authentication

- [ ] GitHub token available via one of:
  - `GITHUB_TOKEN` environment variable
  - macOS Keychain (service: `github-token`, account: `claude-code`)
  - Direct config parameter

```bash
# Check environment variable
if [ -n "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN is set"
else
  echo "GITHUB_TOKEN not set, checking keychain..."
  security find-generic-password -s "github-token" -a "claude-code" -w 2>/dev/null && echo "Token found in keychain" || echo "No token in keychain"
fi
```

**To store token in keychain:**
```bash
security add-generic-password -s "github-token" -a "claude-code" -w "ghp_your_token_here"
```

---

## API Connectivity Test (Optional)

- [ ] GitHub API is accessible
- [ ] Token has required permissions

**Note:** This test requires a valid GitHub token and network access.

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-github-cicd-adapter"

# Create a simple connectivity test script
cat > /tmp/github-test.ts << 'EOF'
import { GitHubCICDAdapter } from './src/index.ts';

async function main() {
  const adapter = new GitHubCICDAdapter();

  console.log('Testing GitHub API connectivity...');
  const health = await adapter.healthCheck();

  if (health.healthy) {
    console.log(`Status: HEALTHY`);
    console.log(`Message: ${health.message}`);
    console.log(`Latency: ${health.latencyMs}ms`);
  } else {
    console.log(`Status: UNHEALTHY`);
    console.log(`Error: ${health.message}`);
  }
}

main().catch(console.error);
EOF

cd "$PACK_DIR" && bun run /tmp/github-test.ts
rm /tmp/github-test.ts
```

**Expected (with valid token):**
```
Testing GitHub API connectivity...
Status: HEALTHY
Message: GitHub API is accessible
Latency: <number>ms
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Dependencies installed | |
| TypeScript compiles | |
| Unit tests pass | |
| GitHub token available | |
| API connectivity (optional) | |

**Minimum for installation:** Directory structure, dependencies, TypeScript compilation, and unit tests must pass.

**For full functionality:** GitHub token must be available and API connectivity test should pass.

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-github-cicd-adapter"

echo "=== GitHub CI/CD Adapter Verification ==="
echo ""

echo "1. Directory structure..."
[ -f "$PACK_DIR/package.json" ] && [ -f "$PACK_DIR/adapter.yaml" ] && [ -f "$PACK_DIR/src/GitHubCICDAdapter.ts" ] && echo "Directory structure OK" || echo "Directory structure FAILED"
echo ""

echo "2. Dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "Dependencies OK" || echo "Dependencies FAILED"
echo ""

echo "3. TypeScript..."
cd "$PACK_DIR" && bun run typecheck && echo "TypeScript OK" || echo "TypeScript FAILED"
echo ""

echo "4. Unit tests..."
cd "$PACK_DIR" && bun test && echo "Unit tests OK" || echo "Unit tests FAILED"
echo ""

echo "5. Authentication check..."
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Authentication OK (env var)"
elif security find-generic-password -s "github-token" -a "claude-code" -w >/dev/null 2>&1; then
  echo "Authentication OK (keychain)"
else
  echo "Authentication MISSING - set GITHUB_TOKEN or add to keychain"
fi
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### TypeScript errors about mai-cicd-core
Ensure the core package is built and linked:
```bash
cd ../mai-cicd-core && bun install
cd ../mai-github-cicd-adapter && bun install
```

### Authentication errors
1. Verify token is set: `echo $GITHUB_TOKEN`
2. Check keychain: `security find-generic-password -s "github-token" -a "claude-code" -w`
3. Verify token permissions on GitHub (needs `actions:read`, `actions:write`, `contents:read`)

### Rate limiting
GitHub API limits: 5,000 requests/hour for authenticated users. The adapter handles rate limiting with automatic retry and exponential backoff.

### Test failures
If tests fail, check:
1. Bun version: `bun --version` (requires >= 1.0)
2. Clean install: `rm -rf node_modules && bun install`
3. Run specific test: `bun test tests/GitHubCICDAdapter.test.ts`
