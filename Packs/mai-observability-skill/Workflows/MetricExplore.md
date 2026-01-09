# MetricExplore Workflow

**Purpose:** Discover available metrics and their labels to understand what data is being collected and how to query it.

**Triggers:** explore metrics, what metrics are available, list metrics, find metric, discover metrics, metric names, what can I query, available labels, label values, what labels does metric have

---

## Steps

1. **Parse the user's request** to identify:
   - Whether they want to list all metrics or search for specific ones
   - Whether they want label names or label values
   - Any pattern or filter they're looking for
   - Limit on results (for large metric stores)

2. **Determine the exploration approach:**
   - **List all metrics**: No filter, show available metric names
   - **Search metrics**: Use `--match` to filter by pattern
   - **Explore labels**: Get label values for a specific label name
   - **Understand a metric**: Combine metric listing with label discovery

3. **Execute the exploration commands:**

   List all metric names:
   ```bash
   bun run Tools/metrics.ts
   ```

   Search for metrics matching a pattern:
   ```bash
   bun run Tools/metrics.ts --match "http_*"
   bun run Tools/metrics.ts --match "node_*"
   bun run Tools/metrics.ts --match "*_total"
   ```

   Limit results:
   ```bash
   bun run Tools/metrics.ts --limit 50
   ```

   Get values for a specific label:
   ```bash
   bun run Tools/labels.ts job
   bun run Tools/labels.ts instance
   bun run Tools/labels.ts namespace
   ```

   Get label values filtered by metric:
   ```bash
   bun run Tools/labels.ts instance --match "node_cpu_seconds_total"
   bun run Tools/labels.ts method --match "http_requests_total"
   ```

4. **Present results helpfully:**
   - Group metrics by prefix/exporter when listing many
   - Explain common metric naming conventions
   - Suggest relevant queries based on discovered metrics

---

## Metric Naming Conventions

Understanding Prometheus metric naming helps with discovery:

| Prefix | Source | Examples |
|--------|--------|----------|
| `node_` | Node Exporter (Linux system metrics) | node_cpu_seconds_total, node_memory_MemFree_bytes |
| `container_` | cAdvisor (container metrics) | container_cpu_usage_seconds_total |
| `kube_` | kube-state-metrics | kube_pod_info, kube_deployment_status_replicas |
| `http_` | Application HTTP metrics | http_requests_total, http_request_duration_seconds |
| `process_` | Process metrics | process_cpu_seconds_total, process_resident_memory_bytes |
| `go_` | Go runtime metrics | go_goroutines, go_memstats_alloc_bytes |
| `prometheus_` | Prometheus itself | prometheus_tsdb_head_samples_appended_total |

| Suffix | Metric Type | Usage |
|--------|-------------|-------|
| `_total` | Counter | Always increasing, use rate() |
| `_count` | Counter | Number of observations |
| `_sum` | Counter | Sum of observed values |
| `_bucket` | Histogram | Use histogram_quantile() |
| `_bytes` | Gauge | Memory/disk measurements |
| `_seconds` | Gauge/Counter | Time measurements |
| `_info` | Gauge | Metadata (always value 1) |

---

## Examples

**Example 1: Discover all available metrics**
```
User: "What metrics are available?"

Process:
1. Parse: User wants full metric list
2. Run: bun run Tools/metrics.ts --limit 100
3. Return: Grouped list of metrics with brief categorization
```

**Example 2: Find CPU-related metrics**
```
User: "What CPU metrics can I query?"

Process:
1. Parse: User wants metrics related to CPU
2. Run: bun run Tools/metrics.ts --match "*cpu*"
3. Return: All CPU-related metrics (node_cpu, container_cpu, process_cpu, etc.)
```

**Example 3: Find HTTP metrics**
```
User: "What HTTP metrics are available?"

Process:
1. Parse: User wants HTTP/web metrics
2. Run: bun run Tools/metrics.ts --match "http_*"
3. Return: HTTP metrics with explanation of common ones (requests, duration, etc.)
```

**Example 4: Explore what jobs exist**
```
User: "What jobs are being monitored?"

Process:
1. Parse: User wants job label values
2. Run: bun run Tools/labels.ts job
3. Return: List of all job names being scraped
```

