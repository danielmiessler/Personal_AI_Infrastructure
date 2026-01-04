---
# name: (24 words max) Human-readable pack name
name: PAI Knowledge System

# pack-id: (format) {author}-{pack-name}-{variant}-v{version}
pack-id: madeinoz67-pai-knowledge-system-core-v1.0.0

# version: (format) SemVer major.minor.patch
version: 1.0.0

# author: (1 word) GitHub username or organization
author: madeinoz67

# description: (128 words max) One-line description
description: Persistent personal knowledge management system powered by Graphiti knowledge graph with FalkorDB backend - automatic entity extraction, relationship mapping, and semantic search for AI conversations and documents

# type: (single) concept | skill | hook | plugin | agent | mcp | workflow | template | other
type: skill

# purpose-type: (multi) security | productivity | research | development | automation | integration | creativity | analysis | other
purpose-type: [productivity, automation, development]

# platform: (single) agnostic | claude-code | opencode | cursor | custom
platform: claude-code

# dependencies: (list) Required pack-ids, empty [] if none
dependencies: [kai-history-system]

# keywords: (24 tags max) Searchable tags for discovery
keywords: [knowledge, graph, memory, semantic search, entity extraction, relationships, graphiti, falkordb, mcp, persistent, ai, storage, retrieval, organizational, learning, documentation]
---

<p align="center">
  <img src="icons/pai-knowledge-system.png" alt="Knowledge" width="256">
</p>

# Knowledge

> Persistent personal knowledge management system powered by Graphiti knowledge graph with FalkorDB backend - automatically extracts entities, relationships, and temporal context from conversations, documents, and ideas

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** PAI (Personal AI Infrastructure) is a framework for building composable, modular AI systems with skills, hooks, and tools.

**What is a Pack?** A PAI Pack is a complete, end-to-end solution that can be installed into your PAI infrastructure. Each pack contains everything needed - from source code to configuration - with no missing components or "figure it out yourself" steps.

This pack adds persistent memory to your AI infrastructure. The PAI Knowledge System is not just a note-taking tool - it's a comprehensive knowledge graph that:

- **Automatically Learns**: Extracts entities and relationships as you work
- **Connects Concepts**: Maps how ideas relate over time
- **Semantic Search**: Finds relevant knowledge using natural language
- **Builds Context**: Compounds knowledge across sessions
- **Never Forgets**: Persistent storage with temporal tracking

**Core principle**: Work normally, knowledge handles itself.

No more lost insights. No more forgotten context. Your AI builds a knowledge graph that grows with you.

Please follow the installation instructions below to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| PAI Skill Definition | `SKILL.md` | Main skill file with intent-based routing and workflow table |
| Capture Workflow | `src/skills/workflows/CaptureEpisode.md` | Add knowledge to graph with entity extraction |
| Search Workflow | `src/skills/workflows/SearchKnowledge.md` | Find entities and summaries using semantic search |
| Facts Workflow | `src/skills/workflows/SearchFacts.md` | Find relationships between entities |
| Recent Workflow | `src/skills/workflows/GetRecent.md` | Retrieve recent knowledge additions |
| Status Workflow | `src/skills/workflows/GetStatus.md` | Check system health and statistics |
| Clear Workflow | `src/skills/workflows/ClearGraph.md` | Delete all knowledge and reset graph |
| Bulk Import Workflow | `src/skills/workflows/BulkImport.md` | Import multiple documents at once |
| Install Tool | `src/skills/tools/Install.md` | Complete installation workflow |
| **History Sync Hook** | `src/hooks/sync-history-to-knowledge.ts` | Auto-sync learnings/research from PAI History System |
| Hook Libraries | `src/hooks/lib/*.ts` | Frontmatter parser, sync state, knowledge client |
| MCP Server Launcher | `src/server/run.sh` | Graphiti server launcher with Podman |
| Server Management | `src/server/{start,stop,status,logs}.sh` | Container management scripts |
| Configuration Template | `src/config/.env.example` | API keys and model settings template |
| Docker Compose | `src/server/docker-compose.yml` | Docker Compose config (Docker users) |
| Podman Compose | `src/server/podman-compose.yml` | Podman Compose config (Podman users) |

