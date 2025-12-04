# Risk-Based Testing Workflow

**Purpose**: Prioritize testing efforts based on risk, ensuring critical areas receive thorough testing while low-risk areas receive proportional coverage

**When to Use**: Planning test strategy for any feature, sprint, or release

**Output**: Risk matrix, prioritized test plan, coverage targets by risk level

---

## What is Risk-Based Testing?

**Risk-Based Testing (RBT)** is a testing strategy that:
1. **Identifies** risk factors (what could go wrong?)
2. **Assesses** risk level (how likely? how bad?)
3. **Prioritizes** testing effort (focus on high-risk areas)
4. **Optimizes** resources (test what matters most)

**Key Formula**: **Risk = Likelihood × Impact**

**Example**:
- **Payment processing**: High likelihood of bugs (complex) × High impact (money loss) = **Critical Risk**
- **Footer copyright text**: Low likelihood of bugs (simple) × Low impact (cosmetic) = **Low Risk**

**Result**: Test payment processing thoroughly (90% coverage), test footer lightly (50% coverage).

---

## Why Risk-Based Testing?

### Problem: Not All Code is Equally Risky

**Traditional Testing** (blind coverage):
- Test everything equally (80% coverage across all modules)
- Waste effort on low-risk code (footer, static pages)
- Under-test high-risk code (payment, auth)

**Risk-Based Testing** (smart coverage):
- Test high-risk areas thoroughly (90% coverage on payment, auth)
- Test medium-risk areas adequately (70% coverage on user profile)
- Test low-risk areas lightly (50% coverage on footer)

**Result**: Better quality with same effort (or same quality with less effort).

---

## Risk Factors

### 1. Business Criticality (Impact)

**Question**: If this feature fails, what's the business impact?

| Level | Impact | Examples | Coverage Target |
|-------|--------|----------|-----------------|
| **Critical** | Revenue loss, legal liability, data breach | Payment processing, authentication, PII handling | 90% |
| **High** | Customer churn, poor UX, competitive disadvantage | User onboarding, core features, search | 80% |
| **Medium** | Minor inconvenience, workaround exists | Profile settings, notifications, filters | 70% |
| **Low** | Cosmetic issue, rarely used feature | Footer text, static pages, admin tools | 50% |

**Example**:
- **Payment processing fails**: Users can't pay → Revenue loss → **Critical**
- **Footer copyright wrong**: No business impact → **Low**

---

### 2. Technical Complexity (Likelihood)

**Question**: How complex is this code? More complexity = more bugs.

| Level | Complexity | Indicators | Likelihood of Bugs |
|-------|------------|------------|-------------------|
| **Very High** | >500 LOC, >10 dependencies, complex algorithms | Distributed transactions, cryptography, concurrency | 80% |
| **High** | 200-500 LOC, 5-10 dependencies, multiple integrations | API gateway, ORM queries, state machines | 60% |
| **Medium** | 50-200 LOC, 2-5 dependencies, standard logic | CRUD operations, form validation, simple algorithms | 40% |
| **Low** | <50 LOC, 0-1 dependencies, trivial logic | Static pages, constants, simple getters | 20% |

**Example**:
- **Distributed payment transaction**: Very high complexity → 80% chance of bugs
- **Display copyright text**: Low complexity → 20% chance of bugs

---

### 3. Change Frequency

**Question**: How often does this code change? More changes = more regression risk.

| Level | Change Frequency | Indicators | Regression Risk |
|-------|------------------|------------|-----------------|
| **Very High** | Multiple times per sprint | Active development, frequent bug fixes | High |
| **High** | Once per sprint | Regular feature additions | Medium-High |
| **Medium** | Once per release | Occasional updates | Medium |
| **Low** | Rarely changed | Stable, mature code | Low |

**Example**:
- **New feature under active development**: Changed daily → High regression risk → Test more
- **Stable library untouched for months**: Low regression risk → Test less

---

### 4. Regulatory/Compliance Requirements

**Question**: Are there legal or compliance requirements?

| Level | Requirements | Examples | Mandatory Coverage |
|-------|--------------|----------|-------------------|
| **Critical** | CMMC, HIPAA, PCI-DSS, SOC 2 | PII handling, payment processing, audit logs | 100% (audited) |
| **High** | GDPR, CCPA, accessibility (WCAG) | User data deletion, cookie consent, screen readers | 90% |
| **Medium** | Industry best practices | Password complexity, session timeout | 80% |
| **Low** | No regulatory requirements | Internal tools, non-sensitive features | 50% |

