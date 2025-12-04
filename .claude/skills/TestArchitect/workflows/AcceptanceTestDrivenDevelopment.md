# Acceptance Test-Driven Development (ATDD) Workflow

**Purpose**: Define executable acceptance criteria BEFORE writing code, ensuring features meet business requirements

**When to Use**: Starting development on any user story or feature

**Output**: Acceptance tests in Given-When-Then format, test automation code, implementation plan

---

## What is ATDD?

**Acceptance Test-Driven Development (ATDD)** is a collaborative practice where business stakeholders, developers, and testers:
1. **Define** acceptance criteria together BEFORE coding
2. **Write** acceptance tests as executable specifications
3. **Implement** code to make tests pass
4. **Verify** the feature works as expected

**Key Principle**: Tests are the specification. If the test passes, the feature is done.

---

## ATDD vs TDD vs BDD

| Practice | Focus | Who Writes | Format | Example |
|----------|-------|------------|--------|---------|
| **ATDD** | Acceptance criteria | Whole team | Given-When-Then | "Given user logged in, When click logout, Then session cleared" |
| **TDD** | Unit tests | Developers | Assert statements | `assert user.isAuthenticated() == false` |
| **BDD** | Behavior specification | Whole team | Gherkin (Given-When-Then) | Same as ATDD but more formal (Cucumber, SpecFlow) |

**ATDD for FORGE**: We use ATDD's Given-When-Then format without requiring formal BDD tools like Cucumber. Tests written in natural language first, then automated.

---

## ATDD Workflow (7 Steps)

### Step 1: Identify User Story

**Input**: User story from backlog (see AgilePm skill → CreateStories workflow)

**Example User Story**:
```markdown
**US-42**: Password Reset
**As a** user who forgot their password
**I want to** reset my password via email
**So that** I can regain access to my account

**Story Points**: 5
**Priority**: Must Have
```

**Questions to Ask**:
- What is the business value? (Why are we building this?)
- Who are the users? (Personas, roles)
- What are the edge cases? (Expired tokens, invalid emails, etc.)
- What could go wrong? (Security risks, UX failures)

**Output**: Clear understanding of the user story and its value

---

### Step 2: Conduct 3 Amigos Meeting

**Who Attends**:
- **Business Analyst** (or Product Owner): Defines "what" success looks like
- **Developer**: Identifies technical constraints and implementation approach
- **Tester** (or QA Engineer): Identifies edge cases, failure scenarios, test data needs

**Duration**: 30-60 minutes

**Agenda**:
1. Review user story (5 min)
2. Brainstorm acceptance criteria (15 min)
3. Identify happy path scenarios (10 min)
4. Identify edge cases and error scenarios (10 min)
5. Define test data requirements (5 min)
6. Agree on Definition of Done (5 min)

**Example Discussion** (Password Reset story):
- **Business**: "User clicks 'Forgot Password', receives email with reset link, clicks link, sets new password"
- **Developer**: "Reset token expires after 1 hour, stored in Redis, hashed password in DB"
- **Tester**: "What if email doesn't exist? What if token expired? What if user already reset?"

**Output**: Shared understanding of requirements and edge cases

---

### Step 3: Define Acceptance Criteria (Given-When-Then)

**Format**: Use Given-When-Then structure for every scenario

**Structure**:
```gherkin
Scenario: [Scenario Name]
  Given [Precondition / Initial State]
  When [Action / Trigger]
  Then [Expected Outcome]
  And [Additional Expected Outcome] (optional)
```

**Example: Password Reset Acceptance Criteria**

#### Scenario 1: Successful password reset (Happy Path)
```gherkin
Scenario: User resets password successfully
  Given the user "alice@example.com" exists in the system
  And the user is on the login page
  When the user clicks "Forgot Password"
  And enters email "alice@example.com"
  And clicks "Send Reset Link"
  Then the system sends a password reset email to "alice@example.com"
  And the email contains a valid reset token
  And the token expires in 1 hour

  Given the user receives the reset email
  When the user clicks the reset link in the email
  Then the system displays the "Set New Password" form

  Given the user is on the "Set New Password" form
  When the user enters new password "NewSecurePass123!"
  And confirms password "NewSecurePass123!"
  And clicks "Reset Password"
  Then the system updates the user's password
  And displays "Password reset successful" message
  And redirects to login page

  Given the user's password has been reset
  When the user logs in with "alice@example.com" and "NewSecurePass123!"
  Then the user is successfully authenticated
```

