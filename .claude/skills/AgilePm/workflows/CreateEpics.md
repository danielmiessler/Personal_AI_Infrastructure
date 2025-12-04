# CreateEpics Workflow

Break down a PRD into user-value epics - deliverable themes that group related features by the value they provide to users.

## When to Use

- After completing PRD (use CreatePrd first)
- Need to organize features into deliverable chunks
- Want to prioritize work by user value
- Planning multi-sprint or multi-month project

## Inputs

**Required**:
- Completed PRD document
- Feature list from PRD

**Optional**:
- System architecture document
- User personas
- Timeline constraints

## What is an Epic?

An **epic** is a large body of work that:
- Delivers specific user value (not just technical work)
- Contains multiple related features
- Typically spans 2-4 sprints
- Can be independently prioritized

**Epic is NOT**:
- ❌ A technical layer ("Backend API epic")
- ❌ A random collection of features
- ❌ Too small (single story) or too large (entire product)

---

## Workflow Steps

### Step 1: Read and Understand PRD

Load the PRD document and extract:
1. **Business goals**: What are we trying to achieve?
2. **User problems**: What pain points are we solving?
3. **Feature list**: What features are planned?
4. **Priorities**: What's MVP vs. later releases?

**Output**: Clear picture of the entire product scope

---

### Step 2: Identify User Value Themes

Group features by **the value they deliver to users**, not by technical implementation.

**Ask for each feature**:
- What user problem does this solve?
- What user benefit does this provide?
- Can this be used independently?

**Example Grouping**:

❌ **Bad Epic**: "API Development"
- Features: Build REST API, Add authentication, Write docs
- Problem: Technical grouping, no user value

✅ **Good Epic**: "Secure User Accounts"
- Features: Registration, Login, Password reset, Profile management
- User Value: Users can create accounts, securely access data, manage their information

**Common Epic Themes**:
- **Onboarding**: Help users get started
- **Core Functionality**: Deliver primary value proposition
- **Security & Privacy**: Keep users safe and compliant
- **Performance**: Make app fast and reliable
- **Analytics & Insights**: Help users make decisions

---

### Step 3: Define Each Epic

For each epic, create a structured definition:

**Epic Template**:
```markdown
## Epic: [User-Value Theme]

### User Value Statement
As a [user type], I want [goal] so that [benefit].

### Problem Solved
[Current pain point this epic addresses]

### Features Included
- Feature 1
- Feature 2
- Feature 3
- Feature 4

### Success Criteria
- [ ] Measurable outcome 1
- [ ] Measurable outcome 2
- [ ] User feedback/metric target

### Dependencies
- [Other epics that must complete first]

### Estimated Size
[S/M/L based on story points - see sizing guide below]

### Priority
[Must Have / Should Have / Could Have]
```

---

### Step 4: Size Epics

Estimate epic size based on complexity and number of features:

| Size | Story Points | Duration | Features |
|------|--------------|----------|----------|
| **S (Small)** | 8-13 pts | 1-2 sprints | 2-4 features |
| **M (Medium)** | 21-34 pts | 3-5 sprints | 5-8 features |
| **L (Large)** | 55+ pts | 6+ sprints | 9+ features |

**Guidelines**:
- If epic > 55 points, split into multiple epics
- If epic < 8 points, consider combining with related epic
- Size based on uncertainty and complexity, not just feature count

---

### Step 5: Sequence Epics

Determine order based on:

**Dependency-Driven**:
- Technical dependencies (Epic B needs Epic A)
- User flow (onboarding before advanced features)

**Value-Driven**:
- High user value first
- MVP critical features first
- Risk reduction (tackle unknowns early)

**Example Sequencing**:
```
Sprint 1-2: Epic 1 (Foundation) - Account creation, basic auth
Sprint 3-4: Epic 2 (Core Value) - Primary features users came for
Sprint 5-6: Epic 3 (Enhancement) - Advanced features, polish
Sprint 7-8: Epic 4 (Scale) - Performance, analytics
```

---

### Step 6: Map Features to Epics

Create a mapping showing which features belong to which epic:

**Feature-to-Epic Map**:
```markdown
## Feature Mapping

### Epic 1: Secure User Accounts
- User registration (email/password)
- Login with session management
- Password reset flow
- Profile management

### Epic 2: Core Data Management
- Create new records
- Edit existing records
- Delete records
- Search and filter

### Epic 3: Collaboration
- Share records with team
- Comment on records
- Activity feed
- Notifications
```

---

### Step 7: Validate Epic Breakdown

Check that epic breakdown is sound:

**Validation Checklist**:
- [ ] Each epic delivers user value (not just technical work)
- [ ] Epics can be independently prioritized
- [ ] Epic sizes are reasonable (8-55 points)
- [ ] Dependencies are clearly identified
- [ ] All PRD features are mapped to an epic
- [ ] No epic is too large (if >55 pts, split)
- [ ] Sequence makes sense (dependencies, value, risk)

---

## Output Files

After completing this workflow, you will have:

1. **epics.md** - Complete epic list with definitions
2. **feature-to-epic-map.md** - Mapping of features to epics
3. **epic-sequencing.md** (optional) - Recommended sprint sequence

---

## Epic Template (Copy-Paste)

```markdown
# Epic: [User-Value Theme]

## User Value Statement
As a [user type], I want [goal] so that [benefit].

## Problem Solved
[Current pain point this epic addresses]

## Features Included
- Feature 1
- Feature 2
- Feature 3

## Success Criteria
- [ ] Measurable outcome 1
- [ ] Measurable outcome 2

## Dependencies
- None / [Other epic IDs]

## Estimated Size
[S/M/L] - [Story points range]

## Priority
[Must Have / Should Have / Could Have]

## Technical Notes
[Architecture considerations, technical dependencies]
```

---

## Example Epic Breakdown

**Project**: User Authentication System (from CreatePrd example)

### Epic 1: Basic User Accounts (Small - 13 points)
**User Value**: As a user, I want to create and manage my account so that I can access personalized features.

**Features**:
- Email/password registration
- Login with session management
- Basic profile management
- Password reset via email

**Success**: 80% registration completion rate, <5% auth errors

**Priority**: Must Have (MVP)

---

### Epic 2: Enhanced Security (Medium - 21 points)
**User Value**: As a user, I want advanced security options so that my account and data are protected.

**Features**:
- OAuth2 (Google, GitHub)
- Two-factor authentication (TOTP)
- Email verification
- Session management (device list, logout all)
- Account recovery options

**Success**: <1% account compromises, 40% 2FA adoption

**Priority**: Should Have (v1.1)

**Dependencies**: Epic 1 (basic auth must exist first)

---

### Epic 3: Admin & Compliance (Small - 13 points)
**User Value**: As an admin, I want to manage users and ensure compliance so that the platform is secure and regulation-compliant.

**Features**:
- User admin panel
- Role-based access control (RBAC)
- Audit logging
- GDPR compliance (data export, account deletion)

**Success**: Full CMMC compliance, audit logs for all actions

**Priority**: Must Have (for enterprise customers)

---

## Integration with Other Workflows

**After CreateEpics**:
1. Use **CreateStories** to break each epic into implementable user stories
2. Use **SprintPlanning** to organize stories into sprints
3. Use **Security → ThreatModel** to identify risks per epic
4. Use **TestArchitect → RiskBasedTesting** to plan test coverage per epic

**During Standup**:
- PM validates business value of each epic
- Architect confirms technical feasibility
- Security reviews security requirements

---

## Common Patterns

### Pattern 1: Foundation → Core → Enhancement
1. **Foundation**: Authentication, data models, infrastructure
2. **Core**: Primary features (the value prop)
3. **Enhancement**: Advanced features, polish, optimization

### Pattern 2: User Journey
1. **Onboarding**: Sign up, first-time experience
2. **Core Actions**: Main tasks users perform
3. **Advanced Features**: Power user capabilities
4. **Retention**: Engagement, notifications, insights

### Pattern 3: Risk Reduction
1. **High-Risk/High-Value**: Tackle unknowns early
2. **Medium-Risk**: Proven patterns
3. **Low-Risk**: Polish and refinement

---

## Tips for Great Epic Breakdowns

**DO**:
✅ Group by user value, not technical layers
✅ Keep epics independently deliverable
✅ Size epics realistically (8-55 points)
✅ Identify dependencies clearly
✅ Prioritize by user impact

**DON'T**:
❌ Create "technical epics" (Backend, Frontend, Database)
❌ Make epics too large (>55 points = split it)
❌ Make epics too small (<8 points = combine)
❌ Ignore dependencies (causes blocking issues later)
❌ Prioritize by developer preference instead of user value

---

## Estimated Time

**First epic breakdown**: 15-20 minutes
**Subsequent breakdowns**: 5-10 minutes
**Complex products**: 10-15 minutes

**Goal**: Organize features into 3-6 epics with clear user value

---

## Quality Checklist

Before marking epics as complete:

- [ ] All epics deliver user value (not just technical work)
- [ ] Epic sizes are reasonable (8-55 points)
- [ ] Dependencies identified and documented
- [ ] All PRD features mapped to an epic
- [ ] Priority assigned (Must/Should/Could)
- [ ] Success criteria are measurable
- [ ] Sequence makes sense (dependencies + value + risk)

---

**CreateEpics workflow complete. Proceed to CreateStories to break epics into implementable user stories.**
