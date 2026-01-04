# Key Concepts

This guide explains how the PAI Knowledge System works under the hood. Understanding these concepts will help you use the system more effectively.

## The Knowledge Graph

### What is a Graph?

Think of a traditional note-taking app like a filing cabinet with folders. You put notes in folders, and later you search for the folder you need.

A knowledge graph is different. It's more like a mind map where:
- **Nodes** are the concepts (Podman, Docker, containers)
- **Edges** are the relationships (Podman is similar to Docker)
- **Paths** connect related concepts across multiple hops

Instead of storing isolated notes, you're building a web of connected knowledge.

### Why This Matters

Traditional notes:
```
Folder: Docker
  Note: Docker uses a daemon

Folder: Podman
  Note: Podman is daemonless
```

You have to remember both notes exist to see the connection.

Knowledge graph:
```
Docker --> [requires] --> daemon
Podman --> [is alternative to] --> Docker
Podman --> [property: daemonless]
```

Ask "what's different between Docker and Podman?" and the system can traverse these connections automatically.

## Core Components

### 1. Episodes

An episode is like a diary entry in your knowledge system. Every time you say "remember this," the system creates an episode containing:

- **Name**: A brief title
- **Body**: The full content you provided
- **Timestamp**: When this was captured
- **Source**: Where it came from (conversation, document, etc.)

**Example Episode:**
```yaml
name: "Podman Volume Syntax"
body: "Podman volume mounting uses host:container syntax.
       Left side is host path, right side is container path."
timestamp: 2025-01-08T10:30:00Z
source: "Technical learning"
```

Episodes preserve the original context while entities and relationships are extracted from them.

### 2. Entities

Entities are the "things" in your knowledge. The system automatically extracts these from your episodes using AI.

**Types of Entities:**

| Type | Description | Examples |
|------|-------------|----------|
| **Person** | Individual people | "Alice", "Bob", "Dr. Smith" |
| **Organization** | Companies, teams, groups | "OpenAI", "My Dev Team", "PAI Project" |
| **Location** | Places, servers, repos | "production server", "GitHub", "office" |
| **Concept** | Ideas, technologies | "microservices", "AI", "knowledge graph" |
| **Procedure** | How-to guides, processes | "deployment process", "backup procedure" |
| **Preference** | Your choices, opinions | "prefer Markdown", "use 2-space tabs" |
| **Requirement** | Needs, specifications | "must support 1000 users", "needs auth" |
| **Event** | Time-bound occurrences | "architecture meeting", "bug discovered" |
| **Document** | Files, articles, books | "API documentation", "user manual" |

**History-Derived Entity Types:**

When integrated with the PAI History System, additional entity types are synced:

| Type | Description | Examples |
|------|-------------|----------|
| **Learning** | Knowledge from learning sessions | Solved problems, insights gained |
| **Research** | Findings from research | Investigated topics, comparisons |
| **Decision** | Architectural and strategic choices | Tech selections, design decisions |
| **Feature** | Feature implementations | Completed features, improvements |

These types allow you to filter searches specifically for learnings, research, etc.

**Automatic Extraction:**

When you say:
```
"Remember that Graphiti uses OpenAI for entity extraction and FalkorDB for storage."
```

The system extracts:
- Graphiti (Tool/Concept)
- OpenAI (Organization)
- entity extraction (Procedure)
- FalkorDB (Tool/Concept)
- storage (Concept)

### 3. Facts (Relationships)

Facts connect entities and give your knowledge structure. They're also called "relationships" or "edges."

**Types of Relationships:**

| Type | Description | Example |
|------|-------------|---------|
| **Causal** | X causes Y | "Podman is daemonless" → causes → "better security" |
| **Dependency** | X requires Y | "Graphiti" → requires → "OpenAI API key" |
| **Temporal** | X before Y | "Bug discovered" → before → "Bug fixed" |
| **Comparison** | X vs Y | "Podman" → alternative to → "Docker" |
| **Possession** | X has Y | "VS Code" → has setting → "2-space tabs" |
| **Location** | X in Y | "FalkorDB" → runs in → "container" |
| **Purpose** | X for Y | "entity extraction" → used for → "knowledge graph" |

**Example Facts:**
```
Podman → [is alternative to] → Docker
Podman → [property: daemonless] → (no daemon required)
Graphiti → [uses] → FalkorDB
FalkorDB → [is backend for] → Graphiti
```

### 4. Groups

Groups let you organize knowledge into separate namespaces, like having multiple notebooks.