**Summary:**
- **Files created:** 3 (README.md, INSTALL.md, VERIFY.md)
- **Workflows included:** 7
- **Tools included:** 1
- **Hooks included:** 1 (History Sync)
- **Server scripts:** 5 (run, start, stop, status, logs)
- **External dependencies:** Podman, Docker image (falkordb/graphiti-knowledge-graph-mcp:latest)
- **Dependencies:** Podman (container runtime), OpenAI API key (or compatible LLM provider)

---

## The Concept and/or Problem

AI agents are brilliant but amnesiac. Every conversation starts fresh with no memory of:

- What you learned last week about a technology
- Why you made certain architectural decisions
- What bugs you've already fixed (and might reintroduce)
- Lessons learned from debugging sessions
- Research you've already conducted
- Connections between seemingly unrelated concepts

This creates cascading problems across your entire AI workflow:

**For Development Work:**
- You research the same topics repeatedly because findings aren't captured
- Architectural decisions lack rationale when revisited months later
- Code reviews miss context because the "why" is lost
- Debugging sessions don't preserve solutions for future reference

**For Knowledge Management:**
- Notes are scattered across files, chats, and documents
- No way to see how concepts connect across domains
- Search is keyword-based, missing semantic relationships
- Temporal context is lost - when did you learn this?

**For Continuous Learning:**
- Insights get lost in conversation history
- No way to build on previous discoveries
- Mistakes repeat because there's no institutional memory
- Can't track how your understanding evolves over time

**The Fundamental Problem:**

Traditional AI systems treat knowledge as ephemeral. But real learning is cumulative. Today's debugging session informs tomorrow's architecture decision. Last month's research prevents this week's repeated mistake. Research findings should connect to project decisions. Bug fixes should link to related concepts.

Without a knowledge system, your AI is powerful but forgetful. Every conversation is day one. Every insight is fleeting. Every connection must be manually rediscovered.

---

## The Solution

The PAI Knowledge System solves this through **automatic knowledge graph construction**. Instead of requiring manual note-taking, it extracts and structures knowledge as a natural byproduct of conversation.

**Core Architecture:**