#### Scenario 2: Reset link expired (Error Case)
```gherkin
Scenario: User tries to use expired reset token
  Given the user "alice@example.com" requested a password reset 2 hours ago
  And the reset token expired after 1 hour
  When the user clicks the reset link in the email
  Then the system displays "Reset link has expired" error message
  And provides a link to request a new reset link
```

#### Scenario 3: Email doesn't exist (Edge Case)
```gherkin
Scenario: User requests reset for non-existent email
  Given no user exists with email "nonexistent@example.com"
  When the user enters email "nonexistent@example.com"
  And clicks "Send Reset Link"
  Then the system displays "If the email exists, a reset link has been sent" message
  (Note: Don't reveal whether email exists for security - prevents user enumeration)
```

#### Scenario 4: Password doesn't meet requirements (Validation)
```gherkin
Scenario: User enters weak password
  Given the user is on the "Set New Password" form
  When the user enters new password "weak"
  And clicks "Reset Password"
  Then the system displays "Password must be at least 12 characters" error
  And does not reset the password
```

#### Scenario 5: Token already used (Security)
```gherkin
Scenario: User tries to reuse reset token
  Given the user "alice@example.com" already used reset token "abc123"
  When the user clicks the same reset link again
  Then the system displays "Reset link has already been used" error message
  And provides a link to request a new reset link
```

**Acceptance Criteria Checklist**:
- [ ] Happy path scenario defined
- [ ] Error scenarios defined (expired, invalid, etc.)
- [ ] Edge cases defined (non-existent user, weak password, etc.)
- [ ] Security scenarios defined (token reuse, user enumeration, etc.)
- [ ] Performance requirements (if applicable)
- [ ] Accessibility requirements (if applicable)

**Output**: Complete set of acceptance criteria covering all scenarios

---

### Step 4: Identify Test Data Requirements

**Purpose**: Define what test data is needed to execute acceptance tests

**Test Data Categories**:

1. **Valid Data** (Happy Path):
   - Existing user: `alice@example.com`
   - Valid reset token: `valid-token-abc123`
   - Strong password: `NewSecurePass123!`

2. **Invalid Data** (Error Cases):
   - Non-existent email: `nonexistent@example.com`
   - Expired token: `expired-token-xyz789` (created 2 hours ago)
   - Used token: `used-token-def456`
   - Weak password: `weak`

3. **Edge Cases**:
   - Email with special characters: `alice+test@example.com`
   - Very long email: `a` * 100 + `@example.com`
   - Unicode password: `パスワード123!`

4. **Boundary Conditions**:
   - Token expiration: exactly 1 hour (59:59 vs 1:00:01)
   - Password length: 11 chars (fail), 12 chars (pass)
   - Rate limiting: 5 requests per hour (max)

**Test Data Setup**:
```javascript
// test-data.js
export const testUsers = {
  validUser: {
    email: "alice@example.com",
    password: "OldPassword123!",
    id: "user-001",
  },
  nonExistentUser: {
    email: "nonexistent@example.com",
  },
}

export const resetTokens = {
  validToken: {
    token: "valid-token-abc123",
    userId: "user-001",
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    used: false,
  },
  expiredToken: {
    token: "expired-token-xyz789",
    userId: "user-001",
    expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    used: false,
  },
  usedToken: {
    token: "used-token-def456",
    userId: "user-001",
    expiresAt: new Date(Date.now() + 3600000),
    used: true,
  },
}
```

**Output**: Test data fixtures for all scenarios

---

### Step 5: Write Acceptance Tests (Automate Given-When-Then)

