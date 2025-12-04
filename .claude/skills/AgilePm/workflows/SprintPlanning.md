# SprintPlanning Workflow

**Purpose**: Organize user stories into sprints and create a tracking system

**Input**: User stories (from CreateStories workflow)

**Output**: `sprint-status.yaml` file with sprint assignments, goals, and progress tracking

---

## Workflow Steps

### Step 1: Calculate Team Velocity

**Action**: Determine how many story points the team can complete per sprint

**Velocity Calculation**:

**For New Teams** (no historical data):
- **Solo Developer**: 8-10 points/week = 16-20 points/2-week sprint
- **Small Team (2-3 devs)**: 30-40 points/2-week sprint
- **Medium Team (4-6 devs)**: 50-70 points/2-week sprint
- **Large Team (7+ devs)**: 80+ points/2-week sprint

**For Established Teams** (use historical data):
- Average last 3 sprints' completed story points
- Adjust for known factors (vacations, new team members, technical debt)

**Example**:
```
Last 3 sprints: 18, 22, 20 points
Average: 20 points/sprint
Adjustment: Team member on vacation next sprint (-30%)
Adjusted velocity: 14 points for next sprint
```

**Best Practice**: Start conservative (lower estimate) and adjust upward based on actual performance

---

### Step 2: Prioritize Stories

**Action**: Order stories by value, dependencies, and risk

**Prioritization Framework** (in order):

1. **Dependencies First**: Stories that block other stories
2. **Must Haves**: Core functionality required for MVP
3. **High Risk**: Technically complex or uncertain stories (tackle early)
4. **High Value**: Features with greatest user impact
5. **Should Haves**: Important but not critical
6. **Could Haves**: Nice-to-have enhancements

**MoSCoW Prioritization Example**:
```
Must Have (MVP required):
- Story 1.1: User login (5 pts) [DEPENDENCY: blocks 1.2, 1.3]
- Story 1.2: User registration (5 pts)
- Story 1.4: Basic dashboard (3 pts)

Should Have (v1.1):
- Story 1.3: Password reset (5 pts)
- Story 1.5: Profile management (3 pts)

Could Have (Future):
- Story 1.6: OAuth2 login (8 pts)

Won't Have (Explicitly excluded):
- Story 1.7: Biometric authentication
```

**Dependency-Aware Ordering**:
```
Sprint 1:
- Story 1.1 (blocks 1.2, 1.3) ← Do first
- Story 1.2 (blocked by 1.1)
- Story 1.4 (independent)

Sprint 2:
- Story 1.3 (blocked by 1.1) ← Can't do until Sprint 1 done
- Story 1.5 (independent)
```

---

### Step 3: Assign Stories to Sprints

**Action**: Distribute stories across sprints based on velocity and priorities

**Assignment Rules**:

1. **Don't Overload**: Total sprint points ≤ team velocity
2. **Respect Dependencies**: Blocking stories must be in earlier sprints
3. **Balance Work**: Mix easy and hard stories within each sprint
4. **Buffer Time**: Leave 10-20% capacity for bugs and unexpected work
5. **Whole Stories**: Don't split a story across multiple sprints

**Sprint Assignment Example**:
```
Team Velocity: 20 points/sprint

Sprint 1 (Weeks 1-2): 18 points (10% buffer)
- Story 1.1: User login (5 pts) [Must Have, blocks others]
- Story 1.2: User registration (5 pts) [Must Have]
- Story 1.4: Basic dashboard (3 pts) [Must Have]
- Story 2.1: Database setup (5 pts) [Must Have, dependency]

Sprint 2 (Weeks 3-4): 18 points
- Story 1.3: Password reset (5 pts) [Should Have]
- Story 1.5: Profile management (3 pts) [Should Have]
- Story 2.2: API documentation (3 pts) [Should Have]
- Story 3.1: Admin panel (8 pts) [Should Have]

Sprint 3 (Weeks 5-6): 16 points
- Story 1.6: OAuth2 login (8 pts) [Could Have]
- Story 2.3: Analytics dashboard (8 pts) [Could Have]
```