```
User Conversation/Document
         │
         ▼
┌─────────────────────────────────┐
│   PAI Knowledge System Skill    │
│  ┌───────────────────────────┐  │
│  │   Intent Routing          │  │
│  │   - "remember this"       │  │
│  │   - "what do I know"      │  │
│  │   - "how are X and Y...   │  │
│  └───────────┬───────────────┘  │
└───────────────┼──────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│   Graphiti MCP Server           │
│  ┌───────────────────────────┐  │
│  │   LLM-Based Extraction    │  │
│  │   - Entities (People,     │  │
│  │     Organizations,        │  │
│  │     Concepts, Places)     │  │
│  │   - Relationships         │  │
│  │   - Temporal Context      │  │
│  └───────────┬───────────────┘  │
│             │                    │
│  ┌──────────▼───────────────┐  │
│  │   Vector Embeddings      │  │
│  │   - OpenAI embeddings    │  │
│  │   - Semantic similarity  │  │
│  └──────────┬───────────────┘  │
└─────────────┼──────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   FalkorDB Graph Database       │
│  ┌───────────────────────────┐  │
│  │   Nodes (Entities)        │  │
│  │   Edges (Relationships)   │  │
│  │   Episodes (Context)      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**How It Works:**

1. **Natural Capture**: Say "remember that Podman volumes use host:container syntax" and the system:
   - Extracts entities: "Podman", "volume mounting"
   - Identifies relationship: "uses", "syntax rule"
   - Creates episode with full context
   - Stores in graph with timestamp

2. **Semantic Search**: Ask "what do I know about container orchestration?" and the system:
   - Searches vector embeddings for related concepts
   - Returns entities: "Podman", "Kubernetes", "Docker Compose"
   - Shows relationships: "alternatives to", "similar tools"
   - Displays episodes with full context

3. **Relationship Discovery**: Ask "how are FalkorDB and Graphiti connected?" and the system:
   - Traverses graph edges between entities
   - Returns: "FalkorDB is the graph database backend for Graphiti"
   - Shows temporal context: "learned on 2025-01-03"
   - Displays related entities and connections

**Design Principles:**

1. **Zero Friction**: Capture knowledge through natural conversation
2. **Automatic Extraction**: LLM-powered entity and relationship detection
3. **Semantic Understanding**: Vector embeddings enable concept-based search
4. **Temporal Tracking**: Know when knowledge was added and how it evolves
5. **Graph-Based**: Explicit relationships show how concepts connect
6. **Complete**: Every component included - MCP server, PAI skill, workflows

**The Key Insight:**

Knowledge capture should be conversational, not administrative. By making the process frictionless and automatic, you build a knowledge graph that compounds over time without requiring manual maintenance or organization.

---

## What Makes This Different

The PAI Knowledge System solves the problem through **multi-layered semantic architecture** that goes far beyond simple keyword search or flat note storage.

**Core Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    User Intent Layer                        │
│  Natural language triggers: "remember this", "what do I     │
│  know about X", "how are X and Y related"                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  PAI Skill Routing Layer                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SKILL.md Frontmatter → Intent Detection             │  │
│  │  - USE WHEN clauses trigger based on user phrases    │  │
│  │  - Routes to appropriate workflow                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Execution Layer                   │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  CaptureEpisode  │  │  SearchKnowledge │               │
│  │  - Adds episode  │  │  - Vector search │               │
│  │  - Extracts      │  │  - Returns       │               │
│  │    entities      │  │    entities +    │               │
│  │  - Creates       │  │    summaries     │               │
│  │    relationships │  │                  │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  SearchFacts     │  │  GetRecent       │               │
│  │  - Traverses     │  │  - Temporal      │               │
│  │    graph edges   │  │    queries       │               │
│  │  - Returns       │  │  - Shows         │               │
│  │    connections   │  │    progression   │               │
│  └──────────────────┘  └──────────────────┘               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Server Integration Layer                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HTTP Endpoint: localhost:8000/mcp/                  │  │
│  │  - add_episode: Store knowledge                      │  │
│  │  - search_nodes: Semantic entity search              │  │
│  │  - search_facts: Relationship traversal              │  │
│  │  - get_episodes: Temporal retrieval                  │  │
│  │  - delete_episode/clear_graph: Management            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Graphiti Knowledge Graph Layer                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LLM Processing (OpenAI/compatible)                  │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Entity Extraction                             │ │  │
│  │  │  - People, Organizations, Locations            │ │  │
│  │  │  - Concepts, Preferences, Requirements         │ │  │
│  │  │  - Procedures, Events, Documents               │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                     │                               │  │
│  │  ┌──────────────────▼─────────────────────────────┐ │  │
│  │  │  Relationship Mapping                          │ │  │
│  │  │  - Causal: X caused Y                          │ │  │
│  │  │  - Dependency: X requires Y                    │ │  │
│  │  │  - Temporal: X happened before Y               │ │  │
│  │  │  - Semantic: X is related to Y                 │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                     │                               │  │
│  │  ┌──────────────────▼─────────────────────────────┐ │  │
│  │  │  Vector Embeddings                             │ │  │
│  │  │  - OpenAI text-embedding-3-small               │ │  │
│  │  │  - Semantic similarity search                  │ │  │
│  │  │  - Hybrid: vector + keyword                    │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           FalkorDB Graph Database (Redis-based)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Nodes: Entities with embeddings and metadata        │  │
│  │  Edges: Typed relationships with timestamps          │  │
│  │  Episodes: Full conversation context                │  │
│  │  Indices: Vector search, entity lookup, time        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Why This Architecture Matters:**

**1. Separation of Concerns**
Each layer has a single responsibility:
- **Intent Layer**: Natural language understanding
- **Routing Layer**: Direct user intent to workflow
- **Workflow Layer**: Operational procedures
- **Server Layer**: API abstraction
- **Graph Layer**: Knowledge operations
- **Database Layer**: Persistent storage

This is FUNDAMENTALLY DIFFERENT from "just storing notes" because:
- Progressive abstraction (not everything in one layer)
- Explicit intent routing (not fuzzy keyword matching)
- Separation of operations (capture, search, retrieve distinct)
- Deterministic execution (workflows map intent to MCP calls)

**2. Bidirectional Knowledge Flow**

```
User → "Remember X" → Capture Episode → Extract Entities → Create Relationships → Store in Graph
                                                                              ↓
