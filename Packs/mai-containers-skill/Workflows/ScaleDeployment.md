# ScaleDeployment Workflow

**Purpose:** Scale a Kubernetes deployment up or down by adjusting the replica count, with safety checks and rollout monitoring.

**Triggers:** scale deployment, scale up, scale down, add replicas, reduce replicas, set replicas, stop deployment, start deployment

---

## Steps

1. Identify the deployment name, namespace, and desired replica count
2. Get current deployment status to confirm it exists and show current scale:
```bash
bun run Tools/Deployments.ts list --namespace <namespace> --name <deployment>
```
3. Confirm the scaling action with the user (especially for scale to 0)
4. Execute the scale operation:
```bash
bun run Tools/Deployments.ts scale --namespace <namespace> --name <deployment> --replicas <count>
```
5. Monitor the rollout progress:
```bash
bun run Tools/Deployments.ts status --namespace <namespace> --name <deployment>
```
6. Confirm completion and report final state

---

## Examples

**Example 1: Scale up a deployment**
```
User: "Scale my plex deployment to 2 replicas"

Process:
1. Parse: deployment=plex, replicas=2
2. Run: bun run Tools/Deployments.ts list --namespace media --name plex
3. Current state: 1/1 replicas
4. Confirm: "Scaling plex from 1 to 2 replicas. Proceed?"
5. User confirms
6. Run: bun run Tools/Deployments.ts scale --namespace media --name plex --replicas 2
7. Run: bun run Tools/Deployments.ts status --namespace media --name plex
8. Return: Scaling result

Output:
Scaling 'plex' in 'media' namespace:

Current: 1 replica
Target: 2 replicas

Executing scale operation...

Rollout Progress:
- Desired: 2
- Updated: 2
- Available: 1 -> 2

Scale complete. Deployment 'plex' now running 2/2 replicas.

New pods:
- plex-7d8f9c6b5-xk2rm (Running, Ready)
- plex-7d8f9c6b5-jm4nl (Running, Ready)
```

**Example 2: Scale down to zero (stop deployment)**
```
User: "Stop the dev-api deployment, I'm not using it"

Process:
1. Parse: deployment=dev-api, replicas=0 (stop = scale to 0)
2. Run: bun run Tools/Deployments.ts list --namespace development --name dev-api
3. Current state: 2/2 replicas
4. Safety prompt: "This will stop all pods for dev-api. The deployment will remain but no pods will run. Confirm?"
5. User confirms
6. Run: bun run Tools/Deployments.ts scale --namespace development --name dev-api --replicas 0
7. Return: Confirmation

Output:
Stopping 'dev-api' in 'development' namespace:

WARNING: Scaling to 0 replicas will stop all pods.
The deployment configuration is preserved and can be scaled back up.

Scaling from 2 to 0 replicas...

Complete. Deployment 'dev-api' is now stopped (0/0 replicas).

To restart: "Scale dev-api back up" or "Start dev-api"
```

**Example 3: Scale based on relative change**
```
User: "Add 2 more replicas to the nginx deployment"

Process:
1. Parse: deployment=nginx, change=+2
2. Run: bun run Tools/Deployments.ts list --namespace default --name nginx
3. Current state: 3/3 replicas
4. Calculate target: 3 + 2 = 5 replicas
5. Confirm: "Scaling nginx from 3 to 5 replicas. Proceed?"
6. Run: bun run Tools/Deployments.ts scale --namespace default --name nginx --replicas 5
7. Return: Result

Output:
Scaling 'nginx' in 'default' namespace:

Current: 3 replicas
Adding: 2 replicas
Target: 5 replicas

Scaling in progress...

Rollout complete:
- nginx-6c7d8e9f0-abc12 (Running)
- nginx-6c7d8e9f0-def34 (Running)
- nginx-6c7d8e9f0-ghi56 (Running)
- nginx-6c7d8e9f0-jkl78 (New - Running)
- nginx-6c7d8e9f0-mno90 (New - Running)

Deployment 'nginx' now at 5/5 replicas.
```

**Example 4: Restart deployment (scale down then up)**
```
User: "Restart the home-assistant deployment"

Process:
1. Parse: deployment=home-assistant, action=restart
2. Note: Kubernetes has rollout restart, but scaling is alternative
3. Run: bun run Tools/Deployments.ts restart --namespace home-automation --name home-assistant
4. Monitor rollout
5. Return: Result

Output:
Restarting 'home-assistant' in 'home-automation' namespace:

Triggering rolling restart...

Rollout Progress:
- Old pod terminating: home-assistant-8d7f6c5b4-xm2kl
- New pod starting: home-assistant-8d7f6c5b4-np3qr
- New pod ready: home-assistant-8d7f6c5b4-np3qr
- Old pod terminated

Restart complete. New pod running:
- home-assistant-8d7f6c5b4-np3qr (Running, Ready, Age: 30s)
```

---

## Error Handling

- Deployment not found -> List deployments in namespace, suggest correct name
- Insufficient resources -> Warn about pending pods, check node capacity
- Scale blocked by PodDisruptionBudget -> Explain PDB constraints, suggest gradual scaling
- Horizontal Pod Autoscaler conflict -> Warn that HPA will override manual scaling, suggest adjusting HPA instead
- Namespace not found -> List available namespaces

---

## Safety Checks

Before scaling, verify:
1. **Scale to 0:** Always confirm - this stops the workload entirely
2. **Large scale up (>5):** Confirm resource availability on nodes
3. **HPA present:** Warn that HPA may override manual scaling
4. **StatefulSet:** Different scaling behavior - warn about data implications
5. **DaemonSet:** Cannot be scaled - runs one pod per node

---

## Notes

- Scaling to 0 is useful for:
  - Stopping unused dev/test workloads to save resources
  - Maintenance windows
  - Troubleshooting by removing all pods
- Scaling preserves the deployment spec; pods can be recreated by scaling back up
- For persistent workloads, ensure PersistentVolumeClaims aren't deleted
- Watch for resource quotas in the namespace that might block scale-up
- k3s on Raspberry Pi clusters have limited resources - scale conservatively
- Consider using `kubectl rollout restart` for zero-downtime restarts instead of scale down/up
