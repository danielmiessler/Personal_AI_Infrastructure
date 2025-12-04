# CreateTestStrategy Workflow

**Purpose**: Define comprehensive test strategy using ATDD (Acceptance Test-Driven Development) and risk-based testing

**Input**: PRD, user stories, or feature description

**Output**: Test strategy document with test types, coverage targets, and test scenarios

---

## What is ATDD?

**Acceptance Test-Driven Development (ATDD)** is a collaborative approach where tests are written BEFORE code, based on acceptance criteria.

**ATDD Flow**:
```
1. Define acceptance criteria (Given-When-Then)
   ↓
2. Write acceptance tests (automated)
   ↓
3. Tests FAIL (red)
   ↓
4. Implement feature
   ↓
5. Tests PASS (green)
   ↓
6. Refactor code (maintain green)
```

**Benefits**:
- Tests written before code prevent rework
- Acceptance criteria drive implementation
- Higher test coverage (no "we'll test it later")
- Fewer defects escape to production

---

## Test Pyramid

All test strategies should follow the Test Pyramid:

```
         /\
        /  \      E2E Tests (10%)
       /____\     Few, slow, expensive
      /      \
     /        \   Integration Tests (20%)
    /__________\  Moderate number, moderate speed
   /            \
  /______________\ Unit Tests (70%)
   Many, fast, cheap
```

**Guideline**:
- **70%** Unit tests (fast, isolated, test single functions)
- **20%** Integration tests (test component interactions)
- **10%** E2E tests (test full user workflows)

**Anti-Pattern**: Inverted pyramid (mostly E2E tests) → slow, flaky, expensive

---

## Workflow Steps

### Step 1: Understand the Feature

**Action**: Gather context about what needs testing

**Questions to Ask**:
- What is this feature? (user story, epic, full system)
- What user value does it deliver?
- What are the acceptance criteria?
- What are the risks? (security, data loss, performance)
- What dependencies exist? (APIs, databases, external services)

**Inputs**:
- User stories (from AgilePm skill)
- PRD (product requirements)
- Architecture diagram
- Acceptance criteria (Given-When-Then)

**Example**:
```
Feature: User Login

User Story:
As a registered user,
I want to log in with email and password,
So that I can access my personalized dashboard.

Acceptance Criteria:
- Given valid credentials, user is redirected to dashboard
- Given invalid password, user sees "Invalid credentials" error
- Given 5 failed attempts, account is locked for 15 minutes
```

---

### Step 2: Identify Test Types

**Action**: Determine which types of tests are needed

**Test Types**:

#### 1. Unit Tests
**What**: Test individual functions/methods in isolation
**When**: Always (70% of test suite)
**Tools**: Jest, Mocha, pytest, JUnit
**Example**: Test password hashing function

```typescript
// Unit test example
test('hashPassword should return bcrypt hash', () => {
  const password = 'SecurePass123!';
  const hash = hashPassword(password);
  expect(hash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
  expect(hash).not.toBe(password); // not plaintext
});
```

---

#### 2. Integration Tests
**What**: Test component interactions (API + database, service + cache)
**When**: For features with external dependencies (20% of suite)
**Tools**: Supertest, Postman, RestAssured
**Example**: Test login API endpoint

```typescript
// Integration test example
test('POST /api/login with valid credentials returns 200 and token', async () => {
  const response = await request(app)
    .post('/api/login')
    .send({ email: 'user@example.com', password: 'SecurePass123!' });

  expect(response.status).toBe(200);
  expect(response.body.token).toBeDefined();
  expect(response.body.user.email).toBe('user@example.com');
});
```

---

#### 3. End-to-End (E2E) Tests
**What**: Test full user workflows (browser automation)
**When**: For critical user paths (10% of suite)
**Tools**: Playwright, Cypress, Selenium
**Example**: Test complete login flow

