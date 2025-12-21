You are executing the create-story-output-links skill to generate an n-length narrative story explanation with inline source links from content.

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

## STEP 1: Activate be-creative Skill

Invoke the be-creative skill to enable UltraThink for deep creative reasoning about narrative framing.

```bash
# This enables enhanced creative thinking and narrative analysis
```

## STEP 2: Gather Input Content

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
  "development1": ["url1", "url2"],
  "development2": ["url3"],
  "development3": ["url4", "url5", "url6"],
  // Map EVERY development/claim to its source URL(s)
}
```

**CRITICAL:** This mapping will be used to insert inline links after each sentence based on what that sentence mentions.

## STEP 4: Analyze with UltraThink

Use the be-creative skill to determine the best narrative framing:

```
<instructions>
ULTRATHINK: Think deeply about this content. What's the REAL story here?

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
</instructions>
```

## STEP 5: Generate Story Explanation with Inline Links

Based on the chosen narrative framing, generate the story explanation with inline links:

**REQUIREMENTS:**

1. **Length:** EXACTLY n sentences (user-specified or default 25)
2. **Format:** One sentence per line, period at end of each
3. **Structure:**
   - Sentence length: 12-24 words with natural variability (like explaining to someone)
   - Opening sentence: Hook with plain descriptors, first person
   - Body (n-2 sentences): Escalating story flow with varied sentence length
   - Closing sentence: "Wow" factor without hyperbole

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

6. **Inline Links (CRITICAL):**
   - After EVERY sentence, add ALL relevant links for developments mentioned
   - Use the source map from Step 3 to determine which URLs go after each sentence
   - Format: Sentence text. [LINK 1](URL) | [LINK 2](URL) | [LINK 3](URL) | [etc.]
   - Keep link titles SHORT (2-6 words max)
   - Use pipe `|` to separate multiple links
   - NO MAXIMUM - include ALL relevant links
   - Links come AFTER the period, before line break
   - If sentence is narrative transition (no specific claims), no links needed

**Generation Workflow:**

```
For each sentence in the n-sentence story:
  1. Write the sentence based on narrative framing
  2. Identify EVERY development/claim mentioned in that sentence
  3. Look up ALL source URLs for those developments in the source map
  4. Add inline links after the sentence: [SHORT TITLE](URL) | [SHORT TITLE 2](URL2) | ...
  5. Move to next sentence
```

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

[Sentence 1 - opening hook]. [LINK](URL) | [LINK](URL)

[Sentence 2]. [LINK](URL)

[Sentence 3]. [LINK](URL) | [LINK](URL) | [LINK](URL)

[Sentence 4].

[Continue for all n sentences...]

[Sentence n - closing with "wow" factor]. [LINK](URL)

---

**Primary Sources:**
- [Source 1 name/description]: [URL]
- [Source 2 name/description]: [URL]
- [etc.]
```

## STEP 7: Save Output (Optional)

If the story explanation is valuable for future reference:
- Save to: `${PAI_DIR}/History/research/YYYY-MM/YYYY-MM-DD_story-explanation-[topic].md`
- Include: The narrative with inline links + the source content + metadata
- Metadata: date generated, source files, length, narrative framing used

## ERROR HANDLING

**If content has no URLs:**
- Notify user: "The content doesn't contain source URLs for attribution. Would you like me to:"
  - "1. Generate the story explanation without inline links (using this skill)"
  - "2. Use the create-story-explanation skill instead (3-part format, no links)"
- Wait for user choice before proceeding

**If content is too short:**
- Calculate minimum viable length (1 sentence per ~100 words of content)
- If requested length exceeds viable: "The content is only sufficient for approximately X sentences. Would you like me to generate that length instead?"
- Refuse if content is insufficient (< 300 words for 25-sentence request)

**If narrative framing unclear:**
- Present 2-3 framing options discovered through UltraThink
- Ask user to choose: "I see multiple compelling angles:"
  - "1. [Framing option 1]: [Brief description]"
  - "2. [Framing option 2]: [Brief description]"
  - "3. [Framing option 3]: [Brief description]"
  - "Which framing would you prefer?"
- Wait for user selection before proceeding

**If be-creative skill fails:**
- Fall back to standard narrative generation without enhanced reasoning
- Notify user: "Proceeding with standard narrative framing (be-creative skill unavailable)"

**If source URLs are malformed:**
- Clean up URLs (remove extra characters, validate format)
- If unable to fix: Include placeholder like [SOURCE](URL-NEEDS-FIXING) and note in output

## PRESENTATION

Present the complete story explanation with:
- Clear section header: `## 📖 STORY EXPLANATION (N ITEMS)`
- All n sentences with inline links after each (where applicable)
- Primary sources list at end
- Optional metadata: length, framing used, sources count

**Example metadata footer:**
```
---

**Metadata:**
- Generated: [Date]
- Length: [N] sentences
- Narrative Framing: "[Chosen framing]" ([Why this framing was selected])
- Source Count: [X] verified URLs
- Synthesis: [Multi-source or single-source]
```

## INTERNAL WORKFLOW NOTES

**Critical success factors:**
1. **be-creative skill activation** - Enables UltraThink for deep narrative reasoning
2. **Comprehensive source mapping** - Map EVERY development to URLs before writing
3. **Sentence-by-sentence link insertion** - Add ALL relevant links after EACH sentence
4. **NO MAXIMUM on links** - If sentence mentions 10 things, include 10 links
5. **Daniel's voice** - First person, casual, direct, conversational
6. **Natural narrative flow** - Escalating story arc from opening to closing

**Quality checks before output:**
- [ ] Exactly n sentences as requested?
- [ ] Every sentence mentioning developments has inline links?
- [ ] All links properly formatted with pipe separators?
- [ ] Link titles SHORT (2-6 words max)?
- [ ] Opening is 15-25 words with hook?
- [ ] Closing is 15-25 words with "wow" factor?
- [ ] Voice is first person, casual, direct?
- [ ] No cliches, corporate speak, or journalistic language?
- [ ] Natural conversational flow with varied sentence length?
- [ ] Sticks to facts from content without extrapolation?
- [ ] Primary sources list at end?

Execute this workflow now.