**Purpose**: Convert Given-When-Then scenarios into executable tests

**Tools**: Choose based on project stack
- **JavaScript**: Jest, Playwright, Cypress
- **Python**: pytest, behave (BDD)
- **Java**: JUnit, Cucumber
- **Ruby**: RSpec

**Example: Playwright Acceptance Test**

```javascript
// tests/acceptance/password-reset.spec.js
import { test, expect } from '@playwright/test'
import { testUsers, resetTokens } from './test-data'

test.describe('Password Reset', () => {

  test('Scenario 1: User resets password successfully', async ({ page }) => {
    // Given the user "alice@example.com" exists in the system
    await setupUser(testUsers.validUser)

    // And the user is on the login page
    await page.goto('/login')

    // When the user clicks "Forgot Password"
    await page.click('text=Forgot Password')

    // And enters email "alice@example.com"
    await page.fill('input[name="email"]', testUsers.validUser.email)

    // And clicks "Send Reset Link"
    await page.click('button:has-text("Send Reset Link")')

    // Then the system sends a password reset email
    const sentEmail = await getLastEmailSent()
    expect(sentEmail.to).toBe(testUsers.validUser.email)
    expect(sentEmail.subject).toContain('Password Reset')

    // And the email contains a valid reset token
    const resetLink = extractResetLink(sentEmail.body)
    expect(resetLink).toMatch(/\/reset-password\?token=[a-zA-Z0-9]+/)

    // Given the user receives the reset email
    // When the user clicks the reset link
    await page.goto(resetLink)

    // Then the system displays the "Set New Password" form
    await expect(page.locator('h1')).toHaveText('Set New Password')
    await expect(page.locator('input[name="password"]')).toBeVisible()

    // When the user enters new password
    await page.fill('input[name="password"]', 'NewSecurePass123!')
    await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!')
    await page.click('button:has-text("Reset Password")')

    // Then the system updates the password
    await expect(page.locator('.success-message')).toHaveText('Password reset successful')

    // And redirects to login page
    await expect(page).toHaveURL('/login')

    // Given the password has been reset
    // When the user logs in with new password
    await page.fill('input[name="email"]', testUsers.validUser.email)
    await page.fill('input[name="password"]', 'NewSecurePass123!')
    await page.click('button:has-text("Login")')

    // Then the user is successfully authenticated
    await expect(page).toHaveURL('/dashboard')
  })

  test('Scenario 2: Reset link expired', async ({ page }) => {
    // Given the reset token expired 1 hour ago
    const expiredToken = resetTokens.expiredToken

    // When the user clicks the expired reset link
    await page.goto(`/reset-password?token=${expiredToken.token}`)

    // Then the system displays error message
    await expect(page.locator('.error-message')).toHaveText('Reset link has expired')

    // And provides link to request new reset
    await expect(page.locator('a:has-text("Request new reset link")')).toBeVisible()
  })

  test('Scenario 3: Email doesn\'t exist', async ({ page }) => {
    // Given no user exists with email
    const nonExistentEmail = testUsers.nonExistentUser.email

    // When the user enters non-existent email
    await page.goto('/forgot-password')
    await page.fill('input[name="email"]', nonExistentEmail)
    await page.click('button:has-text("Send Reset Link")')

    // Then the system displays generic message (security: don't reveal if email exists)
    await expect(page.locator('.info-message')).toHaveText(
      'If the email exists, a reset link has been sent'
    )

    // And no email is actually sent
    const emailsSent = await getEmailsSentInLastMinute()
    expect(emailsSent).toHaveLength(0)
  })

  test('Scenario 4: Weak password', async ({ page }) => {
    // Given user is on Set New Password form
    await setupResetToken(resetTokens.validToken)
    await page.goto(`/reset-password?token=${resetTokens.validToken.token}`)

    // When user enters weak password
    await page.fill('input[name="password"]', 'weak')
    await page.click('button:has-text("Reset Password")')

    // Then system displays validation error
    await expect(page.locator('.error-message')).toHaveText(
      'Password must be at least 12 characters'
    )

    // And password is not reset
    const user = await getUser(testUsers.validUser.id)
    expect(user.password).not.toBe('weak') // Password unchanged
  })

  test('Scenario 5: Token already used', async ({ page }) => {
    // Given token was already used
    const usedToken = resetTokens.usedToken

    // When user clicks same reset link again
    await page.goto(`/reset-password?token=${usedToken.token}`)

    // Then system displays error
    await expect(page.locator('.error-message')).toHaveText('Reset link has already been used')
  })
})
```

