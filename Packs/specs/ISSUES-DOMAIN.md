# Issues/PM Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-07
**Phase**: 3

---

## Overview

The Issues domain provides a unified interface for task and issue tracking across different backends. It abstracts the differences between personal task managers (Joplin), team project management tools (Linear), and enterprise systems (Jira) behind a common `IssuesProvider` interface.

### Goals
- Unified interface for creating, updating, and querying issues/tasks
- Seamless transition between home (Joplin, Linear) and work (Jira) environments
- Support both personal tasks and team-based issue tracking
- Preserve backend-specific features through metadata passthrough

### Non-Goals
- Full project management (sprints, roadmaps, capacity planning)
- Time tracking (separate domain)
- Rich text editing (pass through as markdown)
- Real-time sync between backends

### Design Decisions

**Why "Issues" not "Tasks"?**

"Issues" is the industry-standard term used by GitHub, GitLab, Jira, and Linear. "Tasks" is more personal (Joplin, Todoist). The interface uses "Issue" as the primary type but supports task semantics through the `type` field.

**Why separate from kai-joplin-skill?**

The existing kai-joplin-skill is a direct CLI tool for Joplin-specific operations (notes, notebooks, search). The Issues domain abstracts only the task/issue subset behind a portable interface. The Joplin adapter can internally use similar API calls but exposes them through the standard IssuesProvider interface.

**Why include Joplin as an adapter?**

Joplin's "todo" notes function as tasks. For personal productivity, Joplin is the source of truth. The adapter maps Joplin's note-with-checkbox model to the Issue interface.

---

## Pack Structure

```
kai-issues-core/              # Interface + discovery + shared utilities
kai-joplin-issues-adapter/    # Joplin as issue tracker (uses todo notes)
kai-linear-adapter/           # Linear project management
kai-mock-issues-adapter/      # Mock adapter for testing (REQUIRED)
kai-issues-skill/             # User-facing workflows
```

**Future adapters** (not implemented in Phase 3):
- `kai-jira-adapter` - Enterprise Jira integration
- `kai-github-issues-adapter` - GitHub Issues integration

---

## kai-issues-core

### Purpose
Defines the IssuesProvider interface and shared utilities for issue tracking. Provides adapter discovery, configuration loading, and error classes.

### Directory Structure

```
kai-issues-core/
├── README.md
├── VERIFY.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── IssuesProvider.ts       # Provider interface
│   ├── types/
│   │   ├── Issue.ts                # Issue type definition
│   │   ├── Project.ts              # Project/board type
│   │   └── Label.ts                # Label/tag type
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discovery with caching
│   │   ├── ConfigLoader.ts         # Configuration loading
│   │   └── ProviderFactory.ts      # Provider instantiation
│   └── utils/
│       ├── errors.ts               # Domain-specific errors
│       ├── logger.ts               # Audit logging
│       └── retry.ts                # Retry with exponential backoff
└── tests/
    ├── interfaces.test.ts
    ├── discovery.test.ts
    └── fixtures.ts
```

### Provider Interface

```typescript
// src/interfaces/IssuesProvider.ts

export interface IssuesProvider {
  /** Provider identifier */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Issue CRUD
  createIssue(issue: CreateIssueInput): Promise<Issue>;
  getIssue(id: string): Promise<Issue>;
  updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;

  // Issue queries
  listIssues(query?: IssueQuery): Promise<Issue[]>;
  searchIssues(text: string, options?: SearchOptions): Promise<Issue[]>;

  // Project/board operations (optional - not all backends support)
  listProjects?(): Promise<Project[]>;
  getProject?(id: string): Promise<Project>;

  // Label operations
  listLabels(): Promise<Label[]>;
  addLabel(issueId: string, labelId: string): Promise<void>;
  removeLabel(issueId: string, labelId: string): Promise<void>;

  // Health check
  healthCheck(): Promise<HealthStatus>;
}

// Issue types
export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  type: IssueType;
  priority?: IssuePriority;
  labels: Label[];
  assignee?: string;
  project?: Project;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  metadata?: Record<string, unknown>;  // Backend-specific data
}

export type IssueStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type IssueType = 'task' | 'bug' | 'feature' | 'story' | 'epic';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface CreateIssueInput {
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  labels?: string[];
  assignee?: string;
  projectId?: string;
  dueDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee?: string;
  dueDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface IssueQuery {
  status?: IssueStatus | IssueStatus[];
  type?: IssueType | IssueType[];
  priority?: IssuePriority | IssuePriority[];
  assignee?: string;
  projectId?: string;
  labels?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  projectId?: string;
  status?: IssueStatus[];
  limit?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Label {
  id: string;
  name: string;
  color?: string;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
```

### Domain Errors