**Default Group:**
Everything goes into the "main" group unless you specify otherwise.

**Use Cases:**
- **work**: Professional knowledge
- **personal**: Life organization, preferences
- **research**: Academic or exploratory learning
- **projects**: Project-specific knowledge

**Isolation:**
Groups don't share entities - "Docker" in your work group is separate from "Docker" in your personal group.

### 5. Embeddings

This is the "magic" that makes semantic search work.

**What They Are:**
When you add knowledge, the system converts your text into a vector (a list of numbers). Similar concepts have similar vectors.

**Example:**
```
"container orchestration" → [0.23, 0.45, 0.12, ...]
"container management"    → [0.25, 0.43, 0.15, ...]
"baking cookies"          → [0.89, 0.02, 0.76, ...]
```

The first two are similar (close vectors), the third is different (distant vector).

**Why This Matters:**
You can search for "container tools" and find results about "Docker" and "Podman" even if you never used the word "tools" when capturing that knowledge.

## How Knowledge Flows

### Capturing Knowledge

```
1. You say: "Remember that Podman is faster than Docker for starting containers"
                    ↓
2. PAI Skill recognizes the intent ("remember this")
                    ↓
3. Content sent to MCP Server
                    ↓
4. Graphiti processes with LLM (GPT-4)
                    ↓
5. Entities extracted:
   - Podman (Tool)
   - Docker (Tool)
   - container startup (Procedure)
                    ↓
6. Relationships identified:
   - Podman → faster than → Docker
   - Both → used for → container startup
                    ↓
7. Embeddings created for semantic search
                    ↓
8. Everything stored in FalkorDB graph database
```

### Searching Knowledge

```
1. You ask: "What do I know about container tools?"
                    ↓
2. PAI Skill recognizes search intent
                    ↓
3. Query sent to MCP Server
                    ↓
4. Vector similarity search:
   "container tools" embedding compared to all entities
                    ↓
5. Top matches retrieved:
   - Podman (similarity: 0.89)
   - Docker (similarity: 0.87)
   - FalkorDB (similarity: 0.72)
                    ↓
6. Related facts and episodes retrieved
                    ↓
7. Results formatted and returned to you
```

### Finding Relationships

```
1. You ask: "How are Podman and Docker related?"
                    ↓
2. PAI Skill recognizes relationship query
                    ↓
3. Graph traversal starts at both entities
                    ↓
4. FalkorDB finds paths between them:
   - Direct: Podman → [alternative to] → Docker
   - Indirect: Podman → [uses] → containers ← [uses] ← Docker
                    ↓
5. Temporal context added (when relationships were learned)
                    ↓
6. Full relationship map returned
```

## Technical Architecture

### Component Stack

```
┌─────────────────────────────────────┐
│   You (Natural Language)            │
│   "Remember this..."                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   PAI Skill (Intent Recognition)    │
│   - Routes to workflows              │
│   - Manages conversation flow        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   MCP Server (API Layer)            │
│   - HTTP endpoint                    │
│   - Tool definitions                 │
│   - Request/response handling        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Graphiti (Knowledge Processing)   │
│   - LLM entity extraction            │
│   - Relationship mapping             │
│   - Vector embedding creation        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   FalkorDB (Graph Database)         │
│   - Stores entities as nodes         │
│   - Stores relationships as edges    │
│   - Handles vector search            │
│   - Manages indices                  │
└─────────────────────────────────────┘
```

### Data Flow

**On Capture:**
```
Text Input
  → LLM Analysis (GPT-4)
    → Entities Identified
      → Relationships Mapped
        → Embeddings Created
          → Graph Updated
            → Confirmation Returned
```

**On Search:**
```
Search Query
  → Embedding Created
    → Vector Similarity Search
      → Top Entities Retrieved
        → Related Facts Fetched
          → Episodes Included
            → Results Formatted
              → Response Returned
```

## The Role of LLMs (Language Models)

The knowledge system uses LLMs at multiple stages. Understanding this helps you optimize costs and quality.

### LLMs in Knowledge Capture

When you say "remember this," an LLM analyzes your text to extract structure:

```
Your Input: "Podman is faster than Docker for starting containers
             because it doesn't require a daemon process"
                              ↓
                    LLM Analysis (GPT-4)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Entity Extraction:                                              │
│   • Podman (Tool) - container management tool                   │
│   • Docker (Tool) - container platform                          │
│   • daemon process (Concept) - background service               │
│   • container startup (Procedure) - launching containers        │
│                                                                 │
│ Relationship Mapping:                                           │
│   • Podman → [faster than] → Docker                            │
│   • Podman → [does not require] → daemon process               │
│   • Docker → [requires] → daemon process                        │
│   • Both → [used for] → container startup                       │
│                                                                 │
│ Entity Classification:                                          │
│   • Determines entity types (Tool, Concept, Procedure, etc.)    │
│   • Assigns confidence scores                                   │
│   • Identifies temporal markers                                 │
└─────────────────────────────────────────────────────────────────┘
```

**What the LLM does:**
1. **Identifies entities** - Recognizes "things" in your text (people, tools, concepts)
2. **Classifies types** - Determines if something is a Procedure, Preference, etc.
3. **Extracts relationships** - Understands how entities connect
4. **Resolves references** - Links "it" to what "it" refers to
5. **Handles ambiguity** - Makes intelligent choices about unclear text

**Why this matters:**
- Better LLM = better entity extraction
- `gpt-4o` extracts more nuanced relationships than `gpt-4o-mini`
- Cost tradeoff: ~$0.01/capture (gpt-4o-mini) vs ~$0.03/capture (gpt-4o)

### LLMs in Embedding Generation

Embeddings convert text into vectors for semantic search:

```
Text: "container orchestration"
                 ↓
      Embedding Model (text-embedding-3-small)
                 ↓
Vector: [0.023, 0.451, 0.122, -0.089, 0.334, ... 1536 dimensions]
```

**How embeddings enable search:**
```
Query: "Docker alternatives"     →  Vector A: [0.021, 0.448, ...]
Entity: "Podman"                 →  Vector B: [0.025, 0.452, ...]
Entity: "Kubernetes"             →  Vector C: [0.189, 0.201, ...]
Entity: "PostgreSQL"             →  Vector D: [0.891, 0.023, ...]

Similarity scores:
  Podman:     0.94  ← Very similar (good match!)
  Kubernetes: 0.72  ← Somewhat related
  PostgreSQL: 0.12  ← Not related
```

**What the embedding model does:**
1. **Converts text to vectors** - Creates numeric representations
2. **Captures meaning** - Similar concepts have similar vectors
3. **Enables fuzzy matching** - Find "Docker alternatives" even if you never said "alternatives"

### LLMs in Retrieval (Search)

When you search, LLMs help in two ways:

**1. Query Embedding:**
```
Your Query: "What container tools do I know about?"
                              ↓
                   Embedding Model
                              ↓
              Query Vector: [0.034, 0.445, ...]
                              ↓
              Vector Similarity Search in FalkorDB
                              ↓
              Top Matches: Podman, Docker, containerd
```

**2. Result Synthesis (optional):**
After retrieval, an LLM can synthesize results into a coherent answer.

### Model Configuration

The system uses different models for different tasks:

| Task | Model | Why |
|------|-------|-----|
| **Entity Extraction** | gpt-4o-mini (default) | Good balance of cost and quality |
| **Embeddings** | text-embedding-3-small | Fast, cheap, excellent for search |
| **High-Quality Extraction** | gpt-4o (optional) | Better for complex knowledge |

**In your config (`config/.env`):**
```bash
# Entity extraction model
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o-mini

# For better extraction (costs more):
# PAI_KNOWLEDGE_MODEL_NAME=gpt-4o
```

### Cost Breakdown by LLM Task

| Operation | Model Used | Approximate Cost |
|-----------|------------|------------------|
| Capture (entity extraction) | gpt-4o-mini | ~$0.01 per episode |
| Capture (entity extraction) | gpt-4o | ~$0.03 per episode |
| Embedding generation | text-embedding-3-small | ~$0.0001 per text |
| Search query embedding | text-embedding-3-small | ~$0.0001 per search |

**Monthly estimates:**
- Light use (50 captures, 200 searches): ~$0.50-1.00
- Moderate use (200 captures, 500 searches): ~$2.00-5.00
- Heavy use (500+ captures): ~$5.00-15.00

### Quality vs Cost Tradeoffs

**Use `gpt-4o-mini` (default) when:**
- Capturing straightforward knowledge
- Cost is a concern
- High volume of captures
- Relationships are explicit in your text

**Consider `gpt-4o` when:**
- Capturing complex technical content
- Implicit relationships need to be inferred
- Entity types are nuanced
- Quality matters more than cost

**Tips for better extraction with cheaper models:**
1. Be explicit about relationships ("X is faster than Y")
2. Use clear terminology
3. Provide 50+ words of context
4. State entity types when possible ("the tool Podman")

