# kai-joplin-issues-adapter

Joplin issues adapter - use Joplin todo notes as an issue tracker. This adapter implements the IssuesProvider interface from kai-issues-core using Joplin's REST API.

## Prerequisites

1. **Joplin Desktop** must be running with Web Clipper enabled
2. **API token** stored in macOS Keychain:
   ```bash
   security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
   ```
   Get your token from: Joplin Desktop -> Tools -> Options -> Web Clipper -> Advanced Options

## Installation

```bash
bun add kai-joplin-issues-adapter
```

## Usage

```typescript
import JoplinIssuesAdapter from 'kai-joplin-issues-adapter';

// Create adapter
const adapter = new JoplinIssuesAdapter({
  port: 41184,              // Web Clipper port (default: 41184)
  defaultNotebook: 'Tasks', // Default notebook for new issues
});

// Check health
const health = await adapter.healthCheck();

// Create an issue (todo note)
const issue = await adapter.createIssue({
  title: 'Fix login bug',
  description: 'Users cannot login with special characters',
  type: 'bug',
  priority: 'high',
});

// List open issues
const openIssues = await adapter.listIssues({ status: 'open' });

// Complete an issue
await adapter.updateIssue(issue.id, { status: 'done' });
```

## Mapping

### Issue -> Joplin Note

| Issue Field | Joplin Field | Notes |
|-------------|--------------|-------|
| id | note.id | UUID |
| title | note.title | Direct map |
| description | note.body | Markdown content |
| status | todo_completed | 0=open, >0=done |
| type | tag | Via tags: task, bug, feature |
| priority | tag | Via tags: p0, p1, p2, p3 |
| labels | tags | Direct map (excluding type/priority) |
| project | parent_id | Notebook as project |
| dueDate | todo_due | Unix timestamp |

### Priority Tags

| Priority | Tag |
|----------|-----|
| urgent | p0 |
| high | p1 |
| medium | p2 |
| low | p3 |

### Type Tags

Issues are typed via tags: `task`, `bug`, `feature`, `story`, `epic`

## Configuration

Via `providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
```

## Limitations

- Requires Joplin Desktop running locally
- No support for CI/CD or Kubernetes (local only)
- Assignees are not supported (Joplin is single-user)
- in_progress status not distinguished from open (Joplin only has complete/incomplete)

## Related

- [kai-issues-core](../kai-issues-core) - Core interfaces
- [kai-joplin-skill](../kai-joplin-skill) - Full Joplin skill with CLI tools
