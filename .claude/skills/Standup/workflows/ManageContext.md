# ManageContext Workflow

**Purpose**: Create and maintain project-context.md - the "bible" for your project

**Input**: Project information (PRD, architecture, decisions)

**Output**: project-context.md updated with latest project state

---

## What is Project Context?

**project-context.md** is the single source of truth for your project. All agents reference this during standup discussions.

**Contains**:
- Project overview (what, why, who, when)
- System architecture (components, tech stack, data flows)
- Success metrics (user adoption, performance, compliance)
- Key decisions made (what, why, when, who)
- Constraints (timeline, budget, technical, regulatory)
- Epics overview (user value summary)

**Why It Matters**:
- Agents need shared context for informed standup discussions
- Prevents redundant explanations ("What is this project?")
- Documents rationale for future team members
- Provides audit trail for compliance (CMMC, SOX, GDPR)
- Prevents re-litigating settled decisions

---

## Workflow Steps

### Step 1: Classify Project Data

**Action**: Determine data classification level for the project

**When**: At project initialization (before creating project-context.md)

**Classification Levels**:
- **Public**: No sensitive information (e.g., open source projects, marketing sites)
- **Internal**: Company confidential (e.g., internal tools, employee data)
- **CUI (Controlled Unclassified Information)**: DoD contractor data requiring CMMC compliance
- **Classified**: Government classified information (requires clearance)

**Classification Questions**:
1. Does this project handle DoD contractor data? → **CUI**
2. Does this project handle ITAR/export-controlled technical data? → **CUI//SP-CTI**
3. Is this project publicly shareable? → **Public**
4. Is this project company confidential only? → **Internal**

**Data Handling Rules by Classification**:
| Classification | Cross-Project Sharing | Encryption | CMMC Required | GitHub |
|----------------|----------------------|------------|---------------|--------|
| Public | ✅ Shareable with all | Optional | No | Public repos OK |
| Internal | ✅ Internal/Public only | Recommended | No | Private repos only |
| CUI | ⚠️ CUI projects only | Required | Yes (Level 2) | Private repos only, CUI marked |
| Classified | ❌ No sharing | Required (FIPS 140-2) | Yes (Level 3+) | No GitHub |

**Warning for CUI/Classified Projects**:
```
⚠️ CUI DATA CLASSIFICATION

This project handles Controlled Unclassified Information (CUI).

CMMC Practices:
- AC.L2-3.1.20: Control CUI posted on publicly accessible systems
- MP.L2-3.8.4: Mark media with necessary CUI markings
- AU.L2-3.3.1: Create audit records for data access

Do NOT commit this project-context.md to public GitHub repositories.
Do NOT share architecture details with Public or Internal classified projects.
```

**Template Selection**:
- Public/Internal: Use `templates/project-context.md` (standard)
- CUI/Classified: Use `templates/project-context-classified.md` (with classification controls)

---

### Step 2: Create Initial Project Context

**Action**: Generate project-context.md from PRD with appropriate classification

**When**: After PRD is created (AgilePm skill) and classification determined (Step 1)

**Source**: docs/PRD-[ProjectName].md

**What to Extract**:
- Executive summary → Project overview
- System architecture → Architecture section (mark CUI sections if applicable)
- Success metrics → Success metrics section
- Feature breakdown → Epics overview
- Tech stack → Tech stack decisions

**Data Classification by Component** (for CUI projects):
Identify which components handle CUI data:
| Component | Data Handled | Classification | Security Notes |
|-----------|--------------|----------------|----------------|
| API Gateway | User requests | Internal | No CUI |
| Database | Technical specs | **CUI//SP-CTI** | Export-controlled technical data |
| File Storage | Design docs | **CUI** | Defense contractor data |

**Generated File**: docs/project-context.md

