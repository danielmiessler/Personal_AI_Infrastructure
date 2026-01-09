# mai-linear-adapter

Linear project management adapter for KAI issues domain. This adapter implements the IssuesProvider interface from mai-issues-core using Linear's GraphQL API.

## Prerequisites

1. **Linear API key** stored in macOS Keychain:
   ```bash
   security add-generic-password -s "linear-api-key" -a "claude-code" -w "<your-api-key>"
   ```
   Get your API key from: Linear Settings -> API -> Personal API Keys

2. **Team ID**: You need to know your Linear team ID

## Installation

```bash
bun add mai-linear-adapter
```

## Usage

```typescript
import LinearAdapter from 'mai-linear-adapter';

// Create adapter
const adapter = new LinearAdapter({
  teamId: 'your-team-id',
  apiUrl: 'https://api.linear.app/graphql', // optional
});

// Check health
const health = await adapter.healthCheck();

// Create an issue
const issue = await adapter.createIssue({
  title: 'Fix login bug',
  description: 'Users cannot login with special characters',
  type: 'bug',
  priority: 'high',
  projectId: 'project-id',
});

// List open issues
const openIssues = await adapter.listIssues({ status: 'open' });

// Complete an issue
await adapter.updateIssue(issue.id, { status: 'done' });
```

## Mapping

### Linear State Types -> IssueStatus

| Linear State Type | IssueStatus |
|-------------------|-------------|
| backlog, unstarted, triage | open |
| started | in_progress |
| completed | done |
| canceled | cancelled |

### Linear Priority -> IssuePriority

| Linear Priority | IssuePriority |
|-----------------|---------------|
| 0 (No priority) | none |
| 1 (Urgent) | urgent |
| 2 (High) | high |
| 3 (Medium) | medium |
| 4 (Low) | low |

### Issue Types

Issue types are determined by labels: `bug`, `feature`, `story`, `epic`. Default is `task`.

## Configuration

Via `providers.yaml`:

```yaml
domains:
  issues:
    primary: linear
    adapters:
      linear:
        teamId: your-team-id
        apiUrl: https://api.linear.app/graphql
```

## Rate Limiting

Linear has a rate limit of 1500 requests per hour. The adapter uses exponential backoff retry for rate limit errors.

## Related

- [mai-issues-core](../mai-issues-core) - Core interfaces
- [mai-issues-skill](../mai-issues-skill) - User-facing workflows
