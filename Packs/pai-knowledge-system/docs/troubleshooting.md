# Troubleshooting Guide

This guide helps you fix common issues with the PAI Knowledge System. Problems are organized by symptom with step-by-step solutions.

## Quick Diagnostics

Before diving into specific problems, run these checks:

### 1. Check if Services are Running

```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/status.ts
```

Expected output:
```
PAI Knowledge System Status:

Containers:
  pai-knowledge-graph-mcp: running
  pai-knowledge-falkordb: running

MCP Server: http://localhost:8000/sse
  Status: healthy
```

### 2. Check Logs

```bash
bun run src/server/logs.ts
```

Look for errors (lines with ERROR or WARN).

### 3. Test Connectivity

```bash
curl http://localhost:8000/sse -H "Accept: text/event-stream"
```

Should see some response about the endpoint.

## Common Problems

### "Cannot connect to server" or "Connection refused"

**Symptom:** Commands fail with connection errors

**Possible Causes:**
1. Server not running
2. Wrong port
3. Firewall blocking connection

**Solutions:**

**Check if server is running:**
```bash
podman ps | grep pai-knowledge
```

If nothing shows up, the server isn't running.

**Start the server:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/start.ts
```

**Check if port 8000 is in use:**
```bash
lsof -i :8000
```

If another service is using port 8000, you need to either stop that service or change the knowledge system port.

**To change the port:**
Edit `src/server/run.ts` and change the port number, then restart.

### "API key not configured" or "Invalid API key"

**Symptom:** Error messages about API keys

**Check your configuration:**
```bash
cat config/.env | grep PAI_KNOWLEDGE_OPENAI_API_KEY
```

**If the key is missing or wrong:**

1. Edit the config file:
```bash
nano config/.env
```

2. Add or fix your API key:
```
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-your-actual-key-here
```

3. Save (Ctrl+O, Enter, Ctrl+X)

4. Restart the server:
```bash
bun run src/server/stop.ts
bun run src/server/start.ts
```

**Verify your key has credits:**
Visit https://platform.openai.com/usage to check your API usage and credits.

### "No entities extracted" or Poor Extraction Quality

**Symptom:** System captures knowledge but extracts no or few entities

**Causes:**
1. Content too short or vague
2. Model not powerful enough
3. Content lacks clear concepts

**Solutions:**

**Add more detail:**

Instead of:
```
Remember Docker
```

Try:
```
Remember that Docker is a container runtime that requires a daemon
process running as root, which manages container lifecycles and images.
```

**Use a better model:**

Edit `config/.env`:
```bash
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o
```

Note: gpt-4o costs more but extracts entities better than gpt-4o-mini.

Restart the server after changing.

**Be explicit about relationships:**

Instead of:
```
Remember Podman and Docker
```

Try:
```
Remember that Podman is an alternative to Docker, designed to be
daemonless and rootless for better security.
```

### Container Won't Start

**Symptom:** Server fails to start, containers exit immediately

**Check Docker/Podman is running:**
```bash
podman ps
# or
docker ps
```

**If "Cannot connect to Podman socket":**

On macOS:
```bash
podman machine start
```

Wait 30 seconds, then try starting the server again.

**Check logs for specific errors:**
```bash
bun run src/server/logs.ts
```

**Common specific issues:**

**Error: "port already in use"**
Another service is using port 8000 or 6379.

Find what's using the port:
```bash
lsof -i :8000
lsof -i :6379
```

Kill the process or change the knowledge system ports.

**Error: "image not found"**
The container image needs to be pulled:
```bash
podman pull falkordb/graphiti-knowledge-graph-mcp:latest
```

**Error: "network not found"**
Recreate the network:
```bash
podman network rm pai-knowledge-net
```
Then start the server again (it will recreate the network).

### Search Returns No Results

**Symptom:** Searches return empty or "No knowledge found"

**Check if knowledge has been captured:**
```bash
# In your AI assistant
Show me recent knowledge additions
```

If nothing recent, you need to capture knowledge first.

**Try a broader search:**

Instead of:
```
What do I know about Podman volume mounting syntax?
```

Try:
```
What do I know about Podman?
```

**Check you're searching the right group:**

If you've set a custom group ID, make sure searches use the same group.

Verify your group setting:
```bash
grep PAI_KNOWLEDGE_GROUP_ID config/.env
```

**Verify entities were extracted:**

Look at a recent capture - did it show "Entities extracted: 0"? If so, see the "No entities extracted" section above.

### "Rate limit exceeded" or API Errors

**Symptom:** Errors about too many requests or rate limits

**Immediate fix:**

Reduce concurrent requests in `config/.env`:
```bash
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=3
```

Lower number = fewer parallel requests.

Restart the server after changing.

**Permanent solution:**

Check your OpenAI tier at https://platform.openai.com/account/rate-limits

Adjust SEMAPHORE_LIMIT based on your tier:
- Free tier: 1-2
- Tier 1: 3-5
- Tier 2: 8
- Tier 3+: 10-15

**If you're hitting rate limits constantly:**
Consider upgrading your OpenAI tier or capturing knowledge less frequently.

### "SSE endpoint not responding"

**Symptom:** MCP connection fails, mentions SSE

**This is the MCP transport layer having issues.**

**Quick fix:**
1. Stop the server: `bun run src/server/stop.ts`
2. Wait 10 seconds
3. Start again: `bun run src/server/start.ts`
4. Restart your AI assistant (Claude Code, etc.)

**If that doesn't work:**

Check if the SSE endpoint responds at all:
```bash
curl -N -H "Accept: text/event-stream" http://localhost:8000/sse
```

Should see event-stream data.

**If curl fails:**
The MCP server isn't running properly. Check logs:
```bash
bun run src/server/logs.ts
```

Look for startup errors.

### Knowledge Not Syncing from History

**Symptom:** History captures aren't appearing in knowledge graph

**Check if the hook is installed:**
```bash
cat ~/.claude/settings.json | grep sync-history-to-knowledge
```

Should see a hook definition.

**If nothing shows:**
The hook isn't installed. Install it:
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/install.ts
```