User ← "What about X" ← Search Results ← Vector Search ← Semantic Similarity ← Graph Query
```

Every knowledge addition improves future retrieval. Every search result can trigger new knowledge capture.

**3. Multi-Dimensional Retrieval**

Traditional search: Keyword matching in flat text
Knowledge graph: Three retrieval dimensions

| Dimension | Mechanism | Example Query | Result Type |
|-----------|-----------|---------------|-------------|
| **Semantic** | Vector embeddings | "container orchestration" | Podman, Kubernetes, Docker |
| **Relational** | Graph traversal | "how are X and Y related" | "X uses Y as backend" |
| **Temporal** | Episode timestamps | "what did I learn about X" | Chronological episodes |

**4. Automatic Entity Extraction**

LLM-powered extraction identifies:
- **Named Entities**: People, organizations, locations
- **Abstract Concepts**: Technologies, methodologies, patterns
- **Procedural Knowledge**: Workflows, SOPs, how-to guides
- **Preferences**: Choices, configurations, opinions
- **Requirements**: Features, needs, specifications

This happens AUTOMATICALLY - no manual tagging required.

**5. Temporal Context Tracking**

Every episode includes:
- Timestamp: When knowledge was added
- Source: Conversation or document
- Entity State: How understanding evolved
- Relationship Creation: When connections were made

Example: "FalkorDB backend for Graphiti (learned 2025-01-03, updated 2025-01-05)"

**6. End-to-End Completeness**

Every component is included:
- ✅ MCP Server: `run.sh` starts Graphiti + FalkorDB
- ✅ PAI Skill: `SKILL.md` with intent routing
- ✅ Workflows: 7 complete operational procedures
- ✅ Installation: Step-by-step in `tools/Install.md`
- ✅ Configuration: `.env` with all environment variables
- ✅ Documentation: README, INSTALL, VERIFY

NOT: "You need to set up your own vector database" - FalkorDB is included
NOT: "Implement your own entity extraction" - Graphiti handles it
NOT: "Configure your own embeddings" - OpenAI integration built-in

**What Problems This Architecture Prevents:**

| Problem | Traditional Approach | Knowledge Graph Approach |
|---------|---------------------|-------------------------|
| **Keyword limits** | Must know exact terms | Semantic similarity finds related concepts |
| **Siloed information** | Notes in separate files | Graph connects everything |
| **Lost context** | No temporal tracking | Every episode has timestamp |
| **No relationships** | Flat documents | Explicit edges between entities |
| **Manual organization** | Tag and categorize yourself | Automatic entity extraction |
| **Scattered knowledge** | Multiple tools | Single unified graph |

**The Architectural Innovation:**

The key insight is that **knowledge is relational, not transactional**. Traditional note-taking treats each piece of information as an isolated transaction. The PAI Knowledge System treats knowledge as a graph of interconnected entities with temporal context.

This isn't just "better search" - it's a fundamentally different paradigm:
- **Transaction**: "Note about Podman volumes" (isolated, static)
- **Relational**: "Podman → uses → volume mounting → syntax → host:container" (connected, queryable, temporal)

The graph structure allows queries impossible with flat notes:
- "Show me all technologies related to container orchestration I learned about in the past month"
- "What debugging solutions led to architectural decisions?"
- "How do my preferences for dev tools relate to past troubleshooting sessions?"

This architecture makes your AI infrastructure genuinely intelligent, not just a better filing cabinet.

---

## Why This Is Different

This sounds similar to Obsidian which also does knowledge management through linked notes. What makes this approach different?

The PAI Knowledge System uses LLM-powered automatic entity extraction and semantic vector embeddings, requiring zero manual effort to organize. Unlike manual note-linking systems that demand you create and maintain connections yourself, this pack automatically identifies entities, relationships, and temporal context as you converse - no tagging, categorizing, or linking required.

- Automatic extraction eliminates all manual tagging overhead completely
- Semantic vector search enables concept-based knowledge queries
- Temporal tracking shows how your knowledge evolves
- Conversational interface integrates seamlessly into AI workflows

---

## Installation

See [INSTALL.md](INSTALL.md) for complete installation instructions.

Quick start:
```bash
# 1. Navigate to pack directory
cd /path/to/pai-knowledge-system

