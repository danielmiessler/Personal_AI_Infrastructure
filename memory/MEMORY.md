# Eko's Memory

Core learnings and patterns from sessions with Tony.

---

## YouTube Wisdom Extraction Workflow

**Problem:** fabric CLI and youtube-transcript-api not available in environment
**Solution:** Multi-step workaround using available tools

**Workflow:**
1. Extract video title: `curl -s "https://youtube.com/watch?v=ID" | grep -oP '<title>[^<]*</title>' | sed 's/<title>//; s/ - YouTube<\/title>//'`
2. Search for content: `WebSearch` with video title + "summary key lessons"
3. Fetch details: `WebFetch` on promising summary URLs
4. Apply pattern: Use Fabric extract_wisdom pattern on gathered content
5. Store results: Create Notion page with formatted wisdom

**Key Learning:** When direct tools unavailable, build workflows from primitives (curl, grep, sed, WebSearch, WebFetch)

---

## Fabric Pattern Formatting

**extract_wisdom pattern requirements:**
- SUMMARY: 25 words exactly
- IDEAS: 20-50 bullets, **exactly 16 words each**
- INSIGHTS: 10-20 bullets, **exactly 16 words each**
- QUOTES: 15-30, exact quotes from source
- HABITS: 15-30 bullets, **exactly 16 words each**
- FACTS: 15-30 bullets, **exactly 16 words each**
- REFERENCES: All mentions of sources
- ONE-SENTENCE TAKEAWAY: **exactly 15 words**
- RECOMMENDATIONS: 15-30 bullets, **exactly 16 words each**

**Critical:** The 16-word requirement is strict. Count carefully.

**Pattern location:** `~/.claude/skills/Fabric/Patterns/extract_wisdom/system.md`

---

## Notion Integration

**Creating pages with mcp__claude_ai_Notion__notion-create-pages:**
- Use `properties: {"title": "Page Name"}` for title
- Use `content` field for Notion-flavored Markdown
- Pages return with `id` and `url` fields
- URLs follow format: `https://www.notion.so/{id}`

**Successful pattern:**
```json
{
  "pages": [{
    "properties": {"title": "Title Here"},
    "content": "# Heading\n\nContent with **formatting**..."
  }]
}
```

---

## Workaround Strategies

**When tools fail:**
1. Don't give up - find alternative paths using available tools
2. Curl + grep/sed can extract structured data from HTML
3. WebSearch finds summaries when direct access fails
4. WebFetch retrieves detailed content from summary pages
5. Ask user for help when all technical options exhausted (using AskUserQuestion)

**Example:** No YouTube transcript → curl for title → WebSearch for summaries → WebFetch for details → Pattern application

---

## Related Files

- See `workflows.md` for detailed workflow documentation (create as needed)
- See `fabric-patterns.md` for pattern-specific notes (create as needed)
