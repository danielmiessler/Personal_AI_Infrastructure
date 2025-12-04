# CI/CD Quality Gates Workflow

**Purpose**: Define and implement automated quality checks in CI/CD pipeline to prevent low-quality code from reaching production

**When to Use**: Setting up CI/CD pipeline for any project, or improving existing pipeline quality gates

**Output**: Quality gate definitions, CI/CD configuration (GitHub Actions/GitLab CI/etc.), quality dashboard

---

## What are CI/CD Quality Gates?

**Quality Gates** are automated pass/fail checks that run in the CI/CD pipeline BEFORE code can be deployed.

**Key Principle**: **If quality gate fails, deployment stops** (fail-fast)

**Example**:
```
Developer pushes code → CI/CD runs quality gates → ✅ Pass → Deploy to production
Developer pushes code → CI/CD runs quality gates → ❌ Fail → Deployment blocked
```

**Quality Gate Categories**:
1. **Code Coverage**: Minimum % of code covered by tests
2. **Test Pass Rate**: All tests must pass (or X% pass rate)
3. **Security Scan**: No critical vulnerabilities (OWASP, CMMC)
4. **Code Quality**: Linting, complexity, duplication
5. **Type Safety**: TypeScript/Flow type checking
6. **Performance**: Bundle size, load time limits
7. **Accessibility**: WCAG compliance
8. **Compliance**: CMMC audit checks, license scanning

---

## Why CI/CD Quality Gates?

### Problem: Manual Quality Checks Don't Scale

