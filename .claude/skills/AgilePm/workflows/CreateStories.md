# CreateStories Workflow

**Purpose**: Break epics into implementable user stories with acceptance criteria and story points

**Input**: Epic document (from CreateEpics workflow)

**Output**: User stories document with acceptance criteria, estimates, and dependencies

---

## Workflow Steps

### Step 1: Read and Understand the Epic

**Action**: Load the epic document and understand its scope

**Questions to Ask**:
- What user value does this epic deliver?
- What features are included in this epic?
- What's the estimated size (S/M/L)?
- Are there dependencies on other epics?

**Tool**: Read the epic file (e.g., `docs/epics/EPIC-001-example.md`)

---

### Step 2: Identify Vertical Slices

**Action**: Break the epic into end-to-end functional slices

**Vertical Slice Definition**: A complete feature that delivers value from UI to database (not horizontal layers)

**Good Vertical Slice Examples**:
- ✅ "User can log in with email/password" (UI + API + DB + validation)
- ✅ "User can reset forgotten password" (complete flow)
- ✅ "Admin can view user activity logs" (end-to-end feature)

**Bad Horizontal Layer Examples**:
- ❌ "Build authentication API" (no user-facing value until UI done)
- ❌ "Create database schema" (technical layer, not user value)
- ❌ "Design login UI" (incomplete without backend)

**Rule**: Each story should deliver working functionality that can be tested and demoed

---

### Step 3: Define Each User Story

**Action**: Write user stories using the standard format

**User Story Format**:
```
As a [user type],
I want [goal],
So that [benefit].
```

**Example**:
```
As a registered user,
I want to log in with my email and password,
So that I can access my personalized dashboard securely.
```

**Template Fields**:
- **User Type**: Who benefits? (end user, admin, developer, API consumer)
- **Goal**: What do they want to accomplish?
- **Benefit**: Why does this matter? What value does it provide?

**Tips**:
- Focus on user value, not technical implementation
- Keep it simple and conversational
- Avoid technical jargon in the "So that" clause
- If struggling to articulate benefit, reconsider if this is valuable

---

### Step 4: Write Acceptance Criteria

**Action**: Define testable conditions for "done"

**Acceptance Criteria Format** (Given-When-Then):
```
Given [initial context],
When [action occurs],
Then [expected outcome].
```

**Example**:
```
### Acceptance Criteria
- Given I am on the login page
  When I enter valid email and password
  Then I am redirected to my dashboard

- Given I am on the login page
  When I enter an invalid password
  Then I see "Invalid credentials" error message

- Given I have entered wrong password 5 times
  When I try to log in again
  Then my account is temporarily locked for 15 minutes
```

**Checklist-Style Alternative**:
```
### Acceptance Criteria
- [ ] User can log in with valid email/password
- [ ] Invalid credentials show error message
- [ ] Account locks after 5 failed attempts
- [ ] Login page shows "Forgot password?" link
- [ ] Session expires after 24 hours of inactivity
```

**Tips**:
- Make criteria testable (can you write a test for it?)
- Include happy path AND edge cases
- Specify error handling behavior
- Include performance criteria if relevant (e.g., "<200ms response time")
- Add security requirements (input validation, rate limiting, etc.)

---

### Step 5: Estimate Story Points

**Action**: Assign story points using Fibonacci scale

**Story Point Scale**:

| Points | Complexity | Duration | Example |
|--------|------------|----------|---------|
| **1** | Trivial | <1 hour | Add a simple label to UI |
| **2** | Simple | 1-2 hours | Add a new field to form with validation |
| **3** | Moderate | Half day | Create simple CRUD endpoint |
| **5** | Complex | 1 day | Implement email verification flow |
| **8** | Very Complex | 2-3 days | Build OAuth2 integration |
| **13** | Epic-sized | 1 week | Full feature with multiple components |

**Estimation Factors**:
1. **Technical Complexity**: Simple CRUD vs complex algorithm?
2. **Uncertainty**: Well-understood vs research needed?
3. **Dependencies**: Standalone vs many integration points?
4. **Testing**: Easy to test vs complex test scenarios?

**Estimation Process**:
- Compare to previously completed stories
- Consider all tasks: design, code, test, review, documentation
- Include time for debugging and unexpected issues
- If story is >8 points, split it into smaller stories

