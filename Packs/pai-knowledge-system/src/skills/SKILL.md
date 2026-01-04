---
name: Knowledge
description: Personal knowledge management system using Graphiti knowledge graph with FalkorDB. USE WHEN user says 'store this', 'remember this', 'add to knowledge', 'search my knowledge', 'what do I know about', 'find in my knowledge base', 'organize my information', 'install knowledge', 'setup knowledge system', 'configure knowledge graph', or requests knowledge capture, retrieval, synthesis, installation, or configuration of their personal knowledge graph system.
---

# Knowledge

Persistent personal knowledge system powered by Graphiti knowledge graph with FalkorDB backend. Automatically extracts entities, relationships, and temporal context from conversations, documents, and ideas.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Install** | "install knowledge", "setup knowledge system", "configure knowledge graph", "install knowledge system" | `tools/Install.md` |
| **Capture Episode** | "remember this", "store this", "add to knowledge", "save this", "log this" | `workflows/CaptureEpisode.md` |
| **Search Knowledge** | "search my knowledge", "what do I know about", "find in my knowledge base", "recall" | `workflows/SearchKnowledge.md` |
| **Search Facts** | "what's the connection", "how are these related", "show relationships" | `workflows/SearchFacts.md` |
| **Get Recent Episodes** | "what did I learn", "recent additions", "latest knowledge" | `workflows/GetRecent.md` |
| **Get Status** | "knowledge status", "graph health", "knowledge stats" | `workflows/GetStatus.md` |
| **Clear Graph** | "clear knowledge", "reset graph", "delete all knowledge" | `workflows/ClearGraph.md` |
| **Bulk Import** | "import these documents", "bulk knowledge import" | `workflows/BulkImport.md` |

## Core Capabilities

**Knowledge Graph Features:**
- **Automatic Entity Extraction** - Identifies people, organizations, locations, concepts, preferences, requirements
- **Relationship Mapping** - Tracks how entities connect with temporal context
- **Semantic Search** - Finds relevant knowledge using vector embeddings
- **Episode-Based Storage** - Preserves context and conversations over time
- **Multi-Source Input** - Accepts text, JSON, messages, and structured data

**Built-in Entity Types:**
- **Preferences** - User choices, opinions, configurations
- **Requirements** - Features, needs, specifications
- **Procedures** - SOPs, workflows, how-to guides
- **Locations** - Physical or virtual places
- **Events** - Time-bound occurrences, experiences
- **Organizations** - Companies, institutions, groups
- **Documents** - Articles, reports, books, content

## Prerequisites

**Required Setup:**

1. **Start the Graphiti MCP server:**
   ```bash
   cd /path/to/pai-knowledge-system
   bun run src/server/run.ts
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:8000/health
   ```

3. **Configure API key** (in `config/.env.example`):
   ```bash
   PAI_KNOWLEDGE_OPENAI_API_KEY=sk-your-key-here
   ```

**What Gets Captured:**
- Conversations and insights from work sessions
- Research findings and web content
- Code snippets and technical decisions
- Project documentation and notes
- Personal preferences and decisions
- Meeting notes and action items

## Examples

**Example 1: Capture a Learning**

User: "Remember that when using Podman volumes, you should always mount to /container/path not host/path"

→ Invokes CaptureEpisode workflow
→ Stores episode with extracted entities:
  - Entity: "Podman volumes" (Topic)
  - Entity: "volume mounting" (Procedure)
  - Fact: "Podman volumes use /container/path syntax"
→ User receives: "✓ Captured: Podman volume mounting syntax"

**Example 2: Search Knowledge**

User: "What do I know about Graphiti?"

→ Invokes SearchKnowledge workflow
→ Searches knowledge graph for "Graphiti" entities
→ Returns related entities, facts, and summaries
→ User receives: "Based on your knowledge graph, Graphiti is..."

**Example 3: Find Relationships**

User: "How are FalkorDB and Graphiti connected?"

→ Invokes SearchFacts workflow
→ Searches for edges between FalkorDB and Graphiti entities
→ Returns facts showing relationship with temporal context
→ User receives: "FalkorDB is the graph database backend for Graphiti MCP server"

**Example 4: Get Recent Learning**

User: "What did I learn this week about PAI?"

→ Invokes GetRecent workflow
→ Retrieves recent episodes mentioning "PAI" or "Personal AI Infrastructure"
→ Returns chronological list with timestamps
→ User receives: "Recent additions: 1) PAI skills architecture... 2) Canonical skill structure..."

**Example 5: Clear and Reset**

User: "Clear my knowledge graph and start fresh"

→ Invokes ClearGraph workflow
→ Confirms destructive action
→ Deletes all entities and relationships
→ Rebuilds indices
→ User receives: "✓ Knowledge graph cleared. Ready for fresh knowledge capture."

## MCP Integration

**MCP Server Endpoint:**
```
http://localhost:8000/mcp/
```

**Available MCP Tools:**

| MCP Tool | Graphiti Concept | User-Friendly Action |
|----------|------------------|----------------------|
| `add_memory` | Episode | "Store this knowledge" |
| `search_memory_nodes` | Nodes/Entities | "Search my knowledge" |
| `search_memory_facts` | Facts/Edges | "Find relationships" |
| `get_episodes` | Episodes | "Show recent additions" |
| `delete_episode` | Episode | "Remove this entry" |
| `delete_entity_edge` | Edge | "Remove relationship" |
| `get_entity_edge` | Edge | "Get relationship details" |
| `clear_graph` | Graph | "Clear all knowledge" |
| `get_status` | - | "Check knowledge status" |

**Naming Convention (Hybrid Approach):**
- **User-facing (Skills/Workflows):** Knowledge-friendly language ("store knowledge", "search my knowledge")
- **Internal (TypeScript):** Graphiti-native methods (`addEpisode`, `searchNodes`, `searchFacts`)
- **MCP Layer:** Actual tool names (`add_memory`, `search_memory_nodes`, `search_memory_facts`)

**Response Caching:**
Search operations (`search_memory_nodes`, `search_memory_facts`) are cached to improve performance:
- **TTL:** 5 minutes (configurable via `cacheTtlMs`)
- **Max entries:** 100 (configurable via `cacheMaxSize`)
- **Scope:** Per-client instance (not shared across sessions)
- **Cache invalidation:** Automatic on TTL expiry, or manual via `clearCache()`

To disable caching, initialize the client with `enableCache: false`.

## Configuration Options

**Environment Variables** (set in `config/.env`):

```bash
# LLM Configuration
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-your-key-here
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o-mini
PAI_KNOWLEDGE_LLM_PROVIDER=openai
PAI_KNOWLEDGE_EMBEDDER_PROVIDER=openai

# Concurrency (adjust based on API tier)
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=10

# Group ID (for multiple knowledge graphs)
PAI_KNOWLEDGE_GROUP_ID=main

# Disable telemetry
PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED=false
```

**Model Recommendations:**
- **gpt-4o-mini** - Fast, cost-effective for daily use
- **gpt-4o** - Better for complex reasoning
- **gpt-3.5-turbo** - Economy option, may miss some entities

## Related Documentation

- `${PAI_DIR}/skills/CORE/SkillSystem.md` - Canonical skill structure guide
- `${PAI_DIR}/skills/CORE/HistorySystem.md` - PAI's history documentation
- [Graphiti Documentation](https://help.getzep.com/graphiti)
- [Podman Configuration](../README.md)

**Last Updated:** 2025-01-03