**Example**:
- **CMMC-required CUI handling**: Must have 100% coverage (audit requirement)
- **Internal admin dashboard**: No compliance requirements → 50% coverage

---

### 5. Security Sensitivity

**Question**: What's the security impact if this fails?

| Level | Security Impact | Examples | Security Coverage |
|-------|----------------|----------|------------------|
| **Critical** | Data breach, privilege escalation | Authentication, authorization, encryption | 100% (penetration tested) |
| **High** | Information disclosure, session hijacking | Password reset, API tokens, session management | 90% |
| **Medium** | CSRF, XSS (limited scope) | Form submissions, user-generated content | 80% |
| **Low** | No security impact | Static pages, read-only data | 50% |

**Example**:
- **OAuth callback**: Security critical → 100% coverage + penetration testing
- **Public blog post**: No security impact → 50% coverage

---

## Risk Scoring Formula

### Step 1: Assess Each Risk Factor (1-5 scale)

**Business Criticality** (1 = Low, 5 = Critical):
- 5: Revenue loss, data breach, legal liability
- 4: Customer churn, poor UX
- 3: Minor inconvenience
- 2: Cosmetic issue
- 1: No business impact

**Technical Complexity** (1 = Simple, 5 = Very Complex):
- 5: >500 LOC, >10 dependencies, distributed systems
- 4: 200-500 LOC, 5-10 dependencies
- 3: 50-200 LOC, 2-5 dependencies
- 2: <50 LOC, 1 dependency
- 1: Trivial logic, no dependencies

**Change Frequency** (1 = Rare, 5 = Very Frequent):
- 5: Multiple times per sprint
- 4: Once per sprint
- 3: Once per release
- 2: Rarely
- 1: Never

**Compliance** (1 = None, 5 = Critical):
- 5: CMMC, HIPAA, PCI-DSS (audited)
- 4: GDPR, CCPA, WCAG
- 3: Industry best practices
- 2: Internal standards
- 1: No compliance requirements

**Security** (1 = None, 5 = Critical):
- 5: Authentication, authorization, encryption
- 4: Password reset, API tokens
- 3: CSRF, XSS protection
- 2: Input validation
- 1: No security impact

---

### Step 2: Calculate Total Risk Score

**Formula**:
```
Total Risk Score = (
  Business Criticality × 3 +    // 3x weight (most important)
  Technical Complexity × 2 +     // 2x weight
  Change Frequency × 1.5 +       // 1.5x weight
  Compliance × 2 +               // 2x weight (audit requirements)
  Security × 2                   // 2x weight (breach prevention)
) / 10.5                         // Normalize to 1-5 scale
```

**Why weighted?**: Business impact and compliance matter more than change frequency.

---

### Step 3: Map Risk Score to Risk Level

| Risk Score | Risk Level | Coverage Target | Test Types |
|-----------|------------|-----------------|------------|
| 4.5 - 5.0 | **Critical** | 90-100% | Unit, Integration, E2E, Security, Performance, Penetration |
| 3.5 - 4.4 | **High** | 80-90% | Unit, Integration, E2E, Security |
| 2.5 - 3.4 | **Medium** | 70-80% | Unit, Integration, E2E |
| 1.5 - 2.4 | **Low** | 50-70% | Unit, Integration |
| 1.0 - 1.4 | **Very Low** | 30-50% | Unit (smoke tests only) |

---

## Risk-Based Testing Workflow (6 Steps)

### Step 1: Identify Features/Modules to Assess

**Purpose**: List all features or modules in the current sprint/release

**Example: E-commerce Application**

Features for this sprint:
1. User authentication (login, logout, session management)
2. Product catalog (browse products, search, filters)
3. Shopping cart (add to cart, update quantity, remove items)
4. Checkout (payment processing, order confirmation, email receipt)
5. User profile (view profile, edit details, change password)
6. Footer (copyright, links, privacy policy)
7. Admin dashboard (view orders, manage products)

**Output**: List of features to assess

---

### Step 2: Assess Risk Factors for Each Feature

**Purpose**: Score each feature on 5 risk factors (1-5 scale)

**Example: User Authentication**

