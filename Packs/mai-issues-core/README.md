# mai-issues-core

Core interfaces and utilities for the KAI issues/PM domain. Provides the `IssuesProvider` interface that adapters implement to enable portable issue tracking across different backends (Joplin, Linear, Jira).

## Installation

```bash
bun add mai-issues-core
```

## Usage

```typescript
import { createProvider } from 'mai-issues-core';

// Create provider from configuration
const provider = await createProvider();

// List open issues
const issues = await provider.listIssues({ status: 'open' });

// Create an issue
const issue = await provider.createIssue({
  title: 'Fix login bug',
  type: 'bug',
  priority: 'high'
});

// Update issue status
await provider.updateIssue(issue.id, { status: 'done' });
```

## Interface

```typescript
interface IssuesProvider {
  readonly name: string;
  readonly version: string;

  createIssue(issue: CreateIssueInput): Promise<Issue>;
  getIssue(id: string): Promise<Issue>;
  updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;

  listIssues(query?: IssueQuery): Promise<Issue[]>;
  searchIssues(text: string, options?: SearchOptions): Promise<Issue[]>;

  listProjects?(): Promise<Project[]>;
  getProject?(id: string): Promise<Project>;

  listLabels(): Promise<Label[]>;
  addLabel(issueId: string, labelId: string): Promise<void>;
  removeLabel(issueId: string, labelId: string): Promise<void>;

  healthCheck(): Promise<HealthStatus>;
}
```

## Configuration

Create `providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
      linear:
        teamId: your-team-id
```

## Available Adapters

- `mai-joplin-issues-adapter` - Joplin todo notes
- `mai-linear-adapter` - Linear project management
- `mai-mock-issues-adapter` - Mock adapter for testing

## Related

- [ISSUES-DOMAIN.md](../specs/ISSUES-DOMAIN.md) - Full specification
- [mai-issues-skill](../mai-issues-skill) - User-facing workflows
