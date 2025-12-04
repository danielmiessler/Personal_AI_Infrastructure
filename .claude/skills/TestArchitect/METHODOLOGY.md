# TestArchitect Skill Methodology

**Purpose**: Document test-first principles and workflow sequence

---

## Core Principles

### 1. Tests Before Code (ATDD)
**Principle**: Write acceptance tests BEFORE implementing the feature

**Acceptance Test-Driven Development (ATDD) Flow**:
```
1. Define acceptance criteria (Given-When-Then)
   ↓
2. Write acceptance test (RED - fails)
   ↓
3. Implement feature
   ↓
4. Test passes (GREEN)
   ↓
5. Refactor (keep tests GREEN)
```

**Benefits**:
- Tests define "done" upfront (no ambiguity)
- Higher coverage (tests written, not deferred)
- Fewer defects (testable code by design)
- Living documentation (tests show how features work)

**Example**:
```typescript
// Step 1: Write test first (RED)
test('login with valid credentials should return token', async () => {
  const response = await login('user@example.com', 'password123');
  expect(response.token).toBeDefined();
  expect(response.user.email).toBe('user@example.com');
});

// Step 2: Implement login function (make test GREEN)
function login(email, password) {
  // Implementation here
}
```

---

### 2. Test Pyramid (Not Ice Cream Cone)
**Principle**: Most tests should be fast unit tests, fewest E2E tests

**Test Pyramid** (Ideal):
```
         /\
        /  \      E2E (10%)
       /____\     Slow, brittle, expensive
      /      \
     /        \   Integration (20%)
    /__________\  Moderate speed/cost
   /            \
  /______________\ Unit (70%)
   Fast, reliable, cheap
```

**Anti-Pattern** (Ice Cream Cone):
```
  /______________\ E2E (70%)  ← WRONG
   \            /
    \__________/  Integration (20%)
     \        /
      \______/    Unit (10%)
       \    /
        \__/
```

**Why Pyramid is Better**:
- Unit tests run in milliseconds (fast feedback)
- E2E tests run in minutes (slow, blocks developers)
- Flaky E2E tests waste time (false failures)

---

### 3. Risk-Based Testing
**Principle**: Test more where risk is higher

**Risk Factors**:
- **Impact**: How bad if this breaks? (data loss, financial loss, security breach)
- **Likelihood**: How likely is this to break? (complexity, dependencies)

**Risk Matrix**:

| Risk | Impact | Likelihood | Coverage Target | Example |
|------|--------|------------|-----------------|---------|
| **Critical** | High | High | 90-100% | Authentication, payment processing |
| **High** | High | Medium | 80-90% | Core features (user management) |
| **Medium** | Medium | Medium | 70-80% | Secondary features (profile editing) |
| **Low** | Low | Low | 50-70% | Utilities, cosmetic UI changes |

**Example**:
```
Feature: User Login (Critical)
- Impact: High (all users need to log in)
- Likelihood: High (common attack target)
→ Test Coverage: 95% (37 tests)

Feature: Profile picture upload (Medium)
- Impact: Medium (nice-to-have feature)
- Likelihood: Medium (file upload is moderately complex)
→ Test Coverage: 75% (12 tests)
```

---

### 4. Test Isolation
**Principle**: Each test must be independent (no shared state)

**Why Isolation Matters**:
- Tests can run in any order
- Parallel test execution (faster CI)
- Easier debugging (no cascading failures)

**Bad Example** (Shared State):
```typescript
let user; // Shared state between tests

test('create user', () => {
  user = createUser('test@example.com');
  expect(user.email).toBe('test@example.com');
});

test('delete user', () => {
  deleteUser(user.id); // Depends on previous test
  expect(getUser(user.id)).toBeNull();
});
```

**Good Example** (Isolated):
```typescript
test('create user', () => {
  const user = createUser('test@example.com');
  expect(user.email).toBe('test@example.com');
  // Clean up
  deleteUser(user.id);
});

test('delete user', () => {
  const user = createUser('delete@example.com'); // Fresh data
  deleteUser(user.id);
  expect(getUser(user.id)).toBeNull();
});
```

---

### 5. Coverage is Necessary but Not Sufficient
**Principle**: High coverage ≠ good tests (but low coverage = definitely gaps)

**Coverage Tells You**:
- ✅ Which code is untested (gaps)
- ✅ If coverage is dropping (regressions)

