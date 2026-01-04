# Search Facts Workflow

**Objective:** Find relationships and connections between entities in the knowledge graph using semantic fact search.

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification SearchFacts PaiKnowledgeSystem
```

**Output to user:**
```
Running the **SearchFacts** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Understand Relationship Query

**Identify what user wants to know:**

**Direct Relationship Questions:**
- "How are X and Y related?"
- "What's the connection between X and Y?"
- "Show me relationships about X"

**Implicit Connection Requests:**
- "Tell me about X's relationship to Y"
- "What connects X and Y"
- "Link between X and Y"

**Extract key entities:**
- Identify the two (or more) entities in question
- Note the type of relationship being sought
- Preserve context about the relationship domain

---

## Step 3: Build Fact Query

**Construct relationship search query:**

> **MCP Tool:** `search_memory_facts` (searches relationship "facts" in the graph)

```typescript
// TypeScript: searchFacts() → calls MCP tool "search_memory_facts"
{
  query: "relationship search terms here",
  limit: 15  // Number of facts to return
}
```

**Query Construction Tips:**
- Focus on the relationship, not just entities
- Use action verbs (connected, relates, influences, causes)
- Include domain context
- Keep queries specific to one relationship type

**Examples:**
- "FalkorDB Graphiti integration" → Good
- "how FalkorDB serves as backend for Graphiti" → Better
- "database backend" → Too vague

---

## Step 4: Execute Fact Search

**Call the MCP tool:**

```typescript
search_facts({
  query: relationshipQuery,
  limit: 15
})
```

**Parameters:**
- `query` (required) - Natural language query about relationships
- `limit` (optional) - Number of results (default: 15)
- `group_id` (optional) - Filter by knowledge namespace
- `entity` (optional) - Filter by entity type:
  - `Preference` - User preferences and settings
  - `Procedure` - How-to guides and processes
  - `Learning` - Knowledge from learning sessions
  - `Research` - Findings from research
  - `Decision` - Architectural and strategic decisions
  - `Feature` - Feature implementations
  - `Person`, `Organization`, `Location`, `Concept`, `Event`, `Document`

---

## Step 5: Present Relationship Results

**Format facts for user:**

```markdown
🔗 **Relationships Found: [Topic]**

**Direct Relationships:**
1. **[Entity A]** → **[relation]** → **[Entity B]**
   - Fact: [Description of the relationship]
   - Confidence: [Score if available]
   - Episode: [Source episode name]

2. **[Entity C]** → **[relation]** → **[Entity D]**
   - Fact: [Description of the relationship]
   - Confidence: [Score if available]
   - Episode: [Source episode name]

**Relationship Network:**
```
[Entity A] --[relation]--> [Entity B]
    |
    +--[relation]--> [Entity C]
                 |
                 +--[relation]--> [Entity D]
```

**Key Insights:**
- [Synthesize what these relationships reveal]
- [Note patterns or interesting connections]
- [Highlight temporal evolution if relevant]

💡 **Implications:**
[What these relationships mean for understanding the topic]
```

**If no relationships found:**
```markdown
❌ **No Relationships Found**

I couldn't find any direct relationships between "[Entity A]" and "[Entity B]" in your knowledge graph.

Suggestions:
1. Check if both entities exist in your knowledge graph
2. Try searching for each entity separately
3. Look for indirect connections through other entities

Want to explore each entity individually?
```

---

## Best Practices

**When to Use SearchFacts vs SearchKnowledge:**
- **SearchFacts:** Focus on relationships, connections, edges between entities
- **SearchKnowledge:** Focus on entity summaries, what entities exist

**Relationship Query Patterns:**
- Use relational language (connects, influences, depends on)
- Specify relationship type if known (causes, requires, enables)
- Include temporal context (historically, currently, planned)

**Interpreting Results:**
- Look for relationship directionality (A→B vs B→A)
- Note relationship strength/confidence
- Consider temporal aspects (when was this relationship established?)
- Identify transitive relationships (A→B→C implies A→C)

---

## Examples

**Example 1: Direct Connection Query**

User: "How are FalkorDB and Graphiti related?"

Query: "FalkorDB Graphiti backend database relationship"