**Before Quality Gates** (manual):
- Developer: "I think I tested everything"
- Code Reviewer: "Looks good to me" (didn't run tests)
- QA: "Found 10 bugs in production"
- Result: 🔥 Production incidents, customer complaints

**After Quality Gates** (automated):
- CI/CD: "Coverage is 65%, minimum is 80% → ❌ FAILED"
- CI/CD: "3 critical security vulnerabilities → ❌ FAILED"
- Deployment: ❌ BLOCKED (cannot deploy until fixed)
- Result: ✅ Bugs caught before production

---

## Quality Gates by Risk Level

**Integration with Risk-Based Testing**: High-risk code gets stricter quality gates.

| Risk Level | Coverage Gate | Test Gate | Security Gate | Performance Gate |
|-----------|---------------|-----------|---------------|------------------|
| **Critical** | ≥90% | 100% pass | Zero critical vulnerabilities | Bundle <500KB, LCP <2.5s |
| **High** | ≥80% | 100% pass | Zero high vulnerabilities | Bundle <1MB, LCP <3s |
| **Medium** | ≥70% | 100% pass | Zero medium+ vulnerabilities | Bundle <2MB, LCP <4s |
| **Low** | ≥50% | ≥95% pass | Zero critical vulnerabilities | Bundle <5MB, LCP <5s |
| **Very Low** | ≥30% | ≥90% pass | Warn only | No gate |

**Example**: User Authentication (Critical Risk)
- Coverage: Must have ≥90% (fail if 89%)
- Tests: 100% must pass (fail if 1 test fails)
- Security: Zero critical/high vulnerabilities (fail if SQL injection found)
- Performance: Login API must respond in <500ms

---

## CI/CD Quality Gates Workflow (8 Steps)

### Step 1: Identify Required Quality Gates

**Purpose**: Determine which quality gates are needed for your project

**Common Quality Gates**:

#### 1. Code Coverage Gate
**What**: Minimum % of code covered by tests
**Why**: Ensures code is tested before deployment
**Tool**: Jest, pytest, JaCoCo, Istanbul
**Threshold**: 70-90% (varies by risk level)

**Example** (Jest):
```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Critical risk: stricter thresholds
    './src/auth/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
}
```

---

#### 2. Test Pass Rate Gate
**What**: All tests must pass (or X% pass rate)
**Why**: Broken tests indicate broken functionality
**Tool**: Jest, pytest, JUnit, RSpec
**Threshold**: 100% pass (zero tolerance for failing tests)

**Example** (GitHub Actions):
```yaml
- name: Run Tests
  run: npm test
  # Exit code 1 if any test fails → blocks deployment
```

---

#### 3. Security Scan Gate
**What**: No critical/high security vulnerabilities
**Why**: Prevent security breaches (OWASP Top 10, CMMC compliance)
**Tool**: Snyk, npm audit, OWASP Dependency-Check, Trivy
**Threshold**: Zero critical vulnerabilities (high-risk: zero high too)

**Example** (npm audit):
```yaml
- name: Security Audit
  run: |
    npm audit --audit-level=critical
    # Fails if any critical vulnerabilities found
```

---

#### 4. Code Quality Gate (Linting)
**What**: Code follows style guidelines (no linting errors)
**Why**: Consistent code quality, catch common bugs
**Tool**: ESLint, Prettier, Pylint, RuboCop
**Threshold**: Zero linting errors (warnings optional)

**Example** (ESLint):
```yaml
- name: Lint Code
  run: |
    npm run lint
    # Fails if ESLint finds errors
```

---

#### 5. Type Safety Gate
**What**: TypeScript/Flow type checking passes
**Why**: Catch type errors before runtime
**Tool**: TypeScript tsc, Flow
**Threshold**: Zero type errors

**Example** (TypeScript):
```yaml
- name: Type Check
  run: |
    npm run typecheck
    # tsc --noEmit (fails on type errors)
```

---

#### 6. Performance Gate
**What**: Bundle size, load time, Core Web Vitals within limits
**Why**: Prevent performance regressions
**Tool**: Lighthouse CI, Webpack Bundle Analyzer, size-limit
**Threshold**: Bundle <1MB, LCP <2.5s, FID <100ms

**Example** (size-limit):
```yaml
- name: Check Bundle Size
  run: |
    npm run size
    # Fails if bundle exceeds 1MB
```

---

#### 7. Accessibility Gate
**What**: No critical WCAG violations
**Why**: Ensure app is usable by people with disabilities
**Tool**: axe-core, Pa11y, Lighthouse
**Threshold**: Zero critical WCAG violations (A, AA level)

**Example** (Pa11y):
```yaml
- name: Accessibility Audit
  run: |
    npx pa11y-ci
    # Fails if critical WCAG violations found
```

---

#### 8. Compliance Gate (CMMC, Licensing)
**What**: CMMC audit checks, license scanning
**Why**: Meet regulatory requirements, avoid legal issues
**Tool**: CMMC scanner, license-checker, FOSSA
**Threshold**: Zero CMMC violations, only approved licenses

**Example** (license-checker):
```yaml
- name: License Scan
  run: |
    npm run license-check
    # Fails if GPL license found (not allowed in commercial code)
```

---

### Step 2: Define Quality Gate Thresholds by Risk Level

**Purpose**: Set different thresholds for different risk levels (from Risk-Based Testing workflow)

**Example: E-commerce Application**

#### Critical Risk (Auth, Payment):
```yaml
quality_gates:
  auth:
    risk_level: critical
    coverage:
      minimum: 90%
      fail_on_decrease: true  # Coverage cannot drop
    tests:
      pass_rate: 100%
      timeout: 300s
    security:
      critical_vulnerabilities: 0
      high_vulnerabilities: 0
      medium_vulnerabilities: 0
    performance:
      api_response_time: 500ms
      p95_latency: 200ms
```

#### Medium Risk (Shopping Cart):
```yaml
quality_gates:
  cart:
    risk_level: medium
    coverage:
      minimum: 70%
      fail_on_decrease: false  # Allow temporary drops
    tests:
      pass_rate: 100%
      timeout: 60s
    security:
      critical_vulnerabilities: 0
      high_vulnerabilities: 0
      medium_vulnerabilities: 5  # Allow up to 5 medium
```

#### Low Risk (Footer):
```yaml
quality_gates:
  footer:
    risk_level: low
    coverage:
      minimum: 50%
      fail_on_decrease: false
    tests:
      pass_rate: 95%  # Allow 5% failures
      timeout: 30s
    security:
      critical_vulnerabilities: 0
      # No gates for high/medium
```

**Output**: Quality gate configuration by module/risk level

---

### Step 3: Choose CI/CD Platform and Tools

**Purpose**: Select CI/CD platform and quality gate tools

**CI/CD Platforms**:
- **GitHub Actions** (recommended for GitHub repos)
- **GitLab CI/CD** (recommended for GitLab repos)
- **CircleCI** (cloud-based, fast)
- **Jenkins** (self-hosted, highly customizable)
- **Travis CI** (legacy, less popular now)
- **Azure DevOps** (Microsoft stack)

**Quality Gate Tools** (by language):

#### JavaScript/TypeScript:
- **Coverage**: Jest (`--coverage --coverageThreshold`)
- **Security**: `npm audit`, Snyk, Socket
- **Linting**: ESLint, Prettier
- **Type Safety**: TypeScript `tsc`
- **Performance**: Lighthouse CI, size-limit
- **Accessibility**: axe-core, Pa11y

#### Python:
- **Coverage**: pytest-cov, coverage.py
- **Security**: Safety, Bandit, pip-audit
- **Linting**: Pylint, Flake8, Black
- **Type Safety**: mypy
- **Performance**: pytest-benchmark

#### Java:
- **Coverage**: JaCoCo
- **Security**: OWASP Dependency-Check
- **Linting**: Checkstyle, PMD, SpotBugs
- **Type Safety**: (built-in)
- **Performance**: JMH

---

### Step 4: Implement Quality Gates in CI/CD Pipeline

**Purpose**: Configure CI/CD to run quality gates on every commit/PR

**Example: GitHub Actions Quality Gates**

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      # Checkout code
      - uses: actions/checkout@v3

      # Setup Node.js
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      # Install dependencies
      - name: Install Dependencies
        run: npm ci

      # GATE 1: Code Coverage
      - name: Run Tests with Coverage
        run: npm run test:coverage
        # Jest will fail if coverage < threshold

      # GATE 2: Type Safety
      - name: Type Check
        run: npm run typecheck
        # TypeScript will fail on type errors

      # GATE 3: Linting
      - name: Lint Code
        run: npm run lint
        # ESLint will fail on errors

      # GATE 4: Security Scan
      - name: Security Audit
        run: |
          npm audit --audit-level=critical
          npx snyk test --severity-threshold=high

      # GATE 5: Performance (Bundle Size)
      - name: Check Bundle Size
        run: npm run build && npm run size
        # size-limit will fail if bundle > 1MB

      # GATE 6: Accessibility
      - name: Accessibility Audit
        run: |
          npm run build
          npm start &
          sleep 5
          npx pa11y-ci --threshold 0
          # Fails if any WCAG violations

      # GATE 7: License Check
      - name: License Scan
        run: npm run license-check
        # Fails if unapproved licenses found

      # Upload coverage report
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      # Comment PR with quality gate results
      - name: Comment PR
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const coverage = process.env.COVERAGE_PERCENT
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Quality Gate Results\n\n✅ All quality gates passed!\n\n- Coverage: ${coverage}%\n- Security: No critical vulnerabilities\n- Performance: Bundle size OK`
            })
```

---

### Step 5: Configure Module-Specific Quality Gates

**Purpose**: Apply different thresholds to different modules based on risk

**Example: Per-Module Coverage Thresholds**

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    // Global baseline (low risk)
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },

    // Critical risk modules (auth, payment)
    './src/auth/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/payment/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },

    // High risk modules (user data, API)
    './src/user/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/api/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },

    // Medium risk modules (cart, profile)
    './src/cart/**/*.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },

    // Low risk modules (footer, static)
    './src/components/Footer.tsx': {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
}
```

**Result**: Stricter gates for critical code, relaxed gates for low-risk code

---

### Step 6: Implement Fail-Fast vs Warn Strategies

**Purpose**: Decide when to BLOCK deployment (fail) vs WARN (but allow)

**Fail-Fast** (block deployment):
- ❌ Critical security vulnerabilities
- ❌ Failing tests
- ❌ Coverage below minimum (for critical risk modules)
- ❌ Type errors

**Warn** (allow but notify):
- ⚠️ Medium security vulnerabilities (low-risk modules)
- ⚠️ Linting warnings (not errors)
- ⚠️ Performance regressions <10%
- ⚠️ Accessibility warnings (not errors)

**Example Configuration**:

```yaml
# .github/workflows/quality-gates.yml