**Coverage Does NOT Tell You**:
- ❌ If tests are meaningful (could be useless assertions)
- ❌ If edge cases are tested (100% line coverage ≠ all scenarios)
- ❌ If tests are maintainable

**Example of Bad 100% Coverage**:
```typescript
// This achieves 100% coverage but doesn't test correctness
test('validatePassword should run', () => {
  validatePassword('anything');
  expect(true).toBe(true); // Meaningless assertion
});
```

**Better Test**:
```typescript
test('validatePassword should reject passwords under 8 characters', () => {
  expect(validatePassword('short')).toBe('Password must be at least 8 characters');
});
```

---

## Workflow Sequence

### Typical Test Workflow

```
1. User Story Created (AgilePm skill)
   - Acceptance criteria defined (Given-When-Then)
   ↓
2. Test Strategy (TestArchitect skill: CreateTestStrategy)
   - Identify test types (unit/integration/E2E/security/performance)
   - Set coverage targets based on risk
   - Define test scenarios
   ↓
3. Write Acceptance Tests (ATDD)
   - Convert acceptance criteria to automated tests
   - Tests FAIL (RED) - feature not implemented yet
   ↓
4. Implement Feature (Engineer agent)
   - Write code to make tests pass
   ↓
5. Tests Pass (GREEN)
   - All acceptance criteria met
   ↓
6. Coverage Analysis (TestArchitect skill: DefineCoverage)
   - Measure coverage (lines, branches, functions)
   - Identify gaps
   ↓
7. Add Missing Tests (if gaps found)
   - Fill coverage gaps (especially critical code)
   ↓
8. Refactor (keep tests GREEN)
   - Improve code quality
   - Tests prevent regressions
   ↓
9. Deploy to Production
   - All tests pass in CI/CD
   - Coverage meets targets
```

---

## Test Types

### 1. Unit Tests (70% of test suite)

**What**: Test individual functions/methods in isolation

**When**: For all business logic, pure functions, utilities

**Tools**: Jest, Mocha, pytest, JUnit

**Characteristics**:
- Fast (milliseconds per test)
- No external dependencies (mocked)
- High coverage (easy to write many unit tests)

**Example**:
```typescript
function calculateDiscount(price: number, discountPercent: number): number {
  return price * (discountPercent / 100);
}

test('calculateDiscount should return 10 for 100 price and 10% discount', () => {
  expect(calculateDiscount(100, 10)).toBe(10);
});
```

---

### 2. Integration Tests (20% of test suite)

**What**: Test component interactions (API + database, service + cache)

**When**: For features with external dependencies

**Tools**: Supertest, Postman, RestAssured

**Characteristics**:
- Moderate speed (seconds per test)
- Real dependencies (database, APIs)
- Tests integration points

**Example**:
```typescript
test('POST /api/users should create user in database', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ email: 'test@example.com', password: 'password123' });

  expect(response.status).toBe(201);

  // Verify in database
  const user = await db.query('SELECT * FROM users WHERE email = ?', ['test@example.com']);
  expect(user).toBeDefined();
});
```

---

### 3. End-to-End (E2E) Tests (10% of test suite)

**What**: Test full user workflows (browser automation)

**When**: For critical user paths

**Tools**: Playwright, Cypress, Selenium

**Characteristics**:
- Slow (minutes per test)
- Full stack (browser + backend + database)
- Tests real user scenarios

**Example**:
```typescript
test('User can sign up, log in, and edit profile', async ({ page }) => {
  // Sign up
  await page.goto('https://app.example.com/signup');
  await page.fill('input[name=email]', 'test@example.com');
  await page.fill('input[name=password]', 'password123');
  await page.click('button[type=submit]');

  // Log in
  await expect(page).toHaveURL('/dashboard');

  // Edit profile
  await page.click('a[href="/profile"]');
  await page.fill('input[name=name]', 'John Doe');
  await page.click('button[type=submit]');
  await expect(page.locator('.success-message')).toContainText('Profile updated');
});
```

---

### 4. Security Tests

**What**: Test for vulnerabilities (SQL injection, XSS, auth bypass)

**When**: For features handling sensitive data or user input

**Tools**: OWASP ZAP, Burp Suite, SQLMap

**Integration**: Get scenarios from Security skill (ThreatModel)

---

### 5. Performance Tests

**What**: Test response time, throughput, scalability

**When**: For features with performance requirements

