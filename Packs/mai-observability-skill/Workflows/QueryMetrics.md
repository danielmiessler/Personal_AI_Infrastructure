# QueryMetrics Workflow

**Purpose:** Execute PromQL queries to retrieve instant or time-series metric data from Prometheus.

**Triggers:** query metrics, run promql, check metric value, get metric data, prometheus query, metric query, what is the value of, show me metrics

---

## Steps

1. **Parse the user's request** to identify:
   - The PromQL query expression (required)
   - Whether they want instant (point-in-time) or range (time-series) data
   - Time parameters: specific time, duration lookback, or time range
   - Desired output format (table for readability, JSON for processing)

2. **Determine query type:**
   - **Instant query**: User wants current value or value at a specific time
   - **Range query**: User wants data over a time period (requires `--start` and `--step`)

3. **Execute the appropriate query:**

   For instant queries:
   ```bash
   bun run Tools/query.ts "<promql_expression>"
   ```

   For instant query at specific time:
   ```bash
   bun run Tools/query.ts "<promql_expression>" --time "2024-01-15T10:00:00Z"
   ```

   For range queries (last N hours/minutes/days):
   ```bash
   bun run Tools/query.ts "<promql_expression>" --start <duration> --step <seconds>
   ```

   For JSON output:
   ```bash
   bun run Tools/query.ts "<promql_expression>" --format json
   ```

4. **Interpret and present results:**
   - For vector results: Show metric labels and current values
   - For matrix results: Show time series with timestamps
   - For scalar/string: Show the single value
   - Highlight any anomalies or notable values

---

## Duration Format

The `--start` parameter accepts these formats:
- `5m` - 5 minutes ago
- `1h` - 1 hour ago
- `6h` - 6 hours ago
- `1d` - 1 day ago
- `7d` - 7 days ago
- ISO 8601 timestamp: `2024-01-15T10:00:00Z`

The `--step` parameter is in seconds:
- `15` - 15-second resolution (fine-grained)
- `60` - 1-minute resolution (standard)
- `300` - 5-minute resolution (coarse)
- `3600` - 1-hour resolution (for long ranges)

**Rule of thumb**: For range queries, use step = total_duration / 100 to get ~100 data points.

---

## Examples

**Example 1: Current CPU usage**
```
User: "What's the current CPU usage?"

Process:
1. Parse: User wants instant CPU metric
2. Construct query for CPU usage (common metric names: node_cpu_seconds_total, process_cpu_seconds_total)
3. Run: bun run Tools/query.ts "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
4. Return: Current CPU usage percentage per instance
```

**Example 2: Memory usage over last hour**
```
User: "Show me memory usage for the last hour"

Process:
1. Parse: User wants range query, 1 hour lookback
2. Calculate step: 3600s / 100 = 36s, round to 60s
3. Run: bun run Tools/query.ts "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100" --start 1h --step 60
4. Return: Time series of memory availability percentage
```

**Example 3: Specific metric value**
```
User: "What's the value of http_requests_total for the api service?"

Process:
1. Parse: Specific metric with label filter
2. Run: bun run Tools/query.ts "http_requests_total{service=\"api\"}"
3. Return: Current request count per endpoint/method
```

**Example 4: Rate calculation over time**
```
User: "Show me the request rate for the last 6 hours"

Process:
1. Parse: Rate calculation, 6 hour range
2. Calculate step: 21600s / 100 = 216s, round to 300s (5min)
3. Run: bun run Tools/query.ts "rate(http_requests_total[5m])" --start 6h --step 300
4. Return: Requests per second over time
```

**Example 5: JSON output for further processing**
```
User: "Get the disk usage in JSON format"

Process:
1. Parse: Disk metric, JSON output requested
2. Run: bun run Tools/query.ts "node_filesystem_avail_bytes / node_filesystem_size_bytes * 100" --format json
3. Return: Raw JSON response for processing
```

**Example 6: Aggregated metrics**
```
User: "What's the average response time across all services?"

Process:
1. Parse: Aggregation query for latency
2. Run: bun run Tools/query.ts "avg(rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))"
3. Return: Average response time in seconds
```

---

## Error Handling

- **"No data" or empty result** - The metric may not exist or the label filters are too restrictive. Suggest using MetricExplore workflow to discover available metrics.
- **"Parse error" or "invalid expression"** - PromQL syntax error. Check quotes, brackets, and function names. Common issues: unescaped quotes in label values, missing closing brackets.
- **Connection refused / timeout** - Prometheus may be down. Run `bun run Tools/health.ts` to check provider status.
- **"vector cannot contain metrics with the same labelset"** - Aggregation needed. Add `by()` or `without()` clause to distinguish series.
- **Range query returns single point** - Step value may be larger than the time range. Reduce step size.

---

## Common PromQL Patterns

**CPU Usage (percentage):**
```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Memory Usage (percentage):**
```promql
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

**Request Rate:**
```promql
rate(http_requests_total[5m])
```

**Error Rate:**
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

**P95 Latency (histogram):**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Disk Usage:**
```promql
(1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100
```

---

## Notes

- Always use `rate()` or `increase()` for counter metrics to get meaningful values
- The `[5m]` range in rate calculations should match or exceed your scrape interval times 4
- For high-cardinality metrics, add label filters to reduce result size
- When comparing metrics, ensure they have compatible label sets
