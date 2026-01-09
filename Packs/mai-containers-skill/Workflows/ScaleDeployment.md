# Scale Deployment

Scale a deployment to specified number of replicas.

## Triggers

- "scale [deployment] to [n] replicas"
- "increase [deployment] replicas"
- "decrease [deployment] replicas"
- "scale up [deployment]"
- "scale down [deployment]"

## Workflow

1. **Identify target** - Get namespace and deployment name
2. **Current state** - Show current replica count
3. **Validate** - Check if scaling is appropriate
4. **Scale** - Execute scaling operation
5. **Monitor** - Watch rollout status
6. **Confirm** - Report final state

## Steps

```
1. Get current deployment status:
   bun run Tools/Deployments.ts get <namespace> <name>

2. Confirm scaling action with user if significant change

3. Execute scale:
   bun run Tools/Deployments.ts scale <namespace> <name> <replicas>

4. Monitor rollout (check every 5s, up to 60s):
   bun run Tools/Deployments.ts get <namespace> <name>

5. Report final status
```

## Output Format

```
🔄 Scaling: <deployment> in <namespace>

Current: 2 replicas (2 ready, 2 available)
Target:  5 replicas

Scaling...

Progress:
- 3/5 ready
- 4/5 ready
- 5/5 ready

✓ Scaling complete
  Deployment: <deployment>
  Replicas: 5/5 ready, 5 available
```

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| namespace | No | default | Kubernetes namespace |
| deployment | Yes | - | Deployment name |
| replicas | Yes | - | Target replica count |

## Safety Checks

- Warn if scaling to 0 (will cause downtime)
- Warn if scaling above 10 replicas
- Warn if current pods are unhealthy