**Tools**: k6, Apache JMeter, Gatling

**Example**:
```javascript
// k6 performance test
export default function() {
  const response = http.get('https://api.example.com/users');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200
  });
}
```

---

## Coverage Metrics

### Coverage Types

| Type | Measures | Target | How to Achieve |
|------|----------|--------|----------------|
| **Line Coverage** | % of code lines executed | ≥80% | Write tests that execute all paths |
| **Branch Coverage** | % of if/else branches | ≥75% | Test both true and false branches |
| **Function Coverage** | % of functions called | ≥90% | Call all functions at least once |
| **Mutation Coverage** | % of mutants killed | ≥70% | Write assertions that catch logic errors |

### Coverage Targets by Risk

| Risk | Line | Branch | Functions | Example |
|------|------|--------|-----------|---------|
| **Critical** | ≥90% | ≥85% | 100% | Authentication, payment |
| **High** | ≥80% | ≥75% | ≥95% | User management |
| **Medium** | ≥70% | ≥65% | ≥85% | Profile editing |
| **Low** | ≥50% | ≥45% | ≥70% | Utilities |

---

## Test Data Management

### Approaches

#### 1. Test Fixtures (Static Data)
**When**: Predictable, reusable test data
**Example**: Seed 10 test users with known properties

#### 2. Factory Pattern (Dynamic Data)
**When**: Need many variations
**Example**: Generate random users on-demand

#### 3. Database Seeding
**When**: Integration/E2E tests need realistic data
**Example**: Seed test database before suite

#### 4. Mocking (Test Doubles)
**When**: External dependencies (APIs, services)
**Example**: Mock payment gateway in tests

---

## Test Automation Tiers

### Tier 1: Pre-Commit (Developer Laptop)
- **When**: Before `git commit`
- **What**: Unit tests only (<30 seconds)
- **Tool**: Husky pre-commit hook

### Tier 2: Pull Request (CI Pipeline)
- **When**: On PR creation
- **What**: Unit + Integration tests (<5 minutes)
- **Tool**: GitHub Actions

### Tier 3: Merge to Main (CI Pipeline)
- **When**: After PR merge
- **What**: Unit + Integration + E2E (<15 minutes)
- **Tool**: GitHub Actions

### Tier 4: Nightly (Scheduled)
- **When**: Every night at 2 AM
- **What**: Full suite + performance + security (<1 hour)
- **Tool**: Scheduled GitHub Action

---

## Best Practices

### DO:
✅ Write tests before code (ATDD)
✅ Follow test pyramid (70/20/10)
✅ Use risk-based testing (more tests for critical features)
✅ Isolate tests (no shared state)
✅ Use descriptive test names
✅ Track coverage trends
✅ Automate tests in CI/CD
✅ Write meaningful assertions

### DON'T:
❌ Write tests after code (low coverage, deferred)
❌ Invert pyramid (mostly E2E tests)
❌ Share state between tests (flaky)
❌ Skip edge cases (only test happy path)
❌ Use vague test names ("test1")
❌ Ignore test failures
❌ Manual testing only (not scalable)
❌ Chase 100% coverage (diminishing returns)

---

## Common Testing Anti-Patterns

### 1. Ice Cream Cone
**Problem**: Mostly E2E tests (slow, brittle)
**Fix**: Invert to pyramid (70% unit, 20% integration, 10% E2E)

### 2. Coverage Theater
**Problem**: 100% coverage with useless tests
**Fix**: Write meaningful assertions, not just line coverage

### 3. Flaky Tests
**Problem**: Tests fail randomly (shared state, race conditions)
**Fix**: Isolate tests, use deterministic data

### 4. Testing Implementation Details
**Problem**: Tests coupled to internal code structure
**Fix**: Test behavior (inputs → outputs), not implementation

### 5. No Integration Tests
**Problem**: Unit tests pass but app doesn't work
**Fix**: Add integration tests for component interactions

---

## Resources

- **ATDD**: [Gojko Adzic - Specification by Example](https://gojko.net/books/specification-by-example/)
- **Test Pyramid**: [Martin Fowler - TestPyramid](https://martinfowler.com/bliki/TestPyramid.html)
- **TDD**: [Kent Beck - Test Driven Development](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- **Risk-Based Testing**: [ISO 29119 Software Testing](https://www.iso.org/standard/45142.html)

---

**Methodology Version**: 1.0
**Last Updated**: 2025-12-02
