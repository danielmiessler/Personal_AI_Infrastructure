# Research Execution Logging

**Purpose:** Structured logging for research execution, enabling observability and debugging.

This reference document defines the logging schema and integration with PAI's observability system. Load this when implementing or debugging research logging.

---

## Logging Architecture

Research logging integrates with PAI's existing hook system:

```
Research Execution
       │
       ├─→ capture-all-events.ts (existing hook)
       │         │
       │         └─→ JSONL logs in ${PAI_DIR}/logs/
       │
       └─→ Research-specific metadata
                 │
                 └─→ Structured fields for research analytics
```

---

## Research Log Schema

### Base Event Structure

All research events extend the standard PAI event format:

```json
{
  "timestamp": "2025-12-07T10:30:00.000Z",
  "event_type": "research",
  "session_id": "sess_abc123",
  "agent_id": "perplexity-researcher-1",
  "research": {
    "topic": "quantum computing developments",
    "mode": "standard",
    "phase": "query|collect|synthesize|validate",
    "metadata": { ... }
  }
}
```

### Phase-Specific Metadata

#### Query Phase

```json
{
  "phase": "query",
  "metadata": {
    "query_text": "quantum computing breakthroughs 2024",
    "agent_type": "perplexity-researcher",
    "instance_id": 1,
    "query_index": 3,
    "total_queries": 9,
    "optimizations": ["recency_filter", "domain_specific"]
  }
}
```

#### Collection Phase

```json
{
  "phase": "collect",
  "metadata": {
    "agent_id": "perplexity-researcher-1",
    "duration_ms": 2340,
    "status": "success|timeout|error",
    "sources_found": 5,
    "content_length": 3420,
    "error_message": null
  }
}
```

#### Synthesis Phase

```json
{
  "phase": "synthesize",
  "metadata": {
    "agents_completed": 7,
    "agents_timeout": 2,
    "total_sources": 23,
    "findings_count": 12,
    "contradictions_found": 2,
    "synthesis_duration_ms": 1500
  }
}
```

#### Validation Phase

```json
{
  "phase": "validate",
  "metadata": {
    "gate_1_passed": true,
    "gate_2_passed": true,
    "gate_3_passed": false,
    "gate_3_issues": ["2 contradictions not documented"],
    "overall_status": "warnings",
    "validation_duration_ms": 800
  }
}
```

---

## Metrics Calculation

### Research Metrics (from logs)

Extract these metrics from structured logs:

| Metric | Calculation | Source Field |
|--------|-------------|--------------|
| Query Count | Count of query phase events | `phase: "query"` |
| Success Rate | `collect.success / total` | `collect.status` |
| Avg Response Time | Mean of `duration_ms` | `collect.duration_ms` |
| Timeout Rate | `collect.timeout / total` | `collect.status` |
| Source Density | `sources_found / agents` | `collect.sources_found` |
| Validation Pass Rate | Gates passed / total | `validate.gate_*_passed` |

### Aggregated Session Metrics

```json
{
  "session_summary": {
    "topic": "quantum computing",
    "mode": "standard",
    "total_agents": 9,
    "agents_succeeded": 7,
    "agents_timeout": 2,
    "total_queries": 14,
    "total_sources": 23,
    "unique_sources": 18,
    "findings": 12,
    "high_confidence": 5,
    "medium_confidence": 5,
    "low_confidence": 2,
    "contradictions": 2,
    "validation_status": "warnings",
    "total_duration_ms": 34500
  }
}
```

---

## Integration with Observability Dashboard

### Dashboard Panels

These log fields enable observability dashboard features:

1. **Research Timeline** - Shows query → collect → synthesize → validate phases
2. **Agent Performance** - Compare response times across agent types
3. **Source Analytics** - Track source diversity and quality over time
4. **Validation Trends** - Monitor gate pass rates

### Query Examples

```sql
-- Average research completion time by mode
SELECT mode, AVG(total_duration_ms)
FROM research_sessions
GROUP BY mode;

-- Agent timeout rates
SELECT agent_type,
       SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) / COUNT(*) as timeout_rate
FROM research_collect_events
GROUP BY agent_type;

-- Validation failure patterns
SELECT gate_3_issues, COUNT(*)
FROM research_validate_events
WHERE gate_3_passed = false
GROUP BY gate_3_issues;
```

---

## Logging Implementation

### Hook Integration

Research logging hooks into the existing `capture-all-events.ts`:

```typescript
// In research workflow, emit structured events:
function logResearchEvent(phase: string, metadata: object) {
  // This integrates with existing capture-all-events.ts
  // Events are written to ${PAI_DIR}/logs/research-YYYY-MM.jsonl
  const event = {
    timestamp: new Date().toISOString(),
    event_type: 'research',
    session_id: process.env.SESSION_ID,
    research: {
      topic: currentTopic,
      mode: currentMode,
      phase,
      metadata
    }
  };

  // Write to research-specific log
  appendToLog('research', event);
}
```

### Log File Locations

```
${PAI_DIR}/logs/
├── events-YYYY-MM.jsonl      # All events (existing)
├── research-YYYY-MM.jsonl    # Research-specific events
└── research-metrics.json     # Aggregated metrics cache
```

---

## Debugging with Logs

### Common Debug Queries

**Find slow agents:**
```bash
cat research-*.jsonl | jq 'select(.research.phase == "collect" and .research.metadata.duration_ms > 5000)'
```

**Find validation failures:**
```bash
cat research-*.jsonl | jq 'select(.research.phase == "validate" and .research.metadata.overall_status == "failed")'
```

**Track specific research session:**
```bash
cat research-*.jsonl | jq 'select(.session_id == "sess_abc123")'
```

### Log Retention

- **Active logs:** 30 days in `${PAI_DIR}/logs/`
- **Archived logs:** Compressed monthly, stored in `${PAI_DIR}/logs/archive/`
- **Metrics cache:** Updated hourly, kept indefinitely

---

## Privacy & Security

### Data Handling

- **Topic Sanitization:** Remove PII from topic strings before logging
- **Source URLs:** Log domain only, not full URLs with query params
- **Content:** Never log raw research content, only metadata
- **Retention:** Follow PAI's data retention policies

### Sensitive Research

For private research topics:
```json
{
  "research": {
    "topic": "[REDACTED]",
    "topic_hash": "sha256:abc123...",
    "private": true
  }
}
```

---

## Quick Reference: Log Events

| Event | Phase | When Emitted |
|-------|-------|--------------|
| `research.start` | - | Research request detected |
| `research.query` | query | Each agent query launched |
| `research.collect` | collect | Agent returns results |
| `research.timeout` | collect | Agent times out |
| `research.synthesize` | synthesize | Synthesis begins |
| `research.validate` | validate | Each gate checked |
| `research.complete` | - | Final output delivered |

---

*This logging system implements TAC Tactic #5: Add Feedback - comprehensive observability for research execution and quality tracking.*