# FAIL-FAST: Critical gates
- name: Critical Security Scan
  run: npm audit --audit-level=critical
  # Exits 1 (fails) if critical vulnerabilities found

# WARN: Medium vulnerabilities
- name: Medium Security Scan
  run: npm audit --audit-level=moderate || true
  # || true prevents failure, but logs warning

- name: Report Security Warnings
  if: failure()
  run: |
    echo "::warning::Medium security vulnerabilities found"
    npm audit

# FAIL-FAST: Test failures
- name: Run Tests
  run: npm test
  # Fails if any test fails

# WARN: Performance regression
- name: Performance Check
  run: |
    npm run perf
    if [ $? -ne 0 ]; then
      echo "::warning::Performance regression detected"
    fi
  continue-on-error: true
```

---

### Step 7: Set Up Quality Gate Dashboards

**Purpose**: Visualize quality gate trends over time

**Dashboard Tools**:
- **Codecov**: Coverage trends, PR diffs
- **SonarQube/SonarCloud**: Code quality, security, technical debt
- **Snyk**: Security vulnerability trends
- **Lighthouse CI**: Performance trends (Core Web Vitals)
- **GitHub Actions**: Built-in workflow summaries

**Example: Codecov Integration**

```yaml
# .github/workflows/quality-gates.yml

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true
    flags: unittests
    name: codecov-umbrella
