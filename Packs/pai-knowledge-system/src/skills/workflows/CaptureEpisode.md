# Capture Episode Workflow

**Objective:** Add knowledge to the Graphiti knowledge graph with automatic entity extraction and relationship mapping.

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification CaptureEpisode PaiKnowledgeSystem
```

**Output to user:**
```
Running the **CaptureEpisode** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Prepare Episode Content

**Determine episode source format:**

### Text/Conversational Content
- User's own words and ideas
- Conversation transcripts
- Meeting notes
- Documentation

### JSON/Structured Data
- API responses
- Database records
- Configuration files
- System outputs

### Message Format
- Chat logs
- Email threads
- Comment threads

---

## Step 3: Extract Episode Metadata

**Gather from context:**

1. **Episode Name** - Brief title describing the content
2. **Episode Body** - The actual content to store
3. **Source Description** - Where this came from (optional)
4. **Reference Date** - When this occurred (if temporal context matters)

**Example:**
```yaml
name: "Podman Volume Mounting Syntax"
episode_body: "When using Podman volumes, always mount to /container/path not host/path. The left side is host path, right side is container path."
source_description: "Technical learning about Podman"
```

---

## Step 4: Call MCP Tool

**Add episode to knowledge graph:**

```typescript
// Use the add_episode tool
{
  name: "Episode Title Here",
  episode_body: "The full content to store in the graph",
  source_description: "Where this came from (optional)"
}
```

**Parameters:**
- `name` (required) - Brief title
- `episode_body` (required) - Content to process
- `source` (optional) - "text", "json", or "messages" (default: "text")
- `source_description` (optional) - Origin of this knowledge

---

## Step 5: Present Results

**Confirm capture to user:**

```
✓ **Knowledge Captured**

Stored episode: [Episode Name]

Entities extracted:
- [Entity 1] ([Type])
- [Entity 2] ([Type])
- [Entity 3] ([Type])

Relationships identified:
- [Entity 1] → [relationship] → [Entity 2]
- [Entity 2] → [relationship] → [Entity 3]
```

**If MCP tool fails:**
```
❌ **Capture Failed**

Error: [error message]

Troubleshooting:
1. Check if Graphiti server is running: curl http://localhost:8000/health
2. Verify PAI_KNOWLEDGE_OPENAI_API_KEY is configured
3. Check server logs: podman logs graphiti-knowledge-graph-mcp
```

---

## Best Practices

**What to Capture:**
✅ Technical decisions and rationale
✅ Debugging solutions and workarounds
✅ Configuration patterns and preferences
✅ Process documentation (SOPs)
✅ Meeting insights and action items
✅ Research findings and sources
✅ Code explanations and patterns

**What NOT to Capture:**
❌ Transient conversations without substance
❌ Duplicate information
❌ Sensitive credentials or secrets
❌ Obviously incorrect information

**Episode Naming:**
- Use descriptive, searchable titles
- Include key topics in the name
- Keep under 100 characters
- Use Title_Case_With_Underscores

**Content Quality:**
- Provide context, not just facts
- Include relationships between concepts
- Add temporal context when relevant (when this happened)
- Be specific and detailed

---

## Examples

**Example 1: Capture Technical Learning**

Input: "Remember that Podman volume syntax is host:container, not the other way around"

```typescript
add_episode({
  name: "Podman Volume Syntax",
  episode_body: "Podman volume mounting uses host:container syntax. The left side (before colon) is the host machine path, the right side (after colon) is the container path. This is the opposite of what some expect.",
  source_description: "Technical learning about containerization"
})
```

**Example 2: Capture Meeting Notes**

Input: "Log from our architecture discussion: We decided to use Graphiti for knowledge management because it supports temporal context and automatic entity extraction"

```typescript
add_episode({
  name: "Architecture Decision - Graphiti Selection",
  episode_body: "Architecture team decided to use Graphiti knowledge graph framework for the personal knowledge management system. Key reasons: 1) Temporal context support for tracking when knowledge was added, 2) Automatic entity extraction from unstructured text, 3) Built-in relationship mapping, 4) FalkorDB integration for efficient graph queries.",
  source_description: "Architecture meeting notes"
})
```

**Example 3: Capture Configuration Pattern**

Input: "Store my VS Code settings: I prefer 2-space tabs, auto-save on focus change, and the One Dark Pro theme"

```typescript
add_episode({
  name: "VS Code Preferences",
  episode_body: "User's preferred VS Code configuration: Tab size = 2 spaces, Auto-save = onWindowChange, Theme = One Dark Pro, Font = JetBrains Mono (if available)",
  source_description: "User preferences - development environment"
})
```

---

## Troubleshooting

**Error: "Connection refused"**
- Graphiti MCP server is not running
- Start server: `cd /path/to/podman-graphiti && ./run.sh`

**Error: "API key not configured"**
- PAI_KNOWLEDGE_OPENAI_API_KEY is missing or invalid
- Check `config/.env` file has valid key
- Restart server after updating `.env`

**Error: "No entities extracted"**
- Episode content may be too vague or brief
- Add more context and detail
- Ensure content has clear entities (people, places, concepts)

**Poor entity extraction quality:**
- Consider upgrading model (gpt-4o vs gpt-4o-mini)
- Provide more structured, detailed content
- Use `source: "json"` for structured data

---

**Related Workflows:**
- `SearchKnowledge.md` - Find what you've stored
- `GetRecent.md` - Review recent additions
- `ClearGraph.md` - Reset and start fresh