**Example 5: Find instances of a service**
```
User: "What instances are reporting for node-exporter?"

Process:
1. Parse: User wants instances for a specific job
2. Run: bun run Tools/labels.ts instance --match "node_cpu_seconds_total"
3. Return: List of instance addresses reporting node metrics
```

**Example 6: Explore a specific metric's labels**
```
User: "What labels does http_requests_total have?"

Process:
1. Parse: User wants to understand metric structure
2. Run: bun run Tools/query.ts "http_requests_total" --format json
3. Parse unique label keys from results
4. Return: Available labels (method, status, handler, etc.)
```

**Example 7: Find metrics from a specific exporter**
```
User: "What metrics does the node exporter provide?"

Process:
1. Parse: User wants node exporter metrics
2. Run: bun run Tools/metrics.ts --match "node_*" --limit 100
3. Return: Categorized list of node exporter metrics
```

**Example 8: Discover namespaces**
```
User: "What Kubernetes namespaces are being monitored?"

Process:
1. Parse: User wants namespace label values
2. Run: bun run Tools/labels.ts namespace
3. Return: List of all namespaces with metrics
```

**Example 9: Search with wildcard**
```
User: "Find all metrics ending with _total"

Process:
1. Parse: User wants counter metrics
2. Run: bun run Tools/metrics.ts --match "*_total"
3. Return: All counter-type metrics
```

**Example 10: Combined exploration**
```
User: "Help me understand what's being monitored"

Process:
1. Parse: User wants comprehensive overview
2. Run in sequence:
   - bun run Tools/metrics.ts --limit 20 (sample of metrics)
   - bun run Tools/labels.ts job (what's being scraped)
   - bun run Tools/targets.ts (target count)
3. Return: Overview of monitoring coverage with metric categories and job list
```

---

## Common Labels

Standard labels you'll find across many metrics:

| Label | Meaning | Example Values |
|-------|---------|----------------|
| `job` | Scrape job name | prometheus, node-exporter, kube-state-metrics |
| `instance` | Target endpoint | 192.168.1.10:9090, localhost:9100 |
| `namespace` | Kubernetes namespace | default, monitoring, production |
| `pod` | Kubernetes pod name | api-server-abc123 |
| `container` | Container name | nginx, api, sidecar |
| `node` | Kubernetes node | worker-1, master-0 |
| `service` | Service name | api-gateway, user-service |
| `method` | HTTP method | GET, POST, PUT |
| `status` | HTTP status code | 200, 404, 500 |
| `handler` / `path` | HTTP endpoint | /api/users, /health |

---

## Error Handling

- **"No metrics found"** - The match pattern may be too restrictive, or no metrics exist. Try broader patterns or no filter.
- **Too many metrics** - Use `--limit` to cap results, or use more specific `--match` patterns.
- **Label not found** - The label name may not exist. Common labels: job, instance, namespace, pod. Use QueryMetrics to see what labels a specific metric has.
- **Empty label values** - The label exists but has no values matching the optional metric filter.
- **Connection error** - Check provider health with `bun run Tools/health.ts`.

---

## Building Queries from Exploration

Once you've discovered metrics and labels, build queries:

1. **Found metric**: `http_requests_total`
2. **Found labels**: job, instance, method, status, handler
3. **Found job values**: api-gateway, auth-service
4. **Found status values**: 200, 201, 400, 404, 500

Build targeted queries:
```promql
# All requests
http_requests_total

# Requests for specific service
http_requests_total{job="api-gateway"}

# Error requests only
http_requests_total{status=~"5.."}

# Specific endpoint errors
http_requests_total{handler="/api/users", status=~"5.."}

# Rate of requests
rate(http_requests_total[5m])
```

---

## Notes

- Large metric stores may have thousands of metrics - always use `--limit` or `--match` for initial exploration
- Metric names are case-sensitive
- The `--match` parameter supports glob patterns (*, ?) not regex
- Label values can change over time as instances come and go
- Some labels are added by Prometheus (job, instance) while others come from the exporter
- `_info` metrics are useful for joining metadata but always have value 1
