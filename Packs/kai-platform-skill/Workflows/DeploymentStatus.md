# Deployment Status

Check the status of deployments in a namespace.

## Triggers

- "deployment status"
- "check deployments"
- "how are my deployments"
- "what's running in [namespace]"

## Workflow

1. **Identify namespace** - Use provided namespace or default
2. **List deployments** - Get all deployments with status
3. **Check health** - For any non-running deployments, get details
4. **Report** - Summarize deployment status

## Steps

```
1. Run: bun run Tools/Deployments.ts list <namespace>
2. For any deployments not in 'running' status:
   - Run: bun run Tools/Containers.ts list <namespace> --deployment <name>
   - Check container status and restart counts
3. Summarize findings
```

## Output Format

```
📋 Deployment Status: <namespace>

| Deployment | Status | Replicas | Notes |
|------------|--------|----------|-------|
| api-server | ✓ running | 3/3 | - |
| worker | ⚠ updating | 2/3 | Rolling update in progress |
| redis | ✗ failed | 0/1 | CrashLoopBackOff |

Issues Found:
- redis: Container crashing, 5 restarts in last hour
  Last log: "Connection refused to database"
```

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| namespace | No | default | Kubernetes namespace |
| provider | No | primary | Provider to use |
