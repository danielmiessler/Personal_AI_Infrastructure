# TargetHealth Workflow

**Purpose:** Check the health status of Prometheus scrape targets to identify what's being monitored and detect collection failures.

**Triggers:** target health, scrape targets, what's being monitored, is prometheus scraping, target status, what's up, what's down, scrape failures, collection status, endpoint health

---

## Steps

1. **Parse the user's request** to identify:
   - Whether they want all targets or filtered by health (up/down)
   - Whether they want a specific job's targets
   - Output format preference

2. **Determine filter parameters:**
   - If user asks "what's down" or "scrape failures" - filter by health=down
   - If user asks "healthy targets" or "what's working" - filter by health=up
   - If user mentions a specific job name - filter by that job
   - If no filter - show all targets with summary

3. **Execute the targets command:**

   List all targets:
   ```bash
   bun run Tools/targets.ts
   ```

   Filter by health status:
   ```bash
   bun run Tools/targets.ts --health up
   bun run Tools/targets.ts --health down
   ```

   Filter by job name:
   ```bash
   bun run Tools/targets.ts --job node-exporter
   bun run Tools/targets.ts --job prometheus
   ```

   Combine filters:
   ```bash
   bun run Tools/targets.ts --job kubernetes-pods --health down
   ```

   JSON output:
   ```bash
   bun run Tools/targets.ts --format json
   ```

4. **Interpret and present results:**
   - Highlight any DOWN targets prominently
   - Show last successful scrape time
   - Include error messages for failed targets
   - Summarize health by job

---

## Target Health States

| Health | Meaning |
|--------|---------|
| `up` | Target is reachable and responding to scrapes. Metrics are being collected. |
| `down` | Target is unreachable or returning errors. Metrics are NOT being collected. |
| `unknown` | Target health hasn't been determined yet (new target or Prometheus restart). |

---

## Examples

**Example 1: Quick health overview**
```
User: "Are all my scrape targets healthy?"

Process:
1. Parse: User wants overall health status
2. Run: bun run Tools/targets.ts
3. Return: Summary like "15 targets total - 14 up, 1 down" with details on any DOWN targets
```

**Example 2: Find scrape failures**
```
User: "What targets are down?"

Process:
1. Parse: User wants failed targets only
2. Run: bun run Tools/targets.ts --health down
3. Return: List of DOWN targets with error messages and last successful scrape time
```

**Example 3: Check specific job**
```
User: "Is the node-exporter job healthy?"

Process:
1. Parse: Filter by job=node-exporter
2. Run: bun run Tools/targets.ts --job node-exporter
3. Return: All targets in node-exporter job with their health status
```

**Example 4: Healthy targets only**
```
User: "Show me what's currently being scraped successfully"

Process:
1. Parse: User wants UP targets
2. Run: bun run Tools/targets.ts --health up
3. Return: List of healthy targets grouped by job
```

**Example 5: Investigate specific job failures**
```
User: "Why is the kubernetes-pods job failing?"

Process:
1. Parse: User wants down targets in kubernetes-pods job
2. Run: bun run Tools/targets.ts --job kubernetes-pods --health down
3. Return: Down targets with their error messages (e.g., "connection refused", "timeout")
```

**Example 6: JSON for automation**
```
User: "Get target health in JSON for my monitoring script"

Process:
1. Parse: JSON output requested
2. Run: bun run Tools/targets.ts --format json
3. Return: Raw JSON array of target objects
```

**Example 7: Check after deployment**
```
User: "After deploying the new service, is Prometheus scraping it?"

Process:
1. Parse: User wants to verify new target is being scraped
2. Run: bun run Tools/targets.ts
3. Look for the new service in target list
4. Return: Whether target exists and its health status
```

---

## Understanding Target Output

The targets.ts tool returns:

| Field | Meaning |
|-------|---------|
| JOB | The scrape job name (from prometheus.yml) |
| INSTANCE | The target endpoint (host:port) |
| HEALTH | up/down/unknown |
| LAST SCRAPE | When metrics were last collected |
| [ERROR] | Error message if scrape failed (only shown for DOWN targets) |

---

## Common Error Messages

| Error | Likely Cause | Resolution |
|-------|--------------|------------|
| `connection refused` | Service not running or wrong port | Check if service is running, verify port number |
| `context deadline exceeded` / `timeout` | Network issue or slow response | Check network connectivity, increase scrape timeout |
| `no route to host` | Network unreachable | Check firewall rules, verify host is on network |
| `connection reset` | Service crashed during scrape | Check service logs for crashes |
| `401 Unauthorized` | Authentication required | Configure bearer token or basic auth in scrape config |
| `certificate verify failed` | TLS/SSL issue | Check certificates or set insecure_skip_verify |

---

## Error Handling

- **"No targets found"** - Either no scrape jobs are configured, or the filter is too restrictive. Run without filters to see all targets.
- **All targets down** - Prometheus itself may have network issues. Run `bun run Tools/health.ts` to check provider connectivity.
- **Job not found** - The job name may be misspelled. Run `bun run Tools/targets.ts` to list all jobs.
- **Connection refused to Prometheus** - Prometheus server may be down or unreachable.

---

## Follow-up Actions

After checking target health:

1. **Target is DOWN** - Investigate the error message:
   - Check if the service is running
   - Verify network connectivity
   - Check firewall rules
   - Review Prometheus scrape configuration

2. **New target not appearing** - Check:
   - Service discovery configuration
   - Label relabeling rules
   - Prometheus configuration reload

3. **Intermittent failures** - Use QueryMetrics workflow to check:
   ```bash
   bun run Tools/query.ts "up{job=\"job-name\"}" --start 1h --step 60
   ```

---

## Notes

- Targets are discovered via static config or service discovery (Kubernetes, Consul, etc.)
- A target being DOWN doesn't mean existing metrics disappear - they become stale
- "Last scrape" time helps identify when failures started
- Multiple instances under the same job are common (horizontal scaling)
- Prometheus scrapes targets at the configured `scrape_interval` (typically 15-60s)