| Risk Factor | Score | Justification |
|-------------|-------|---------------|
| Business Criticality | 5 | Without auth, users can't access account (critical) |
| Technical Complexity | 4 | OAuth integration, session management, JWT tokens (complex) |
| Change Frequency | 3 | Occasional updates (once per release) |
| Compliance | 5 | CMMC IA.L2-3.5.10 requires password encryption (audited) |
| Security | 5 | Authentication is critical security boundary |

**Risk Score Calculation**:
```
Risk Score = (5×3 + 4×2 + 3×1.5 + 5×2 + 5×2) / 10.5
           = (15 + 8 + 4.5 + 10 + 10) / 10.5
           = 47.5 / 10.5
           = 4.52
```

**Risk Level**: **Critical** (4.52 ≥ 4.5)
**Coverage Target**: 90-100%
**Test Types**: Unit, Integration, E2E, Security, Penetration

---

### Step 3: Create Risk Matrix

**Purpose**: Visualize all features by risk level

**Example Risk Matrix** (E-commerce Application):

| Feature | Business | Complexity | Change Freq | Compliance | Security | **Total Risk** | **Risk Level** | **Coverage Target** |
|---------|----------|------------|-------------|------------|----------|---------------|---------------|-------------------|
| User Authentication | 5 | 4 | 3 | 5 | 5 | **4.52** | Critical | 90-100% |
| Checkout (Payment) | 5 | 5 | 4 | 5 | 4 | **4.67** | Critical | 90-100% |
| Shopping Cart | 4 | 3 | 4 | 2 | 2 | **3.24** | Medium | 70-80% |
| User Profile | 3 | 2 | 2 | 3 | 3 | **2.71** | Medium | 70-80% |
| Product Catalog | 3 | 2 | 3 | 1 | 1 | **2.33** | Low | 50-70% |
| Admin Dashboard | 2 | 3 | 2 | 2 | 3 | **2.48** | Low | 50-70% |
| Footer | 1 | 1 | 1 | 1 | 1 | **1.00** | Very Low | 30-50% |

**Visual Risk Matrix**:
```
Critical Risk (90-100% coverage):
├─ User Authentication (4.52)
└─ Checkout/Payment (4.67)

High Risk (80-90% coverage):
└─ (none)

Medium Risk (70-80% coverage):
├─ Shopping Cart (3.24)
└─ User Profile (2.71)

Low Risk (50-70% coverage):
├─ Product Catalog (2.33)
└─ Admin Dashboard (2.48)

Very Low Risk (30-50% coverage):
└─ Footer (1.00)
```

**Output**: Risk matrix with coverage targets for each feature

---

### Step 4: Prioritize Test Efforts

**Purpose**: Allocate testing time/resources based on risk

**Test Effort Allocation** (E-commerce example):

Assume 40 hours available for testing this sprint.

| Risk Level | Features | Coverage Target | Test Hours | % of Total |
|-----------|----------|-----------------|-----------|------------|
| Critical | Auth, Checkout | 90-100% | 20 hours | 50% |
| High | (none) | 80-90% | 0 hours | 0% |
| Medium | Cart, Profile | 70-80% | 12 hours | 30% |
| Low | Catalog, Admin | 50-70% | 6 hours | 15% |
| Very Low | Footer | 30-50% | 2 hours | 5% |
| **Total** | 7 features | - | **40 hours** | **100%** |

**Test Plan** (prioritized):

#### Week 1 (Critical Risk - 20 hours):
1. **User Authentication** (10 hours):
   - Unit tests: Password hashing, token generation (2 hours)
   - Integration tests: Login/logout API endpoints (3 hours)
   - E2E tests: Login flow, session expiration (3 hours)
   - Security tests: SQL injection, brute force protection (2 hours)

2. **Checkout/Payment** (10 hours):
   - Unit tests: Price calculation, tax logic (2 hours)
   - Integration tests: Payment gateway API (Stripe) (3 hours)
   - E2E tests: Complete checkout flow (3 hours)
   - Security tests: Payment data encryption, PCI compliance (2 hours)

#### Week 2 (Medium Risk - 12 hours):
3. **Shopping Cart** (6 hours):
   - Unit tests: Add/remove items, quantity updates (2 hours)
   - Integration tests: Cart persistence (Redis) (2 hours)
   - E2E tests: Cart workflow (2 hours)

