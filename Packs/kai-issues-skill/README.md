# kai-issues-skill

User-facing workflows for issue and task management. Works across multiple backends (Joplin, Linear, Jira) through the kai-issues-core adapter system.

## Installation

```bash
bun add kai-issues-skill
```

## CLI Tools

```bash
# List issues
bun run Tools/list.ts [--status open] [--format table|json]

# Health check
bun run Tools/health.ts
```

## Workflows

- **CreateIssue** - Create new issues/tasks
- **ListIssues** - Query and list issues
- **UpdateIssue** - Modify issue status, priority, etc.
- **SearchIssues** - Full-text search
- **ProjectOverview** - Project/sprint summary

## Configuration

Configure your preferred backend in `providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
```

## Related

- [kai-issues-core](../kai-issues-core) - Core interfaces
- [kai-joplin-issues-adapter](../kai-joplin-issues-adapter) - Joplin adapter
- [kai-linear-adapter](../kai-linear-adapter) - Linear adapter
- [kai-mock-issues-adapter](../kai-mock-issues-adapter) - Mock adapter for testing