```typescript
// E2E test example
test('User can log in and see dashboard', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.fill('input[name=email]', 'user@example.com');
  await page.fill('input[name=password]', 'SecurePass123!');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome back');
});
```

---

#### 4. Security Tests
**What**: Test for vulnerabilities (SQL injection, XSS, auth bypass)
**When**: For features handling sensitive data or user input
**Tools**: OWASP ZAP, Burp Suite, SQLMap
**Example**: Test SQL injection prevention

```bash
# Security test example (manual with SQLMap)
sqlmap -u "https://api.example.com/login" \
  --data="email=user@example.com&password=test" \
  --risk=3 --level=5 --batch
```

---

#### 5. Performance Tests
**What**: Test response time, throughput, scalability
**When**: For features with performance requirements
**Tools**: k6, Apache JMeter, Gatling
**Example**: Test login API handles 100 req/sec

```javascript
// Performance test example (k6)
export default function() {
  const response = http.post('https://api.example.com/login', {
    email: 'user@example.com',
    password: 'SecurePass123!'
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

---

### Step 3: Apply Risk-Based Testing

**Action**: Prioritize testing effort based on risk

**Risk Scoring**:

| Risk Level | Impact | Likelihood | Test Coverage Target |
|------------|--------|------------|----------------------|
| **Critical** | High | High | 90-100% coverage |
| **High** | High | Medium | 80-90% coverage |
| **Medium** | Medium | Medium | 70-80% coverage |
| **Low** | Low | Low | 50-70% coverage |

**Risk Factors**:

**High Risk** (more testing):
- Handles financial transactions
- Processes sensitive data (PII, credentials)
- Impacts many users (core feature)
- Complex logic (many edge cases)
- Security-critical (authentication, authorization)
- Compliance-required (CMMC, GDPR, SOX)

**Low Risk** (less testing):
- Read-only operations
- Non-critical UI (cosmetic changes)
- Isolated feature (few users)
- Simple logic (no edge cases)

**Example Risk Assessment**:

```markdown
### Feature: User Login
**Impact**: High (all users need to log in)
**Likelihood**: High (common attack target)
**Risk Level**: **Critical**
**Test Coverage Target**: 90-100%

**Test Allocation**:
- Unit tests: 15 tests (password validation, hashing, token generation)
- Integration tests: 10 tests (API endpoints, database queries)
- E2E tests: 5 tests (full login flow, error scenarios)
- Security tests: 5 tests (SQL injection, XSS, brute force)
- Performance tests: 2 tests (100 req/sec, 1000 concurrent users)