```

**Codecov Dashboard Shows**:
- Coverage % (overall + per-module)
- Coverage trends (up/down over time)
- PR coverage diff (did this PR increase/decrease coverage?)
- Uncovered lines (what code is not tested?)

---

**Example: SonarQube Integration**

```yaml
# .github/workflows/quality-gates.yml

- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@master
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

- name: SonarQube Quality Gate
  uses: sonarsource/sonarqube-quality-gate-action@master
  timeout-minutes: 5
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

**SonarQube Dashboard Shows**:
- Bugs, vulnerabilities, code smells
- Technical debt (time to fix all issues)
- Code duplication %
- Complexity trends

---

### Step 8: Monitor and Improve Quality Gates

**Purpose**: Track quality gate effectiveness, adjust thresholds as needed

**Quality Gate Metrics**:
1. **Pass Rate**: % of builds that pass quality gates
2. **Time to Fix**: How long to fix failing gates?
3. **False Positives**: Gates that fail but shouldn't
4. **Escapes**: Bugs that passed gates but found in production

**Example: Quality Gate Report**

```markdown
# Quality Gate Report (Q4 2025)

## Overall Stats
- **Pass Rate**: 85% (340 passed / 400 total builds)
- **Average Time to Fix**: 2.3 hours
- **False Positives**: 3% (12 builds incorrectly failed)
- **Escapes**: 2 bugs reached production despite passing gates

## Gate Breakdown

| Gate | Pass Rate | Avg Fix Time | False Positives | Escapes |
|------|-----------|--------------|-----------------|---------|
| Coverage | 90% | 1.5 hrs | 5% | 0 |
| Tests | 95% | 0.5 hrs | 1% | 1 |
| Security | 80% | 4 hrs | 2% | 0 |
| Linting | 98% | 0.2 hrs | 0% | 0 |
| Performance | 75% | 6 hrs | 10% | 1 |

## Issues
- **Performance gate has high false positive rate** (10%)
  - Problem: Bundle size varies by 50KB due to dependencies
  - Solution: Increase threshold from 1MB to 1.05MB (5% tolerance)

- **Security gate takes longest to fix** (4 hours avg)
  - Problem: Dependency updates break other features
  - Solution: Schedule security updates weekly (not blocking)

## Improvements This Quarter
1. ✅ Added per-module coverage thresholds (critical: 90%, low: 50%)
2. ✅ Implemented warn vs fail strategy (security: fail critical, warn medium)
3. ⏩ TODO: Add performance regression detection (not just absolute limits)
```

**Output**: Quality gate effectiveness report, improvement plan

---

## Quality Gate Best Practices

### 1. Start Lenient, Tighten Over Time
❌ **Wrong**: Set 90% coverage gate on legacy codebase with 30% coverage
✅ **Right**: Start at 30%, increase 5% every sprint until reaching 90%

**Why**: Developers can't hit impossible targets. Gradual improvement is sustainable.

