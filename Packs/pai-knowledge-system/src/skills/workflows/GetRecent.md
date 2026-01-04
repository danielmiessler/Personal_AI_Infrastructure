# Get Recent Episodes Workflow

**Objective:** Retrieve the most recent knowledge additions to the knowledge graph, optionally filtered by topic or time range.

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification GetRecent PaiKnowledgeSystem
```

**Output to user:**
```
Running the **GetRecent** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Determine Retrieval Scope

**Parse user's request:**

**Unfiltered Recent (Default):**
- "What did I learn recently?"
- "Show me recent knowledge"
- "Latest additions to my knowledge base"
- "What's new in my knowledge graph?"

**Topic-Filtered:**
- "What did I learn about [topic]?"
- "Recent additions about [subject]"
- "Latest knowledge on [domain]"
- "Show recent [topic] learning"

**Time-Specific:**
- "What did I learn this week?"
- "Knowledge from the last few days"
- "Recent additions from [date range]"

---

## Step 3: Build Retrieval Parameters

**Construct get_episodes call:**

```typescript
// Basic recent episodes
{
  group_id: "main",
  limit: 20
}

// With episode name filter (if topic specified)
{
  group_id: "main",
  limit: 20,
  episode_name: "topic keyword"  // Optional filtering
}
```

**Parameters:**
- `group_id` (optional) - Knowledge namespace (default: "main")
- `limit` (optional) - Number of episodes (default: 20)
- `episode_name` (optional) - Filter by episode name pattern

**Determine appropriate limit:**
- Quick overview: 10 episodes
- Standard request: 20 episodes
- Comprehensive view: 50 episodes

---

## Step 4: Retrieve Recent Episodes

**Call the MCP tool:**

```typescript
get_episodes({
  group_id: groupId || "main",
  limit: 20,
  episode_name: topicFilter || undefined
})
```

---

## Step 5: Present Recent Knowledge

**Format episodes for user:**

```markdown
📅 **Recent Knowledge Additions**

**Time Period:** [Most recent to oldest]
**Total Episodes:** [Number returned]
**Group ID:** [Knowledge namespace]

---

**[Episode 1 Name]** — [Relative time]
**Added:** [Exact timestamp]
**Episode UUID:** [uuid]

**Summary:**
[Brief description of what was captured]

**Entities Extracted:**
- [Entity 1] ([Type])
- [Entity 2] ([Type])
- [Entity 3] ([Type])

**Relationships Identified:**
- [Relationship 1]
- [Relationship 2]

---

**[Episode 2 Name]** — [Relative time]
[Same format as above]

---

💡 **Learning Patterns:**
[Synthesize common themes or topics across recent episodes]

📊 **Knowledge Distribution:**
- **By Type:** [Preferences: X, Procedures: Y, Events: Z]
- **By Topic:** [Topic 1: X, Topic 2: Y, Topic 3: Z]
- **Temporal:** [Most active day, learning streaks, etc.]

🎯 **Suggested Actions:**
- [Recommend follow-up actions based on recent knowledge]
- [Identify gaps or areas for deeper learning]
```

**If no episodes found:**
```markdown
❌ **No Episodes Found**

Your knowledge graph doesn't have any episodes yet.

**Get Started:**
1. Capture your first piece of knowledge using CaptureEpisode
2. Import existing documents using BulkImport
3. Add conversation insights from this session

💡 The more you add, the more valuable your knowledge graph becomes!
```

---

## Best Practices

**When to Use GetRecent:**
- Quick knowledge refresh before starting work
- Review learning after a break
- Identify what you've been working on
- Track progress on a topic over time
- Find recently captured but not yet integrated knowledge

**Time-Based Interpretations:**
- Recent episodes are sorted by creation time (newest first)
- Use relative time descriptions ("2 hours ago", "yesterday")
- Group by time periods for easier scanning
- Note temporal patterns in your learning