**Load Balancing**:
- Each sprint has mix of frontend/backend work
- Each sprint has mix of easy (2-3 pts) and hard (5-8 pts) stories
- No sprint is overloaded (all ≤ velocity)

---

### Step 4: Define Sprint Goals

**Action**: Create a clear, measurable goal for each sprint

**Sprint Goal Format**:
```
Sprint [N] Goal: [One sentence describing the value delivered]

Success Criteria:
- [ ] Criterion 1 (measurable outcome)
- [ ] Criterion 2 (user-facing value)
- [ ] Criterion 3 (technical milestone)
```

**Good Sprint Goal Examples**:
✅ "Users can register, log in, and access their personalized dashboard"
✅ "Admin can manage user accounts and view system analytics"
✅ "System supports OAuth2 authentication and third-party integrations"

**Bad Sprint Goal Examples**:
❌ "Complete 20 story points" (focuses on points, not value)
❌ "Build backend APIs" (technical layer, not user value)
❌ "Work on authentication" (vague, not measurable)

**Sprint Goal Example**:
```
Sprint 1 Goal: Users can register and log in to access a basic dashboard

Success Criteria:
- [ ] New users can register with email/password
- [ ] Registered users can log in securely
- [ ] Logged-in users see a personalized dashboard
- [ ] All authentication flows have 80%+ test coverage
```

---

### Step 5: Generate sprint-status.yaml

**Action**: Create a YAML file to track sprint progress

**File Structure**:
```yaml
project:
  name: "Project Name"
  start_date: "2025-12-02"
  team_velocity: 20 # points per sprint
  sprint_duration: 2 # weeks

sprints:
  - sprint_number: 1
    start_date: "2025-12-02"
    end_date: "2025-12-15"
    goal: "Users can register and log in to access a basic dashboard"

    success_criteria:
      - criterion: "New users can register with email/password"
        status: "pending" # pending | in_progress | done
      - criterion: "Registered users can log in securely"
        status: "pending"
      - criterion: "Logged-in users see a personalized dashboard"
        status: "pending"

    stories:
      - story_id: "1.1"
        title: "User login"
        points: 5
        status: "pending" # pending | in_progress | done | blocked
        assignee: "Developer Name"
        dependencies: []

      - story_id: "1.2"
        title: "User registration"
        points: 5
        status: "pending"
        assignee: "Developer Name"
        dependencies: ["1.1"]

      - story_id: "1.4"
        title: "Basic dashboard"
        points: 3
        status: "pending"
        assignee: "Developer Name"
        dependencies: []

    metrics:
      planned_points: 18
      completed_points: 0
      velocity: 0 # Updated at sprint end
      completion_rate: 0 # percentage

  - sprint_number: 2
    start_date: "2025-12-16"
    end_date: "2025-12-29"
    goal: "Users can reset passwords and manage their profiles"

    success_criteria:
      - criterion: "Users can reset forgotten passwords via email"
        status: "pending"
      - criterion: "Users can update their profile information"
        status: "pending"

    stories:
      - story_id: "1.3"
        title: "Password reset"
        points: 5
        status: "pending"
        assignee: "Developer Name"
        dependencies: ["1.1"]

      - story_id: "1.5"
        title: "Profile management"
        points: 3
        status: "pending"
        assignee: "Developer Name"
        dependencies: []

    metrics:
      planned_points: 18
      completed_points: 0
      velocity: 0
      completion_rate: 0

summary:
  total_sprints: 2
  total_story_points: 36
  completed_story_points: 0
  overall_velocity: 0 # Average across all sprints
  estimated_completion: "2025-12-29"
```

**Tool**: Write this file to `docs/sprint-status.yaml`

---

### Step 6: Set Up Sprint Ceremonies

**Action**: Document when and how sprint ceremonies occur

**Sprint Ceremonies**:

