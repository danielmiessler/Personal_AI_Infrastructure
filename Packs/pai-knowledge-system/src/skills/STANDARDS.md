# PAI Knowledge System - Usage Standards

Standards for effectively capturing, organizing, and retrieving knowledge from your personal knowledge graph.

---

## Episode Capture Standards

An **episode** is the fundamental unit of knowledge in the system. Well-structured episodes enable better entity extraction, relationship mapping, and future retrieval.

### What Makes a Good Episode

| Quality | Poor Example | Good Example |
|---------|--------------|--------------|
| **Specific** | "Learned something about Docker" | "Docker containers share the host kernel, unlike VMs which run separate OS instances" |
| **Contextual** | "Use retry logic" | "API calls to OpenAI should use exponential backoff with max 3 retries to handle rate limits" |
| **Complete** | "Meeting notes" | "Product review meeting: Decided to delay v2.0 launch to add OAuth support. John owns implementation, due March 15" |
| **Attributable** | "Someone said X" | "Per AWS documentation, Lambda cold starts average 100-200ms for Python runtimes" |

### Episode Structure Template

```
[WHAT] - The core fact, insight, or decision
[CONTEXT] - When/where/why this matters
[SOURCE] - Where this came from (optional but valuable)
[RELATED] - Connected concepts or entities (helps relationship extraction)
```

**Example:**
```
Bun runtime is 3x faster than Node.js for TypeScript execution.
Discovered while benchmarking the PAI hook system.
Source: Personal testing with sync-history-to-knowledge.ts
Related: TypeScript, Node.js, performance optimization
```

---

## When to Capture Knowledge

### Capture Immediately

| Trigger | Example |
|---------|---------|
| **Learning something new** | "TIL that PostgreSQL JSONB indexes can use GIN for faster queries" |
| **Making a decision** | "Decided to use FalkorDB over Neo4j for lower memory footprint" |
| **Solving a problem** | "Fixed the race condition by adding mutex lock in sync-state.ts" |
| **Receiving advice** | "Code reviewer suggested using discriminated unions for error handling" |
| **Discovering a preference** | "Prefer using `bun test` over Jest for faster test execution" |

### Capture Later (Batch)

| Trigger | Example |
|---------|---------|
| **After meetings** | Key decisions, action items, ownership assignments |
| **After research sessions** | Synthesized findings, sources, confidence levels |
| **After debugging sessions** | Root cause, solution, prevention strategies |
| **End of day review** | Important learnings not yet captured |

### Don't Capture

- Temporary information (task lists, reminders)
- Sensitive credentials or secrets
- Highly volatile data that changes frequently
- Information already well-documented elsewhere

---

## Source Types

Choose the appropriate source type for your content:

### `text` (Default)

For natural language content, insights, and prose.

```typescript
{
  source: "text",
  episode_body: "GraphQL subscriptions use WebSockets under the hood for real-time updates",
  source_description: "learning from Apollo docs"
}
```

**Best for:** Learnings, insights, decisions, meeting notes, research findings

### `json`

For structured data with clear entity relationships.

```typescript
{
  source: "json",
  episode_body: "{\"project\": \"PAI\", \"decision\": \"Use FalkorDB\", \"reason\": \"Lower memory\", \"date\": \"2025-01-04\"}",
  source_description: "architecture decision record"
}
```

**Best for:** Configuration, structured records, data imports, API responses

### `message`

For conversation-style content with speaker attribution.

```typescript
{
  source: "message",
  episode_body: "user: What's the best database for graphs?\nassistant: FalkorDB for lightweight, Neo4j for enterprise features.",
  source_description: "chat transcript"
}
```

**Best for:** Chat logs, Q&A pairs, interview notes, support tickets

---

## Group ID Conventions

Group IDs partition your knowledge graph into isolated namespaces. Use them strategically.

### Recommended Group IDs

| Group ID | Purpose |
|----------|---------|
| `main` | Primary personal knowledge (default) |
| `work` | Professional/work-related knowledge |
| `project-{name}` | Project-specific knowledge (e.g., `project-pai`) |
| `research-{topic}` | Research area isolation (e.g., `research-llm`) |
| `archive` | Historical knowledge, less frequently accessed |

### Group ID Best Practices

1. **Start with `main`** - Use the default until you have a clear need for separation
2. **Project isolation** - Create project-specific groups for large, distinct projects
3. **Avoid proliferation** - Too many groups fragments your knowledge; prefer fewer, broader groups
4. **Document your groups** - Keep a record of what each group contains

---

## Entity Naming Standards

The system automatically extracts entities, but you can help by using consistent naming.

### Entity Type Guidelines

| Entity Type | Naming Convention | Examples |
|-------------|-------------------|----------|
| **People** | Full name, consistent format | "John Smith", not "John" or "J. Smith" |
| **Organizations** | Official name | "Anthropic", not "anthropic" or "the Claude company" |
| **Technologies** | Official casing | "TypeScript", "PostgreSQL", "GraphQL" |
| **Projects** | Consistent identifier | "PAI Knowledge System", not "knowledge system" or "the KG project" |
| **Concepts** | Noun phrases | "rate limiting", "exponential backoff" |

### Improving Entity Extraction

Include explicit entity mentions to improve extraction:

**Less effective:**
```
"The database is fast because it uses in-memory storage"
```