```typescript
search_facts({
  query: "FalkorDB backend database integration with Graphiti knowledge graph",
  limit: 15
})
```

Returns:
- FalkorDB → serves as → graph database backend for Graphiti
- Graphiti → uses → FalkorDB for efficient graph queries
- FalkorDB → provides → Redis-based graph storage for Graphiti

**Example 2: Procedural Dependencies**

User: "What connects PAI skills to MCP servers?"

Query: "PAI skills integration with MCP servers"

```typescript
search_facts({
  query: "PAI skills integration MCP servers external tools",
  limit: 15
})
```

Returns:
- PAI skills → integrate with → MCP servers for external capabilities
- MCP servers → provide → tools to PAI skill workflows
- Skills → can invoke → MCP tools through canonical structure

**Example 3: Influence/Causality**

User: "Why did we choose OpenAI for embeddings?"

Query: "OpenAI embeddings selection decision reasoning"

```typescript
search_facts({
  query: "OpenAI embeddings choice decision factors advantages",
  limit: 15
})
```

Returns:
- OpenAI → chosen for → high-quality embeddings
- Model quality → influenced → OpenAI selection
- Cost considerations → led to → gpt-4o-mini for embeddings

**Example 4: Temporal Relationships**

User: "How has my understanding of PAI evolved?"

Query: "PAI understanding learning progression over time"

```typescript
search_facts({
  query: "PAI concepts understanding evolution learning journey",
  limit: 20
})
```

Returns chronological relationships showing knowledge progression.

---

## Advanced Relationship Patterns

**Dependency Chains:**
```typescript
// Find what depends on what
query: "procedure dependencies PAI skill workflows"
```

**Influence Networks:**
```typescript
// Find what influences what
query: "factors influencing architecture decisions"
```

**Temporal Sequences:**
```typescript
// Find before/after relationships
query: "learning progression prerequisites concepts"
```

**Causal Relationships:**
```typescript
// Find cause and effect
query: "what caused the decision to use Graphiti"
```

**Part-Whole Relationships:**
```typescript
// Find component relationships
query: "components of PAI skill structure"
```

---

## Visualizing Relationships

**Text-Based Network Diagrams:**
```
        [FalkorDB]
           |
           | serves as backend
           |
           v
      [Graphiti]--uses-->[OpenAI Embeddings]
           |
           | provides
           |
           v
    [Knowledge Graph]
```

**Relationship Matrix:**
| Entity 1 | Relationship | Entity 2 | Context |
|----------|-------------|----------|---------|
| FalkorDB | backs | Graphiti | Database layer |
| Graphiti | uses | OpenAI | Embeddings |
| Graphiti | integrates with | PAI | Knowledge system |

---

## Troubleshooting

**No Relationships Found:**
- Entities may not both exist → Search for each separately
- No direct relationship → Look for indirect through third entities
- Different terminology → Try synonyms
- Relationship not captured yet → Check with GetRecent

**Too Many Weak Relationships:**
- Query too broad → Add specific relationship type
- Filter by confidence threshold if available
- Focus on strongest connections
- Narrow domain context

**Missing Expected Relationships:**
- Knowledge may not be captured → Capture episode about this relationship
- Relationship may be implicit → Make it explicit through capture
- Different entity names used → Check entity variations

**Connection Issues:**
```bash
# Verify server is running
curl http://localhost:8000/health

# Check database status
curl http://localhost:8000/status

# Restart if needed
podman restart graphiti-knowledge-graph-mcp
```

---

## Integration with Other Workflows

**Before Searching Facts:**
- Use `SearchKnowledge` to identify entities first
- Use `GetRecent` to understand current knowledge context
- Use `GetStatus` to verify graph is operational

**After Searching Facts:**
- Use `SearchKnowledge` to dive deeper into specific entities
- Use `CaptureEpisode` to add newly discovered relationships
- Use `GetEntityEdge` to get full details of a specific relationship

---

**Related Workflows:**
- `SearchKnowledge.md` - Find entities and summaries
- `GetRecent.md` - Browse recent knowledge additions
- `CaptureEpisode.md` - Add new relationship information
- `GetStatus.md` - Check knowledge graph health