**Manually trigger sync:**
```bash
bun run src/hooks/sync-history-to-knowledge.ts --verbose
```

This shows what's being synced (or why not).

**Check sync state:**
```bash
cat ~/.config/pai/history/.synced/sync-state.json
```

Shows what's already been synced.

**Force re-sync everything:**
```bash
rm ~/.config/pai/history/.synced/sync-state.json
bun run src/hooks/sync-history-to-knowledge.ts --all --verbose
```

### High API Costs

**Symptom:** Your OpenAI bill is higher than expected

**Check usage:**
https://platform.openai.com/usage

**Reduce costs:**

**1. Use cheaper model:**

In `config/.env`:
```bash
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o-mini
```
(gpt-4o-mini is 10x cheaper than gpt-4o)

**2. Capture less:**
Only capture truly valuable knowledge, not every conversation.

**3. Reduce concurrency:**
```bash
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=3
```

**4. Monitor usage:**
Check your API usage weekly to catch cost spikes early.

**Typical costs:**
- Light use: $0.50-1.00/month
- Moderate use: $1.00-3.00/month
- Heavy use: $3.00-10.00/month

Using gpt-4o-mini, not gpt-4o.

### FalkorDB Web UI Not Accessible

**Symptom:** Can't access http://localhost:3000

**Check if FalkorDB container is running:**
```bash
podman ps | grep falkordb
```

**If not running:**
```bash
bun run src/server/start.ts
```

**Check port 3000 isn't blocked:**
```bash
lsof -i :3000
```

**If another service uses port 3000:**
You'll need to change the FalkorDB web UI port in the container configuration.

**Try accessing the graph directly:**
```bash
podman exec pai-knowledge-falkordb redis-cli PING
```

Should respond "PONG".

### Memory or Performance Issues

**Symptom:** System is slow or running out of memory

**Check system resources:**
```bash
podman stats
```

Shows CPU and memory usage of containers.

**If memory usage is high:**

**Option 1: Restart containers**
```bash
bun run src/server/stop.ts
bun run src/server/start.ts
```

**Option 2: Clear old data**
If you have a lot of episodes you no longer need:
```
# In your AI assistant
Clear my knowledge graph
```

(Warning: This deletes everything!)

**Option 3: Add memory limits**
Edit container configuration to limit memory usage.

### "Initialization not complete" Warning

**Symptom:** MCP logs show "Received request before initialization was complete"

**Cause:** This is a known issue with the Graphiti MCP server - Claude Code sometimes sends requests before the SSE session fully initializes.

**Workaround:**
Restart your AI assistant (Claude Code). This resets the MCP connection.

**Tracking:**
This issue is tracked at: https://github.com/getzep/graphiti/issues/840

**Not a critical issue:**
This warning usually doesn't break functionality, but restarting helps if you see repeated failures.

### RediSearch Query Syntax Errors with Special Characters

**Symptom:** Search queries fail with syntax errors, especially when searching for content containing hyphens, at-signs, or other special characters. Error messages may include "QuerySyntaxError" or mention unexpected tokens.

**Root Cause:**

FalkorDB uses RediSearch for fulltext indexing, which interprets certain characters as Lucene query operators:

| Character | Lucene Interpretation |
|-----------|----------------------|
| `-` | Negation (NOT operator) |
| `+` | Required term (AND) |
| `@` | Field prefix |
| `#` | Tag field |
| `*` `?` | Wildcards |
| `"` | Phrase query |
| `( )` | Grouping |
| `{ }` `[ ]` | Range queries |
| `~` | Fuzzy/proximity |
| `:` | Field specifier |
| `\|` | OR operator |
| `&` | AND operator |
| `!` | NOT operator |
| `%` | Fuzzy threshold |
| `< > =` | Comparison operators |
| `$` | Variable reference |
| `/` | Regex delimiter |

**Example of the bug:**

When you search for `pai-threat-intel`:
- RediSearch interprets this as: `pai AND NOT threat AND NOT intel`
- This returns wrong results or a syntax error

**The Graphiti Bug:**

Graphiti's FalkorDB driver has a `sanitize()` method that replaces special characters with whitespace. However, this sanitization is **not applied to group_ids** in search queries. When you use a group_id like `my-knowledge-base`, the hyphen is passed directly to RediSearch and interpreted as negation.

**Related Issues:**
- [RediSearch #2628](https://github.com/RediSearch/RediSearch/issues/2628) - Can't search text with hyphens
- [RediSearch #4092](https://github.com/RediSearch/RediSearch/issues/4092) - Escaping filter values
- [Graphiti #815](https://github.com/getzep/graphiti/issues/815) - FalkorDB query syntax errors
- [Graphiti #1118](https://github.com/getzep/graphiti/pull/1118) - Fix forward slash handling

**Our Local Workaround:**

The PAI Knowledge System implements client-side sanitization in `src/server/lib/lucene.ts`:

1. **For group_ids:** Hyphens are converted to underscores before sending to Graphiti
   - `pai-threat-intel` → `pai_threat_intel`
   - This avoids the Graphiti bug where group_ids aren't escaped

2. **For search queries:** Special characters are escaped with backslashes
   - `user@domain` → `user\@domain`
   - `50%` → `50\%`

**Full list of escaped characters:**
```
+ - && || ! ( ) { } [ ] ^ " ~ * ? : \ / @ # $ % < > =
```

**If you encounter syntax errors:**

1. Check if your group_id contains special characters:
   ```bash
   grep PAI_KNOWLEDGE_GROUP_ID config/.env
   ```

2. Use underscores instead of hyphens in group_ids:
   - Bad: `my-knowledge-base`
   - Good: `my_knowledge_base`

3. The sanitization is automatic for MCP tool calls, but if you're calling Graphiti directly, ensure you sanitize inputs.

**Code reference:** `src/server/lib/lucene.ts:158-182` (sanitizeSearchQuery function)

## Diagnostic Commands Summary

Quick reference for troubleshooting:

```bash
# Check status
bun run src/server/status.ts

# View logs
bun run src/server/logs.ts

# Restart everything
bun run src/server/stop.ts && bun run src/server/start.ts

# Check configuration
cat config/.env

# Test MCP endpoint
curl http://localhost:8000/sse -H "Accept: text/event-stream"

# Check containers
podman ps | grep pai-knowledge

# Check ports
lsof -i :8000
lsof -i :6379
lsof -i :3000

# Manual sync test
bun run src/hooks/sync-history-to-knowledge.ts --dry-run --verbose

# View container logs directly
podman logs pai-knowledge-graph-mcp
podman logs pai-knowledge-falkordb
```

## Getting More Help

If these solutions don't work:

1. **Check the main README:**
   `/Users/seaton/.config/pai/Packs/pai-knowledge-system/README.md`

2. **Check installation guide:**
   `docs/installation.md`

3. **Review verification:**
   `/Users/seaton/.config/pai/Packs/pai-knowledge-system/VERIFY.md`

4. **Check Graphiti documentation:**
   https://help.getzep.com/graphiti

5. **Check FalkorDB documentation:**
   https://docs.falkordb.com/

## Still Stuck?

Create a diagnostic report:

```bash
cd ~/.config/pai/Packs/pai-knowledge-system

echo "=== System Status ===" > diagnostic.txt
bun run src/server/status.ts >> diagnostic.txt

echo "\n=== Configuration ===" >> diagnostic.txt
cat config/.env | grep -v API_KEY >> diagnostic.txt

echo "\n=== Recent Logs ===" >> diagnostic.txt
bun run src/server/logs.ts | tail -100 >> diagnostic.txt

echo "\n=== Container Info ===" >> diagnostic.txt
podman ps --all | grep pai-knowledge >> diagnostic.txt

echo "\n=== Port Status ===" >> diagnostic.txt
lsof -i :8000 >> diagnostic.txt
lsof -i :6379 >> diagnostic.txt

echo "Diagnostic report saved to diagnostic.txt"
```

Share `diagnostic.txt` when asking for help (remove any sensitive info first!).
