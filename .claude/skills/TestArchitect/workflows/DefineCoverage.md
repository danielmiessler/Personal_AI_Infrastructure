# DefineCoverage Workflow

**Purpose**: Analyze test coverage, identify gaps, and create improvement plan

**Input**: Codebase with existing tests, or new feature requiring coverage targets

**Output**: Coverage analysis report with gaps, risk assessment, and remediation plan

---

## What is Test Coverage?

**Test Coverage** measures how much of your code is executed by tests.

**Coverage Types**:

| Type | Measures | Target | Example |
|------|----------|--------|---------|
| **Line Coverage** | % of code lines executed | ≥80% | 450 / 500 lines = 90% |
| **Branch Coverage** | % of if/else branches tested | ≥75% | 15 / 20 branches = 75% |
| **Function Coverage** | % of functions called | ≥90% | 45 / 50 functions = 90% |
| **Statement Coverage** | % of statements executed | ≥80% | Similar to line coverage |

**Why Coverage Matters**:
- High coverage ≠ good tests, but low coverage = definitely gaps
- Identifies untested code (potential bugs lurking)
- Enforces quality gates (block PR if coverage drops)
- Trends show code health over time

---

## Workflow Steps

### Step 1: Run Coverage Analysis

**Action**: Generate coverage report for your codebase

**Tools by Language**:

| Language | Tool | Command |
|----------|------|---------|
| **JavaScript/TypeScript** | Jest, c8, nyc | `npm test -- --coverage` |
| **Python** | pytest-cov, coverage.py | `pytest --cov=src tests/` |
| **Java** | JaCoCo, Cobertura | `mvn test jacoco:report` |
| **Go** | built-in | `go test -cover ./...` |
| **Ruby** | SimpleCov | `bundle exec rspec` (with SimpleCov) |
| **C#** | Coverlet, dotCover | `dotnet test /p:CollectCoverage=true` |

**Example (TypeScript with Jest)**:
```bash
$ npm test -- --coverage

PASS  src/auth/login.test.ts
PASS  src/auth/password.test.ts
PASS  src/auth/session.test.ts

----------------------|---------|----------|---------|---------|-------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------|---------|----------|---------|---------|-------------------
All files             |   78.5  |   72.3   |   85.0  |   80.1  |
 auth/                |   82.1  |   76.5   |   90.0  |   84.3  |
  login.ts            |   92.5  |   87.5   |  100.0  |   95.2  | 45,78
  password.ts         |   85.7  |   80.0   |  100.0  |   88.9  | 23,67-69
  session.ts          |   78.3  |   70.0   |   90.0  |   81.2  | 12,34,56-60
  oauth.ts            |   45.0  |   40.0   |   60.0  |   48.5  | 15-45,78-90
 utils/               |   65.2  |   58.1   |   75.0  |   68.4  |
  validation.ts       |   70.0  |   65.0   |   80.0  |   72.5  | 11,22,33
  crypto.ts           |   60.0  |   50.0   |   70.0  |   64.0  | 5-10,20-25
----------------------|---------|----------|---------|---------|-------------------
```