```typescript
// src/utils/errors.ts

export class IssuesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'IssuesError';
  }
}

export class IssueNotFoundError extends IssuesError {
  constructor(issueId: string, provider?: string) {
    super(`Issue not found: ${issueId}`, 'ISSUE_NOT_FOUND', provider);
    this.name = 'IssueNotFoundError';
  }
}

export class ProjectNotFoundError extends IssuesError {
  constructor(projectId: string, provider?: string) {
    super(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND', provider);
    this.name = 'ProjectNotFoundError';
  }
}

export class AuthenticationError extends IssuesError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends IssuesError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

export class AdapterNotFoundError extends IssuesError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

export class RateLimitError extends IssuesError {
  constructor(retryAfter?: number, provider?: string) {
    super(
      `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      provider
    );
    this.name = 'RateLimitError';
  }
}
```

---

## kai-joplin-issues-adapter

### Purpose
Implements IssuesProvider using Joplin's todo notes as the issue backend. Maps Joplin's note model to the Issue interface.

### Adapter Manifest

```yaml
# adapter.yaml
name: joplin
version: 1.0.0
domain: issues
interface: IssuesProvider
entry: ./src/JoplinIssuesAdapter.ts
description: Joplin todo notes as issue tracker

config:
  required: []  # Token from keychain
  optional:
    - port: 41184
    - defaultNotebook: null  # Notebook for new issues

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: false   # Requires Joplin Desktop running
  kubernetes: false
  local: true
```

### Joplin-to-Issue Mapping

| Issue Field | Joplin Field | Notes |
|-------------|--------------|-------|
| id | note.id | UUID |
| title | note.title | Direct map |
| description | note.body | Markdown content |
| status | note.todo_completed | 0=open, 1=done |
| type | metadata (tag) | Via tags: task, bug, feature |
| priority | metadata (tag) | Via tags: p1, p2, p3 |
| labels | note.tags | Direct map |
| project | note.parent_id | Notebook as project |
| createdAt | note.created_time | Unix timestamp |
| updatedAt | note.updated_time | Unix timestamp |
| completedAt | note.todo_completed (time) | When marked done |
| dueDate | note.todo_due | Unix timestamp |

### Implementation Notes

- **Authentication**: Token from macOS Keychain (`joplin-token` / `claude-code`)
- **Projects**: Joplin notebooks map to projects
- **Labels**: Joplin tags map to labels
- **Filtering by status**: Query `is_todo=1` + `todo_completed` field
- **listProjects**: Returns notebooks
- **Pagination**: Joplin API supports `page` and `limit`

---

## kai-linear-adapter

### Purpose
Implements IssuesProvider using Linear's GraphQL API. Provides full issue tracking with projects, labels, and team support.

### Adapter Manifest

```yaml
# adapter.yaml
name: linear
version: 1.0.0
domain: issues
interface: IssuesProvider
entry: ./src/LinearAdapter.ts
description: Linear project management adapter

config:
  required:
    - teamId    # Linear team ID
  optional:
    - apiUrl: https://api.linear.app/graphql

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: true
  local: true
```

### Linear-to-Issue Mapping

| Issue Field | Linear Field | Notes |
|-------------|--------------|-------|
| id | issue.id | UUID |
| title | issue.title | Direct map |
| description | issue.description | Markdown |
| status | issue.state.type | Map to IssueStatus |
| type | issue.labels | Via label conventions |
| priority | issue.priority | 0-4 to enum |
| labels | issue.labels | Direct map |
| assignee | issue.assignee.id | User ID |
| project | issue.project | Linear project |
| createdAt | issue.createdAt | ISO timestamp |
| updatedAt | issue.updatedAt | ISO timestamp |
| completedAt | issue.completedAt | When resolved |
| dueDate | issue.dueDate | ISO date |

### Linear State Mapping

| Linear State Type | IssueStatus |
|-------------------|-------------|
| backlog, unstarted, triage | open |
| started | in_progress |
| completed | done |
| canceled | cancelled |

### Implementation Notes

- **Authentication**: API key from Keychain (`linear-api-key` / `claude-code`)
- **GraphQL**: Use Linear's GraphQL API with proper pagination
- **Rate limiting**: Linear has 1500 req/hour limit, implement backoff
- **Webhooks**: Not in scope for Phase 3 (future enhancement)

---

## kai-mock-issues-adapter

### Purpose
Provides a mock IssuesProvider for testing skills and integration tests without requiring real backends.

### Adapter Manifest

```yaml
# adapter.yaml
name: mock
version: 1.0.0
domain: issues
interface: IssuesProvider
entry: ./src/MockIssuesAdapter.ts
description: Mock adapter for testing

config:
  required: []
  optional:
    - issues: []           # Pre-populated issues
    - projects: []         # Pre-populated projects
    - labels: []           # Pre-populated labels
    - simulateLatency: 0   # Simulated latency in ms
    - failureRate: 0       # Percentage of requests to fail (0-100)

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Test Helpers