**Test Structure**:
1. **Given**: Setup test data and preconditions
2. **When**: Perform user actions (click, fill, submit)
3. **Then**: Assert expected outcomes (visible text, redirects, database state)

**Output**: Automated acceptance tests for all scenarios

---

### Step 6: Run Tests (Red Phase)

**Purpose**: Verify tests fail before implementation (proves tests are actually testing something)

**Expected Result**: All tests should FAIL initially (Red phase of Red-Green-Refactor)

**Example Output**:
```
Running 5 tests...

✗ Scenario 1: User resets password successfully
  Error: Element 'text=Forgot Password' not found

✗ Scenario 2: Reset link expired
  Error: Page not found: /reset-password

✗ Scenario 3: Email doesn't exist
  Error: Element 'button:has-text("Send Reset Link")' not found

✗ Scenario 4: Weak password
  Error: Page not found: /reset-password

✗ Scenario 5: Token already used
  Error: Page not found: /reset-password

5 failed, 0 passed
```

**If Tests Pass Immediately**: This is a problem! It means either:
1. Feature already exists (acceptance criteria are wrong)
2. Tests are not actually testing anything (false positive)
3. Test setup is incorrect

**Output**: Failing tests (Red phase confirmed)

---

### Step 7: Implement Feature (Green Phase)

**Purpose**: Write minimum code to make acceptance tests pass

**Implementation Order**:
1. **Happy path first**: Get Scenario 1 passing (core functionality)
2. **Error handling next**: Get Scenario 2, 3, 4, 5 passing (robustness)
3. **Refactor**: Clean up code while keeping tests green

**Example Implementation** (simplified):

```javascript
// routes/forgot-password.js
export async function POST(req) {
  const { email } = await req.json()

  // Scenario 3: Email doesn't exist (security: don't reveal)
  const user = await db.users.findByEmail(email)
  if (!user) {
    return json({ message: 'If the email exists, a reset link has been sent' })
  }

  // Scenario 1: Generate reset token
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 3600000) // 1 hour

  await db.resetTokens.create({
    token,
    userId: user.id,
    expiresAt,
    used: false,
  })

  // Send reset email
  await sendEmail({
    to: email,
    subject: 'Password Reset',
    body: `Click here to reset: ${process.env.APP_URL}/reset-password?token=${token}`,
  })

  return json({ message: 'If the email exists, a reset link has been sent' })
}

// routes/reset-password.js
export async function POST(req) {
  const { token, password } = await req.json()

  // Scenario 2: Check if token exists and not expired
  const resetToken = await db.resetTokens.findByToken(token)
  if (!resetToken) {
    return json({ error: 'Invalid reset link' }, { status: 400 })
  }

  if (resetToken.expiresAt < new Date()) {
    return json({ error: 'Reset link has expired' }, { status: 400 })
  }

  // Scenario 5: Check if token already used
  if (resetToken.used) {
    return json({ error: 'Reset link has already been used' }, { status: 400 })
  }

  // Scenario 4: Validate password strength
  if (password.length < 12) {
    return json({ error: 'Password must be at least 12 characters' }, { status: 400 })
  }

  // Scenario 1: Update password
  const hashedPassword = await bcrypt.hash(password, 10)
  await db.users.update(resetToken.userId, { password: hashedPassword })

  // Mark token as used
  await db.resetTokens.update(token, { used: true })

  return json({ message: 'Password reset successful' })
}
```

