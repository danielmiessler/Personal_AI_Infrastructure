You are executing the create-story-explanation skill to generate a narrative story explanation with inline source links from content.

**🎯 PARSE USER REQUEST:**

Analyze the user's request to determine:

1. **Content source:**
   - File path(s) provided?
   - Text pasted directly?
   - Previous conversation output?
   - Multiple sources to combine?

2. **Story length:**
   - Did user specify length? (e.g., "15 sentences", "30-item story")
   - Default: 25 sentences if not specified

3. **Narrative framing preference:**
   - Did user specify angle? (e.g., "enterprise focus", "platform shift", "agent autonomy")
   - Default: Use UltraThink to determine best framing

**WORKFLOW:**

## STEP 1: Gather Input Content

**If file path(s) provided:**
- Read all specified files
- Collect all content and URLs

**If text pasted:**
- Parse the provided content
- Extract all URLs and source references

**If previous output:**
- Reference the relevant conversation history
- Extract content and URLs

**If multiple sources:**
- Read/collect all sources
- Prepare for cross-source synthesis

## STEP 3: Extract Source URLs

Parse the content to identify all source URLs:
- Direct links in text
- Markdown link references
- Footnote URLs
- Source lists at end of documents

Create a comprehensive source map:
```typescript
{
  "topic1": ["url1", "url2"],
  "topic2": ["url3", "url4", "url5"],
  // ...
}
```

## STEP 3: Analyze with UltraThink

Think deeply about this content to determine the best narrative framing:

```
ULTRATHINK: What's the REAL story here?

NARRATIVE FRAMING ANALYSIS:
- What inflection point or pattern is emerging?
- What narrative framing makes this most compelling?
- How would Daniel explain this to someone who cares about this topic?
- What's the key angle?
  * "Production Transition" (experimental → operational)
  * "Platform War" (competition and consolidation)
  * "Agent Moment" (autonomous AI breakthrough)
  * "Infrastructure Consolidation" (underlying tech maturity)
  * "Paradigm Shift" (fundamental change in approach)
  * "Practical Implementation" (how people are using this now)
  * Other angle?
- Which framing best captures the significance?
- What's the escalating arc? (where does the story build toward?)

VOICE CHECK:
- This needs Daniel's voice: first person, casual, direct
- No corporate speak - conversational and honest
- Facts + interpretation, not just facts
- Connect the dots for the reader

Choose the most compelling framing and outline the narrative arc.
```

## STEP 4: Generate Story Explanation

Based on the chosen narrative framing, generate the story explanation:

**REQUIREMENTS:**

1. **Length:** EXACTLY n sentences (user-specified or default 25)
2. **Format:** One sentence per line, period at end of each
3. **Structure:**
   - Opening sentence (15-25 words): Hook with plain descriptors, first person
   - Body (n-2 sentences): Escalating story flow, varied sentence length (8-20 words)
   - Closing sentence (15-25 words): "Wow" factor without hyperbole

4. **Style (Daniel's Voice):**
   - First person ("I", "we", "me")
   - Casual and direct ("Here's the thing", "This is huge")
   - No corporate speak or buzzwords
   - Conversational rhythm
   - Stick to facts from the content
   - No numbered lists or bullet points in narrative

5. **Content:**
   - Each sentence synthesizes content from source material
   - Natural story flow with escalation
   - Mix of concrete facts and interpretive framing
   - Connect dots across different sources
   - Build toward insight or conclusion

## STEP 5: Add Inline Links

**CRITICAL: After EVERY sentence, add ALL relevant links for developments mentioned in that sentence.**

**Formatting rules:**
- Sentence text. [LINK 1](URL) | [LINK 2](URL) | [LINK 3](URL) | [etc.]
- Keep link titles SHORT (2-6 words max): "ANTHROPIC BLOG", "GITHUB DOCS", "ARXIV PAPER"
- Use pipe `|` to separate multiple links
- Include ALL links relevant to that sentence's claims
- **NO MAXIMUM** - if a sentence mentions 10 things, include links to all 10
- Links come AFTER the period, before line break
- If a sentence doesn't mention specific verifiable claims, no links needed (narrative transitions)

**Example patterns:**

Single development:
```
Netflix deployed Claude Sonnet 4.5 to 3,000 developers with structured productivity frameworks. [ANTHROPIC WEBINAR](https://www.anthropic.com/webinars/scaling-ai-agent-development-at-netflix)
```

Multiple developments in one sentence:
```
The complete agent autonomy stack emerged with ReCode architecture, Data Agents Survey taxonomy, GitHub Agent HQ, vLLM Sleep Mode, and LangChain DeepAgents. [RECODE ARXIV](https://arxiv.org/abs/2510.23564) | [RECODE GITHUB](https://github.com/FoundationAgents/ReCode) | [DATA AGENTS PAPER](https://arxiv.org/abs/2510.23587) | [GITHUB AGENT HQ](https://github.blog/news-insights/company-news/welcome-home-agents/) | [VLLM BLOG](https://blog.vllm.ai/2025/10/26/sleep-mode.html) | [LANGCHAIN BLOG](https://blog.langchain.com/doubling-down-on-deepagents/)
```

Narrative sentence (no specific claims):
```
This isn't just incremental progress - this is a fundamental shift in how AI gets deployed.
```

## STEP 6: Format Complete Output

Present the final story explanation in this format:

```
## 📖 STORY EXPLANATION (N ITEMS)

[Sentence 1]. [LINK](URL) | [LINK](URL)

[Sentence 2].

[Sentence 3]. [LINK](URL) | [LINK](URL) | [LINK](URL)

[Continue for all n sentences...]

[Final sentence]. [LINK](URL)

---

**Primary Sources:**
- [Source 1 name/description]: [URL]
- [Source 2 name/description]: [URL]
- [etc.]
```

## STEP 7: Save Output (Optional)

If the story explanation is valuable for future reference:
- Save to: `${PAI_DIR}/History/Research/YYYY-MM/YYYY-MM-DD_story-explanation-[topic].md`
- Include both the narrative and the source content
- Add metadata: date generated, source files, length

## ERROR HANDLING

**If content has no URLs:**
- Notify user: "The content doesn't contain source URLs for attribution. Would you like me to generate the story explanation without inline links?"
- Offer to proceed without links if user confirms

**If content is too short:**
- Calculate minimum viable length (1 sentence per ~100 words of content)
- If requested length exceeds viable: "The content is only sufficient for approximately X sentences. Would you like me to generate that length instead?"
- Refuse if content is insufficient (< 300 words for 25-sentence request)

**If narrative framing unclear:**
- Present 2-3 framing options discovered through UltraThink
- Ask user to choose: "I see multiple compelling angles: [Option 1], [Option 2], [Option 3]. Which framing would you prefer?"
- Wait for user selection before proceeding

**If source URLs are malformed:**
- Clean up URLs (remove extra characters, validate format)
- If unable to fix: Include placeholder and note in output

## PRESENTATION

Present the complete story explanation with:
- Clear section header (## 📖 STORY EXPLANATION)
- All sentences with inline links
- Primary sources list at end
- Optional: Metadata about generation (length, framing used, sources count)

**Important:**
- UltraThink determines the most compelling story angle
- Inline links provide comprehensive source attribution
- NO LIMIT on links per sentence - include ALL relevant sources
- Daniel's voice is critical - casual, first person, direct
- Story should be shareable, digestible, and insightful

Execute this workflow now.