4. **User Profile** (6 hours):
   - Unit tests: Profile validation (1 hour)
   - Integration tests: Update profile API (2 hours)
   - E2E tests: Edit profile flow (2 hours)
   - Security tests: Password change (1 hour)

#### Week 3 (Low Risk - 8 hours):
5. **Product Catalog** (3 hours):
   - Unit tests: Search/filter logic (1 hour)
   - Integration tests: Product API (1 hour)
   - E2E tests: Browse products (1 hour)

6. **Admin Dashboard** (3 hours):
   - Unit tests: Order list logic (1 hour)
   - Integration tests: Admin API (1 hour)
   - E2E tests: Admin workflows (1 hour)

7. **Footer** (2 hours):
   - Smoke tests: Footer displays correctly (2 hours)

**Output**: Prioritized test plan with time allocations

---

### Step 5: Define Test Types by Risk Level

**Purpose**: Specify what types of tests are needed for each risk level

#### Critical Risk (90-100% coverage):
**Test Types**:
- ✅ **Unit Tests**: 80% coverage minimum
- ✅ **Integration Tests**: All API endpoints, database interactions
- ✅ **E2E Tests**: All user workflows (happy path + error paths)
- ✅ **Security Tests**: OWASP Top 10, penetration testing
- ✅ **Performance Tests**: Load testing (if high traffic expected)
- ✅ **Compliance Tests**: CMMC/HIPAA/PCI audit tests

**Example** (User Authentication):
```javascript
// Unit tests (80% coverage)
describe('Password Hashing', () => {
  test('hashes password with bcrypt', () => {
    const hashed = hashPassword('SecurePass123!')
    expect(bcrypt.compare('SecurePass123!', hashed)).toBe(true)
  })

  test('rejects weak passwords', () => {
    expect(() => hashPassword('weak')).toThrow('Password too weak')
  })
})

// Integration tests (API endpoints)
describe('Login API', () => {
  test('POST /api/login returns JWT token', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'alice@example.com', password: 'SecurePass123!' })
    expect(res.status).toBe(200)
    expect(res.body.token).toMatch(/^eyJ/)
  })

  test('POST /api/login returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'alice@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})

// E2E tests (user workflows)
test('User logs in successfully', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'alice@example.com')
  await page.fill('input[name="password"]', 'SecurePass123!')
  await page.click('button:has-text("Login")')
  await expect(page).toHaveURL('/dashboard')
})

// Security tests (OWASP)
test('Login protects against SQL injection', async () => {
  const res = await request(app)
    .post('/api/login')
    .send({ email: "admin' OR '1'='1", password: 'anything' })
  expect(res.status).toBe(401) // Should reject, not bypass auth
})

// Performance tests (load)
test('Login handles 1000 requests/sec', async () => {
  const results = await loadTest({
    url: '/api/login',
    rps: 1000,
    duration: 60,
  })
  expect(results.p95Latency).toBeLessThan(200) // 95th percentile < 200ms
})
```

---

#### High Risk (80-90% coverage):
**Test Types**:
- ✅ **Unit Tests**: 70% coverage minimum
- ✅ **Integration Tests**: Core API endpoints
- ✅ **E2E Tests**: Happy path + critical error paths
- ✅ **Security Tests**: Basic OWASP checks
- ⏩ **Performance Tests**: Optional (if known bottleneck)

---

#### Medium Risk (70-80% coverage):
**Test Types**:
- ✅ **Unit Tests**: 60% coverage minimum
- ✅ **Integration Tests**: Key endpoints only
- ✅ **E2E Tests**: Happy path only
- ⏩ **Security Tests**: Optional (basic input validation)

---

#### Low Risk (50-70% coverage):
**Test Types**:
- ✅ **Unit Tests**: 50% coverage minimum
- ✅ **Integration Tests**: Smoke tests only
- ⏩ **E2E Tests**: Optional (happy path only if time permits)

---

#### Very Low Risk (30-50% coverage):
**Test Types**:
- ✅ **Unit Tests**: Smoke tests only (does it render?)
- ⏩ **Integration Tests**: Skip
- ⏩ **E2E Tests**: Skip

---

### Step 6: Track Risk Over Time

**Purpose**: Monitor how risk changes as code evolves

**Risk Tracking Metrics**:
1. **Risk Score**: Does risk increase or decrease over time?
2. **Coverage**: Are we meeting coverage targets?
3. **Defect Density**: Bugs per 1000 LOC (validates risk assessment)