**Split Large Stories Example**:
```
Original Story (13 points): "User can manage their profile"

Split into:
- Story 1 (3 pts): User can view their profile
- Story 2 (3 pts): User can edit basic info (name, email)
- Story 3 (3 pts): User can upload profile picture
- Story 4 (2 pts): User can change password
Total: 11 points (easier to estimate and complete)
```

---

### Step 6: Identify Dependencies

**Action**: Document what must be done before this story can start

**Dependency Types**:

1. **Story Dependencies**:
   - "Blocked by Story X" (must complete X first)
   - "Builds on Story Y" (extends functionality from Y)

2. **Epic Dependencies**:
   - "Requires Epic Z to be complete" (can't start until Z is done)

3. **Technical Dependencies**:
   - "Requires database migration" (infrastructure change needed)
   - "Needs API v2 upgrade" (technical prerequisite)

4. **External Dependencies**:
   - "Waiting for design mockups" (external deliverable)
   - "Requires third-party API approval" (external blocker)

**Dependency Documentation Example**:
```
### Dependencies
- **Blocked by**: Story 1.1 (user registration must be complete)
- **Technical**: Requires PostgreSQL upgrade to v15
- **External**: Waiting for OAuth2 provider approval (ETA: 2 weeks)
```

**Best Practice**: Minimize dependencies by designing stories to be as independent as possible (INVEST principle: Independent)

---

### Step 7: Add Security and Testing Requirements

**Action**: Integrate security and testing concerns into each story

**Security Integration**:
- Use the Security skill to identify security requirements
- Add security acceptance criteria
- Document CMMC practices addressed

**Security Checklist**:
- [ ] Input validation (prevent XSS, SQL injection)
- [ ] Authentication/authorization requirements
- [ ] Data encryption (at rest, in transit)
- [ ] Rate limiting (prevent abuse)
- [ ] Audit logging (who did what, when)
- [ ] Secret management (no hardcoded credentials)

**Example Security Criteria**:
```
### Security Requirements
- [ ] Email and password inputs sanitized (prevent XSS)
- [ ] Password hashed with bcrypt (min 12 rounds)
- [ ] Rate limit: max 5 login attempts per 15 minutes per IP
- [ ] Failed login attempts logged with timestamp and IP
- [ ] Session token uses secure, httpOnly cookies
- [ ] CMMC Practice: AC.L2-3.1.1 (Limit access to authorized users)
```

**Testing Integration**:
- Use the TestArchitect skill to define test strategy
- Specify test coverage requirements
- Document test scenarios

**Testing Checklist**:
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user workflows
- [ ] Security tests (penetration testing if high-risk)
- [ ] Performance tests (if relevant)

**Example Test Requirements**:
```
### Test Requirements
- [ ] Unit test coverage: ≥80%
- [ ] Integration tests: All API endpoints (happy path + error cases)
- [ ] E2E test: Complete login flow (Playwright)
- [ ] Security test: SQL injection prevention (OWASP ZAP)
- [ ] Load test: 100 concurrent logins (<500ms p95 response time)
```

---

### Step 8: Validate User Stories

**Action**: Review stories against INVEST principles

**INVEST Principles**:

✅ **Independent**: Can be developed in any order (minimal dependencies)
✅ **Negotiable**: Details can be discussed; not a contract
✅ **Valuable**: Delivers value to users or stakeholders
✅ **Estimable**: Team can estimate effort reasonably
✅ **Small**: Can be completed in one sprint (1-2 weeks)
✅ **Testable**: Clear acceptance criteria enable testing

**Validation Checklist**:
- [ ] Each story follows "As a... I want... So that..." format
- [ ] User value (benefit) is clearly articulated
- [ ] Acceptance criteria are testable and complete
- [ ] Story points assigned (1, 2, 3, 5, 8, or 13)
- [ ] Dependencies documented
- [ ] Security requirements included
- [ ] Test requirements specified
- [ ] Stories are independent (or dependencies minimal)
- [ ] Stories are small enough to complete in 1 sprint
- [ ] Total story points match epic estimate (±20%)

**Epic-to-Stories Reconciliation**:
```
Epic Estimate: 34 points (Medium)
Sum of Story Points: 32 points
Difference: -2 points (6% under, acceptable)
Status: ✅ Stories validated
```

If story points differ by >20% from epic estimate, re-evaluate sizing or epic scope.

---

## Output Format

Create a `stories.md` file for the epic with this structure:

```markdown
# User Stories: [Epic Name]

**Epic ID**: EPIC-XXX
**Epic Size**: [S/M/L] ([X] points)
**Story Count**: [N] stories
**Total Story Points**: [Sum] points

---

## Story 1: [Story Title]

### User Story
As a [user type],
I want [goal],
So that [benefit].

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Story Points
[1/2/3/5/8/13]

### Dependencies
- [List dependencies or "None"]

### Security Requirements
- [ ] Security requirement 1
- [ ] Security requirement 2

### Test Requirements
- [ ] Test requirement 1
- [ ] Test requirement 2

### Technical Notes
- [Implementation notes, edge cases, etc.]

---

## Story 2: [Story Title]
[Same structure repeats]

---

## Summary

| Story ID | Title | Points | Dependencies | Status |
|----------|-------|--------|--------------|--------|
| 1.1 | [Title] | 5 | None | ⏳ Pending |
| 1.2 | [Title] | 3 | Story 1.1 | ⏳ Pending |
| 1.3 | [Title] | 8 | Epic 2 | ⏳ Pending |

**Total**: [X] points
```

---

## Common Patterns

### Pattern 1: CRUD Feature
**Epic**: User Management

**Stories**:
1. User can view list of users (3 pts)
2. User can create new user (5 pts)
3. User can edit existing user (3 pts)
4. User can delete user (3 pts)
5. User can search/filter users (5 pts)

**Total**: 19 points

---

### Pattern 2: Authentication Flow
**Epic**: User Authentication

**Stories**:
1. User can register with email/password (5 pts)
2. User can log in with email/password (5 pts)
3. User can log out (2 pts)
4. User can reset forgotten password (5 pts)
5. User receives email verification (5 pts)
6. User session expires after inactivity (3 pts)

**Total**: 25 points

---

### Pattern 3: Integration Feature
**Epic**: Third-Party API Integration

**Stories**:
1. System can authenticate with API (5 pts)
2. System can fetch data from API (5 pts)
3. System can handle API rate limits (3 pts)
4. System can retry failed requests (3 pts)
5. Admin can configure API credentials (3 pts)
6. System logs all API interactions (2 pts)

**Total**: 21 points

---

## Tips for Great User Stories

### DO:
✅ Write from user perspective (not developer perspective)
✅ Focus on value delivered (the "why")
✅ Make acceptance criteria testable
✅ Include edge cases and error handling
✅ Keep stories small (completable in 1 sprint)
✅ Add security and testing requirements upfront
✅ Document dependencies clearly

### DON'T:
❌ Write technical tasks disguised as stories ("Build REST API")
❌ Omit the benefit ("So that" clause)
❌ Make stories too large (>13 points)
❌ Forget edge cases and error scenarios
❌ Skip security or testing requirements
❌ Create dependencies unnecessarily
❌ Use technical jargon in user-facing descriptions

---

## Skill Integration

### Security Skill Integration
When defining stories, invoke the Security skill to:
- Identify security requirements for each story
- Map to CMMC practices
- Generate threat model for high-risk stories
- Add security acceptance criteria

**Example**:
```
/skill Security
Analyze this user story for security requirements:
"As a user, I want to reset my password via email link."
```

### TestArchitect Skill Integration
When defining stories, invoke the TestArchitect skill to:
- Define test strategy (unit, integration, E2E)
- Specify test coverage requirements
- Identify test scenarios and edge cases
- Add testing acceptance criteria

**Example**:
```
/skill TestArchitect
Define test requirements for this story:
"As a user, I want to upload a profile picture."
```

---

## Quality Checklist

Before finalizing stories, verify:

- [ ] All stories follow "As a... I want... So that..." format
- [ ] User value is clearly articulated for each story
- [ ] Acceptance criteria are comprehensive and testable
- [ ] Story points assigned using Fibonacci scale
- [ ] Dependencies documented and minimized
- [ ] Security requirements included for each story
- [ ] Test requirements specified for each story
- [ ] Stories are independent (or minimally dependent)
- [ ] Stories are small enough (<13 points)
- [ ] Sum of story points ≈ epic estimate (±20%)
- [ ] Technical notes clarify complex implementation details

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
