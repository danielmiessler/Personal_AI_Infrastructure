# Usage Guide

This guide shows you how to use the PAI Knowledge System in everyday situations. All commands are shown as natural language - just talk to your AI assistant normally.

## Capturing Knowledge

### Basic Capture

The simplest way to add knowledge is to just say "remember this":

```
You: Remember that Podman is a daemonless container engine.
```

```
AI: Knowledge Captured

Stored episode: Podman Architecture

Entities extracted:
- Podman (Tool)
- container engine (Concept)
- daemonless (Property)

Relationships identified:
- Podman -> is a -> container engine
- Podman -> has property -> daemonless
```

### Alternative Phrases

All of these work the same way:
- "Remember this"
- "Store this"
- "Add to my knowledge"
- "Save this information"
- "Log this"
- "Keep track of this"

### Capturing Different Types of Information

#### Technical Decisions

```
You: Remember that we chose FalkorDB over Neo4j because it's lighter weight and uses Redis as the backend.
```

The system uses an LLM (GPT-4) to automatically extract:
- The decision (FalkorDB vs Neo4j)
- The reasoning (lighter weight, Redis backend)
- Temporal context (when you made this decision)
- Relationships between concepts

#### Personal Preferences

```
You: Store this: I prefer writing documentation in Markdown rather than Word documents because it's easier to version control.
```

The system extracts:
- Preference: Markdown over Word
- Reason: version control compatibility
- Type: personal preference

#### Procedures and How-Tos

```
You: Remember this procedure: To reset the knowledge graph, use the clear graph command, then restart the MCP server to rebuild the indices.
```

The system creates:
- A procedure entity
- Steps in sequence
- Related tools and commands

#### Bug Fixes and Solutions

```
You: Remember this fix: When Podman containers can't access the internet, run 'podman network reload' to refresh the network stack.
```

Perfect for capturing solutions to problems you've solved.

#### Configuration Snippets

```
You: Save my tmux configuration: I use Ctrl+A as prefix, enable mouse mode, and set the history limit to 50000 lines.
```

Great for keeping track of your preferred settings.

## Searching Knowledge

### Basic Search

Ask questions in natural language:

```
You: What do I know about Podman?
```

```
AI: Knowledge Found: Podman

Based on your knowledge graph:

Key Entities:
1. Podman (Tool)
   - Daemonless container engine
   - Alternative to Docker
   - CLI-compatible with Docker commands
   - Uses libpod library

Relationships:
- Podman -> alternative to -> Docker
- Podman -> is a -> container engine
- Podman -> has property -> daemonless

Episodes:
- "Podman Architecture" (2025-01-08)
- "Container Networking Fix" (2025-01-07)
```

### Alternative Search Phrases

These all trigger searches:
- "What do I know about X?"
- "Search my knowledge for X"
- "Find information about X"
- "What have I learned about X?"
- "Recall what I know about X"

### Searching by Topic

```
You: What do I know about knowledge graphs?
```

Returns everything related to knowledge graphs - Graphiti, FalkorDB, entities, relationships, etc.

### Searching for Procedures

```
You: What do I know about resetting the knowledge graph?
```

Returns procedural knowledge about graph operations.

### Searching for Preferences

```
You: What are my development environment preferences?
```

Returns your stored preferences about editors, tools, settings, etc.

### Searching for Decisions

```
You: What architectural decisions have I made?
```

Returns episodes about technical choices and their reasoning.

### Filtering by Entity Type

You can narrow searches to specific types of knowledge:

```
You: Search my knowledge for procedures about container setup
```

**Available Entity Types:**

| Type | What It Captures | Example Query |
|------|------------------|---------------|
| **Preference** | Your choices and settings | "Find my preferences about editors" |
| **Procedure** | How-to guides and processes | "Search for procedures about deployment" |
| **Learning** | Knowledge from learning sessions | "What learnings do I have about APIs?" |
| **Research** | Findings from research | "Show research about database options" |
| **Decision** | Architectural choices | "Find decisions about architecture" |
| **Feature** | Feature implementations | "Search for features we've built" |
| **Person** | Individual people | "What do I know about team members?" |
| **Organization** | Companies and teams | "Find information about vendors" |
| **Concept** | Ideas and technologies | "Search concepts about microservices" |

**Examples:**

```
You: Find only my procedures about Podman
```

```
You: What research have I done about knowledge graphs?
```

```
You: Show me my learning about TypeScript
```

This is especially useful when you have lots of knowledge and want to focus on a specific type.

## Finding Connections

### Discover Relationships