#### 1. Sprint Planning (First day of sprint)
- **Duration**: 2 hours (for 2-week sprint)
- **Attendees**: Full team
- **Agenda**:
  - Review sprint goal
  - Review and commit to stories
  - Break stories into tasks (optional)
  - Team agrees on sprint commitment
- **Output**: Sprint backlog, sprint goal confirmed

#### 2. Daily Standup (Every day, same time)
- **Duration**: 15 minutes
- **Attendees**: Full team
- **Format**: Each person answers:
  - What did I complete yesterday?
  - What will I work on today?
  - Are there any blockers?
- **Output**: Updated status, blockers identified

#### 3. Sprint Review (Last day of sprint)
- **Duration**: 1 hour
- **Attendees**: Team + stakeholders
- **Agenda**:
  - Demo completed stories
  - Get stakeholder feedback
  - Update product backlog based on feedback
- **Output**: Stakeholder feedback, backlog updates

#### 4. Sprint Retrospective (Last day of sprint, after review)
- **Duration**: 1 hour
- **Attendees**: Full team (no stakeholders)
- **Agenda**:
  - What went well?
  - What didn't go well?
  - What should we improve next sprint?
- **Output**: Action items for improvement

**Ceremony Schedule Example**:
```yaml
ceremonies:
  sprint_planning:
    day: "Monday (Week 1)"
    time: "9:00 AM"
    duration: "2 hours"

  daily_standup:
    day: "Every weekday"
    time: "9:00 AM"
    duration: "15 minutes"

  sprint_review:
    day: "Friday (Week 2)"
    time: "2:00 PM"
    duration: "1 hour"

  sprint_retrospective:
    day: "Friday (Week 2)"
    time: "3:30 PM"
    duration: "1 hour"
```

---

### Step 7: Track and Update Progress

**Action**: Update `sprint-status.yaml` as work progresses

**Daily Updates**:
- Update story status: `pending` → `in_progress` → `done` (or `blocked`)
- Add notes about blockers or issues
- Update completed_points when stories finish

**End-of-Sprint Updates**:
- Calculate velocity (completed points)
- Calculate completion rate (completed / planned × 100%)
- Update overall velocity (average of all sprints)
- Carry over incomplete stories to next sprint (re-prioritize)

**Tracking Example**:
```yaml
# During Sprint 1
stories:
  - story_id: "1.1"
    title: "User login"
    points: 5
    status: "done" # ✅ Completed!
    completed_date: "2025-12-08"

  - story_id: "1.2"
    title: "User registration"
    points: 5
    status: "in_progress" # 🔄 Currently working

  - story_id: "1.4"
    title: "Basic dashboard"
    points: 3
    status: "blocked" # 🚫 Blocker identified
    blocker: "Waiting for design mockups"

metrics:
  planned_points: 18
  completed_points: 5 # Story 1.1 done
  in_progress_points: 5 # Story 1.2
  blocked_points: 3 # Story 1.4
```

**Burndown Tracking** (Optional):
```yaml
burndown:
  - day: 1
    remaining_points: 18
  - day: 2
    remaining_points: 18
  - day: 3
    remaining_points: 13 # Story 1.1 completed
  - day: 4
    remaining_points: 13
  # ... continue daily
```

---

## Output Format

**Primary Output**: `docs/sprint-status.yaml`

**Secondary Output** (Optional): Sprint board visualization

```markdown
# Sprint 1: User Authentication (Dec 2 - Dec 15)

**Goal**: Users can register and log in to access a basic dashboard

## Stories

### To Do (0 pts)
- None

### In Progress (5 pts)
- [1.2] User registration (5 pts) - @DevName

### Done (5 pts)
- [1.1] User login (5 pts) ✅

### Blocked (3 pts)
- [1.4] Basic dashboard (3 pts) 🚫 Waiting for design mockups

## Metrics
- **Completed**: 5 / 18 points (28%)
- **Days Remaining**: 7 days
- **Velocity**: On track ✅
```

---

## Common Patterns

### Pattern 1: MVP Sprint Planning
**Goal**: Deliver minimum viable product in 3 sprints