**Example: Risk Trend Report**

```markdown
# Risk Trend Report (Sprint 5)

## User Authentication Risk History

| Sprint | Risk Score | Coverage | Defects | Defect Density | Trend |
|--------|-----------|----------|---------|----------------|-------|
| Sprint 1 | 4.52 | 85% | 3 | 15/1000 LOC | 🔴 High defects |
| Sprint 2 | 4.52 | 90% | 1 | 5/1000 LOC | 🟡 Improving |
| Sprint 3 | 4.52 | 95% | 0 | 0/1000 LOC | 🟢 Stable |
| Sprint 4 | 4.67 | 92% | 2 | 10/1000 LOC | 🔴 Regression! |
| Sprint 5 | 4.67 | 95% | 0 | 0/1000 LOC | 🟢 Fixed |

**Analysis**:
- Sprint 4 regression: OAuth provider update introduced bugs
- Sprint 5: Increased coverage to 95%, fixed regressions
- Recommendation: Maintain 95% coverage for auth (critical risk)
```

**Risk Re-Assessment Triggers**:
- Major feature addition (complexity increases)
- New compliance requirement (CMMC, GDPR)
- Production incident (risk was underestimated)
- Code churn >50% (change frequency spike)

**Output**: Risk trend dashboard, re-assessment schedule

---

## Risk-Based Testing Best Practices

### 1. Re-Assess Risk Quarterly
**Why**: Risk changes as features mature, requirements evolve, threats emerge

**Trigger Events**:
- New compliance requirements (CMMC update, GDPR fine)
- Production incidents (payment outage, data breach)
- Major refactoring (distributed system migration)
- Market changes (new competitor, customer churn)

---

### 2. Validate Risk Assessment with Production Data
**Question**: Does high-risk code actually have more bugs?

**Validation**:
```
Defect Density = Bugs Found / 1000 LOC

Expected:
- Critical risk: 20+ bugs/1000 LOC
- High risk: 10-20 bugs/1000 LOC
- Medium risk: 5-10 bugs/1000 LOC
- Low risk: 1-5 bugs/1000 LOC
```

**If actual defect density doesn't match risk level**: Re-assess risk factors.

---

### 3. Use Risk Matrix in Sprint Planning
**Integration with AgilePm**:
- High-risk user stories get more story points (testing effort)
- High-risk stories prioritized (test early, fail fast)
- Definition of Done includes coverage targets by risk

---

### 4. Document Risk Assumptions
**Why**: Risk assessment is subjective. Document why you assigned each score.

**Example**:
```markdown
## Feature: Payment Processing

**Business Criticality: 5** (Critical)
- Assumption: Payment failure causes revenue loss
- Validation: 2023 outage lost $50k in 1 hour
- Reviewed by: Product Owner, CFO

**Technical Complexity: 5** (Very High)
- Assumption: Stripe integration, PCI compliance, idempotent transactions
- Validation: 500 LOC, 12 external dependencies
- Reviewed by: Lead Developer
```

---

### 5. Balance Risk with Resources
**Problem**: Can't achieve 100% coverage on everything (limited time/budget)

**Solution**: Risk-based prioritization ensures you test what matters most

**Example**:
- Budget: 40 hours testing
- Critical risk (2 features): 20 hours (50%)
- Medium risk (2 features): 12 hours (30%)
- Low risk (3 features): 8 hours (20%)

**Result**: High ROI testing (prevent critical failures, accept low-risk bugs)

---

## Risk-Based Testing Anti-Patterns

### 1. Ignoring Risk, Testing Everything Equally
❌ **Wrong**: 80% coverage on all modules (including footer)
✅ **Right**: 95% on auth, 70% on profile, 50% on footer

---

### 2. Risk Assessment Once, Never Updated
❌ **Wrong**: Assess risk at project start, never revisit
✅ **Right**: Re-assess quarterly or after major changes

---

### 3. Business Doesn't Participate in Risk Assessment
❌ **Wrong**: Developers guess business criticality
✅ **Right**: Product Owner/Business Analyst provides business impact scores

---

### 4. No Validation of Risk Scores
❌ **Wrong**: Assume high-risk areas have more bugs (no proof)
✅ **Right**: Track defect density by risk level (validate assumptions)

---

## Integration with Other Workflows