```
You: How are Graphiti and FalkorDB related?
```

```
AI: Relationships between Graphiti and FalkorDB:

Direct Relationships:
- Graphiti -> uses as backend -> FalkorDB
- FalkorDB -> provides storage for -> Graphiti

Context:
"Graphiti is a knowledge graph framework that uses FalkorDB as its
graph database backend. FalkorDB provides Redis-based graph storage
with Cypher query support." (captured 2025-01-08)
```

### Alternative Phrases

- "How are X and Y connected?"
- "What's the relationship between X and Y?"
- "Show me connections between X and Y"

### Finding Related Concepts

```
You: What's related to container orchestration in my knowledge?
```

Shows all entities connected to that topic - Docker, Podman, Kubernetes, Docker Compose, etc.

## Reviewing Your Knowledge

### Recent Additions

```
You: What did I learn recently?
```

```
AI: Recent Knowledge Additions:

Past 7 Days:
1. "PAI Knowledge System Setup" (2025-01-08)
   - Installation and configuration
   - MCP server setup

2. "Podman Networking Fix" (2025-01-07)
   - Network reload command
   - Troubleshooting connectivity

3. "Bun vs npm Performance" (2025-01-06)
   - Package installation speed
   - Runtime comparison
```

### Filtered Recent Additions

```
You: What did I learn about containers this week?
```

Shows only recent knowledge about containers.

### Getting System Status

```
You: Show me knowledge graph status
```

```
AI: Knowledge Graph Status:

Database:
  Total Entities: 156
  Total Facts: 342
  Total Episodes: 89

Server:
  Status: Running
  Uptime: 3 days, 4 hours
  MCP Endpoint: http://localhost:8000/sse

Recent Activity:
  Last capture: 2 hours ago
  Last search: 5 minutes ago
```

## Managing Your Knowledge

### Bulk Import

Import multiple documents at once:

```
You: Import these documents to my knowledge:
[list of files or paste content]
```

The system processes each document and extracts entities from all of them.

### Clearing the Graph

**Warning: This deletes everything!**

```
You: Clear my knowledge graph
```

```
AI: ⚠️  Warning: This will delete all your knowledge

Current State:
- Entities: 156
- Facts: 342
- Episodes: 89

Are you sure? (Type 'yes' to confirm)
```

Use this when you want to start completely fresh.

### Backup and Restore

Your knowledge graph is stored in FalkorDB (a Redis-based graph database). Here's how to protect and migrate your data.

#### Quick Backup

Create a backup of your entire knowledge graph:

**Podman:**
```bash
# Navigate to pack directory
cd ~/.config/pai/Packs/pai-knowledge-system

# Create backup directory
mkdir -p backups

# Backup the FalkorDB data (RDB snapshot)
podman exec pai-knowledge-falkordb redis-cli BGSAVE
sleep 2  # Wait for save to complete
podman cp pai-knowledge-falkordb:/data/dump.rdb ./backups/knowledge-$(date +%Y%m%d-%H%M%S).rdb

echo "✓ Backup created"
```

**Docker:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
mkdir -p backups

docker exec pai-knowledge-falkordb redis-cli BGSAVE
sleep 2
docker cp pai-knowledge-falkordb:/data/dump.rdb ./backups/knowledge-$(date +%Y%m%d-%H%M%S).rdb

echo "✓ Backup created"
```

#### Scheduled Backups

Create a cron job for automatic daily backups:

**Podman:**
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd ~/.config/pai/Packs/pai-knowledge-system && podman exec pai-knowledge-falkordb redis-cli BGSAVE && sleep 2 && podman cp pai-knowledge-falkordb:/data/dump.rdb ./backups/knowledge-$(date +\%Y\%m\%d).rdb
```

**Docker:**
```bash
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd ~/.config/pai/Packs/pai-knowledge-system && docker exec pai-knowledge-falkordb redis-cli BGSAVE && sleep 2 && docker cp pai-knowledge-falkordb:/data/dump.rdb ./backups/knowledge-$(date +\%Y\%m\%d).rdb
```

#### Restore from Backup

To restore your knowledge graph from a backup:

**Podman:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# 1. Stop the running containers
bun run stop

# 2. Find your backup file
ls -la backups/

# 3. Start a temporary container to restore data
podman run --rm -v ./backups:/backups:ro -v pai-knowledge-data:/data falkordb/falkordb:latest \
    sh -c "cp /backups/knowledge-YYYYMMDD-HHMMSS.rdb /data/dump.rdb"

