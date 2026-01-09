# DeploymentStatus Workflow

**Purpose:** Check the status of deployments in a specific namespace, including replica counts, rollout progress, and pod health.

**Triggers:** deployment status, check deployments, are my deployments running, what's deployed, deployment health, show deployments

---

## Steps

1. Identify the target namespace from the user request (default to "default" if not specified)
2. List all deployments in the namespace with their current status:
```bash
bun run Tools/Deployments.ts list --namespace <namespace>
```
3. For deployments with issues (not fully available), get detailed status:
```bash
bun run Tools/Deployments.ts describe --namespace <namespace> --name <deployment-name>
```
4. Summarize the deployment health in a clear format showing:
   - Deployment name
   - Desired vs Ready replicas
   - Up-to-date status
   - Available status
   - Any error conditions

---

## Examples

**Example 1: Check all deployments in home-automation namespace**
```
User: "What's the status of my home-automation deployments?"

Process:
1. Parse namespace: home-automation
2. Run: bun run Tools/Deployments.ts list --namespace home-automation
3. Return: Formatted table of deployments

Output:
Deployments in 'home-automation':

| Name              | Ready | Up-to-Date | Available | Age  |
|-------------------|-------|------------|-----------|------|
| home-assistant    | 1/1   | 1          | 1         | 45d  |
| mosquitto         | 1/1   | 1          | 1         | 45d  |
| zigbee2mqtt       | 1/1   | 1          | 1         | 30d  |
| node-red          | 0/1   | 1          | 0         | 2d   |

Warning: node-red has 0 available replicas - investigating...
```

**Example 2: Check deployments with no namespace specified**
```
User: "Check my deployment status"

Process:
1. No namespace specified - use "default"
2. Run: bun run Tools/Deployments.ts list --namespace default
3. Return: Deployment summary for default namespace

Output:
Deployments in 'default' namespace:

| Name       | Ready | Up-to-Date | Available |
|------------|-------|------------|-----------|
| nginx-test | 2/2   | 2          | 2         |

All deployments healthy.
```

**Example 3: Investigating a failing deployment**
```
User: "Why isn't my pihole deployment working?"

Process:
1. Parse deployment name: pihole (infer namespace or ask)
2. Run: bun run Tools/Deployments.ts list --namespace network
3. Run: bun run Tools/Deployments.ts describe --namespace network --name pihole
4. Return: Detailed status with issue identification

Output:
Deployment 'pihole' in 'network' namespace:

Status: DEGRADED
- Desired: 1, Ready: 0, Available: 0

Issue Detected:
- Pod pihole-7d8f9c6b5-xk2rm is in CrashLoopBackOff
- Last restart: 2 minutes ago
- Reason: Container failed liveness probe

Recommendation: Check container logs with "show me pihole logs"
```

---

## Error Handling

- Namespace not found -> List available namespaces and ask user to clarify
- No deployments in namespace -> Report "No deployments found in '<namespace>'" and confirm namespace is correct
- API connection failed -> Check if cluster is reachable, suggest checking kubeconfig or Docker Desktop status
- Permission denied -> Report RBAC issue, suggest checking service account permissions

---

## Notes

- For k3s home lab clusters, common namespaces include: default, kube-system, home-automation, media, network
- Docker Desktop uses "default" namespace unless configured otherwise
- Deployments showing 0/0 replicas may be intentionally scaled down (e.g., dev environments)
- Age can help identify if a deployment was recently updated and might still be rolling out