**Run Tests Again**:
```
Running 5 tests...

✓ Scenario 1: User resets password successfully
✓ Scenario 2: Reset link expired
✓ Scenario 3: Email doesn't exist
✓ Scenario 4: Weak password
✓ Scenario 5: Token already used

5 passed, 0 failed ✓
```

**Definition of Done**:
- [ ] All acceptance tests pass (Green phase)
- [ ] Code reviewed by peer
- [ ] Security requirements met (see Security skill → ThreatModel)
- [ ] Performance acceptable (password reset < 2 seconds)
- [ ] Documentation updated (API docs, user guide)
- [ ] Feature deployed to staging

**Output**: Working feature with passing acceptance tests

---

## ATDD Best Practices

### 1. Write Tests First (Not After)
❌ **Wrong**: Implement feature → Write tests (traditional QA)
✅ **Right**: Write tests → Implement feature (ATDD)

**Why**: Tests written after implementation often miss edge cases and become "confirmation bias tests" (only test what you built, not what you should have built).

---

### 2. Make Tests Readable (Business Language)
❌ **Wrong**:
```javascript
test('test_001', async () => {
  await db.insert({ email: 'a@b.com', token: 'x' })
  const res = await post('/reset', { token: 'x', pw: 'y' })
  expect(res.status).toBe(200)
})
```

✅ **Right**:
```javascript
test('User resets password successfully', async () => {
  // Given a valid reset token exists
  await setupResetToken({ email: 'alice@example.com', token: 'valid-abc' })

  // When user submits new password
  const response = await resetPassword({ token: 'valid-abc', password: 'NewSecure123!' })

  // Then password is updated
  expect(response.status).toBe(200)
  expect(response.message).toBe('Password reset successful')
})
```

**Why**: Business stakeholders should be able to read and understand tests.

---

### 3. One Scenario Per Test
❌ **Wrong**: One giant test that tests everything
✅ **Right**: Each scenario is a separate test

**Why**: If one scenario fails, others still run. Easier to debug.

---