# 4. Restart the knowledge system
bun run start

# 5. Verify restoration
bun run status
```

**Docker:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# 1. Stop the running containers
bun run stop

# 2. Find your backup file
ls -la backups/

# 3. Start a temporary container to restore data
docker run --rm -v ./backups:/backups:ro -v pai-knowledge-data:/data falkordb/falkordb:latest \
    sh -c "cp /backups/knowledge-YYYYMMDD-HHMMSS.rdb /data/dump.rdb"

# 4. Restart the knowledge system
bun run start

# 5. Verify restoration
bun run status
```

Replace `knowledge-YYYYMMDD-HHMMSS.rdb` with your actual backup filename.

#### Export to JSON (Portable Backup)

For a human-readable backup or migration to another system:

**Podman:**
```bash
# Connect to FalkorDB and export graph data
podman exec pai-knowledge-falkordb redis-cli GRAPH.QUERY graphiti \
    "MATCH (n)-[r]->(m) RETURN n, r, m" > backups/knowledge-export.txt

# Export all nodes
podman exec pai-knowledge-falkordb redis-cli GRAPH.QUERY graphiti \
    "MATCH (n) RETURN n" > backups/nodes-export.txt

# Export all relationships
podman exec pai-knowledge-falkordb redis-cli GRAPH.QUERY graphiti \
    "MATCH ()-[r]->() RETURN r" > backups/relationships-export.txt
```

**Docker:**
```bash
# Connect to FalkorDB and export graph data
docker exec pai-knowledge-falkordb redis-cli GRAPH.QUERY graphiti \
    "MATCH (n)-[r]->(m) RETURN n, r, m" > backups/knowledge-export.txt

# Export all nodes
docker exec pai-knowledge-falkordb redis-cli GRAPH.QUERY graphiti \
    "MATCH (n) RETURN n" > backups/nodes-export.txt

# Export all relationships
docker exec pai-knowledge-falkordb redis-cli GRAPH.QUERY graphiti \
    "MATCH ()-[r]->() RETURN r" > backups/relationships-export.txt
```

#### Full Volume Backup

For a complete backup including all container data:

**Podman:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# 1. Stop containers
bun run stop

# 2. Export the entire volume
podman volume export pai-knowledge-data > backups/volume-$(date +%Y%m%d-%H%M%S).tar

# 3. Restart containers
bun run start

echo "✓ Full volume backup created"
```

**Docker:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# 1. Stop containers
bun run stop

# 2. Export the entire volume (Docker requires a helper container)
docker run --rm -v pai-knowledge-data:/data -v $(pwd)/backups:/backup alpine \
    tar cvf /backup/volume-$(date +%Y%m%d-%H%M%S).tar -C /data .

# 3. Restart containers
bun run start

echo "✓ Full volume backup created"
```

#### Restore from Volume Backup

**Podman:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# 1. Stop containers
bun run stop

# 2. Remove existing volume (WARNING: destroys current data)
podman volume rm pai-knowledge-data

# 3. Create new volume and restore
podman volume create pai-knowledge-data
podman volume import pai-knowledge-data < backups/volume-YYYYMMDD-HHMMSS.tar

# 4. Restart containers
bun run start

# 5. Verify
bun run status
```

**Docker:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# 1. Stop containers
bun run stop

# 2. Remove existing volume (WARNING: destroys current data)
docker volume rm pai-knowledge-data

# 3. Create new volume and restore
docker volume create pai-knowledge-data
docker run --rm -v pai-knowledge-data:/data -v $(pwd)/backups:/backup alpine \
    sh -c "cd /data && tar xvf /backup/volume-YYYYMMDD-HHMMSS.tar"

# 4. Restart containers
bun run start

# 5. Verify
bun run status
```

#### Migration to New Machine

To move your knowledge graph to a new computer:

**Podman - On the old machine:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# Create portable backup
bun run stop
podman volume export pai-knowledge-data > knowledge-migration.tar
bun run start

# Transfer the file
scp knowledge-migration.tar user@newmachine:~/
```

**Podman - On the new machine:**
```bash
# After installing pai-knowledge-system
cd ~/.config/pai/Packs/pai-knowledge-system

# Import the volume
podman volume create pai-knowledge-data
podman volume import pai-knowledge-data < ~/knowledge-migration.tar

# Start the system
bun run start
bun run status
```

**Docker - On the old machine:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system

# Create portable backup
bun run stop
docker run --rm -v pai-knowledge-data:/data -v $(pwd):/backup alpine \
    tar cvf /backup/knowledge-migration.tar -C /data .
bun run start

# Transfer the file
scp knowledge-migration.tar user@newmachine:~/
```