# 2. Configure API keys
cp src/config/.env.example src/config/.env
nano src/config/.env  # Add your OPENAI_API_KEY

# 3. Start the MCP server
bash src/server/run.sh

# 4. Verify server is running
curl http://localhost:8000/health

# 5. Install the PAI skill to your PAI directory
# From the pack directory:
PACK_DIR=$(pwd)
PAI_SKILLS_DIR="${PAI_DIR:-$HOME/.claude}/skills"
mkdir -p "$PAI_SKILLS_DIR"
cp -r "$PACK_DIR" "$PAI_SKILLS_DIR/Knowledge"
```

---

## Invocation Scenarios

The PAI Knowledge System triggers automatically based on natural language intent:

| Trigger | Workflow | Action | Output |
|---------|----------|--------|--------|
| "remember that X", "store this", "add to knowledge" | CaptureEpisode | Extract entities and relationships from input | Episode stored in graph with timestamp |
| "what do I know about X", "search my knowledge" | SearchKnowledge | Vector search for related entities | List of entities with summaries and facts |
| "how are X and Y related", "what's the connection" | SearchFacts | Graph traversal between entities | Relationships with temporal context |
| "what did I learn", "recent additions" | GetRecent | Temporal episode query | Chronological list of recent knowledge |
| "knowledge status", "graph health" | GetStatus | Server and database statistics | Entity count, episode count, last update |
| "clear knowledge", "reset graph" | ClearGraph | Delete all data | Confirmation and graph reset |
| "import these documents" | BulkImport | Multi-document processing | Episodes created from each document |

**Edge Cases Handled:**

| Scenario | Behavior |
|----------|----------|
| Server not running | Workflow returns error with troubleshooting steps |
| No entities extracted | Suggests adding more context and detail |
| Empty search results | Recommends broader queries or different terms |
| API rate limits | Automatically retries with exponential backoff |
| Duplicate knowledge | Detects and updates existing entities instead of creating duplicates |

---

## Example Usage

### Example 1: Capturing Technical Knowledge

**User Input:**
```
Remember that when using PAI skills, the SKILL.md file must have a description
with a USE WHEN clause for intent-based routing. Workflows go in the workflows/
subdirectory with TitleCase names.
```

**System Behavior:**
1. Invokes CaptureEpisode workflow
2. Sends to MCP server: `add_episode`
3. Graphiti LLM extracts:
   - Entity: "PAI skills" (Concept)
   - Entity: "SKILL.md" (Document)
   - Entity: "USE WHEN clause" (Procedure)
   - Entity: "workflows/" (Location)
   - Relationship: "requires" → SKILL.md → PAI skills
   - Relationship: "contains" → workflows/ → PAI skills
4. Creates episode with full context

**Output to User:**
```
✓ Captured: PAI skills structure
- Entities extracted: 4
- Relationships created: 2
- Episode ID: abc-123-def
```

### Example 2: Searching Your Knowledge

**User Input:**
```
What do I know about Graphiti knowledge graphs?
```

**System Behavior:**
1. Invokes SearchKnowledge workflow
2. Sends to MCP server: `search_nodes` with query "Graphiti knowledge graphs"
3. Performs vector similarity search
4. Returns related entities with summaries and facts

**Output to User:**
```
Based on your knowledge graph:

**Entities:**
- Graphiti (Knowledge Graph Framework)
- FalkorDB (Graph Database)
- Entity Extraction (LLM Process)
- Vector Embeddings (Semantic Search)

**Key Facts:**
- Graphiti is a knowledge graph framework by Zep AI
- FalkorDB serves as the graph database backend (learned 2025-01-03)
- Uses OpenAI embeddings for semantic search
- Extracts entities: People, Organizations, Locations, Concepts, Procedures
- Maps relationships: causal, dependency, temporal, semantic