### 4. Test Independence
Each test should:
- Set up its own data (don't rely on other tests)
- Clean up after itself (don't pollute database)
- Run in any order (parallel execution)

**Example**:
```javascript
test.beforeEach(async () => {
  await db.reset() // Clean database before each test
})

test.afterEach(async () => {
  await cleanupTestData() // Remove test users, tokens
})
```

---

### 5. Use Page Object Model (POM) for UI Tests

❌ **Wrong**: Repeat selectors in every test
```javascript
test('test 1', async ({ page }) => {
  await page.fill('input[name="email"]', 'alice@example.com')
  await page.click('button:has-text("Send")')
})

test('test 2', async ({ page }) => {
  await page.fill('input[name="email"]', 'bob@example.com')
  await page.click('button:has-text("Send")')
})
```

✅ **Right**: Create Page Object
```javascript
// pages/forgot-password.page.js
export class ForgotPasswordPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('input[name="email"]')
    this.sendButton = page.locator('button:has-text("Send")')
  }

  async requestReset(email) {
    await this.emailInput.fill(email)
    await this.sendButton.click()
  }
}

// Test uses Page Object
test('test 1', async ({ page }) => {
  const forgotPasswordPage = new ForgotPasswordPage(page)
  await forgotPasswordPage.requestReset('alice@example.com')
})
```

**Why**: DRY (Don't Repeat Yourself), easier to maintain when UI changes.

---

## ATDD Anti-Patterns (What NOT to Do)

### 1. Testing Implementation Details
❌ **Wrong**: Test that function X calls function Y
✅ **Right**: Test that user action produces expected outcome

**Why**: Implementation can change (refactoring), but behavior should stay the same.

---

### 2. Flaky Tests
**Problem**: Test passes sometimes, fails other times (race conditions, timing issues)

**Solution**:
- Use explicit waits (not implicit sleeps)
- Reset state between tests
- Avoid testing animations/transitions

---

### 3. Over-Mocking
❌ **Wrong**: Mock everything (database, API calls, email)
✅ **Right**: Use real dependencies where possible (test database, test email service)

**Why**: Acceptance tests should test the whole system (integration), not just units.

---

## ATDD Integration with Other Workflows

### With AgilePm Skill
**When**: Creating user stories (AgilePm → CreateStories workflow)
**Integration**: Add acceptance criteria as Given-When-Then scenarios directly in user story template

```markdown
## Acceptance Criteria

### Scenario 1: Happy Path
Given [precondition]
When [action]
Then [outcome]

### Scenario 2: Error Case
Given [precondition]
When [action]
Then [error message]
```

---

### With Security Skill
**When**: Threat modeling (Security → ThreatModel workflow)
**Integration**: Add security scenarios to acceptance tests

**Example**: From threat model, add CSRF protection test:
```gherkin
Scenario: Attacker tries CSRF on password reset
  Given an attacker creates a malicious reset link
  When a logged-in user clicks the malicious link
  Then the system rejects the request due to missing CSRF token
  And displays "Invalid request" error
```

---

### With TestArchitect → CreateTestStrategy
**When**: Planning test strategy for sprint
**Integration**: ATDD defines acceptance tests, CreateTestStrategy defines overall test mix (unit/integration/E2E)

**Test Pyramid**:
- **70% Unit Tests**: Test individual functions (TDD)
- **20% Integration Tests**: Test API endpoints, database interactions
- **10% E2E Tests**: ATDD acceptance tests (UI automation)

---

## ATDD Checklist

Before starting implementation, verify:
- [ ] User story understood by all 3 Amigos (Business, Dev, QA)
- [ ] Acceptance criteria defined (Given-When-Then format)
- [ ] Happy path scenario identified
- [ ] Error scenarios identified (invalid input, expired tokens, etc.)
- [ ] Edge cases identified (non-existent users, boundary conditions)
- [ ] Security scenarios identified (from threat model)
- [ ] Test data requirements documented
- [ ] Acceptance tests written and failing (Red phase)
- [ ] Tests are readable (business language, not code language)
- [ ] Tests are independent (no test depends on another)

After implementation:
- [ ] All acceptance tests pass (Green phase)
- [ ] Code refactored while keeping tests green
- [ ] Tests still pass after refactoring
- [ ] Definition of Done met (code review, security, performance, docs)

---

## ATDD Tools by Language

### JavaScript/TypeScript
- **Playwright** (recommended for UI): Full browser automation, parallel execution
- **Cypress**: Fast UI testing, great DX
- **Jest**: Unit and integration tests
- **Cucumber.js**: Formal BDD with Gherkin syntax

### Python
- **pytest**: Unit and integration tests
- **behave**: BDD with Gherkin
- **Playwright (Python)**: UI automation

### Java
- **JUnit 5**: Unit and integration tests
- **Cucumber-JVM**: BDD with Gherkin
- **Selenium**: UI automation

### Ruby
- **RSpec**: BDD-style testing
- **Cucumber**: BDD with Gherkin
- **Capybara**: UI automation

---

## Example ATDD Template

Use this template for every user story:

```markdown
# User Story: [US-ID] [Title]

**As a** [role]
**I want to** [feature]
**So that** [benefit]

## Acceptance Criteria

### Scenario 1: [Happy Path Name]
Given [precondition]
And [additional precondition]
When [action]
And [additional action]
Then [expected outcome]
And [additional outcome]

### Scenario 2: [Error Case Name]
Given [precondition]
When [action that causes error]
Then [error message]
And [user can recover]

### Scenario 3: [Edge Case Name]
Given [unusual precondition]
When [action]
Then [expected behavior]

## Test Data Requirements
- Valid data: [examples]
- Invalid data: [examples]
- Edge cases: [examples]

## Definition of Done
- [ ] All acceptance tests pass
- [ ] Code reviewed
- [ ] Security requirements met
- [ ] Performance acceptable
- [ ] Documentation updated
```

---

**Last Updated**: 2025-12-02
**ATDD Standards**: Based on ATDD (2003), BDD (Dan North 2006), Test Pyramid (Martin Fowler 2012)
**Integration**: Works with AgilePm, Security, TestArchitect skills
