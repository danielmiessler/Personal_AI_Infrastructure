# AgilePm Methodology

## Agile Principles

The AgilePm skill follows these core agile principles:

### 1. User-Centric Design
- Start with WHY (business value, user problem)
- Every feature must solve a real user need
- Prioritize by user impact, not developer preference

### 2. Iterative Development
- Break large projects into epics (user-value themes)
- Break epics into stories (implementable units)
- Break stories into tasks (daily work)

### 3. Testable Outcomes
- Acceptance criteria define "done"
- Stories must be independently testable
- Tests written BEFORE implementation (see TestArchitect skill)

### 4. Velocity-Driven Planning
- Story points enable realistic estimates
- Track velocity sprint-over-sprint
- Adjust scope based on actual velocity

## Workflow Sequence

```
Idea/Feature Request
        ↓
    [CreatePrd]
        ↓
    PRD Document
   (exec summary, architecture, features, checklist)
        ↓
    [CreateEpics]
        ↓
    Epic List
   (user-value themes, grouped features)
        ↓
    [CreateStories]
        ↓
    User Stories
   (acceptance criteria, story points)
        ↓
    [SprintPlanning]
        ↓
    Sprint Backlog
   (sprint-status.yaml, velocity tracking)
        ↓
    Implementation
   (code, tests, deployment)
```

## Story Point Sizing (Fibonacci)

- **1 point**: Trivial, <1 hour (config change, simple fix)
- **2 points**: Simple, 1-2 hours (small feature, straightforward)
- **3 points**: Moderate, half day (requires some design)
- **5 points**: Complex, 1 day (multiple components)
- **8 points**: Very complex, 2-3 days (significant effort)
- **13 points**: Epic-sized, 1 week (should be split)

If story > 8 points, split it into smaller stories.

## User Story Format

```
As a [user type]
I want [goal/desire]
So that [benefit/value]

Acceptance Criteria:
- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
- [ ] Specific, testable criterion 3

Story Points: [1, 2, 3, 5, or 8]
Dependencies: [List any blocking stories]
```

## Epic Format

```
Epic: [User-value theme]

User Value: [WHY this epic matters to users]

Features Included:
- Feature 1
- Feature 2
- Feature 3

Success Criteria:
- Measurable outcome 1
- Measurable outcome 2

Sizing: [S/M/L based on total story points]
```

## PRD Format

```
# PRD: [Project Name]

## Executive Summary
1-2 paragraphs: What, Why, Who

## System Architecture
High-level architecture diagram (mermaid or description)

## Feature Breakdown
Features organized by priority

## Implementation Checklist
✅ Actionable items with owners
```

## Integration with Other Skills

### With Security Skill
- Security adds security requirements to each story
- Threat model generated during PRD creation
- CMMC compliance checked per epic

### With TestArchitect Skill
- Test strategy added to PRD
- ATDD test scenarios generated before coding
- Risk-based coverage targets per story

### With Standup Orchestration
- PM agent challenges business value
- Architect reviews technical feasibility
- Security reviews compliance

## Project Context

The AgilePm skill generates `project-context.md` as the "bible" for the project:

**project-context.md includes**:
- Executive summary (elevator pitch)
- System architecture (high-level design)
- Tech stack decisions (with rationale)
- User personas
- Success metrics
- Timeline and milestones

This file is referenced by all agents during standup discussions to maintain alignment.

## Best Practices

### DO
✅ Start with business value (WHY before HOW)
✅ Keep stories small (<8 points)
✅ Write testable acceptance criteria
✅ Include dependencies explicitly
✅ Track velocity and adjust scope

### DON'T
❌ Write technical tasks disguised as user stories
❌ Skip acceptance criteria ("we'll figure it out")
❌ Commit to timelines without velocity data
❌ Gold-plate MVP (ruthless prioritization)
❌ Ignore technical debt

## Velocity Tracking

Example sprint-status.yaml:
```yaml
sprint: 1
duration: 2 weeks
team_size: 1
planned_points: 13
completed_points: 10
velocity: 10  # completed / duration in weeks = 5 pts/week

stories:
  - id: STORY-1
    title: User login
    points: 5
    status: completed
  - id: STORY-2
    title: Password reset
    points: 3
    status: completed
  - id: STORY-3
    title: OAuth integration
    points: 5
    status: in_progress
```

## Attribution

Methodology adapted from BMAD METHOD v6 patterns for PAI architecture.
Follows industry-standard agile practices (Scrum, Kanban, INVEST principles).