```yaml
Sprint 1 (Must Haves - Core):
  - User authentication (13 pts)
  - Database setup (5 pts)
  Goal: Users can log in securely

Sprint 2 (Must Haves - Features):
  - User dashboard (8 pts)
  - Basic CRUD operations (8 pts)
  Goal: Users can perform core actions

Sprint 3 (Must Haves - Polish):
  - Error handling (5 pts)
  - Testing and bug fixes (8 pts)
  - Documentation (3 pts)
  Goal: Product is stable and production-ready
```

---

### Pattern 2: Feature Epic Sprint Planning
**Goal**: Deliver a complete feature across 2 sprints

```yaml
Sprint 1 (Foundation):
  - Backend API (8 pts)
  - Database schema (3 pts)
  - Basic UI (5 pts)
  Goal: Feature foundation in place

Sprint 2 (Enhancement):
  - Advanced UI (5 pts)
  - Edge case handling (3 pts)
  - Testing (5 pts)
  Goal: Feature complete and tested
```

---

### Pattern 3: Technical Debt Sprint
**Goal**: Dedicate 20-30% of sprint to technical debt

```yaml
Sprint N:
  New Features (70%):
    - Feature A (8 pts)
    - Feature B (5 pts)

  Technical Debt (30%):
    - Refactor authentication (3 pts)
    - Update dependencies (2 pts)
    - Fix flaky tests (2 pts)

  Goal: Deliver Feature A & B while reducing tech debt
```

---

## Tips for Effective Sprint Planning

### DO:
✅ Start with conservative velocity estimates
✅ Respect dependencies (blocking stories first)
✅ Leave 10-20% buffer for bugs and unexpected work
✅ Define clear, measurable sprint goals
✅ Balance easy and hard stories within each sprint
✅ Update sprint-status.yaml daily
✅ Hold retrospectives to continuously improve

### DON'T:
❌ Overload sprints (exceeding team velocity)
❌ Split a single story across multiple sprints
❌ Ignore dependencies (causes blockers)
❌ Skip sprint ceremonies (planning, standup, review, retro)
❌ Forget to update tracking file
❌ Set vague sprint goals ("Complete 20 points")
❌ Carry over >30% of stories to next sprint (sign of over-commitment)

---

## Integration with Standup Skill

Once sprint planning is complete, use the **Standup skill** to facilitate daily team conversations:

```
/skill Standup
Context: Sprint 1 - User Authentication (Day 3)
Stories in progress: 1.2 (User registration)
Blockers: Story 1.4 blocked by design mockups
```

The Standup skill will orchestrate agent conversations to:
- Discuss progress on in-progress stories
- Identify and resolve blockers
- Make technical decisions collaboratively
- Update sprint-status.yaml automatically

---

## Velocity Adjustment

**After Each Sprint**: Recalculate velocity based on actual performance

**Adjustment Formula**:
```
New Velocity = (Last 3 Sprints Average) × Adjustment Factor

Adjustment Factors:
- Team member vacation: -10% per person
- New team member: -20% for first 2 sprints
- Technical debt sprint: -30% for new features
- Improved tooling: +10-20%
```

**Example Adjustment**:
```
Last 3 sprints: 18, 22, 20 points
Average: 20 points/sprint

Next sprint: Team member on vacation
Adjusted: 20 × 0.9 = 18 points

Future sprint: New CI/CD pipeline saves time
Adjusted: 20 × 1.15 = 23 points
```

---

## Quality Checklist

Before finalizing sprint plan:

- [ ] Team velocity calculated (historical data or conservative estimate)
- [ ] Stories prioritized (dependencies, value, risk)
- [ ] Stories assigned to sprints (no overload)
- [ ] Sprint goals defined (clear, measurable)
- [ ] sprint-status.yaml created
- [ ] Sprint ceremonies scheduled
- [ ] Dependencies respected (blocking stories in earlier sprints)
- [ ] Each sprint has 10-20% buffer for unexpected work
- [ ] Each sprint delivers user-facing value (not just technical work)
- [ ] Team agrees on sprint commitment

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