**Classification Marking** (for CUI):
```markdown
# Project Context: [Project Name]

**Data Classification**: CUI//SP-CTI
**Last Updated**: 2025-12-02

CUI//SP-CTI

[Project content here - all marked as CUI]

CUI//SP-CTI
```

---

### Step 3: Add Key Decisions

**Action**: Record decisions made during standup with classification awareness

**When**: After each standup discussion (RunStandup workflow)

**Decision Entry Format**:

```markdown
### Decision: [Title] (YYYY-MM-DD)
- **Decision**: [One-line summary of what was decided]
- **Rationale**: [Why this choice? How did agent perspectives align?]
- **Participants**: Hefley (PM), Daniel (Security), Amy (QA)
- **Trade-offs**: [What we gained vs what we deferred]
- **Owner**: [Who owns implementation]
- **Date**: YYYY-MM-DD
- **Status**: Approved | In Progress | Complete
```

**Example**:

```markdown
### Decision: Ship email/password auth for MVP, defer OAuth2 to v1.1 (2025-12-02)
- **Decision**: Implement email/password authentication for MVP, add OAuth2 in v1.1 if user demand exists
- **Rationale**:
  - Hefley: Primary persona (solo developers) doesn't require OAuth2 for initial adoption. Email/password delivers value in 2 weeks vs 5 weeks for OAuth2.
  - Daniel: Email/password meets CMMC IA practices if we add MFA (TOTP). No critical security gap.
  - Amy: Email/password has 40% less testing complexity (simpler to reach 90% coverage target).
  - Consensus: Ship faster with acceptable security, enhance if users request OAuth2.
- **Participants**: Hefley (PM), Daniel (Security), Amy (QA)
- **Trade-offs**:
  - Gained: 3 weeks faster to MVP, simpler testing
  - Deferred: OAuth2 integration (tracked as v1.1 feature)
- **Owner**: Backend Team
- **Date**: 2025-12-02
- **Status**: Approved
```

---

### Step 3: Update Architecture

**Action**: Keep architecture section current as system evolves

**When**: After architecture changes (new components, data flows, integrations)

**What to Update**:
- Component list (add new services, remove deprecated)
- Data flows (new integrations, API changes)
- Tech stack decisions (new libraries, framework upgrades)
- Trust boundaries (security zones, network segmentation)

**Example Update**:

```markdown
## System Architecture (Updated 2025-12-05)

### Key Components

- **Web App** (React + TypeScript): User interface
- **API Gateway** (Express): Rate limiting, auth, routing
- **Auth Service** (NEW - added 2025-12-05): Email/password + TOTP MFA
- **Database** (PostgreSQL): User data, CUI storage
- **Email Service** (SendGrid): Password reset, notifications

### Data Flows

User → Web App → API Gateway → Auth Service → Database
                               ↓
                          Email Service (password reset)

### Tech Stack Decisions

| Component | Choice | Rationale | Date Added |
|-----------|--------|-----------|------------|
| Auth | Email/password + TOTP | Faster MVP, meets CMMC IA practices | 2025-12-02 |
| Email | SendGrid | Reliable, easy integration | 2025-12-05 |
```

---

### Step 4: Track Success Metrics

**Action**: Update success metrics as project progresses

**When**: Weekly or after milestones

**What to Track**:
- User adoption (actual vs target)
- Feature usage (% of users engaging)
- Performance (load time, response time)
- Quality (bug rate, test coverage)
- Compliance (CMMC practices implemented)

**Example**:

```markdown
## Success Metrics (Updated 2025-12-10)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Users (Month 1) | 50 | 42 | ⚠️ 84% of target |
| Login feature usage | 100% | 100% | ✅ Met |
| API response time | <200ms | 150ms | ✅ Exceeded |
| Test coverage | ≥80% | 85% | ✅ Exceeded |
| CMMC practices | 71/71 (5 domains) | 68/71 | ⚠️ 96% (3 gaps) |

**Action Items**:
- User adoption below target: Launch marketing campaign
- CMMC gaps: 3 practices pending (AU.L2-3.3.8, SC.L2-3.13.15, SI.L2-3.14.5)
```