**Example**:
```javascript
// jest.config.js (Sprint 1)
coverageThreshold: { global: { lines: 30 } }  // Current baseline

// jest.config.js (Sprint 2)
coverageThreshold: { global: { lines: 35 } }  // +5%

// jest.config.js (Sprint 3)
coverageThreshold: { global: { lines: 40 } }  // +5%

// ... continue until 90%
```

---

### 2. Prevent Coverage Decrease (Ratcheting)
**Concept**: Never allow coverage to decrease (only increase or stay same)

**Example** (codecov.yml):
```yaml
coverage:
  status:
    project:
      default:
        target: auto  # Coverage cannot decrease
        threshold: 1%  # Allow 1% tolerance for flakiness
    patch:
      default:
        target: 80%  # New code must have 80% coverage
```

**Result**: Coverage can only go up (or stay same), never down.

---

### 3. Require Higher Coverage for New Code
**Concept**: Legacy code may have low coverage, but NEW code must have high coverage

**Example**:
- Overall project coverage: 60% (legacy)
- New code coverage requirement: 90% (in this PR)

**Implementation** (Codecov):
```yaml
coverage:
  status:
    patch:  # Coverage for code changed in this PR
      default:
        target: 90%
```

---

### 4. Use Per-Module Thresholds (Risk-Based)
❌ **Wrong**: 80% coverage requirement for all code (including footer)
✅ **Right**: 90% for auth, 50% for footer (risk-based)

**Why**: Not all code is equally risky (see Risk-Based Testing workflow).

---

### 5. Make Quality Gates Fast (<5 minutes)
**Problem**: Slow quality gates block developers (30-minute feedback loop = wasted time)

**Solution**:
- Run fast gates first (linting, type check) - 30 seconds
- Run medium gates next (unit tests) - 2 minutes
- Run slow gates last (E2E, security) - 5 minutes
- Run very slow gates nightly (penetration tests) - don't block PR

**Example**:
```yaml
jobs:
  fast-gates:
    steps:
      - Lint (30s)
      - Type Check (30s)
      - Unit Tests (2min)
    # Total: 3 minutes

  slow-gates:
    needs: fast-gates
    steps:
      - E2E Tests (5min)
      - Security Scan (3min)
    # Total: 8 minutes (only runs if fast gates pass)

  nightly-gates:
    schedule:
      - cron: '0 0 * * *'  # Run at midnight
    steps:
      - Penetration Tests (30min)
      - Performance Tests (10min)
```

---

### 6. Fail on Coverage Decrease, Not Absolute Value
**Problem**: Absolute thresholds are arbitrary (why 80% not 79%?)

**Better**: Prevent coverage from decreasing (ratcheting)

**Example**:
```yaml
coverage:
  status:
    project:
      default:
        target: auto  # Current coverage (don't decrease)
        threshold: 0%  # Zero tolerance for decrease
```

**Result**: If project has 65% coverage, it must stay ≥65% (cannot drop to 64%).

---

## Quality Gate Anti-Patterns

### 1. Too Many Quality Gates (Analysis Paralysis)
❌ **Wrong**: 20 quality gates, pipeline takes 45 minutes
✅ **Right**: 5 essential gates, pipeline takes 5 minutes

**Focus on**:
- Tests (must pass)
- Coverage (risk-based)
- Security (critical vulnerabilities)
- Linting (errors only)
- Type safety (if applicable)

---

### 2. Quality Gates Without Consequences
❌ **Wrong**: Quality gate fails, but deployment proceeds anyway
✅ **Right**: Quality gate fails → deployment blocked

**Why**: If gates don't block deployment, developers ignore them.

---

### 3. Arbitrary Thresholds (Not Risk-Based)
❌ **Wrong**: 80% coverage for all code (footer, auth, everything)
✅ **Right**: 90% for auth (critical), 50% for footer (low risk)

---

### 4. No Quality Gate Dashboard (Invisible Quality)
❌ **Wrong**: Quality gates run, but no one sees trends
✅ **Right**: Dashboard shows coverage/security trends over time

---

### 5. Quality Gates on Main Branch Only (Too Late)
❌ **Wrong**: Quality gates only run on main branch (after merge)
✅ **Right**: Quality gates run on PRs (before merge)

**Why**: Catch issues before they reach main branch.

---

## Integration with Other Workflows

### With TestArchitect → Risk-Based Testing
**When**: Defining quality gate thresholds
**Integration**: Risk level drives threshold (critical = 90%, low = 50%)

