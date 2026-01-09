# mai-issues-skill

User-facing workflows for issue and task management. Works across multiple backends (Joplin, Linear, Jira) through the mai-issues-core adapter system.

## Installation

```bash
bun add mai-issues-skill
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

- [mai-issues-core](../mai-issues-core) - Core interfaces
- [mai-joplin-issues-adapter](../mai-joplin-issues-adapter) - Joplin adapter
- [mai-linear-adapter](../mai-linear-adapter) - Linear adapter
- [mai-mock-issues-adapter](../mai-mock-issues-adapter) - Mock adapter for testing
