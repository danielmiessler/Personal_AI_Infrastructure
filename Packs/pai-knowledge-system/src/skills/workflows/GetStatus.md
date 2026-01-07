# Get Status Workflow

**Objective:** Check the operational status of the Graphiti knowledge graph, server health, and database connectivity.

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification GetStatus PaiKnowledgeSystem
```

**Output to user:**
```
Running the **GetStatus** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Check Server Health

**Verify Graphiti MCP server is running:**

```bash
# Check if server responds
curl -s http://localhost:8000/health
```

**Expected response:**
```json
{"status": "healthy"}
```

**If server is not reachable:**
```bash
# Check if container is running (using pack status script)
bash src/server/status.sh

# Or check container logs
bash src/server/logs.sh | head -50
```

---

## Step 3: Call MCP Status Tool

**Get detailed status from knowledge graph:**

```typescript
// Use the get_status tool
get_status({})
```

**This returns:**
- Server connection status
- Database connectivity (FalkorDB/Neo4j)
- LLM provider configuration
- Basic graph statistics (if available)

---

## Step 4: Present Status Report

**Format status information for user:**

```markdown
📊 **Knowledge Graph Status Report**

---

**🖥️ Server Status**

**MCP Server:** [Status]
- Endpoint: http://localhost:8000/mcp/
- Health: [✓ Connected / ✗ Disconnected]
- Response Time: [X]ms

**Container Status:**
- Name: graphiti-knowledge-graph-mcp
- State: [running / stopped / exited]
- Uptime: [X hours / Y days]
- Restart Count: [N]

---

**💾 Database Status**

**Backend:** [FalkorDB / Neo4j]
- Connection: [✓ Connected / ✗ Disconnected]
- URI: [redis://localhost:6379 / bolt://localhost:7687]
- Web UI: [http://localhost:3000 / http://localhost:7474]

---

**🤖 LLM Configuration**

**Provider:** [OpenAI / Anthropic / Gemini / Groq]
- Model: [gpt-4o-mini / gpt-4o / etc.]
- API Key: [✓ Configured / ✗ Missing]
- Embedder: [openai / voyage / sentence-transformers]

---

**📈 Graph Statistics**

**Total Entities:** [X]
- By Type:
  - Preferences: [N]
  - Procedures: [N]
  - Locations: [N]
  - Events: [N]
  - Organizations: [N]
  - Documents: [N]

**Total Episodes:** [Y]
- Total Facts/Edges: [Z]

**Knowledge Graph Size:** [Approximate storage used]

**Most Recent Activity:**
- Last Episode: [Date/Time]
- Last Episode Name: [Name]

---

**⚙️ Configuration**

**Group ID:** [main / custom]
- Semaphore Limit: [N] (concurrent processing)
- Telemetry: [enabled / disabled]
- Timezone: [configured timezone]

---

**🔧 System Resources**

**Memory Usage:**
- Container: [X] / [Y] GB
- Database: [A] / [B] GB

**CPU Usage:** [X]%

**Disk Usage:**
- Graph data: [X] MB
- Logs: [Y] MB

---

**✅ Health Summary**

Overall Status: [🟢 Healthy / 🟡 Warnings / 🔴 Issues]

[Additional notes or recommendations]
```

---

## Health Indicators

**🟢 Healthy Status:**
- Server responding to health checks
- Database connected and operational
- LLM provider configured
- No errors in logs
- Recent successful episode additions

**🟡 Warning Status:**
- Server running but slow response times
- High memory or CPU usage
- API key configured but rate limits low
- Recent episode failures
- High semaphore limit for API tier

**🔴 Critical Status:**
- Server not responding
- Database disconnected
- Missing or invalid API keys
- Container stopped or crashed
- No recent successful operations

---

## Troubleshooting by Status

**If Server Disconnected:**

```bash
# Start the server
cd /path/to/podman-graphiti-knowledge-graph-mcp
./run.sh

# Or if using podman-compose
podman-compose up -d

# Verify startup
curl http://localhost:8000/health
```

**If Database Disconnected:**

```bash
# Check database container
podman ps | grep falkordb  # or neo4j

# Check database logs
podman logs falkordb

# Restart database
podman restart falkordb

# Then restart MCP server
podman restart graphiti-knowledge-graph-mcp
```

**If API Key Issues:**

```bash
# Check .env file
cat ~/.claude/.env | grep API_KEY

# Verify API key is valid
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $PAI_KNOWLEDGE_OPENAI_API_KEY"

# Update .env if needed
nano ~/.claude/.env

# Restart container to pick up changes
podman restart graphiti-knowledge-graph-mcp
```

**If High Resource Usage:**

```bash
# Check container stats
podman stats graphiti-knowledge-graph-mcp

# Reduce concurrency
# Edit .env: SEMAPHORE_LIMIT=5

# Restart to apply
podman restart graphiti-knowledge-graph-mcp
```

---

## Performance Metrics

**Track Over Time:**

```markdown
**Performance Trends:**

**Response Times:**
- Current: [X]ms
- Average (24h): [Y]ms
- Peak: [Z]ms

**Episode Throughput:**
- Last hour: [X] episodes
- Last 24h: [Y] episodes
- Last 7 days: [Z] episodes

**Error Rate:**
- Last hour: [X]%
- Last 24h: [Y]%
```

**Optimization Recommendations:**

Based on metrics, suggest:
- Adjust SEMAPHORE_LIMIT based on API tier
- Consider model upgrade if extraction quality is low
- Clean up old episodes if graph is too large
- Archive old knowledge to separate group_id

---

## Quick Health Commands

**One-Line Health Check:**
```bash
curl -s http://localhost:8000/health && echo "✓ Server healthy" || echo "✗ Server down"
```

**Container Status:**
```bash
podman ps --filter name=graphiti --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Recent Errors:**
```bash
podman logs --since 1h graphiti-knowledge-graph-mcp | grep -i error
```

**Database Connection Test:**
```bash
# FalkorDB (Redis)
redis-cli -h localhost -p 6379 ping

# Neo4j
cypher-shell -u neo4j -p demodemo "RETURN 1"
```

---

## Status Alert Conditions

**Alert User If:**

1. **Server down** - Critical, immediate attention needed
2. **Database disconnected** - Critical, check database container
3. **Missing API key** - Error, capture won't work
4. **High error rate (>10%)** - Warning, check logs
5. **No recent episodes** - Info, consider adding knowledge
6. **High resource usage (>90%)** - Warning, may need optimization
7. **Low concurrency for API tier** - Info, could increase throughput

**Actionable Recommendations:**

```markdown
**🎯 Recommended Actions:**

Based on current status:

1. [Most urgent action]
2. [Secondary action]
3. [Optimization suggestion]

**📚 Documentation:**
- [Relevant docs for any issues found]
```

---

## Integration with Other Workflows

**Before Other Workflows:**
- Always run GetStatus before BulkImport to ensure capacity
- Check before CaptureEpisode if server seems slow
- Verify before ClearGraph (destructive operation)

**After Troubleshooting:**
- Re-run GetStatus to verify fixes
- Test with simple CaptureEpisode
- Check GetRecent to confirm operations work

---

**Related Workflows:**
- All other workflows - Run GetStatus first if experiencing issues
- `CaptureEpisode.md` - Test knowledge capture after troubleshooting
- `ClearGraph.md` - Check status before destructive operations