**Related Episodes:**
1. "PAI Knowledge System setup" - 2025-01-03
2. "Entity extraction quality" - 2025-01-04
3. "Vector search tuning" - 2025-01-05
```

### Example 3: Finding Relationships

**User Input:**
```
How are Podman and Docker related?
```

**System Behavior:**
1. Invokes SearchFacts workflow
2. Sends to MCP server: `search_facts` for "Podman" and "Docker"
3. Traverses graph edges between entities
4. Returns relationships with temporal context

**Output to User:**
```
Relationships between Podman and Docker:

**Direct Relationships:**
- Podman → alternative to → Docker (learned 2025-01-02)
- Docker → similar tool → Podman (learned 2025-01-02)

**Related Entities:**
- Containerization (both implement this)
- Kubernetes (orchestration layer)
- Docker Compose (composition tool)

**Context from Episodes:**
"Podman is a daemonless container engine that's CLI-compatible with Docker
but doesn't require a root daemon" (captured 2025-01-02)
```

### Example 4: Reviewing Recent Learning

**User Input:**
```
What did I learn this week about knowledge management?
```

**System Behavior:**
1. Invokes GetRecent workflow
2. Sends to MCP server: `get_episodes` with filter "knowledge management"
3. Retrieves episodes from past 7 days
4. Returns chronological list

**Output to User:**
```
Recent knowledge about "knowledge management" (past 7 days):

**2025-01-05 - Graphiti vs Traditional Notes**
- Graphiti uses automatic entity extraction vs manual tagging
- Vector embeddings enable semantic search beyond keywords
- Temporal tracking shows knowledge evolution

**2025-01-04 - FalkorDB Configuration**
- FalkorDB runs as Redis module for graph operations
- Default port: 6379
- Web UI available at localhost:3000

**2025-01-03 - PAI Knowledge System Setup**
- Installed Graphiti MCP server with FalkorDB backend
- Configured OpenAI API key for LLM operations
- Installed PAI skill to ~/.claude/skills/

Total: 3 episodes, 12 entities extracted, 8 relationships created
```

### Example 5: Clearing and Resetting

**User Input:**
```
Clear my knowledge graph and start fresh
```

**System Behavior:**
1. Invokes ClearGraph workflow
2. Confirms destructive action
3. Sends to MCP server: `clear_graph`
4. Server deletes all entities and relationships
5. Rebuilds indices

**Output to User:**
```
⚠️  WARNING: This will delete all knowledge from your graph.
Entities: 156
Relationships: 342
Episodes: 89

Type 'confirm' to proceed or 'cancel' to abort: confirm

✓ Knowledge graph cleared.
- All entities deleted
- All relationships removed
- Indices rebuilt

Ready for fresh knowledge capture.
```

### Example 6: Troubleshooting - Server Not Running

**User Input:**
```
Remember that I prefer gpt-4o for complex reasoning tasks
```

**System Behavior:**
1. Invokes CaptureEpisode workflow
2. Attempts to connect to MCP server at localhost:8000
3. Connection fails - server not running
4. Workflow returns error with troubleshooting steps

**Output to User:**
```
❌ Unable to connect to Graphiti MCP server at localhost:8000

**Troubleshooting Steps:**

1. Check if server is running:
   podman ps | grep pai-knowledge-graph-mcp

2. If not running, start the server:
   bash pai-knowledge-system/src/server/run.sh

3. Check server logs:
   bash pai-knowledge-system/src/server/logs.sh

4. Verify health endpoint:
   curl http://localhost:8000/health

5. Check if port is already in use:
   lsof -i :8000

Once the server is running, try capturing knowledge again.
```

---

## Configuration

### Environment Variables

**Option 1: `.env` file** (recommended - in pack config directory):
```bash
# Location: pai-knowledge-system/src/config/.env

# LLM Provider Configuration
LLM_PROVIDER=openai
EMBEDDER_PROVIDER=openai
MODEL_NAME=gpt-4o-mini

# API Keys
OPENAI_API_KEY=sk-your-key-here

# Performance Configuration
SEMAPHORE_LIMIT=10

# Knowledge Graph Configuration
GROUP_ID=main