**Interpreting Results**:
- ✅ **login.ts, password.ts**: High coverage (>85%), good shape
- ⚠️ **session.ts**: Borderline (78%), needs a few more tests
- ❌ **oauth.ts**: Critical gap (45%), needs significant work
- ⚠️ **utils/**: Moderate coverage (65%), add tests for edge cases

---

### Step 2: Identify Coverage Gaps

**Action**: Find untested code and uncovered branches

**Gap Categories**:

#### 1. Uncovered Lines
**What**: Code lines never executed by tests
**Example**: Lines 15-45 in oauth.ts

**How to Find**:
```bash
# Show uncovered lines
npm test -- --coverage --coverageReporters=html

# Open coverage/index.html in browser
# Red lines = uncovered, green = covered, yellow = partially covered
```

**Action**: Write tests that execute these lines

---

#### 2. Uncovered Branches
**What**: if/else paths not tested
**Example**:

```typescript
function validateAge(age: number): string {
  if (age < 0) {
    return 'Age cannot be negative'; // Branch 1: tested ✅
  } else if (age < 18) {
    return 'Must be 18 or older'; // Branch 2: not tested ❌
  } else {
    return 'Valid age'; // Branch 3: tested ✅
  }
}
```

**Coverage Report**: 67% branch coverage (2/3 branches tested)

**Action**: Add test for Branch 2 (age = 15)

---

#### 3. Uncovered Functions
**What**: Functions never called by tests
**Example**: `deleteAccount()` function exists but no tests call it

**How to Find**: Look for 0% function coverage

**Action**: Write integration test that calls `deleteAccount()`

---

#### 4. Edge Cases Not Tested
**What**: Boundary conditions, error paths, rare scenarios

**Examples**:
- Empty arrays/objects
- Null/undefined values
- Maximum/minimum values
- Concurrent requests
- Network timeouts

**Action**: Add tests for edge cases (even if line coverage is 100%)

---

### Step 3: Assess Risk of Gaps

**Action**: Prioritize gaps based on code criticality

**Risk Matrix**:

| Code Area | Coverage | Risk | Priority |
|-----------|----------|------|----------|
| **Critical** (auth, payment) | <80% | Critical | Fix immediately |
| **Critical** (auth, payment) | 80-90% | Medium | Fix this sprint |
| **High** (core features) | <70% | High | Fix this sprint |
| **Medium** (secondary features) | <60% | Medium | Fix next sprint |
| **Low** (utilities) | <50% | Low | Track in backlog |

**Example Risk Assessment**:

```markdown
### Gap 1: oauth.ts (45% coverage) - CRITICAL RISK

**Code Area**: OAuth2 authentication (critical path)
**Current Coverage**: 45% lines, 40% branches
**Risk Level**: Critical (authentication bypass possible)

**Uncovered Code**:
- Lines 15-45: OAuth token validation
- Lines 78-90: OAuth error handling

**Potential Bugs**:
- Invalid tokens might be accepted (security vulnerability)
- Error states not handled (app crashes on OAuth failure)

**Priority**: P0 (Fix immediately, block deployment)
**Effort**: 8 story points (10+ tests needed)

---

### Gap 2: session.ts (78% coverage) - MEDIUM RISK

**Code Area**: Session management (important but not critical)
**Current Coverage**: 78% lines, 70% branches
**Risk Level**: Medium (edge cases not covered)

**Uncovered Code**:
- Lines 12, 34: Session expiry edge cases
- Lines 56-60: Concurrent session handling

**Potential Bugs**:
- Sessions might not expire correctly (user stays logged in forever)
- Concurrent logins might cause race conditions

**Priority**: P1 (Fix this sprint)
**Effort**: 3 story points (3-4 tests needed)
```

---

### Step 4: Set Coverage Targets

**Action**: Define realistic coverage goals based on risk

**Target Framework**:

| Code Risk Level | Line Coverage Target | Branch Coverage Target | Timeline |
|-----------------|----------------------|------------------------|----------|
| **Critical** | ≥90% | ≥85% | Current sprint |
| **High** | ≥80% | ≥75% | Current sprint |
| **Medium** | ≥70% | ≥65% | Next sprint |
| **Low** | ≥50% | ≥45% | Backlog |

**Project-Wide Targets**:
- **Minimum** (enforced in CI): 70% line, 65% branch
- **Goal** (team target): 80% line, 75% branch
- **Stretch** (best-in-class): 90% line, 85% branch

**Enforcement in CI/CD**:

```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: npm test -- --coverage

- name: Enforce minimum coverage
  run: |
    npm test -- --coverage \
      --coverageThreshold='{"global":{"lines":70,"branches":65,"functions":75}}'
```

**Result**: CI fails if coverage drops below 70% lines or 65% branches

---

### Step 5: Create Coverage Improvement Plan

**Action**: Define specific tasks to close gaps

**Improvement Plan Template**:

```markdown
## Coverage Improvement Plan: [Module Name]

**Current Coverage**: 78% lines, 72% branches
**Target Coverage**: 85% lines, 80% branches
**Timeline**: Sprint 3 (2 weeks)
**Owner**: Backend Team

### Tasks

#### Task 1: Add tests for OAuth token validation (5 pts)
**Gap**: Lines 15-45 uncovered (oauth.ts)
**Tests to Add**:
- [ ] Test valid OAuth token accepted
- [ ] Test expired OAuth token rejected
- [ ] Test malformed OAuth token rejected
- [ ] Test OAuth token with wrong signature rejected
- [ ] Test OAuth token replay attack detected

**Expected Coverage Increase**: +15% (60% → 75%)

---

#### Task 2: Add tests for session expiry edge cases (3 pts)
**Gap**: Lines 12, 34, 56-60 uncovered (session.ts)
**Tests to Add**:
- [ ] Test session expires after 24 hours
- [ ] Test session renewal extends expiry
- [ ] Test concurrent sessions from same user
- [ ] Test session cleanup on logout

**Expected Coverage Increase**: +10% (78% → 88%)

---

#### Task 3: Add branch tests for password validation (2 pts)
**Gap**: Missing branches in validatePassword()
**Tests to Add**:
- [ ] Test password too short (< 8 chars)
- [ ] Test password missing special character
- [ ] Test password missing number

**Expected Coverage Increase**: +5% (85% → 90%)

---

### Summary

**Total Effort**: 10 story points
**Expected Coverage**: 78% → 90% lines, 72% → 85% branches
**Timeline**: 2 weeks (Sprint 3)
**Risk Mitigation**: Eliminates critical OAuth vulnerability
```

---

### Step 6: Track Coverage Over Time

**Action**: Monitor coverage trends to catch regressions

**Trend Tracking**:

```markdown
## Coverage Trend (Last 6 Sprints)

| Sprint | Lines | Branches | Functions | Change |
|--------|-------|----------|-----------|--------|
| 1 | 65% | 58% | 70% | Baseline |
| 2 | 68% | 62% | 73% | +3% ✅ |
| 3 | 72% | 68% | 78% | +4% ✅ |
| 4 | 70% | 65% | 76% | -2% ⚠️ (regression!) |
| 5 | 75% | 70% | 80% | +5% ✅ (fixed regression) |
| 6 | 78% | 72% | 85% | +3% ✅ |

**Trend**: Improving (+13% over 6 sprints)
**Issues**: Sprint 4 regression (new feature added without tests, now fixed)
**Goal**: 85% lines by Sprint 10
```

**Visualize Trends**:
- Use Codecov, Coveralls, or SonarQube for trend graphs
- Set alerts for coverage drops (Slack notification if coverage < 70%)

---

### Step 7: Generate Coverage Report

**Action**: Create comprehensive coverage analysis document

**Report Structure**:

```markdown
# Test Coverage Analysis: [Project Name]

**Date**: YYYY-MM-DD
**Analyzed By**: [QA Lead]
**Coverage Tool**: Jest with c8

---

## Executive Summary

**Overall Coverage**: 78% lines, 72% branches, 85% functions

**Status**: ⚠️ **Needs Improvement**
- Target: 85% lines, 80% branches
- Gap: -7% lines, -8% branches

**Critical Gaps**:
1. oauth.ts: 45% coverage (critical security risk)
2. payment-processor.ts: 55% coverage (high financial risk)

**Recommendation**: Address critical gaps before production deployment

---

## Coverage by Module

| Module | Lines | Branches | Functions | Risk | Status |
|--------|-------|----------|-----------|------|--------|
| auth/ | 82% | 76% | 90% | Critical | ⚠️ (oauth.ts gap) |
| payment/ | 65% | 58% | 75% | Critical | ❌ (below target) |
| user-mgmt/ | 88% | 82% | 95% | High | ✅ (excellent) |
| utils/ | 65% | 58% | 75% | Low | ⚠️ (acceptable) |
| **TOTAL** | **78%** | **72%** | **85%** | - | ⚠️ |

---

## Critical Gaps (Fix Immediately)

### Gap 1: oauth.ts (45% coverage)
[Details from Step 3]

### Gap 2: payment-processor.ts (55% coverage)
[Details from Step 3]

---

## Coverage Improvement Plan

[Plan from Step 5]

---

## Coverage Trends

[Trends from Step 6]

---

## Recommendations

1. **Immediate (This Sprint)**:
   - Add 15 tests for oauth.ts (closes critical gap)
   - Add 10 tests for payment-processor.ts (closes high-risk gap)

2. **Short-term (Next Sprint)**:
   - Add branch tests for all if/else statements
   - Improve utils/ coverage to 75%

3. **Long-term (Ongoing)**:
   - Enforce 80% minimum coverage in CI/CD
   - Weekly coverage reviews (catch regressions early)
   - Add mutation testing (verify test quality, not just coverage)

---

**Report Version**: 1.0
**Next Review**: YYYY-MM-DD (2 weeks)
```

---

## Coverage Anti-Patterns

### Anti-Pattern 1: Coverage Theater
**Problem**: 100% coverage with useless tests
**Example**:
```typescript
// Bad test (covers line but doesn't verify correctness)
test('validatePassword should run', () => {
  validatePassword('test');
  expect(true).toBe(true); // Meaningless assertion
});
```

**Fix**: Write meaningful assertions

```typescript
// Good test (covers line AND verifies behavior)
test('validatePassword should reject passwords under 8 characters', () => {
  expect(validatePassword('short')).toBe('Password must be at least 8 characters');
});
```

---

### Anti-Pattern 2: Chasing 100% Coverage
**Problem**: Testing trivial code (getters, setters)
**Example**: Testing auto-generated code, simple getters

**Fix**: Focus on business logic, not boilerplate

---

### Anti-Pattern 3: Ignoring Coverage Drops
**Problem**: Coverage drops from 85% → 70%, no one notices
**Example**: New feature added without tests

**Fix**: Enforce coverage minimums in CI (fail build if coverage drops)

---

### Anti-Pattern 4: Only Line Coverage
**Problem**: 100% line coverage but 40% branch coverage
**Example**: Testing only happy path, not edge cases

**Fix**: Track branch coverage, aim for 80%+

---

## Tips for Effective Coverage Analysis

### DO:
✅ Track multiple coverage types (lines, branches, functions)
✅ Set risk-based targets (critical code = 90%, low-risk = 50%)
✅ Enforce minimums in CI/CD (fail build if coverage drops)
✅ Prioritize gaps by risk (fix critical gaps first)
✅ Review coverage trends (catch regressions)
✅ Write meaningful tests (not just coverage theater)
✅ Combine coverage with mutation testing (test quality, not just quantity)

### DON'T:
❌ Chase 100% coverage (diminishing returns)
❌ Test trivial code (getters, auto-generated code)
❌ Only measure line coverage (branches and functions matter too)
❌ Ignore coverage drops (enforce minimums)
❌ Write tests just to increase coverage (test behavior, not lines)
❌ Assume high coverage = good tests (could be useless tests)
❌ Skip edge case testing (100% line coverage ≠ all scenarios tested)

---

## Integration with Other Skills

### CreateTestStrategy Integration
Use coverage analysis to validate test strategy execution:

```
1. CreateTestStrategy sets targets (85% lines, 80% branches)
2. DefineCoverage measures actual coverage (78% lines, 72% branches)
3. Create improvement plan to close gap (-7% lines, -8% branches)
```

### AgilePm Integration
Add coverage improvement tasks as user stories:

```markdown
### Story: Improve OAuth test coverage (8 pts)

**Current**: 45% coverage (critical risk)
**Target**: 90% coverage (meets standard)

**Acceptance Criteria**:
- [ ] oauth.ts has ≥90% line coverage
- [ ] oauth.ts has ≥85% branch coverage
- [ ] All OAuth error scenarios tested
- [ ] CI enforces 90% minimum for oauth.ts
```

---

## Validation Checklist

Before finalizing coverage analysis:

- [ ] Coverage report generated (lines, branches, functions)
- [ ] Gaps identified (uncovered lines, branches, functions)
- [ ] Risk assessment complete (critical/high/medium/low)
- [ ] Coverage targets set based on risk
- [ ] Improvement plan created with effort estimates
- [ ] CI/CD enforcement configured (minimum coverage thresholds)
- [ ] Coverage trends tracked over time
- [ ] Coverage report document generated
- [ ] Critical gaps prioritized for immediate fix

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Based on**: Industry standards (80% coverage), Risk-Based Testing (ISO 29119)