**Docker - On the new machine:**
```bash
# After installing pai-knowledge-system
cd ~/.config/pai/Packs/pai-knowledge-system

# Import the volume
docker volume create pai-knowledge-data
docker run --rm -v pai-knowledge-data:/data -v ~/:/backup alpine \
    sh -c "cd /data && tar xvf /backup/knowledge-migration.tar"

# Start the system
bun run start
bun run status
```

#### Backup Best Practices

| Practice | Recommendation |
|----------|---------------|
| **Frequency** | Daily for active use, weekly for light use |
| **Retention** | Keep at least 7 daily + 4 weekly backups |
| **Location** | Store backups outside the container (local disk, cloud) |
| **Verification** | Test restore from backup periodically |
| **Before upgrades** | Always backup before upgrading the system |

#### Quick Reference

**Podman:**
```bash
# Backup commands
podman exec pai-knowledge-falkordb redis-cli BGSAVE              # Trigger save
podman cp pai-knowledge-falkordb:/data/dump.rdb ./backup.rdb     # Copy backup
podman volume export pai-knowledge-data > volume-backup.tar       # Full volume

# Restore commands
podman volume import pai-knowledge-data < volume-backup.tar       # Restore volume
podman cp ./backup.rdb pai-knowledge-falkordb:/data/dump.rdb     # Restore RDB

# Verification
podman exec pai-knowledge-falkordb redis-cli DBSIZE              # Check DB size
podman exec pai-knowledge-falkordb redis-cli GRAPH.LIST          # List graphs
```

**Docker:**
```bash
# Backup commands
docker exec pai-knowledge-falkordb redis-cli BGSAVE              # Trigger save
docker cp pai-knowledge-falkordb:/data/dump.rdb ./backup.rdb     # Copy backup
docker run --rm -v pai-knowledge-data:/data -v $(pwd):/backup alpine \
    tar cvf /backup/volume-backup.tar -C /data .                 # Full volume

# Restore commands
docker run --rm -v pai-knowledge-data:/data -v $(pwd):/backup alpine \
    sh -c "cd /data && tar xvf /backup/volume-backup.tar"        # Restore volume
docker cp ./backup.rdb pai-knowledge-falkordb:/data/dump.rdb     # Restore RDB

# Verification
docker exec pai-knowledge-falkordb redis-cli DBSIZE              # Check DB size
docker exec pai-knowledge-falkordb redis-cli GRAPH.LIST          # List graphs
```

## Advanced Usage Patterns

### Capturing Code Snippets

````
You: Remember this bash script for starting services:

```bash
#!/bin/bash
podman start pai-knowledge-graph-mcp
podman start pai-knowledge-falkordb
echo "Services started"
```

This starts both knowledge system containers.
````

The system captures the code and its purpose.

### Capturing Conversations

```
You: Store this conversation we just had about API design patterns.
[paste or summarize the conversation]
```

Good for preserving important discussions.

### Capturing Research

```
You: Remember this research finding: Vector embeddings using text-embedding-3-small
are 99.8% as accurate as large embeddings but 5x cheaper and 3x faster to compute.
```

Perfect for building a research knowledge base.

### Capturing Meeting Notes

```
You: Store these meeting notes from the architecture review:
- Decided on microservices architecture
- Will use gRPC for service communication
- PostgreSQL for primary database
- Redis for caching layer
Action items: Complete service design by Friday
```

### Creating Knowledge Chains

Build knowledge over time by connecting related episodes:

**Day 1:**
```
Remember: Exploring knowledge graph options. Considering Neo4j and FalkorDB.
```

**Day 2:**
```
Remember: FalkorDB is lighter than Neo4j because it's a Redis module,
not a standalone database.
```

**Day 3:**
```
Remember: Decision made - using FalkorDB for PAI Knowledge System.
```

The system automatically links these episodes through their shared entities.

## How the LLM Processes Your Knowledge

When you capture knowledge, the system uses LLMs in two ways:

1. **Entity Extraction (GPT-4)** - Identifies people, tools, concepts, procedures, and their relationships
2. **Embedding Generation (text-embedding-3-small)** - Creates searchable vectors for semantic search

This means:
- You write naturally, the AI structures it for you
- Search works by meaning, not just keywords
- Relationships are automatically discovered

**Pro tip:** More detailed input = better extraction. "Podman is fast" extracts less than "Podman starts containers faster than Docker because it doesn't need a daemon."