---

### With Security → SecurityReview
**When**: Defining security quality gates
**Integration**: OWASP Top 10 findings drive security gate rules

---

### With AgilePm → Definition of Done
**When**: Defining user story completion criteria
**Integration**: "All quality gates pass" is part of Definition of Done

**Example**:
```markdown
## Definition of Done (User Story)

- [ ] Code written and reviewed
- [ ] Unit tests written (coverage ≥80% for this module)
- [ ] Integration tests written
- [ ] **All quality gates pass** (coverage, security, linting, tests)
- [ ] Documentation updated
- [ ] Feature deployed to staging
```

---

## Quality Gate Templates by Project Type

### Web Application (React/Vue/Angular):
```yaml
quality_gates:
  - coverage: 70%
  - tests: 100% pass
  - security: npm audit --audit-level=critical
  - linting: eslint
  - type_safety: tsc --noEmit
  - bundle_size: <1MB
  - accessibility: pa11y (zero critical WCAG violations)
```

### API Backend (Node.js/Python/Java):
```yaml
quality_gates:
  - coverage: 80%
  - tests: 100% pass
  - security: OWASP Dependency-Check
  - linting: eslint/pylint/checkstyle
  - type_safety: TypeScript/mypy
  - performance: API response time <500ms
```

### Mobile App (React Native/Flutter):
```yaml
quality_gates:
  - coverage: 70%
  - tests: 100% pass
  - security: npm audit/flutter analyze
  - linting: eslint/flutter analyze
  - bundle_size: <50MB (app size)
  - performance: App launch time <2s
```

### CMMC-Compliant Project (DoD Contractor):
```yaml
quality_gates:
  - coverage: 90% (CUI handling code)
  - tests: 100% pass
  - security: Zero critical/high vulnerabilities
  - cmmc_compliance: AC.L2-3.1.2, IA.L2-3.5.10, AU.L2-3.3.1
  - license_check: Only approved licenses (no GPL)
  - audit_logging: All CUI access logged
```

---

## CI/CD Platform-Specific Examples

### GitHub Actions (Full Example):
```yaml
# .github/workflows/ci.yml
name: CI/CD Quality Gates

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  quality-gates:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for coverage comparison

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      # GATE 1: Type Safety
      - name: Type Check
        run: npm run typecheck

      # GATE 2: Linting
      - name: Lint
        run: npm run lint

      # GATE 3: Tests + Coverage
      - name: Run Tests
        run: npm run test:coverage

      # GATE 4: Security Scan
      - name: Security Audit
        run: npm audit --audit-level=critical

      # GATE 5: Build Success
      - name: Build
        run: npm run build

      # GATE 6: Bundle Size
      - name: Check Bundle Size
        run: npm run size

      # Upload coverage to Codecov
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      # Comment PR with results
      - name: PR Comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ All quality gates passed!'
            })
```

---

### GitLab CI (Full Example):
```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - security
  - build

variables:
  NODE_VERSION: '18'

# GATE 1: Linting
lint:
  stage: lint
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run lint
    - npm run typecheck

# GATE 2: Tests + Coverage
test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# GATE 3: Security Scan
security:
  stage: security
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm audit --audit-level=critical
  allow_failure: false

# GATE 4: Build
build:
  stage: build
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run build
    - npm run size
  artifacts:
    paths:
      - dist/
```

---

## Quality Gate Checklist

Before deploying to production:
- [ ] All tests pass (unit, integration, E2E)
- [ ] Coverage meets threshold (risk-based: critical ≥90%, low ≥50%)
- [ ] Zero critical security vulnerabilities
- [ ] Zero type errors (TypeScript/Flow)
- [ ] Zero linting errors (warnings OK)
- [ ] Bundle size within limits
- [ ] Performance within SLA (API <500ms, LCP <2.5s)
- [ ] Zero critical accessibility violations (WCAG AA)
- [ ] License compliance (only approved licenses)
- [ ] CMMC compliance (for DoD projects)

---

**Last Updated**: 2025-12-02
**Standards**: Based on DevOps CI/CD best practices, CMMC compliance requirements
**Integration**: Works with Risk-Based Testing, SecurityReview, AgilePm (Definition of Done)