---

### Step 5: Document Constraints

**Action**: Keep constraints section current (timeline, budget, tech, regulatory)

**When**: When constraints change (deadline shifts, budget changes, new regulations)

**Constraint Categories**:

**Timeline Constraints**:
```markdown
- **MVP Deadline**: 2025-02-09 (8 weeks from start)
- **v1.1 Deadline**: 2025-04-19 (additional 10 weeks)
- **CMMC Audit**: 2025-06-01 (must have full compliance)
```

**Budget Constraints**:
```markdown
- **Team Size**: Solo developer (10 pts/week velocity)
- **Infrastructure Budget**: $100/month (AWS free tier + SendGrid)
- **Third-party Services**: Prefer free/open-source
```

**Technical Constraints**:
```markdown
- **Must Use**: PAI skills framework (compatibility requirement)
- **Must Avoid**: External dependencies that break PAI (no heavy npm packages)
- **Language**: TypeScript (PAI standard)
```

**Regulatory Constraints**:
```markdown
- **CMMC Level 2**: Required for DoD contractor use case
- **GDPR**: Required if EU users (data protection, right to deletion)
- **SOX**: Not required (not handling financial reporting)
```

---

### Step 6: Maintain Epics Overview

**Action**: Update epics overview as epics are added, completed, or re-prioritized

**When**: After epic changes (from AgilePm skill)

**Epic Entry Format**:

```markdown
## Epics Overview

### EPIC-001: Skills from BMAD (Status: ✅ Complete)
**User Value**: Professional agile workflows for structured project planning
**Story Points**: 26 (completed in Sprint 1-2)
**Priority**: Must Have (MVP)
**Completed**: 2025-12-10

### EPIC-002: Standup Agents (Status: ✅ Complete)
**User Value**: Specialist perspectives in every technical decision
**Story Points**: 9 (completed in Sprint 3)
**Priority**: Must Have (MVP)
**Completed**: 2025-12-15

### EPIC-003: Standup Orchestration (Status: ⏳ In Progress)
**User Value**: Multi-perspective decisions reduce defects and rework
**Story Points**: 16 (Sprint 4, in progress)
**Priority**: Must Have (MVP)
**Target Completion**: 2025-12-22

### EPIC-004: PAI Customization (Status: ⏳ Planned)
**User Value**: Feels like YOUR assistant, not someone else's
**Story Points**: 23 (Release 0.3)
**Priority**: Should Have (post-MVP)
**Target Start**: 2025-04-01
```

---

### Step 7: Review and Prune

**Action**: Quarterly review to keep project-context.md current

**When**: Every 3 months or after major milestones

**What to Review**:
- Remove outdated decisions (replaced by newer decisions)
- Archive completed epics (move to separate file if needed)
- Update team size, budget, constraints (if changed)
- Validate architecture reflects current state (not outdated)

**Pruning Guidelines**:
- Keep decisions from last 6 months (recent history)
- Archive decisions older than 6 months (unless foundational)
- Keep foundational decisions forever (e.g., "Why we chose TypeScript")

**Example Pruning**:

```markdown
## Archived Decisions (Older than 6 months)

See docs/decisions-archive-2024.md for historical decisions.

Recent decisions are below (last 6 months):
```

---

## Context Management Patterns

### Pattern 1: New Project Setup

**Trigger**: Starting new project

**Steps**:
1. Create PRD (AgilePm: CreatePrd workflow)
2. Generate project-context.md from PRD (this workflow)
3. Run initial standup (architecture review)
4. Record standup decisions in project-context.md

**Result**: Project-context.md established as single source of truth

---

### Pattern 2: Decision Documentation

**Trigger**: Standup discussion concluded

