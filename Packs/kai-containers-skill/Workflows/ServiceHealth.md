# Service Health

Check health and connectivity of services.

## Triggers

- "service health"
- "check services"
- "are services running"
- "service endpoints"

## Workflow

1. **List services** - Get all services in namespace
2. **Check backing pods** - Verify pods behind each service
3. **Endpoint status** - Check if endpoints are ready
4. **Report** - Summarize service health

## Steps

```
1. List services:
   bun run Tools/Services.ts list <namespace>

2. For each service, check backing pods:
   bun run Tools/Containers.ts list <namespace> --labels from service selector

3. Compile health report
```

## Output Format

```
🔌 Service Health: <namespace>

| Service | Type | Cluster IP | Ready Pods | Status |
|---------|------|------------|------------|--------|
| api | LoadBalancer | 10.0.0.1 | 3/3 | ✓ Healthy |
| redis | ClusterIP | 10.0.0.2 | 1/1 | ✓ Healthy |
| worker | ClusterIP | 10.0.0.3 | 0/2 | ✗ No endpoints |

Issues:
- worker: No ready pods backing this service
  - Pod worker-abc: CrashLoopBackOff
  - Pod worker-xyz: CrashLoopBackOff
```

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| namespace | No | default | Kubernetes namespace |
| service | No | all | Specific service to check |