**More effective:**
```
"FalkorDB achieves high performance through Redis-based in-memory storage"
```

---

## Search Query Standards

Effective queries return relevant results. Follow these patterns for best results.

### Query Patterns

| Pattern | Example | Use When |
|---------|---------|----------|
| **Entity search** | "FalkorDB" | Looking for everything about a specific entity |
| **Concept search** | "rate limiting strategies" | Exploring a topic area |
| **Relationship search** | "how FalkorDB connects to Graphiti" | Finding connections |
| **Temporal search** | "decisions made in January" | Time-based retrieval |
| **Problem search** | "debugging WebSocket connections" | Finding solutions |

### Search Tips

1. **Start broad, then narrow** - "databases" → "graph databases" → "FalkorDB configuration"
2. **Use entity names** - Search for specific entities rather than vague descriptions
3. **Try synonyms** - If "auth" returns nothing, try "authentication" or "login"
4. **Combine concepts** - "TypeScript AND testing" for intersection queries

### Node Search vs Fact Search

| Tool | Returns | Use When |
|------|---------|----------|
| `search_memory_nodes` | Entity summaries with context | "What do I know about X?" |
| `search_memory_facts` | Relationships between entities | "How are X and Y connected?" |

---

## Knowledge Quality Indicators

### High-Quality Knowledge Graph

- Entities have clear, descriptive summaries
- Relationships capture meaningful connections
- Episodes are retrievable via intuitive queries
- Knowledge builds on itself over time

### Warning Signs

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Sparse entities** | Few connections per entity | Capture more context around entities |
| **Orphan episodes** | Episodes with no extracted entities | Add explicit entity mentions |
| **Duplicate entities** | Same entity with different names | Use consistent naming |
| **Stale knowledge** | Outdated information | Capture updates, note temporal context |

---

## Capture Workflows

### Quick Capture

For immediate insights during work:

```
"Remember that [specific fact with context]"
```

Example: "Remember that Bun's test runner supports TypeScript natively without compilation"

### Structured Capture

For comprehensive knowledge with metadata:

```
"Store this to knowledge:
- Topic: [subject]
- Insight: [the knowledge]
- Source: [where from]
- Confidence: [high/medium/low]
"
```

### Bulk Import

For importing existing documentation or notes:

1. Prepare content in a consistent format
2. Use the BulkImport workflow
3. Review extracted entities
4. Verify relationships

---

## Integration with History System

If using the `kai-history-system` pack, knowledge syncs automatically from:

| History Type | Sync Behavior |
|--------------|---------------|
| `learnings/` | Auto-synced as LEARNING episodes |
| `research/` | Auto-synced as RESEARCH episodes |
| `decisions/` | Auto-synced as DECISION episodes |

### Frontmatter Standards for History Files

Include frontmatter to improve entity extraction:

```yaml
---
title: "FalkorDB Performance Tuning"
date: 2025-01-04
tags: [database, performance, falkordb]
entities: [FalkorDB, Redis, Performance]
---
```

---

## Maintenance Standards

### Regular Maintenance

| Task | Frequency | Purpose |
|------|-----------|---------|
| **Review recent episodes** | Weekly | Ensure quality capture |
| **Search for gaps** | Monthly | Identify missing knowledge areas |
| **Check entity consistency** | Monthly | Fix naming inconsistencies |
| **Archive stale knowledge** | Quarterly | Move outdated content to archive group |

### Graph Health Check

Run periodically to assess knowledge graph health:

```
"Show knowledge graph status"
```

Review:
- Total episode count (growing over time)
- Entity count (reasonable ratio to episodes)
- Last updated (recent activity)

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Better Approach |
|--------------|---------|-----------------|
| **Dumping raw text** | Poor entity extraction | Add context and structure |
| **Vague references** | "that thing" isn't searchable | Use specific entity names |
| **No context** | Isolated facts are hard to connect | Include why/when/where |
| **Over-capturing** | Noise drowns out signal | Be selective, capture signal |
| **Never searching** | Knowledge unused is knowledge lost | Regularly query your graph |
| **Single huge episode** | Entity extraction degrades | Break into focused episodes |

---

## Examples

### Good Episode Capture

```
"Remember that when implementing retry logic for the OpenAI API, use exponential
backoff starting at 1 second with a maximum of 3 retries. This handles both
rate limiting (429) and temporary server errors (500). Learned while building
the PAI Knowledge System's LLM integration."
```

**Why it works:**
- Specific technical details
- Clear context (when to use)
- Source attribution
- Related entities mentioned (OpenAI, PAI Knowledge System)

### Good Search Query

```
"What do I know about handling API rate limits?"
```

**Why it works:**
- Concept-focused (not just entity)
- Natural language
- Broad enough to capture related knowledge

---

## Quick Reference

### Capture Checklist

- [ ] Is the knowledge specific and actionable?
- [ ] Is there enough context for future understanding?
- [ ] Are key entities explicitly mentioned?
- [ ] Is the source noted (if applicable)?
- [ ] Is this the right group_id?

### Search Checklist

- [ ] Start with entity/concept name
- [ ] Try node search first, then fact search
- [ ] Use synonyms if results are sparse
- [ ] Narrow scope if results are too broad

---

**Last Updated:** 2025-01-04