# Telemetry
GRAPHITI_TELEMETRY_ENABLED=false
```

**Option 2: Shell profile** (for manual installation):
```bash
# Add to ~/.zshrc or ~/.bashrc
export PAI_DIR="$HOME/.config/pai"
export OPENAI_API_KEY="sk-your-key-here"
```

### Model Selection

| Model | Use Case | Cost | Quality | Recommended |
|-------|----------|------|---------|-------------|
| **gpt-4o-mini** | Daily use, high volume | Low | Good | ✅ Yes |
| **gpt-4o** | Complex reasoning, important knowledge | Medium | Excellent | For critical content |
| **gpt-3.5-turbo** | Economy option | Very Low | Fair | Not recommended |

### Concurrency Tuning

Adjust `SEMAPHORE_LIMIT` based on your OpenAI API tier:

| Tier | Rate Limit | SEMAPHORE_LIMIT | Cost |
|------|------------|-----------------|------|
| Free | 0 RPM | 1-2 | $0/month |
| Tier 1 | 10 RPM | 3-5 | $5/month |
| Tier 2 | 60 RPM | 8-10 | $20/month |
| Tier 3 | 500 RPM | 10-15 | $100/month |
| Tier 4 | 5000 RPM | 20-50 | $250/month |

---

## Customization

### Recommended Customization

**What to Customize:** LLM model selection based on your use case

**Why:** The default gpt-4o-mini provides good quality at low cost, but complex domains may need more powerful models for accurate entity extraction and relationship mapping.

**Process:**
1. Assess your knowledge domain complexity
   - Simple: Technical documentation, procedures → gpt-4o-mini
   - Complex: Research, cross-domain connections → gpt-4o
2. Update `MODEL_NAME` in `.env` file
3. Restart MCP server: `podman restart graphiti-knowledge-graph-mcp`
4. Test with sample knowledge capture
5. Compare extraction quality between models

**Expected Outcome:** Improved entity extraction accuracy for complex or nuanced content, with higher API costs.

---

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| **Alternative LLM Provider** | `.env` (LLM_PROVIDER, EMBEDDER_PROVIDER) | Switch from OpenAI to Anthropic, Google Gemini, or Groq |
| **Multiple Knowledge Graphs** | `.env` (GROUP_ID) | Create isolated graphs for different domains (work, personal, research) |
| **Custom Entity Types** | Graphiti configuration | Add domain-specific entity types beyond defaults (Preferences, Requirements, Procedures, etc.) |
| **Vector Embedding Model** | `.env` (EMBEDDING_PROVIDER) | Use different embedding models for semantic search |
| **Web UI Configuration** | `../run.sh` | Change FalkorDB web UI port (default: 3000) |
| **Database Persistence** | `../run.sh` | Add volume mounts for persistent data storage |

---

## Credits

- **Original concept**: Built as part of Personal AI Infrastructure (PAI) framework
- **Knowledge graph engine**: [Graphiti](https://github.com/getzep/graphiti) by Zep AI
- **Graph database**: [FalkorDB](https://www.falkordb.com/) - Redis-based graph database
- **Inspired by**: Zettelkasten method, knowledge graph research, semantic search systems

---

## Related Work

- [Obsidian](https://obsidian.md) - Knowledge management with linked notes (manual linking vs automatic extraction)
- [mem0](https://github.com/mem0ai/mem0) - AI memory systems (focus on chat history vs knowledge graphs)
- [Zep](https://github.com/getzep/zep) - Long-term memory for AI applications

---

## Works Well With

- **PAI History System** (Required) - Captures all AI sessions; learnings and research are auto-synced to knowledge graph
- **PAI Research Skill** - Capture research findings into knowledge graph with entity extraction
- **Observability Dashboard** - Monitor knowledge operations in real-time via workflow notifications

---

## History Sync Hook Integration

The PAI Knowledge System includes a **History Sync Hook** that automatically bridges the PAI History System with the knowledge graph. This creates a seamless flow where learnings and research captured during sessions are automatically enriched with semantic search and entity extraction.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    HISTORY → KNOWLEDGE FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session Work                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PAI History System (stop-hook)                          │   │
│  │ • Captures AI responses                                  │   │
│  │ • Filters with hasLearningIndicators()                  │   │
│  │ • Writes markdown with YAML frontmatter                  │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ~/.config/pai/history/                                         │
│  ├── learnings/2026-01/*.md  ◄── HIGH VALUE                   │
│  ├── research/2026-01/*.md   ◄── HIGH VALUE                   │
│  └── decisions/2026-01/*.md  ◄── HIGH VALUE                   │
│                         │                                       │
│  ═══════════════════════════════════════════════════════════   │
│                         │                                       │
│  Next Session Start     │                                       │
│       │                 │                                       │
│       ▼                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ sync-history-to-knowledge.ts (SessionStart hook)        │   │
│  │ • Parses YAML frontmatter (capture_type, timestamp)     │   │
│  │ • Maps to knowledge API (name, episode_body, group_id)  │   │
│  │ • Calls add_memory() for each unsynced file             │   │
│  │ • Tracks synced files to avoid duplicates               │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Graphiti Knowledge Graph                                │   │
│  │ • LLM extracts entities from synced content             │   │
│  │ • Creates vector embeddings for semantic search         │   │
│  │ • Maps relationships between concepts                   │   │
│  │ • Preserves temporal context from original capture      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Synced

| History Category | Synced | Rationale |
|------------------|--------|-----------|
| `learnings/` | ✅ Yes | Problem/solution narratives with learning indicators |
| `research/` | ✅ Yes | Subagent research findings |
| `decisions/` | ✅ Yes | Architectural decisions with rationale |
| `sessions/` | ❌ No | Low entity value (mostly tool/file lists) |

### Metadata Mapping

The hook extracts YAML frontmatter from history files and maps it to the knowledge API:

| History Frontmatter | Knowledge API | Purpose |
|---------------------|---------------|---------|
| `capture_type` | `group_id` + `name` prefix | Organizes by type in graph |
| `timestamp` | `reference_timestamp` | Preserves temporal context |
| `session_id` | `source_description` | Links to original session |
| `executor` | `source_description` | Identifies agent/main |
| Markdown body | `episode_body` | Content for entity extraction |

### Manual Sync

You can manually trigger a sync or check status:

```bash
# Sync all unsynced files
bun run ~/.config/pai/hooks/knowledge/sync-history-to-knowledge.ts