See [concepts.md](concepts.md#the-role-of-llms-language-models) for a deep dive on LLM roles and cost optimization.

## Tips for Effective Knowledge Management

### 1. Be Specific

**Instead of:**
```
Remember Docker.
```

**Try:**
```
Remember that Docker requires a daemon process running as root,
which is why Podman is often preferred for rootless containers.
```

More detail = better entity extraction.

### 2. Include Context

**Instead of:**
```
Remember that config file.
```

**Try:**
```
Remember my VS Code settings: 2-space tabs, auto-save enabled,
Dracula theme, and JetBrains Mono font.
```

Context helps with future searches.

### 3. Explain Relationships

**Instead of:**
```
Remember Graphiti and FalkorDB.
```

**Try:**
```
Remember that Graphiti uses FalkorDB as its graph database backend
for storing entities and relationships.
```

Explicit relationships make connections clearer.

### 4. Add Temporal Context When Relevant

**Instead of:**
```
Remember we had a bug.
```

**Try:**
```
Remember that on January 8th we fixed the container networking bug
by adding a network reload command to the startup script.
```

Temporal context helps track how your knowledge evolves.

### 5. Review Regularly

Once a week, run:
```
What did I learn this week?
```

This helps reinforce knowledge and spot gaps.

## Working with Multiple Knowledge Graphs

You can maintain separate graphs for different purposes:

### Setting Up Groups

In your config (`config/.env`):
```bash
PAI_KNOWLEDGE_GROUP_ID=work
```

Or specify in commands:
```
Remember this in my work knowledge: [information]
```

### Use Cases for Multiple Groups

- **work** - Professional knowledge, project decisions
- **personal** - Personal preferences, life organization
- **research** - Academic or exploratory learning
- **code** - Programming patterns and solutions

### Switching Between Groups

Change the GROUP_ID in your config and restart the server, or use group-specific commands if your AI assistant supports them.

## Integration with Other PAI Systems

### History System Integration

If you have the PAI History System installed with the sync hook:

**What Gets Synced:**
- Learning captures (problems you solved)
- Research findings (subagent research)
- Decision records (architectural choices)

**Automatic Sync:**
The hook runs at session start and syncs new captures automatically.

**Manual Sync:**
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/hooks/sync-history-to-knowledge.ts --verbose
```

### Checking Sync Status

```bash
# Dry run - see what would be synced
bun run src/hooks/sync-history-to-knowledge.ts --dry-run

# View sync history
cat ~/.config/pai/history/.synced/sync-state.json
```

## Search Caching

The knowledge system caches search results to make repeated queries faster.

### How It Works

When you search for something, the result is cached for 5 minutes. If you ask the same question again within that time, you get an instant response without waiting for the database.

**Example:**
```
You: What do I know about Podman?
AI: [fetches from database - takes ~500ms]

You: What do I know about Podman?
AI: [returns cached result - instant]
```

### When Cache Refreshes

- **Automatically:** After 5 minutes, the next search fetches fresh data
- **After adding knowledge:** New knowledge becomes searchable after cache expires

### If You Need Fresh Results

After adding new knowledge and wanting to search for it immediately:

1. Wait 5 minutes for automatic refresh, **or**
2. Ask a slightly different question (different queries aren't cached together):
   ```
   You: Tell me about Podman containers
   ```
   instead of
   ```
   You: What do I know about Podman?
   ```

### What's Cached vs Not Cached

| Action | Cached? | Why |
|--------|---------|-----|
| Searching knowledge | ✅ Yes | Speeds up repeated queries |
| Searching relationships | ✅ Yes | Speeds up repeated queries |
| Adding knowledge | ❌ No | Must always save to database |
| Getting recent episodes | ❌ No | Needs real-time data |
| Checking system status | ❌ No | Needs real-time data |

**Tip:** Caching is transparent - you don't need to think about it. It just makes things faster.

## Best Practices Summary

1. **Capture immediately** - Don't wait to remember details later
2. **Be descriptive** - More detail is better than less
3. **Use natural language** - Write as you'd explain to a friend
4. **Review weekly** - See what you've learned
5. **Search first** - Before researching externally, check your knowledge
6. **Connect concepts** - Explicitly mention relationships when you know them
7. **Don't worry about organization** - The system handles that automatically

## Next Steps

- Learn more about [how the system works](concepts.md)
- Troubleshoot issues in the [troubleshooting guide](troubleshooting.md)
- Explore advanced features in the main [README](/Users/seaton/.config/pai/Packs/pai-knowledge-system/README.md)