**Filtering Strategies:**
- Use topic filters when you know what you're looking for
- Leave unfiltered for serendipitous discovery
- Adjust limit based on how much you want to review
- Consider date ranges for specific time periods

---

## Examples

**Example 1: Unfiltered Recent Overview**

User: "What did I learn recently?"

```typescript
get_episodes({
  group_id: "main",
  limit: 20
})
```

Shows last 20 episodes across all topics, newest first.

**Example 2: Topic-Specific Recent**

User: "What did I learn about PAI this week?"

```typescript
get_episodes({
  group_id: "main",
  limit: 20,
  episode_name: "PAI"  // Filters for episodes with "PAI" in name
})
```

Shows only PAI-related episodes from the recent additions.

**Example 3: Comprehensive Review**

User: "Show me everything I learned about containerization"

```typescript
get_episodes({
  group_id: "main",
  limit: 50,
  episode_name: "container"
})
```

Shows up to 50 episodes mentioning "container" for deep review.

---

## Analysis Patterns

**Identify Learning Trends:**
```markdown
**Learning Velocity:**
- Last 7 days: [X] episodes
- Last 30 days: [Y] episodes
- Most active day: [Day of week]

**Topic Concentration:**
- Primary focus: [Topic 1] ([X]%)
- Secondary: [Topic 2] ([Y]%)
- Emerging: [Topic 3] ([Z]%)

**Knowledge Type Distribution:**
- Procedures (how-to): [X]%
- Preferences: [Y]%
- Events/Decisions: [Z]%
```

**Find Gaps and Opportunities:**
- Topics with few episodes → Need more learning?
- Old episodes on key topics → Knowledge refresh needed?
- Imbalanced types → Too many facts, not enough procedures?

**Track Progress:**
```markdown
**Learning Journey: [Topic]**

Timeline of Understanding:
[Date] - Initial concept captured
[Date] - Added procedure details
[Date] - Refactored based on experience
[Date] - Connected to broader concepts

Current Mastery Level: [Assess based on depth and connections]
```

---

## Presentation Options

**Condensed View (Quick Scan):**
```markdown
📋 Recent Learning (Last 20 Episodes)
[Date] [Episode Name] — [Key entities]
[Date] [Episode Name] — [Key entities]
...
```

**Detailed View (Deep Dive):**
```markdown
📖 Episode Details
[Full episode content with all entities and relationships]
```

**Topic Grouped View:**
```markdown
📚 Learning by Topic

**PAI Skills:**
- [Episode 1]
- [Episode 2]

**Graphiti:**
- [Episode 3]
- [Episode 4]
```

---

## Troubleshooting

**Empty Results:**
- Knowledge graph is new → Start capturing knowledge
- Different group_id → Check which namespace you're using
- Filter too restrictive → Try broader topic terms

**Too Many Results:**
- Reduce limit for focused view
- Add topic filter for specific domain
- Sort by most relevant rather than most recent

**Outdated Knowledge:**
- Note episode timestamps
- Consider updating outdated information
- Capture new insights to supersede old

**Performance Issues:**
- Large graphs may take time to retrieve
- Consider filtering by topic or reducing limit
- Use GetStatus to check graph health

---

## Integration with Other Workflows

**Before Getting Recent:**
- Use `GetStatus` to verify graph is operational
- Consider what time period or topic you want to review

**After Getting Recent:**
- Use `SearchKnowledge` to dive deeper into specific topics
- Use `SearchFacts` to explore relationships between recent entities
- Use `CaptureEpisode` to add new insights discovered during review
- Use `BulkImport` to fill gaps in knowledge coverage

---

**Related Workflows:**
- `SearchKnowledge.md` - Deep dive into specific topics
- `SearchFacts.md` - Explore relationships
- `CaptureEpisode.md` - Add new knowledge
- `GetStatus.md` - Check knowledge graph health
- `BulkImport.md` - Add multiple documents at once