**Steps**:
1. Synthesize standup decision (RunStandup workflow)
2. Add decision to project-context.md (Step 2 above)
3. Update affected sections (architecture, metrics, epics)

**Result**: Decision recorded with rationale, prevents re-litigation

---

### Pattern 3: Project Handoff

**Trigger**: New team member joins or project transferred

**Steps**:
1. New member reads project-context.md (understand project in 15 minutes)
2. Review key decisions (understand "why" not just "what")
3. Ask clarifying questions (fill gaps in context)

**Result**: Fast onboarding, no tribal knowledge lost

---

## Cross-Project Data Isolation (CMMC AC.L2-3.1.20)

**Purpose**: Prevent CUI data leakage between projects with different classification levels

**Rule**: Projects can reference other projects at **same or lower** classification level only

### Classification Hierarchy

```
Classified (highest)
    ↓ (can reference)
CUI
    ↓ (can reference)
Internal
    ↓ (can reference)
Public (lowest)
```

**Examples**:
- ✅ CUI project can reference Internal project lessons learned (lower classification)
- ❌ Internal project cannot reference CUI project architecture (higher classification)
- ✅ Public project can reference Public project code (same classification)

---

### Cross-Project Reference Checklist

**Before Referencing Another Project**:

1. **Check Classification Compatibility**:
   ```markdown
   Current Project: [Your classification]
   Referenced Project: [Their classification]

   Is Referenced ≤ Current? (Same or lower)
   - ✅ Yes → Safe to reference
   - ❌ No → BLOCKED (data isolation violation)
   ```

2. **Sanitize CUI Details** (if referencing from CUI project to lower):
   - ✅ Shareable: Architectural patterns, lessons learned, generic decisions
   - ❌ Not Shareable: Specific technical details, code, configurations, customer names

3. **Log Cross-Project Reference** (audit trail):
   ```markdown
   ## Cross-Project References

   | Date | Referenced Project | Classification | Purpose | Approved |
   |------|-------------------|----------------|---------|----------|
   | 2025-12-02 | Project B | CUI | Shared library | ✅ Same classification |
   | 2025-12-03 | Project C | Internal | Lessons learned | ✅ Lower classification |
   ```

4. **Mark Sensitive Sections** (for CUI projects):
   ```markdown
   CUI//SP-CTI

   ## System Architecture (CUI)

   [Architecture details here - controlled technical information]

   This section contains export-controlled technical data.
   Do NOT share with non-CUI projects.

   CUI//SP-CTI
   ```

---

### Automated Classification Checks

**Git Pre-Commit Hook** (prevents accidental CUI exposure):

```bash
#!/bin/bash
# Check if project-context.md contains CUI marking but repo is public

if grep -q "Data Classification.*CUI" docs/project-context.md; then
  # This is a CUI project

  # Check if attempting to commit to public repo
  if git remote get-url origin | grep -q "github.com"; then
    echo "❌ ERROR: CUI project detected"
    echo "Cannot commit CUI project-context.md to GitHub (public or private)"
    echo ""
    echo "CMMC AC.L2-3.1.20: Control CUI posted on publicly accessible systems"
    echo ""
    echo "Action: Store CUI projects in on-premise git or government-approved cloud"
    exit 1
  fi
fi
```

**Standup Validation** (before cross-project reference):

```markdown
**Before Standup Loads Context from Multiple Projects**:

1. Identify classification of each project
2. Determine highest classification level in standup
3. Filter out projects above highest allowed level

Example:
- Project A: CUI
- Project B: Internal
- Project C: Public

If current standup is for Project B (Internal):
- ✅ Load Project B context (same)
- ✅ Load Project C context (lower)
- ❌ Block Project A context (higher - CUI data cannot leak to Internal project)
```

---

### Quarterly Classification Review

**Every 90 days**:

1. **Review Project Classification**:
   - Does project still handle CUI data?
   - Has classification level changed (upgraded/downgraded)?
   - Update `Data Classification` field if changed

