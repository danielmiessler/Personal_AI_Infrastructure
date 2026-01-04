# Quick Reference Card

One-page reference for the PAI Knowledge System.

## Natural Language Commands

### Capture Knowledge
```
"Remember that [your knowledge]"
"Store this: [information]"
"Add to my knowledge: [details]"
"Save this: [content]"
```

### Search Knowledge
```
"What do I know about [topic]?"
"Search my knowledge for [subject]"
"Find information about [concept]"
"What have I learned about [theme]?"
```

### Filter by Entity Type
```
"Find my procedures about [topic]"
"Search for learnings about [subject]"
"Show research about [concept]"
"What decisions have I made about [theme]?"
"Find my preferences for [setting]"
```

### Find Connections
```
"How are [X] and [Y] related?"
"What's the connection between [A] and [B]?"
"Show me relationships with [topic]"
```

### Review Recent
```
"What did I learn recently?"
"Show me recent knowledge"
"Latest additions about [topic]"
```

### System Status
```
"Knowledge graph status"
"Show me knowledge stats"
"Is the system healthy?"
```

## Server Management

### Status
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/status.ts
```

### Start
```bash
bun run src/server/start.ts
```

### Stop
```bash
bun run src/server/stop.ts
```

### Logs
```bash
bun run src/server/logs.ts
```

### Restart
```bash
bun run src/server/stop.ts && bun run src/server/start.ts
```

## Configuration File

Location: `config/.env`

Key settings:
```bash
# Required: Your API key
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-your-key-here

# Model selection (cost vs quality)
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o-mini

# Concurrency (lower = fewer rate limits)
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=10

# Knowledge graph group
PAI_KNOWLEDGE_GROUP_ID=main
```

## Entity Types

The system automatically extracts:

**Core Types:**
- **Person** - Individual people
- **Organization** - Companies, teams
- **Location** - Places, servers
- **Concept** - Ideas, technologies
- **Procedure** - How-to guides
- **Preference** - Your choices
- **Requirement** - Specifications
- **Event** - Occurrences
- **Document** - Files, articles

**History-Derived Types (from PAI History sync):**
- **Learning** - Knowledge from learning sessions
- **Research** - Findings from research
- **Decision** - Architectural/strategic choices
- **Feature** - Feature implementations

Use these types to filter searches: "Find my procedures about X"

## Knowledge Flow

```
1. You say "remember this"
       ↓
2. PAI Skill captures intent
       ↓
3. MCP Server receives content
       ↓
4. LLM extracts entities (gpt-4o-mini)
       ↓
5. LLM maps relationships
       ↓
6. Embedding model creates vectors (text-embedding-3-small)
       ↓
7. Stored in FalkorDB graph
```

## LLM Roles

| Stage | Model | Purpose |
|-------|-------|---------|
| **Capture** | gpt-4o-mini | Entity extraction, relationship mapping |
| **Embeddings** | text-embedding-3-small | Convert text to searchable vectors |
| **Search** | text-embedding-3-small | Convert query to vector for matching |

**Cost per operation:**
- Capture: ~$0.01 (gpt-4o-mini) or ~$0.03 (gpt-4o)
- Search: ~$0.0001

## Search Caching

- **Search results cached for 5 minutes** (speeds up repeated queries)
- **Writes are never cached** (always save to database)
- **Cache clears automatically** after TTL expires

**If new knowledge doesn't appear in search:**
- Wait 5 minutes for cache refresh, **or**
- Ask a slightly different question

---

## Troubleshooting Checklist

### Issue: Can't connect
```bash
# Check if running
bun run src/server/status.ts

# Start if needed
bun run src/server/start.ts