```typescript
// Test helper methods on MockIssuesAdapter

class MockIssuesAdapter implements IssuesProvider {
  // Standard interface methods...

  // Test helpers
  setIssues(issues: Issue[]): void;
  addIssue(issue: Issue): void;
  clearIssues(): void;

  setProjects(projects: Project[]): void;
  setLabels(labels: Label[]): void;

  setFailureRate(rate: number): void;
  setLatency(ms: number): void;

  getCallLog(): MethodCall[];  // For verifying calls
  clearCallLog(): void;
}
```

---

## kai-issues-skill

### Purpose
Provides user-facing workflows for issue management that work across any IssuesProvider backend.

### SKILL.md

```yaml
---
name: Issues
description: Issue and task management across Joplin, Linear, Jira. USE WHEN tasks, issues, todos, bugs, features, backlog, sprint, project tracking.
---

# Issues Skill

Unified issue tracking across multiple backends. Works with Joplin (personal tasks), Linear (team projects), or Jira (enterprise).

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| CreateIssue | "create task", "new issue", "add bug" | Created issue |
| ListIssues | "my tasks", "open issues", "show backlog" | Issue list |
| UpdateIssue | "complete task", "close issue", "change priority" | Updated issue |
| SearchIssues | "find issues about X", "search tasks" | Search results |
| ProjectOverview | "project status", "sprint progress" | Project summary |

## CLI Tools

```bash
# List issues
bun run Tools/list.ts [--status open] [--project <id>] [--format table|json]

# Get issue details
bun run Tools/get.ts <issue-id>

# Create issue
bun run Tools/create.ts "Title" [--type task|bug|feature] [--priority high] [--project <id>]

# Update issue
bun run Tools/update.ts <issue-id> [--status done] [--priority low]

# Search issues
bun run Tools/search.ts "query" [--limit 20]

# Health check
bun run Tools/health.ts
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin       # Default backend
    fallback: linear      # If primary fails
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
      linear:
        teamId: <team-id>
```
```

### Workflows

1. **CreateIssue.md** - Create issues with type, priority, labels
2. **ListIssues.md** - Query issues by status, project, assignee
3. **UpdateIssue.md** - Change status, priority, add comments
4. **SearchIssues.md** - Full-text search across issues
5. **ProjectOverview.md** - Summarize project/notebook status

---

## Implementation Checklist

### Phase 3.1: kai-issues-core
- [ ] Create package structure (README.md, package.json, tsconfig.json)
- [ ] Create src/index.ts with public exports
- [ ] Define IssuesProvider interface in src/interfaces/
- [ ] Define Issue, Project, Label types
- [ ] Implement adapter discovery with 60s caching
- [ ] Implement cache invalidation function
- [ ] Implement config loading with precedence
- [ ] Implement provider factory
- [ ] Implement retry utility with exponential backoff
- [ ] Add domain-specific error classes
- [ ] Add audit logging (never log sensitive values)
- [ ] Write unit tests for each module
- [ ] Create VERIFY.md and verify all items

### Phase 3.2: kai-joplin-issues-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement JoplinIssuesAdapter class
- [ ] Implement Joplin-to-Issue mapping
- [ ] Map notebooks to projects
- [ ] Map tags to labels
- [ ] Implement todo_completed status mapping
- [ ] Use keychain for token auth
- [ ] Write unit tests with mocked Joplin API
- [ ] Create VERIFY.md and verify all items

### Phase 3.3: kai-linear-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement LinearAdapter class
- [ ] Implement GraphQL client
- [ ] Map Linear states to IssueStatus
- [ ] Map Linear priorities to IssuePriority
- [ ] Implement pagination for listIssues
- [ ] Handle rate limiting with backoff
- [ ] Use keychain for API key auth
- [ ] Write unit tests with mocked GraphQL
- [ ] Create VERIFY.md and verify all items

### Phase 3.4: kai-mock-issues-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement MockIssuesAdapter class with test helpers
- [ ] Implement setIssues/addIssue/clearIssues methods
- [ ] Implement simulated latency
- [ ] Implement simulated failures
- [ ] Implement call logging for verification
- [ ] Create tests/fixtures.ts with factory functions
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify all items

### Phase 3.5: kai-issues-skill
- [ ] Create package structure
- [ ] Create SKILL.md with workflow routing
- [ ] Create CLI tools in Tools/
- [ ] Create workflow documentation in Workflows/
- [ ] Write integration tests using mock adapter
- [ ] Create VERIFY.md and verify all items

### Phase 3.6: Integration Testing
- [ ] End-to-end test: skill → core → mock adapter
- [ ] End-to-end test: skill → core → Joplin adapter (requires Joplin running)
- [ ] End-to-end test: skill → core → Linear adapter (requires API key)
- [ ] Verify fallback chain works
- [ ] Verify audit logging captures all operations
- [ ] Test retry behavior with flaky mock adapter
- [ ] Update SESSION-CONTEXT.md with Phase 3 completion

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Reference implementation (Phase 1)
- [NETWORK-DOMAIN.md](./NETWORK-DOMAIN.md) - Reference implementation (Phase 2)
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Generic domain template

---

## Changelog

### 1.0.0 - 2026-01-07
- Initial specification