**Total**: 37 tests
```

---

### Step 4: Define Acceptance Test Scenarios

**Action**: Convert acceptance criteria into concrete test scenarios

**Given-When-Then to Test Scenarios**:

**Acceptance Criterion 1**:
```
Given I am on the login page
When I enter valid email and password
Then I am redirected to my dashboard
```

**Test Scenarios**:
1. **Happy Path**: Valid credentials → 200 OK, token returned, redirect to /dashboard
2. **Valid Email, Wrong Password**: → 401 Unauthorized, "Invalid credentials" message
3. **Invalid Email Format**: → 400 Bad Request, "Invalid email format" message
4. **Empty Fields**: → 400 Bad Request, "Email and password required" message
5. **Account Locked**: → 403 Forbidden, "Account locked" message + unlock time
6. **Session Expiry**: Token expires after 24 hours → 401 on next request

**Acceptance Criterion 2**:
```
Given I have entered wrong password 5 times
When I try to log in again
Then my account is temporarily locked for 15 minutes
```

**Test Scenarios**:
7. **5 Failed Attempts**: → Account locked, lockout duration = 15 minutes
8. **Lockout Expiry**: After 15 minutes → Account unlocked, login succeeds
9. **Lockout Admin Override**: Admin unlocks account → User can log in immediately

---

### Step 5: Specify Test Coverage Targets

**Action**: Define coverage goals for unit, integration, E2E tests

**Coverage Types**:

1. **Line Coverage**: % of code lines executed by tests
2. **Branch Coverage**: % of if/else branches tested
3. **Function Coverage**: % of functions called by tests
4. **Statement Coverage**: % of statements executed

**Coverage Targets** (by risk level):

| Risk Level | Line Coverage | Branch Coverage | Notes |
|------------|---------------|-----------------|-------|
| **Critical** | ≥90% | ≥85% | All edge cases tested |
| **High** | ≥80% | ≥75% | Most edge cases tested |
| **Medium** | ≥70% | ≥65% | Happy path + key edge cases |
| **Low** | ≥50% | ≥45% | Happy path only |

**Coverage Enforcement**:
```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: npm test -- --coverage --coverageThreshold='{"global":{"lines":80,"branches":75}}'
```

**Coverage Report Example**:
```
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
auth/login.ts       |   92.5  |   87.5   |  100    |   95.2  | ✅
auth/password.ts    |   85.7  |   80.0   |  100    |   88.9  | ✅
auth/session.ts     |   78.3  |   70.0   |   90.0  |   81.2  | ⚠️
auth/oauth.ts       |   45.0  |   40.0   |   60.0  |   48.5  | ❌
--------------------|---------|----------|---------|---------|
All files           |   80.1  |   75.3   |   90.0  |   83.2  | ✅
```

**Action Items**:
- ✅ login.ts, password.ts: Meets targets
- ⚠️ session.ts: Add 2-3 more tests (edge cases)
- ❌ oauth.ts: Critical gap, add 10+ tests immediately

---

### Step 6: Create Test Data Strategy

**Action**: Define how test data is created, managed, and cleaned up

**Test Data Approaches**:

#### 1. Test Fixtures (Static Data)
**When**: Predictable, reusable test data
**Example**: Seed database with 10 test users

```typescript
// fixtures/users.ts
export const testUsers = [
  { email: 'user1@example.com', password: 'Pass123!', role: 'user' },
  { email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
];
```

---

#### 2. Factory Pattern (Dynamic Data)
**When**: Need many variations of test data
**Example**: Generate random users on-demand

```typescript
// factories/user.factory.ts
export function createUser(overrides?: Partial<User>): User {
  return {
    id: randomUUID(),
    email: `user-${Date.now()}@example.com`,
    password: hashPassword('DefaultPass123!'),
    role: 'user',
    ...overrides
  };
}
```

---

#### 3. Database Seeding
**When**: Integration/E2E tests need realistic data
**Example**: Seed test database before test suite

```bash
# Before tests
npm run db:seed:test

# After tests
npm run db:reset:test
```

---

#### 4. Test Isolation
**Principle**: Each test must be independent (no shared state)

**Best Practices**:
- Create test data in `beforeEach()`, clean up in `afterEach()`
- Use transactions (rollback after each test)
- Use unique identifiers (avoid conflicts)

```typescript
beforeEach(async () => {
  // Fresh data for each test
  user = await createUser({ email: 'test@example.com' });
});

afterEach(async () => {
  // Clean up
  await deleteUser(user.id);
});
```

---

### Step 7: Define Test Automation Strategy

**Action**: Specify which tests run when and where

**Test Execution Tiers**:

#### Tier 1: Pre-Commit (Developer Laptop)
**When**: Before git commit
**What**: Unit tests only (fast, <30 seconds)
**Tool**: Husky pre-commit hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit"
    }
  }
}
```

---

#### Tier 2: Pull Request (CI Pipeline)
**When**: On PR creation
**What**: Unit + Integration tests (<5 minutes)
**Tool**: GitHub Actions, GitLab CI

```yaml
# .github/workflows/pr.yml
name: Pull Request Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
```

---

#### Tier 3: Merge to Main (CI Pipeline)
**When**: After PR merge
**What**: Unit + Integration + E2E (<15 minutes)
**Tool**: GitHub Actions

```yaml
# .github/workflows/main.yml
name: Main Branch Tests
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:security
```

---

#### Tier 4: Nightly (Scheduled)
**When**: Every night at 2 AM
**What**: Full test suite + performance tests (<1 hour)
**Tool**: Scheduled GitHub Action

```yaml
# .github/workflows/nightly.yml
name: Nightly Full Test Suite
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:all
      - run: npm run test:performance
      - run: npm run test:security:full
```

---

### Step 8: Generate Test Strategy Document

**Action**: Create comprehensive test strategy document

**Document Structure**: See template in `templates/test-strategy-template.md`

---

## Test Strategy Patterns

### Pattern 1: CRUD Feature Test Strategy

**Feature**: User Management (Create, Read, Update, Delete)

**Test Allocation**:
- **Unit Tests** (70%): Validate input, test business logic
- **Integration Tests** (20%): Test API endpoints + database
- **E2E Tests** (10%): Test UI workflows

**Coverage Targets**: 80% (High risk)

---

### Pattern 2: Authentication Feature Test Strategy

**Feature**: User Login & Session Management

**Test Allocation**:
- **Unit Tests** (60%): Password hashing, token generation, validation
- **Integration Tests** (20%): Login API, session API, logout API
- **E2E Tests** (10%): Full login/logout flow
- **Security Tests** (10%): SQL injection, brute force, session hijacking

**Coverage Targets**: 90% (Critical risk)

---

### Pattern 3: Data Processing Feature Test Strategy

**Feature**: CSV Import with 10,000 rows

**Test Allocation**:
- **Unit Tests** (70%): Parse CSV, validate rows, transform data
- **Integration Tests** (15%): Import API + database writes
- **E2E Tests** (5%): Upload CSV file, verify import
- **Performance Tests** (10%): 10k rows <10 seconds

**Coverage Targets**: 75% (Medium risk)

---

## Tips for Effective Test Strategies

### DO:
✅ Write tests BEFORE code (ATDD approach)
✅ Follow the test pyramid (70% unit, 20% integration, 10% E2E)
✅ Use risk-based testing (more tests for critical features)
✅ Automate tests in CI/CD pipeline
✅ Track test coverage (enforce minimums)
✅ Isolate tests (no shared state)
✅ Use descriptive test names (test should read like documentation)

### DON'T:
❌ Write tests after code is done (too late, low coverage)
❌ Invert the pyramid (mostly E2E tests → slow, flaky)
❌ Skip edge cases (only test happy path)
❌ Manual testing only (not scalable)
❌ Ignore test failures (fix or delete failing tests)
❌ Share state between tests (causes flakiness)
❌ Use vague test names ("test1", "it works")

---

## Integration with Other Skills

### AgilePm Skill Integration
When creating user stories, invoke TestArchitect skill:

```
/skill TestArchitect
Create test strategy for this user story:
"As a user, I want to upload profile pictures so I can personalize my account."
```

TestArchitect returns: test types, coverage targets, test scenarios.

### Security Skill Integration
Security tests should align with threat model:

```
/skill Security
Provide security test scenarios for Threat 1 (SQL injection in login API).
```

Security skill returns: SQLMap commands, test data, expected results.

---

## Validation Checklist

Before finalizing test strategy:

- [ ] All test types identified (unit, integration, E2E, security, performance)
- [ ] Test pyramid ratios defined (70/20/10)
- [ ] Risk assessment complete (Critical/High/Medium/Low)
- [ ] Coverage targets set per risk level (90%/80%/70%/50%)
- [ ] Acceptance criteria converted to test scenarios
- [ ] Test data strategy defined (fixtures, factories, seeding)
- [ ] Test automation tiers defined (pre-commit, PR, merge, nightly)
- [ ] Test strategy document generated
- [ ] CI/CD pipeline configured with tests
- [ ] Coverage enforcement enabled

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Based on**: ATDD methodology, Test Pyramid (Martin Fowler), Risk-Based Testing (ISO 29119)