### With TestArchitect → CreateTestStrategy
**When**: Defining test strategy for sprint
**Integration**: Risk matrix drives test strategy (high-risk = more test types)

---

### With TestArchitect → ATDD
**When**: Writing acceptance tests for user story
**Integration**: Risk level determines ATDD coverage (critical = 100% scenarios, low = happy path only)

---

### With Security → ThreatModel
**When**: Assessing security risk
**Integration**: Threat model informs security risk score (STRIDE threats = high risk)

---

### With AgilePm → CreateStories
**When**: Estimating user story points
**Integration**: High-risk stories get +2 points (extra testing effort)

**Example**:
```markdown
## User Story: US-42 (Implement OAuth Login)

**Risk Assessment**:
- Business Criticality: 5 (auth is critical)
- Complexity: 4 (OAuth integration)
- Security: 5 (authentication)
- **Total Risk**: 4.52 (Critical)

**Story Points**: 8 (5 dev + 3 testing)
- Dev effort: 5 points
- Testing effort: 3 points (critical risk requires thorough testing)

**Coverage Target**: 95%
**Test Types**: Unit, Integration, E2E, Security, Penetration
```

---

## Risk Matrix Template

Use this template for every sprint/release:

```markdown
# Risk Assessment: [Sprint/Release Name]

**Date**: [Date]
**Assessed By**: [Team Members]

## Features/Modules

| Feature | Business | Complexity | Change | Compliance | Security | **Risk Score** | **Risk Level** | **Coverage** |
|---------|----------|------------|--------|------------|----------|---------------|---------------|--------------|
| [Feature 1] | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | [Calculated] | [Critical/High/Medium/Low] | [%] |
| [Feature 2] | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | [Calculated] | [Critical/High/Medium/Low] | [%] |

## Test Effort Allocation

| Risk Level | Features | Hours | % of Total |
|-----------|----------|-------|------------|
| Critical | [List] | [Hours] | [%] |
| High | [List] | [Hours] | [%] |
| Medium | [List] | [Hours] | [%] |
| Low | [List] | [Hours] | [%] |

## Test Plan

### Critical Risk:
- [Feature 1]: Unit (X hrs), Integration (Y hrs), E2E (Z hrs), Security (W hrs)

### High Risk:
- [Feature 2]: Unit (X hrs), Integration (Y hrs), E2E (Z hrs)

### Medium Risk:
- [Feature 3]: Unit (X hrs), Integration (Y hrs)

### Low Risk:
- [Feature 4]: Smoke tests (X hrs)
```

---

## Risk Scoring Calculator

Use this formula for automated risk scoring:

```javascript
// risk-calculator.js

function calculateRiskScore(factors) {
  const {
    businessCriticality,  // 1-5
    technicalComplexity,  // 1-5
    changeFrequency,      // 1-5
    compliance,           // 1-5
    security,             // 1-5
  } = factors

  // Weighted average (normalized to 1-5 scale)
  const score = (
    businessCriticality * 3 +
    technicalComplexity * 2 +
    changeFrequency * 1.5 +
    compliance * 2 +
    security * 2
  ) / 10.5

  return {
    score: score.toFixed(2),
    level: getRiskLevel(score),
    coverage: getCoverageTarget(score),
  }
}

function getRiskLevel(score) {
  if (score >= 4.5) return 'Critical'
  if (score >= 3.5) return 'High'
  if (score >= 2.5) return 'Medium'
  if (score >= 1.5) return 'Low'
  return 'Very Low'
}

function getCoverageTarget(score) {
  if (score >= 4.5) return '90-100%'
  if (score >= 3.5) return '80-90%'
  if (score >= 2.5) return '70-80%'
  if (score >= 1.5) return '50-70%'
  return '30-50%'
}

// Example usage
const authRisk = calculateRiskScore({
  businessCriticality: 5,
  technicalComplexity: 4,
  changeFrequency: 3,
  compliance: 5,
  security: 5,
})

console.log(authRisk)
// { score: '4.52', level: 'Critical', coverage: '90-100%' }
```

---

**Last Updated**: 2025-12-02
**Standards**: Based on ISO 29119 (Risk-Based Testing), ISTQB (Risk Analysis)
**Integration**: Works with TestArchitect (ATDD, CreateTestStrategy), Security (ThreatModel), AgilePm (CreateStories)
