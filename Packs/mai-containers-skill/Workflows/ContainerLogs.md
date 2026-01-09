# ContainerLogs Workflow

**Purpose:** View, filter, and analyze logs from containers and pods to diagnose issues and monitor application behavior.

**Triggers:** container logs, pod logs, show logs, view logs, what's in the logs, log errors, why is it crashing, debug container

---

## Steps

1. Identify the target pod/container and namespace from the request
2. Determine log parameters:
   - Time range (default: last 100 lines or 1 hour)
   - Specific container (if multi-container pod)
   - Filter keywords (errors, warnings, specific terms)
3. Fetch the logs:
```bash
bun run Tools/Containers.ts logs --namespace <namespace> --pod <pod-name> [--container <container>] [--tail <lines>] [--since <duration>]
```
4. If analyzing for issues, scan for common patterns:
   - Error messages
   - Stack traces
   - Connection failures
   - Resource exhaustion
5. Present logs with context and any identified issues

---

## Examples

**Example 1: View recent logs for a pod**
```
User: "Show me the home-assistant logs"

Process:
1. Parse pod name pattern: home-assistant
2. Run: bun run Tools/Containers.ts list --namespace home-automation --filter home-assistant
3. Run: bun run Tools/Containers.ts logs --namespace home-automation --pod home-assistant-8d7f6c5b4-xm2kl --tail 50
4. Return: Formatted log output

Output:
Logs for home-assistant-8d7f6c5b4-xm2kl (last 50 lines):

2024-01-15 14:32:01 INFO (MainThread) [homeassistant.core] Starting Home Assistant
2024-01-15 14:32:05 INFO (MainThread) [homeassistant.loader] Loading integrations...
2024-01-15 14:32:10 INFO (MainThread) [homeassistant.components.zha] ZHA starting up
2024-01-15 14:32:12 WARNING (MainThread) [homeassistant.components.mqtt] MQTT broker connection delayed
2024-01-15 14:32:15 INFO (MainThread) [homeassistant.components.mqtt] Connected to MQTT broker
2024-01-15 14:32:20 INFO (MainThread) [homeassistant.core] Home Assistant initialized in 19.5s
...

No errors detected in recent logs.
```

**Example 2: Debug a crashing container**
```
User: "Why does my zigbee2mqtt keep crashing?"

Process:
1. Parse pod name: zigbee2mqtt
2. Run: bun run Tools/Containers.ts list --namespace home-automation --filter zigbee2mqtt
3. Run: bun run Tools/Containers.ts logs --namespace home-automation --pod zigbee2mqtt-6f7d8c9b5-jk2ml --previous --tail 100
4. Analyze for crash indicators
5. Return: Logs with analysis

Output:
Logs for zigbee2mqtt-6f7d8c9b5-jk2ml (previous container - crashed):

2024-01-15 14:25:01 Zigbee2MQTT:info Starting Zigbee2MQTT version 1.34.0
2024-01-15 14:25:02 Zigbee2MQTT:info Connecting to MQTT server at mqtt://mosquitto:1883
2024-01-15 14:25:03 Zigbee2MQTT:info Connected to MQTT server
2024-01-15 14:25:04 Zigbee2MQTT:info Connecting to Zigbee adapter at /dev/ttyUSB0
2024-01-15 14:25:05 Zigbee2MQTT:error Error while opening serialport 'Error: Error: No such file or directory, cannot open /dev/ttyUSB0'
2024-01-15 14:25:05 Zigbee2MQTT:error Failed to start zigbee
2024-01-15 14:25:05 Zigbee2MQTT:error Exiting...

ISSUE IDENTIFIED:
- Error: Cannot open /dev/ttyUSB0
- Cause: Zigbee USB adapter not accessible to container
- Recommendation:
  1. Verify USB device is connected to the host
  2. Check if device path changed (try /dev/ttyACM0)
  3. Ensure securityContext.privileged=true or proper device mounting
```

**Example 3: Filter logs for specific errors**
```
User: "Show me any errors in the nginx-ingress logs from the last hour"

Process:
1. Parse: pod=nginx-ingress, filter=error, time=1h
2. Run: bun run Tools/Containers.ts list --namespace ingress-nginx --filter nginx
3. Run: bun run Tools/Containers.ts logs --namespace ingress-nginx --pod nginx-ingress-controller-7c9d8b6a5-mk2jl --since 1h --grep "error|Error|ERROR"
4. Return: Filtered error logs

Output:
Errors in nginx-ingress-controller logs (last hour):

2024-01-15 13:45:22 [error] 1234#1234: *5678 upstream timed out (110: Operation timed out) while connecting to upstream, client: 192.168.1.50, server: grafana.home.lab, request: "GET /api/dashboards HTTP/2.0", upstream: "http://10.42.0.50:3000/api/dashboards"
2024-01-15 14:02:15 [error] 1234#1234: *6789 upstream timed out (110: Operation timed out) while connecting to upstream, client: 192.168.1.50, server: grafana.home.lab

Error Summary:
- 2 upstream timeout errors to grafana service
- All errors related to grafana.home.lab backend
- Recommendation: Check grafana pod health and resource limits
```

**Example 4: Multi-container pod logs**
```
User: "Show logs from the istio sidecar in my app pod"

Process:
1. Parse: pod=my-app, container=istio-proxy
2. Run: bun run Tools/Containers.ts logs --namespace default --pod my-app-5d6f7c8b9-xk2ml --container istio-proxy --tail 30
3. Return: Sidecar-specific logs

Output:
Logs for my-app-5d6f7c8b9-xk2ml (container: istio-proxy):

2024-01-15 14:30:00.123Z info Envoy proxy starting...
2024-01-15 14:30:01.456Z info Cluster manager initialized
2024-01-15 14:30:02.789Z warning Upstream connection refused to reviews:9080
2024-01-15 14:30:03.012Z info Retry succeeded for reviews:9080
...
```

---

## Error Handling

- Pod not found -> List pods in namespace with similar names, suggest correct pod name
- Container not found -> List containers in pod, ask user to specify which container
- No logs available -> Pod may have just started, suggest waiting or checking events
- Previous logs requested but none exist -> First container instance, no crash history
- Log stream interrupted -> Reconnect or suggest using --tail with specific line count

---

## Notes

- Use `--previous` flag to get logs from a crashed/restarted container
- `--since` accepts formats like: 1h, 30m, 2h30m, or RFC3339 timestamps
- For pods with init containers, specify container name to see init logs
- Large log volumes can be filtered with grep patterns
- Consider log aggregation (Loki, ELK) for persistent log storage beyond pod lifecycle
- CrashLoopBackOff pods cycle quickly - use `--previous` to catch crash logs
- Sidecar containers (istio-proxy, linkerd-proxy) have separate log streams
