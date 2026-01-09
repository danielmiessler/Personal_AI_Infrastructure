# NamespaceOverview Workflow

**Purpose:** Get a comprehensive overview of all resources in a Kubernetes namespace, including deployments, services, pods, and their current status.

**Triggers:** namespace overview, what's in namespace, show namespace, namespace status, list everything in, namespace summary, what's running in

---

## Steps

1. Identify the target namespace from the request
2. Verify the namespace exists:
```bash
bun run Tools/Namespaces.ts list
```
3. Gather all resource types in the namespace:
```bash
bun run Tools/Deployments.ts list --namespace <namespace>
bun run Tools/Services.ts list --namespace <namespace>
bun run Tools/Containers.ts list --namespace <namespace>
```
4. Check overall health:
```bash
bun run Tools/Health.ts namespace --namespace <namespace>
```
5. Compile and present a structured overview with:
   - Resource counts
   - Deployment status
   - Service endpoints
   - Pod health summary
   - Any issues or warnings

---

## Examples

**Example 1: Overview of home-automation namespace**
```
User: "What's running in my home-automation namespace?"

Process:
1. Parse namespace: home-automation
2. Run all resource listing commands
3. Compile overview
4. Return: Structured summary

Output:
Namespace Overview: home-automation

SUMMARY
-------
Deployments: 4 (4 healthy, 0 degraded)
Services: 4 (4 with endpoints)
Pods: 4 (4 running, 0 pending, 0 failed)
ConfigMaps: 6
Secrets: 3
PVCs: 2 (2 bound)

DEPLOYMENTS
-----------
| Name            | Ready | Status  | Age  |
|-----------------|-------|---------|------|
| home-assistant  | 1/1   | Healthy | 45d  |
| mosquitto       | 1/1   | Healthy | 45d  |
| zigbee2mqtt     | 1/1   | Healthy | 30d  |
| node-red        | 1/1   | Healthy | 14d  |

SERVICES
--------
| Name            | Type         | Cluster-IP    | External-IP    | Ports         |
|-----------------|--------------|---------------|----------------|---------------|
| home-assistant  | LoadBalancer | 10.43.50.100  | 192.168.1.200  | 8123/TCP      |
| mosquitto       | ClusterIP    | 10.43.50.101  | -              | 1883,9001/TCP |
| zigbee2mqtt     | ClusterIP    | 10.43.50.102  | -              | 8080/TCP      |
| node-red        | LoadBalancer | 10.43.50.103  | 192.168.1.201  | 1880/TCP      |

PODS
----
All 4 pods running and ready.

STORAGE
-------
| PVC                  | Status | Capacity | StorageClass |
|----------------------|--------|----------|--------------|
| home-assistant-data  | Bound  | 10Gi     | longhorn     |
| mosquitto-data       | Bound  | 1Gi      | longhorn     |

Status: HEALTHY - All resources operational
```

**Example 2: Overview with issues**
```
User: "Show me the media namespace overview"

Process:
1. Parse namespace: media
2. Run all resource listing commands
3. Identify issues
4. Return: Summary with warnings

Output:
Namespace Overview: media

SUMMARY
-------
Deployments: 5 (3 healthy, 2 degraded)
Services: 5 (4 with endpoints, 1 without)
Pods: 6 (4 running, 1 pending, 1 crashloop)

ISSUES DETECTED
---------------
! radarr: CrashLoopBackOff - container restarting repeatedly
! transmission: Pending - insufficient CPU (requested 500m, available 200m)
! sonarr-service: No endpoints - no ready pods

DEPLOYMENTS
-----------
| Name          | Ready | Status       | Age  |
|---------------|-------|--------------|------|
| plex          | 1/1   | Healthy      | 60d  |
| jellyfin      | 1/1   | Healthy      | 45d  |
| sonarr        | 1/1   | Healthy      | 30d  |
| radarr        | 0/1   | CrashLoop    | 30d  |
| transmission  | 0/1   | Pending      | 1d   |

RECOMMENDATIONS
---------------
1. radarr: Check logs with "show radarr logs" to diagnose crash
2. transmission: Either reduce CPU request or free up node resources
3. sonarr-service: Verify pod labels match service selector

Status: DEGRADED - 2 deployments need attention
```

**Example 3: List all namespaces first**
```
User: "Give me an overview of my cluster namespaces"

Process:
1. No specific namespace - list all
2. Run: bun run Tools/Namespaces.ts list
3. Run: bun run Tools/Health.ts cluster
4. Return: Cluster-wide summary

Output:
Cluster Namespace Overview:

| Namespace        | Deployments | Pods  | Status   |
|------------------|-------------|-------|----------|
| default          | 2           | 2/2   | Healthy  |
| kube-system      | 5           | 8/8   | Healthy  |
| home-automation  | 4           | 4/4   | Healthy  |
| media            | 5           | 4/6   | Degraded |
| monitoring       | 3           | 5/5   | Healthy  |
| network          | 2           | 2/2   | Healthy  |
| ingress-nginx    | 1           | 2/2   | Healthy  |

Cluster Health: 6/7 namespaces healthy

Issue in 'media' namespace - run "overview of media namespace" for details
```

**Example 4: Empty or new namespace**
```
User: "What's in the staging namespace?"

Process:
1. Parse namespace: staging
2. Run: bun run Tools/Namespaces.ts list
3. Found: staging exists but empty
4. Return: Empty namespace report

Output:
Namespace Overview: staging

SUMMARY
-------
Deployments: 0
Services: 0
Pods: 0
ConfigMaps: 1 (kube-root-ca.crt - default)
Secrets: 1 (default-token - default)

This namespace exists but has no workloads deployed.

To deploy to this namespace:
- Apply manifests with: kubectl apply -f <file> -n staging
- Or specify namespace in your deployment YAML
```

---

## Error Handling

- Namespace not found -> List available namespaces, suggest similar names or ask for clarification
- Partial resource fetch failure -> Report what was retrieved, note which resources couldn't be listed
- Permission denied on namespace -> Report RBAC restriction, suggest checking role bindings
- Cluster unreachable -> Check kubeconfig, suggest verifying cluster connectivity

---

## Resource Priority

When displaying, prioritize in this order:
1. **Issues/Warnings** - Always show problems first
2. **Deployments** - Core workload status
3. **Services** - Networking/accessibility
4. **Pods** - Only if different from deployment view (direct pods, jobs)
5. **Storage** - PVCs and their status
6. **Config** - ConfigMaps/Secrets counts (not contents)

---

## Notes

- For large namespaces, summarize rather than list every resource
- Common home lab namespaces: default, home-automation, media, monitoring, network, ingress-nginx
- kube-system contains critical cluster components - issues here affect the whole cluster
- StatefulSets, DaemonSets, and Jobs are also workload types to check
- Ingress resources define external access - important for home lab accessibility
- Resource quotas and limit ranges can affect what can be deployed in a namespace