# Dry run (see what would be synced)
bun run ~/.config/pai/hooks/knowledge/sync-history-to-knowledge.ts --dry-run

# Verbose output
bun run ~/.config/pai/hooks/knowledge/sync-history-to-knowledge.ts --verbose

# Re-sync all files (including already synced)
bun run ~/.config/pai/hooks/knowledge/sync-history-to-knowledge.ts --all
```

### Sync State

The hook tracks synced files in `~/.config/pai/history/.synced/sync-state.json`:

```json
{
  "version": "1.0.0",
  "last_sync": "2026-01-04T10:30:00.000Z",
  "synced_files": [
    {
      "filepath": "/path/to/learning.md",
      "synced_at": "2026-01-04T10:30:00.000Z",
      "episode_uuid": "abc-123",
      "capture_type": "LEARNING"
    }
  ]
}
```

### Resilience

The hook is designed for graceful degradation:

- **MCP Offline**: If the knowledge server is unavailable, the hook exits gracefully. Files remain in history and will be synced on the next session start when MCP is available.
- **Sync Tracking**: Already-synced files are skipped, preventing duplicates.
- **Non-Blocking**: The hook runs asynchronously and won't delay session startup.

---

## Recommended

- **OpenAI API Key** - Required for LLM-based entity extraction and embeddings (get started with $5 credit)
- **Podman** - Container runtime for isolated Graphiti server (or Docker with minor modifications)

---

## Relationships

### Parent Of
*None specified.*

### Child Of
- **Personal AI Infrastructure (PAI)** - Core framework that provides skill system, workflow routing, and tool integration

### Sibling Of
- **PAI History System** - Complementary pack for session capture and documentation
- **PAI Research Skill** - Research workflows that can feed into knowledge graph

### Part Of Collection
- **PAI Core Skills Bundle** - Essential skills for personal AI infrastructure

---

## Changelog

### 1.0.0 - 2025-01-03
- Initial release
- Complete MCP server with Graphiti + FalkorDB
- PAI skill with 7 workflows (Capture, Search, Facts, Recent, Status, Clear, BulkImport)
- Automatic entity extraction and relationship mapping
- Semantic search with vector embeddings
- Temporal context tracking
- End-to-end complete with installation and verification