2. **Review Cross-Project References**:
   - Are all referenced projects at correct classification level?
   - Any unauthorized references detected?
   - Remove outdated references

3. **Audit Cross-Project Access Logs**:
   - Review audit trail for classification violations
   - Investigate any suspicious access patterns
   - Report violations to security team

**CMMC Practice**: AU.L2-3.3.1 (Create and retain audit records)

---

### CUI Data Handling Rules

**For CUI Projects** (CMMC Level 2):

**DO**:
- ✅ Mark all CUI sections with `CUI` or `CUI//SP-CTI` banners
- ✅ Store project-context.md in encrypted storage
- ✅ Restrict access to authorized personnel only
- ✅ Log all data access (audit trail)
- ✅ Quarterly review of classification and access

**DON'T**:
- ❌ Commit CUI project-context.md to public GitHub
- ❌ Share CUI architecture with Public/Internal projects
- ❌ Send CUI project context via unencrypted email
- ❌ Store CUI data on personal devices without encryption
- ❌ Reference CUI projects from non-CUI projects

**CMMC Practices**:
- AC.L2-3.1.20: Control CUI posted on publicly accessible systems
- MP.L2-3.8.4: Mark media with necessary CUI markings
- AU.L2-3.3.1: Create audit records for data access
- SC.L2-3.13.5: Protect confidentiality of CUI during transmission
- SC.L2-3.13.16: Protect confidentiality of CUI at rest

---

## Tips for Effective Context Management

### DO:
✅ Update project-context.md after every standup (don't defer)
✅ Document WHY decisions were made (not just WHAT)
✅ Keep architecture section current (reflects reality, not outdated)
✅ Track success metrics (actuals vs targets)
✅ Prune quarterly (remove outdated content)
✅ Reference project-context.md in standup (shared understanding)

### DON'T:
❌ Let project-context.md become outdated (useless if stale)
❌ Document decisions without rationale (future team won't understand why)
❌ Skip constraint updates (missed deadline, budget change not reflected)
❌ Hoard all decisions (archive old ones, keep recent)
❌ Forget to commit to git (version control is important)

---

## Version Control Best Practices

**Commit project-context.md after major updates**:

```bash
git add docs/project-context.md
git commit -m "docs: record standup decision on auth approach

Decision: Ship email/password for MVP, defer OAuth2 to v1.1

Rationale: Faster time-to-market (2 weeks vs 5 weeks), meets CMMC
requirements with TOTP MFA, primary persona (solo developers) doesn't
require OAuth2 for initial adoption.

Participants: Hefley (PM), Daniel (Security), Amy (QA)
Date: 2025-12-02
Status: Approved"
```

**Why Version Control Matters**:
- Audit trail for compliance (CMMC, SOX require decision documentation)
- See evolution of project decisions over time
- Rollback if decision was wrong (git revert)
- Blame tracking (who made which decision when)

---

## Integration with Skills

### AgilePm Skill
- **PRD created** → Generate initial project-context.md
- **Epics added** → Update epics overview
- **Sprint complete** → Update success metrics

### Security Skill
- **Threat model created** → Add security decisions
- **CMMC baseline** → Update compliance status

### TestArchitect Skill
- **Test strategy defined** → Add quality gates
- **Coverage analyzed** → Update coverage metrics

### Standup Skill
- **Decision made** → Record in Key Decisions section
- **Before standup** → Load context for agents
- **After standup** → Update context with decision

---

## Validation Checklist

Before marking context management as complete:

- [ ] project-context.md created from PRD
- [ ] All standup decisions recorded
- [ ] Architecture section reflects current state
- [ ] Success metrics tracked (actuals vs targets)
- [ ] Constraints documented and current
- [ ] Epics overview updated
- [ ] Quarterly review schedule set
- [ ] Version control configured (git)

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Purpose**: Maintain project-context.md as single source of truth for all agents