## Why These Design Choices?

### LLM-Powered Extraction

**Why not manual tagging?**

Manual tagging requires you to:
1. Decide what entities exist
2. Tag them consistently
3. Define relationships
4. Maintain the structure

LLM extraction does this automatically as you capture knowledge naturally.

### Graph Database

**Why not SQL or document database?**

Relationship queries are the core use case:
- "How are X and Y related?"
- "What's connected to Z?"
- "Find paths between A and B"

Graph databases excel at traversing relationships. In SQL, this would require complex joins. In a document database, you'd have to manually maintain references.

### Vector Embeddings

**Why not just keyword search?**

Keyword search breaks on synonyms:
- Search for "container tools" misses "Docker runtime"
- Search for "fast" misses "high performance"
- Search for "fix" misses "solution"

Vector search understands meaning, not just words.

### Episode-Based Storage

**Why keep the original text?**

Entities and relationships are extracted interpretations. The original episode preserves:
- Full context
- Temporal markers
- Your exact words
- Nuances that entity extraction might miss

You can always go back to the source.

## Limitations and Trade-offs

### What This System Does Well

1. **Semantic search**: Find knowledge by meaning, not keywords
2. **Relationship discovery**: See how concepts connect
3. **Automatic organization**: No manual tagging or filing
4. **Temporal tracking**: Know when you learned things
5. **Context preservation**: Episodes keep the full story

### What This System Doesn't Do

1. **Real-time collaboration**: Not designed for team use (yet)
2. **Document editing**: Captures knowledge, doesn't edit documents
3. **Structured data analysis**: Not a replacement for SQL queries
4. **Version control**: Doesn't track changes to entities over time
5. **Access control**: No per-entity permissions (yet)

### Cost Considerations

**API Costs:**
- Entity extraction: ~$0.01 per episode (using gpt-4o-mini)
- Embeddings: ~$0.0001 per episode
- Searches: ~$0.0001 per search

**Typical monthly cost**: $0.50-2.00 for personal use

**Ways to reduce costs:**
- Use gpt-4o-mini instead of gpt-4o
- Reduce SEMAPHORE_LIMIT to avoid rate charges
- Capture only valuable knowledge, not every thought

### Performance Characteristics

**Fast:**
- Searches (<100ms after first embedding)
- Single entity retrieval (<50ms)
- Recent episodes (<100ms)

**Slower:**
- Initial capture (2-5 seconds for entity extraction)
- Complex relationship traversal (1-2 seconds)
- Bulk imports (depends on volume)

### Quality Factors

**Better extraction with:**
- Longer, detailed content (50+ words)
- Clear relationships stated explicitly
- Specific terminology
- Structured information
- gpt-4o vs gpt-4o-mini

**Worse extraction with:**
- Very short snippets (<10 words)
- Vague language
- Implied relationships
- Ambiguous references

## Advanced Concepts

### Entity Deduplication

The system tries to avoid creating duplicate entities:

If you capture:
1. "Docker is a container runtime"
2. "Docker requires a daemon process"

It creates ONE "Docker" entity with both facts, not two separate entities.

**How it works:**
- Embeddings of entity names are compared
- Similar entities are merged
- Facts accumulate on the same entity

### Temporal Context

Episodes have timestamps, allowing temporal queries:
- "What did I learn last week?"
- "Recent knowledge about X"
- "Show me captures from January"

Facts also track when relationships were established:
- "Learned on 2025-01-08: Podman is faster than Docker"

This helps you see how your understanding evolves.

### Graph Traversal

Finding connections uses graph algorithms:

**Direct connection:**
```
Podman → [alternative to] → Docker
```

**Two-hop connection:**
```
Podman → [uses] → containers ← [used by] ← Kubernetes
```

**Multi-path:**
```
Path 1: Graphiti → [uses] → FalkorDB → [type] → graph database
Path 2: Graphiti → [requires] → OpenAI API → [provides] → LLM
```

### Group Isolation

Groups are completely separate graphs:

```
Group: work
  - Entities: 50
  - Facts: 120
  - Episodes: 30

Group: personal
  - Entities: 80
  - Facts: 200
  - Episodes: 45
```

No cross-group queries (by design - keeps work and personal separate).

## Next Steps

Now that you understand the concepts:

- Return to the [Usage Guide](usage.md) with deeper understanding
- Check [Troubleshooting](troubleshooting.md) if you have issues
- Explore the technical [README](/Users/seaton/.config/pai/Packs/pai-knowledge-system/README.md) for implementation details
