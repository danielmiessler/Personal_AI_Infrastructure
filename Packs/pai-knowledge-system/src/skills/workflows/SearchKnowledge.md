# Search Knowledge Workflow

**Objective:** Retrieve relevant knowledge from the Graphiti knowledge graph using semantic search across entity summaries.

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification SearchKnowledge PaiKnowledgeSystem
```

**Output to user:**
```
Running the **SearchKnowledge** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Parse Search Query

**Extract search intent from user request:**

**Direct Questions:**
- "What do I know about X?"
- "Find information on Y"
- "Search my knowledge base for Z"

**Implicit Requests:**
- "Tell me about X" (implies searching personal knowledge first)
- "Recall what we discussed about Y"
- "What have I learned about Z?"

**Extract key concepts:**
- Identify main topic/keywords
- Note related concepts
- Preserve context clues

---

## Step 3: Build Search Query

**Construct effective query:**

> **MCP Tool:** `search_memory_nodes` (searches entity "nodes" in the graph)

```typescript
// TypeScript: searchNodes() → calls MCP tool "search_memory_nodes"
{
  query: "user's search terms here",
  limit: 10  // Number of results to return
}
```

**Query Construction Tips:**
- Use natural language queries
- Include specific domain terms
- Add context if search is ambiguous
- Keep queries focused on one main topic

**Examples:**
- "Podman volume mounting" → Good
- "how do I mount volumes in Podman containers" → Better (more specific)
- "Podman" → Too broad (may return too many results)

---

## Step 4: Execute Semantic Search

**Call the MCP tool:**

```typescript
search_nodes({
  query: searchQuery,
  limit: 10
})
```

**Parameters:**
- `query` (required) - Natural language search query
- `limit` (optional) - Number of results (default: 10)
- `group_id` (optional) - Filter by specific knowledge namespace
- `entity` (optional) - Filter by entity type:
  - `Preference` - User preferences and settings
  - `Procedure` - How-to guides and processes
  - `Learning` - Knowledge from learning sessions
  - `Research` - Findings from research
  - `Decision` - Architectural and strategic decisions
  - `Feature` - Feature implementations
  - `Person`, `Organization`, `Location`, `Concept`, `Event`, `Document`

---

## Step 5: Present Results

**Format knowledge for user:**

```markdown
📚 **Knowledge Found: [Topic]**

Based on your knowledge graph, here's what you know:

**Key Entities:**
1. **[Entity Name]** ([Type])
   - Summary: [Brief description]
   - Related to: [Related entities]

2. **[Entity Name]** ([Type])
   - Summary: [Brief description]
   - Related to: [Related entities]

**Relationships:**
- [Entity A] → [relationship] → [Entity B]
- [Entity C] → [relationship] → [Entity D]

**Episodes Containing This Knowledge:**
- [Episode name] ([date])
- [Episode name] ([date])

💡 **Insights:**
[Synthesize connections and patterns from the results]
```

**If no results found:**
```markdown
❌ **No Knowledge Found**

I couldn't find any information about "[query]" in your knowledge graph.

Suggestions:
1. Try different search terms
2. Use broader concepts
3. Check if this knowledge has been captured yet

Want to capture this information now?
```

---

## Best Practices

**Search Query Construction:**
- Use domain-specific terminology
- Include related concepts in query
- Think about how entities might be described
- Try synonyms if initial search fails

**Result Interpretation:**
- Look for entity types (Preferences, Procedures, etc.)
- Note relationship types between entities
- Consider temporal context (when was this learned?)
- Check confidence scores if provided

**When to Use vs General Search:**
- Use knowledge search first for personal information
- Fall back to web search if no knowledge found
- Combine both for comprehensive research

---

## Examples

**Example 1: Direct Topic Search**

User: "What do I know about Graphiti?"

Query: "Graphiti knowledge graph framework"

```typescript
search_nodes({
  query: "Graphiti knowledge graph framework temporal context",
  limit: 10
})
```

Returns entities about Graphiti, FalkorDB, knowledge management, MCP, etc.

**Example 2: Procedural Search**

User: "How do I set up PAI skills?"

Query: "PAI skill creation setup configuration"

```typescript
search_nodes({
  query: "PAI skill creation canonical structure setup",
  limit: 10
})
```

Returns procedure entities related to skill creation, SKILL.md format, workflows.

**Example 3: Preference Retrieval**

User: "What are my VS Code settings?"

Query: "VS Code preferences configuration settings"

```typescript
search_nodes({
  query: "VS Code preferences theme tab size configuration",
  limit: 10
})
```

Returns preference entities about development environment setup.

**Example 4: Decision Recall**

User: "Why did we choose Graphiti over other options?"

Query: "Graphiti selection decision reasoning architecture"

```typescript
search_nodes({
  query: "Graphiti architecture decision rationale advantages",
  limit: 10
})
```

Returns event/procedure entities documenting the decision-making process.

---

## Advanced Search Patterns

**Filter by Entity Type:**
```typescript
// Find only procedures
search_nodes({
  query: "PAI skill creation",
  entity: "Procedure",
  limit: 10
})

// Find only learnings
search_nodes({
  query: "containerization",
  entity: "Learning",
  limit: 10
})

// Find only preferences
search_nodes({
  query: "VS Code settings",
  entity: "Preference",
  limit: 10
})

// Find only research
search_nodes({
  query: "knowledge graph architecture",
  entity: "Research",
  limit: 10
})

// Find only decisions
search_nodes({
  query: "database selection",
  entity: "Decision",
  limit: 10
})
```

**Combine Concepts:**
```typescript
// Search for intersection of topics
query: "Podman container networking troubleshooting"
```

**Temporal Searches:**
```typescript
// Add time context
query: "recent knowledge about PAI skills from 2025"
```

**Relationship-Focused:**
```typescript
// Find connections
query: "how FalkorDB integrates with Graphiti"
```

**Procedure Retrieval:**
```typescript
// Find how-to knowledge
search_nodes({
  query: "creating PAI skill workflows",
  entity: "Procedure",
  limit: 10
})
```

---

## Troubleshooting

**No Results Found:**
- Query may be too specific → Try broader terms
- Knowledge may not be captured → Check with GetRecent workflow
- Different terminology used → Try synonyms
- Search may be in wrong group → Verify `group_id`

**Too Many Results:**
- Query too broad → Add specific constraints
- Refine with additional context
- Increase result specificity
- Use relationship type filters

**Irrelevant Results:**
- Query terms may have multiple meanings → Add domain context
- Consider different entity types
- Use SearchFacts for relationships instead

**Connection Issues:**
```bash
# Check server health
curl http://localhost:8000/health

# View server logs
podman logs graphiti-knowledge-graph-mcp

# Restart if needed
podman restart graphiti-knowledge-graph-mcp
```

---

## Integration with Other Workflows

**Before Searching:**
- Use `GetRecent` to see what's been captured lately
- Use `GetStatus` to verify graph is operational

**After Searching:**
- Use `SearchFacts` to explore relationships between found entities
- Use `CaptureEpisode` to add new insights discovered during search
- Use `GetRecent` to see related knowledge added around the same time

---

**Related Workflows:**
- `SearchFacts.md` - Find relationships and connections
- `GetRecent.md` - Browse recent knowledge additions
- `CaptureEpisode.md` - Add new knowledge discovered
- `GetStatus.md` - Verify knowledge graph is operational