# Check endpoint
curl http://localhost:8000/sse
```

### Issue: Poor extraction
- Add more detail to your captures
- Use explicit relationships
- Consider upgrading to gpt-4o model
- Provide 50+ words of context

### Issue: No search results
- Try broader search terms
- Check if knowledge was captured
- Verify you're in the right group
- Review recent additions

### Issue: Rate limits
- Reduce SEMAPHORE_LIMIT in config
- Use gpt-4o-mini instead of gpt-4o
- Check your API tier

## Best Practices

1. **Be Specific**
   - Bad: "Remember Docker"
   - Good: "Remember that Docker requires a daemon process running as root"

2. **Add Context**
   - Bad: "Remember that config"
   - Good: "Remember my VS Code config: 2-space tabs, auto-save enabled"

3. **State Relationships**
   - Bad: "Remember Podman and Docker"
   - Good: "Remember that Podman is an alternative to Docker"

4. **Review Regularly**
   - Weekly: "What did I learn this week?"
   - Monthly: Review knowledge graph status

5. **Capture Immediately**
   - Don't wait to remember details
   - Capture while context is fresh

## Costs

Typical monthly costs (gpt-4o-mini):
- Light use: $0.50-1.00
- Moderate use: $1.00-3.00
- Heavy use: $3.00-10.00

Per operation:
- Capture: ~$0.01
- Search: ~$0.0001
- Embedding: ~$0.0001

## URLs

- MCP Server: http://localhost:8000/sse
- FalkorDB UI: http://localhost:3000
- OpenAI Usage: https://platform.openai.com/usage

## File Locations

```
~/.config/pai/Packs/pai-knowledge-system/
├── config/.env              # Configuration
├── src/server/              # Server scripts
│   ├── run.ts              # Start everything
│   ├── start.ts            # Start containers
│   ├── stop.ts             # Stop containers
│   ├── status.ts           # Check status
│   └── logs.ts             # View logs
├── src/skills/              # PAI skill files
│   ├── SKILL.md            # Skill definition
│   └── workflows/*.md      # Workflow definitions
├── src/hooks/               # Integration hooks
└── docs/                    # User documentation
    ├── README.md           # Overview
    ├── installation.md     # Setup guide
    ├── usage.md            # How-to guide
    ├── concepts.md         # Deep dive
    └── troubleshooting.md  # Fix problems
```

## Keyboard Shortcuts

When editing config:
- `Ctrl+O` - Save file
- `Enter` - Confirm filename
- `Ctrl+X` - Exit editor

## Docker vs Podman

The system works with both:
```bash
# Check which you have
podman --version
# or
docker --version
```

Commands are the same, the system auto-detects which to use.

## History Integration

If you have PAI History System installed:

**Auto-sync on session start:**
Learnings, research, and decisions automatically sync to knowledge graph.

**Manual sync:**
```bash
bun run src/hooks/sync-history-to-knowledge.ts
```

**Check what will sync:**
```bash
bun run src/hooks/sync-history-to-knowledge.ts --dry-run
```

## Backup and Restore

### Podman

**Quick Backup:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
mkdir -p backups
podman exec pai-knowledge-falkordb redis-cli BGSAVE
podman cp pai-knowledge-falkordb:/data/dump.rdb ./backups/knowledge-backup.rdb
```

**Full Volume Backup:**
```bash
bun run stop
podman volume export pai-knowledge-data > backups/volume-backup.tar
bun run start
```

**Restore:**
```bash
bun run stop
podman volume import pai-knowledge-data < backups/volume-backup.tar
bun run start
```

### Docker

**Quick Backup:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
mkdir -p backups
docker exec pai-knowledge-falkordb redis-cli BGSAVE
docker cp pai-knowledge-falkordb:/data/dump.rdb ./backups/knowledge-backup.rdb
```

**Full Volume Backup:**
```bash
bun run stop
docker run --rm -v pai-knowledge-data:/data -v $(pwd)/backups:/backup alpine \
    tar cvf /backup/volume-backup.tar -C /data .
bun run start
```

**Restore:**
```bash
bun run stop
docker run --rm -v pai-knowledge-data:/data -v $(pwd)/backups:/backup alpine \
    sh -c "cd /data && tar xvf /backup/volume-backup.tar"
bun run start
```

### Verify Database
```bash
# Podman
podman exec pai-knowledge-falkordb redis-cli DBSIZE
podman exec pai-knowledge-falkordb redis-cli GRAPH.LIST

# Docker
docker exec pai-knowledge-falkordb redis-cli DBSIZE
docker exec pai-knowledge-falkordb redis-cli GRAPH.LIST
```

See [usage.md#backup-and-restore](usage.md#backup-and-restore) for detailed instructions.

## Common Errors

**"Connection refused"**
→ Server not running. Run: `bun run src/server/start.ts`

**"API key invalid"**
→ Check config/.env has correct key

**"Port already in use"**
→ Stop other service using port 8000/6379

**"No entities extracted"**
→ Add more detail to your capture

**"Rate limit exceeded"**
→ Reduce SEMAPHORE_LIMIT in config

## Getting Help

1. Check logs: `bun run src/server/logs.ts`
2. Read [troubleshooting.md](troubleshooting.md)
3. Review [concepts.md](concepts.md)
4. Check main [README](/Users/seaton/.config/pai/Packs/pai-knowledge-system/README.md)

## Version Info

System: PAI Knowledge System v1.0.0
Components:
- Graphiti (MCP server)
- FalkorDB (graph database)
- OpenAI (LLM and embeddings)

---

**Pro Tip:** Bookmark this page for quick reference while using the system!
