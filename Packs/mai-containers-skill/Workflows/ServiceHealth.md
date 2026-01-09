# ServiceHealth Workflow

**Purpose:** Check the health status of Kubernetes services, their endpoints, and connectivity within the cluster.

**Triggers:** service health, check services, are services running, service status, endpoints, service connectivity, is the service up

---

## Steps

1. Identify the target namespace and optionally a specific service name
2. List services in the namespace:
```bash
bun run Tools/Services.ts list --namespace <namespace>
```
3. Check endpoint health for each service (or specified service):
```bash
bun run Tools/Health.ts endpoints --namespace <namespace> --service <service-name>
```
4. For LoadBalancer or NodePort services, verify external accessibility
5. Report service status including:
   - Service name and type (ClusterIP, NodePort, LoadBalancer)
   - Cluster IP and ports
   - External IP (if applicable)
   - Endpoint count and health
   - Backend pod readiness

---

## Examples

**Example 1: Check all services in media namespace**
```
User: "Are my media services healthy?"

Process:
1. Parse namespace: media
2. Run: bun run Tools/Services.ts list --namespace media
3. Run: bun run Tools/Health.ts endpoints --namespace media
4. Return: Service health summary

Output:
Services in 'media' namespace:

| Service    | Type        | Cluster-IP    | Port(s)        | Endpoints |
|------------|-------------|---------------|----------------|-----------|
| plex       | LoadBalancer| 10.43.100.50  | 32400:30400/TCP| 1/1 ready |
| jellyfin   | ClusterIP   | 10.43.100.51  | 8096/TCP       | 1/1 ready |
| sonarr     | ClusterIP   | 10.43.100.52  | 8989/TCP       | 1/1 ready |
| radarr     | ClusterIP   | 10.43.100.53  | 7878/TCP       | 0/1 ready |

Warning: radarr has no healthy endpoints
- Backend pod radarr-6f8b9c5d4-mk2jl is not ready
- Reason: Readiness probe failed (HTTP 503)
```

**Example 2: Check specific service health**
```
User: "Is my home-assistant service working?"

Process:
1. Parse service name: home-assistant
2. Determine namespace (check common ones or ask)
3. Run: bun run Tools/Services.ts list --namespace home-automation --name home-assistant
4. Run: bun run Tools/Health.ts endpoints --namespace home-automation --service home-assistant
5. Return: Detailed service status

Output:
Service 'home-assistant' in 'home-automation':

Type: LoadBalancer
Cluster IP: 10.43.50.100
External IP: 192.168.1.200 (MetalLB)
Ports: 8123:30123/TCP

Endpoints: 1/1 healthy
- 10.42.0.15:8123 (pod: home-assistant-8d7f6c5b4-xm2kl) - Ready

Status: HEALTHY - Service is accessible at http://192.168.1.200:8123
```

**Example 3: Service with no endpoints**
```
User: "Why can't I reach my grafana dashboard?"

Process:
1. Parse service name: grafana
2. Run: bun run Tools/Services.ts list --namespace monitoring --name grafana
3. Run: bun run Tools/Health.ts endpoints --namespace monitoring --service grafana
4. Return: Diagnostic information

Output:
Service 'grafana' in 'monitoring':

Type: ClusterIP
Cluster IP: 10.43.75.30
Ports: 3000/TCP

Endpoints: 0/1 - NO HEALTHY ENDPOINTS

Diagnosis:
- Service selector: app=grafana
- Matching pods found: 1
- Pod grafana-5c8d7b6a3-jk9ml status: ImagePullBackOff

Root Cause: Pod cannot start due to image pull failure
- Image: grafana/grafana:10.2.0
- Error: "manifest unknown"

Recommendation: Check if image tag exists or update to valid version
```

---

## Error Handling

- Service not found -> List available services in namespace, suggest checking service name spelling
- No endpoints -> Check if matching pods exist, verify selector labels match pod labels
- External IP pending -> For LoadBalancer type, check if MetalLB or cloud provider LB is configured
- Connection refused on endpoint -> Pod is running but application not listening on expected port
- Timeout on health check -> Network policy may be blocking traffic, or pod is overloaded

---

## Notes

- In k3s home labs, LoadBalancer services typically use MetalLB or klipper-lb
- ClusterIP services are only accessible from within the cluster or via Ingress
- NodePort services expose on all nodes at the specified port (30000-32767 range)
- Services with multiple endpoints provide load balancing across pods
- Headless services (ClusterIP: None) are used for StatefulSets and don't load balance
- Check Ingress resources separately if external access isn't working despite healthy service
