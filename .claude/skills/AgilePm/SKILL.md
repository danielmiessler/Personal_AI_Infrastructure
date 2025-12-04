---
name: AgilePm
description: Enterprise agile product management workflows for PAI. USE WHEN user needs PRD creation, epic decomposition, user story generation, sprint planning, or structured agile project management. Provides BMAD-quality rigor with PAI simplicity.
---

# AgilePm

Structured agile workflows for professional software development. Transform ideas into executable plans with PRDs, epics, user stories, and sprint tracking.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| CreatePrd | Starting new project or feature | Comprehensive PRD with architecture |
| CreateEpics | Breaking down PRD into deliverable chunks | Epic list with user value themes |
| CreateStories | Planning sprint or implementation | User stories with acceptance criteria |
| SprintPlanning | Organizing work into iterations | sprint-status.yaml tracking file |

## Examples

### Example 1: Create PRD for new feature
```
User: "Create a PRD for user authentication system"
Skill loads: AgilePm → CreatePrd workflow
Output: PRD with exec summary, architecture, features, checklist
```

### Example 2: Break PRD into epics
```
User: "Break this PRD into epics"
Skill loads: AgilePm → CreateEpics workflow
Output: epics.md with user-value grouped features
```

### Example 3: Generate user stories
```
User: "Create user stories for Epic 1"
Skill loads: AgilePm → CreateStories workflow
Output: stories.md with acceptance criteria and story points
```

### Example 4: Plan sprints
```
User: "Organize these stories into sprints"
Skill loads: AgilePm → SprintPlanning workflow
Output: sprint-status.yaml with sprint assignments and tracking
```

## Integration

- Works with Security skill (adds security reqs to stories)
- Works with TestArchitect skill (adds test strategy to PRD)
- Generates project-context.md as "bible" for project
- Integrates with standup orchestration for collaborative planning

## Methodology

This skill follows agile best practices:
- User-centric (start with WHY)
- Iterative (epics → stories → sprints)
- Testable (acceptance criteria drive development)
- Prioritized (story points enable velocity tracking)

Based on BMAD METHOD patterns adapted for PAI architecture.
