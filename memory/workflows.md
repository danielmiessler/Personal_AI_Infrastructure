# Workflows

Detailed step-by-step workflows for common tasks.

---

## YouTube to Notion Wisdom Extraction

**When to use:** User requests wisdom extraction from YouTube video to be stored in Notion

**Prerequisites:**
- YouTube video URL
- Desired Notion page title
- Fabric skill loaded
- Notion MCP tools available

**Complete Workflow:**

### Step 1: Extract Video Information
```bash
# Get video title
curl -s "https://www.youtube.com/watch?v=VIDEO_ID" | \
  grep -oP '<title>[^<]*</title>' | \
  sed 's/<title>//; s/ - YouTube<\/title>//'
```

**Expected output:** Full video title (e.g., "Jim Rohn - 7 Strategies for Wealth & Happiness")

### Step 2: Search for Content
```
WebSearch query: "[Creator Name] \"[Key Topic]\" summary key lessons insights"
```

**Example:** `Jim Rohn "7 Strategies for Wealth and Happiness" summary key lessons insights`

**Look for:**
- Blog post summaries
- Book summaries (if video based on book)
- Deep dives or analyses
- Educational platform summaries (Blinkist, ReadingGraphics, etc.)

### Step 3: Fetch Detailed Content
Use `WebFetch` on 2-3 promising URLs from search results:
```
WebFetch url: [summary-url]
prompt: "Extract complete summary including all key points, lessons, strategies, quotes, and actionable advice."
```

### Step 4: Apply Fabric Pattern
Read the pattern specification:
```
Read file: ~/.claude/skills/Fabric/Patterns/extract_wisdom/system.md
```

Apply pattern to gathered content, ensuring:
- 16-word bullets for IDEAS, INSIGHTS, HABITS, FACTS, RECOMMENDATIONS
- 25-word SUMMARY
- 15-word ONE-SENTENCE TAKEAWAY
- Exact quotes for QUOTES section
- All references captured

### Step 5: Create Notion Page
```json
mcp__claude_ai_Notion__notion-create-pages({
  "pages": [{
    "properties": {"title": "Page Title Here"},
    "content": "# Video Title\n\n**Video:** [URL](URL)\n\n---\n\n## SUMMARY\n[content]..."
  }]
})
```

**Content structure:**
1. Video title as H1
2. Video URL as link
3. Full video title
4. Separator (---)
5. All wisdom sections (SUMMARY, IDEAS, INSIGHTS, etc.)
6. Sources with links
7. Metadata (extraction method, date)

### Step 6: Verify and Report
- Confirm page created (check returned URL)
- Verify all sections present
- Provide URL to user

**Success Metrics:**
- All ISC criteria met
- Page accessible at returned URL
- Content properly formatted
- User satisfied with results

---

## Fallback: When WebSearch/WebFetch Fail

**Alternative 1: Ask for Manual Input**
```
AskUserQuestion: "How would you like to proceed?"
Options:
- Provide transcript manually
- Use summary instead of transcript
- Skip and create placeholder
- Try alternative tool setup
```

**Alternative 2: Use Video Description**
Some YouTube videos have rich descriptions. Try:
```bash
curl -s "VIDEO_URL" | grep -oP '"description":{"simpleText":"[^"]*"' | head -1
```

**Alternative 3: Install Tools**
If user has permissions:
```bash
pip3 install --user youtube-transcript-api
# or
npm install -g yt-dlp
```

---

## Notes

- Always update TaskCreate/TaskUpdate to track progress
- Use TaskList to display verification status
- Document any new workarounds discovered
- Capture user preferences for future sessions
