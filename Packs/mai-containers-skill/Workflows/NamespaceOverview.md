# Namespace Overview

Get a complete overview of a namespace's resources.

## Triggers

- "namespace overview"
- "what's in [namespace]"
- "show me [namespace]"
- "namespace status"
- "cluster status"

## Workflow

1. **Get namespace** - Verify namespace exists
2. **List deployments** - Get all deployments
3. **List services** - Get all services
4. **Resource usage** - Get namespace resource consumption
5. **Report** - Comprehensive overview

## Steps

```
1. Get namespace info:
   bun run Tools/Namespaces.ts get <namespace>

2. List deployments:
   bun run Tools/Deployments.ts list <namespace>

3. List services:
   bun run Tools/Services.ts list <namespace>

4. Get resource usage:
   bun run Tools/Health.ts resources <namespace>

5. Compile overview
```

## Output Format

```
📊 Namespace Overview: <namespace>

Status: Active
Created: 2024-01-15

## Deployments (3)
| Name | Status | Replicas | Image |
|------|--------|----------|-------|
| api | running | 3/3 | api:v1.2 |
| worker | running | 2/2 | worker:v1.1 |
| redis | running | 1/1 | redis:7 |

## Services (2)
| Name | Type | Cluster IP | Ports |
|------|------|------------|-------|
| api | LoadBalancer | 10.0.0.1 | 80,443 |
| redis | ClusterIP | 10.0.0.2 | 6379 |

## Resource Usage
- CPU: 250m / 1000m (25%)
- Memory: 512MB / 2GB (25%)

## Health Summary
✓ All deployments healthy
✓ All services have endpoints
⚠ 1 pod restarted in last hour
```

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| namespace | No | default | Namespace to inspect |
| include-pods | No | false | Include individual pod details |
