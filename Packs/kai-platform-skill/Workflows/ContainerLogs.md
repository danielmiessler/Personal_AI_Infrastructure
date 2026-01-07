# Container Logs

View and analyze container/pod logs.

## Triggers

- "show logs for [container]"
- "container logs"
- "pod logs"
- "what's happening in [container]"
- "debug [container]"

## Workflow

1. **Identify container** - Get namespace and container name
2. **Fetch logs** - Get recent logs with appropriate tail limit
3. **Analyze** - Look for errors, warnings, patterns
4. **Report** - Present logs with any notable findings

## Steps

```
1. If container not specified, list containers:
   bun run Tools/Containers.ts list <namespace>

2. Get container details:
   bun run Tools/Containers.ts get <namespace> <name>

3. Fetch logs:
   bun run Tools/Containers.ts logs <namespace> <name> --tail 100

4. Analyze log content for:
   - Error patterns (ERROR, FATAL, Exception)
   - Warning patterns (WARN, WARNING)
   - Startup messages
   - Connection issues
```

## Output Format

```
📝 Logs: <container> (<namespace>)

Status: running | Restarts: 2 | Node: worker-1

--- Last 50 lines ---
[timestamp] Log content here...
[timestamp] More logs...

⚠️ Issues Detected:
- 3 ERROR entries found
- Pattern: "Connection timeout to database"
- Recommendation: Check database connectivity
```

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| namespace | No | default | Kubernetes namespace |
| container | Yes | - | Container/pod name |
| tail | No | 100 | Number of lines |
| since | No | - | Time filter (e.g., "1h", "30m") |
| grep | No | - | Filter pattern |
