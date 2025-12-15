You are executing the story-explanation skill to generate a 3-part narrative story explanation in Daniel's voice.

**🎯 PARSE USER REQUEST:**

Analyze the user's request to determine:

1. **Content source:**
   - File path(s) provided?
   - URL to fetch?
   - YouTube video URL?
   - Text pasted directly?
   - Previous conversation output?

2. **Narrative framing preference:**
   - Did user specify angle? (e.g., "systems thinking", "economic forces", "technical breakthrough")
   - Default: Use UltraThink to determine best framing

**WORKFLOW:**

## STEP 1: Activate Deep Thinking

Use UltraThink for deep analysis and enhanced narrative framing.

## STEP 2: Gather Input Content

**If YouTube URL:**
```bash
fabric -y "YOUTUBE_URL"
```

**If article/blog URL:**
```typescript
WebFetch(url, "Extract full content of this article")
```

**If file path provided:**
- Read the specified file

**If text pasted:**
- Parse the provided content

**If previous output:**
- Reference the relevant conversation history

## STEP 3: Save Raw Content to Scratchpad

Create scratchpad directory and save raw content:

```bash
mkdir -p ${PAI_DIR}/scratchpad/$(date +%Y-%m-%d-%H%M%S)_story-explanation-[topic]/
```

Save extracted content for reference.

## STEP 4: UltraThink Narrative Analysis & Framing Selection

Use deep thinking to analyze the content and select the best narrative framing:

```
<instructions>
ULTRATHINK DEEP STORY ANALYSIS MODE:

Think deeply and extensively about this content:

1. CORE NARRATIVE - What's the fundamental story being told?
2. MULTIPLE FRAMINGS - What are 5-7 different ways to frame this story?
   - Systems engineering angle? Economic forces? Technical breakthrough?
   - Definitional shift? Human limitations? Infrastructure maturity?
3. AUDIENCE ANGLES - How would different audiences understand this?
4. HOOK VARIETY - What are compelling but different entry points?
5. EMPHASIS OPTIONS - Which elements could be emphasized or de-emphasized?
6. STRUCTURAL APPROACHES - Chronological? Problem-solution? Comparison?
7. IMPACT FOCUS - What's the "wow" factor that makes this significant?
8. CONVERSATIONAL FLOW - How would Daniel explain this to a friend?
9. KEY INSIGHTS - What makes readers think "I get it now!"?
10. BEST FRAMING - Which narrative angle is most compelling?

Explore multiple narrative approaches.
Question assumptions about the "obvious" way to tell this story.
Look for the framing that would make readers stop and engage.
Consider: What would make someone excited to share this?

SELECT THE SINGLE BEST FRAMING that:
- Has the strongest hook
- Best captures the "wow" factor
- Would make Daniel most excited to share
- Feels most natural in his voice (first person, casual, direct)
- Makes complex ideas accessible
</instructions>
```

Save UltraThink analysis notes and selected framing to scratchpad.

## STEP 5: Generate 3-Part Story Explanation

Based on the selected framing, generate the story explanation in three parts:

**REQUIREMENTS:**

### **Opening (15-25 words)**
- Compelling sentence that sets up the content
- Use plain descriptors: "interview", "paper", "talk", "article", "post", "blog"
- Avoid journalistic adjectives: "alarming", "groundbreaking", "shocking", "incredible"
- First person voice (Daniel's perspective)

**Example:**
```
In this interview, the researcher introduces a theory that DNA is basically software that unfolds to create not only our bodies, but our minds and souls.
```

### **Body (5-15 sentences)**
- Escalating story-based flow: background → main points → examples → implications
- Written in 9th-grade English (conversational, not dumbed down)
- Vary sentence length naturally (8-16 words, mix short and longer)
- Natural rhythm that feels human-written
- First person voice
- Stick to the facts - don't extrapolate beyond the input
- No bullet markers - line breaks between sentences
- Period at end of each sentence

**Example:**
```
The speaker is a scientist who studies DNA and the brain.

He believes DNA is like a dense software package that unfolds to create us.

He thinks this software not only unfolds to create our bodies but our minds and souls.

Consciousness, in his model, is a second-order perception designed to help us thrive.

He also links this way of thinking to the concept of Animism, where all living things have a soul.

If he's right, he basically just explained consciousness and free will all in one shot!
```

### **Closing (15-25 words)**
- Wrap up in a compelling way that delivers the "wow" factor
- First person voice
- Make the significance clear

**Example:**
```
This is one of those rare ideas that feels both simple and profound - if it's correct, it completely reframes how we think about life itself.
```

## STEP 6: Voice and Style Validation

**DANIEL MIESSLER VOICE CHECK:**
- ✅ First person perspective ("In this post, I argue...")
- ✅ Casual, direct, genuinely curious and excited
- ✅ Natural conversational tone (like telling a friend)
- ✅ Never flowery, emotional, or journalistic
- ✅ Let the content speak for itself

**AVOID THESE CLICHE PHRASES:**
- ❌ "sitting on a knife's edge"
- ❌ "game-changer" / "game changing"
- ❌ "double-edged sword"
- ❌ "paradigm shift"
- ❌ "revolutionary"
- ❌ "groundbreaking"
- ❌ "alarming"
- ❌ "shocking"
- ❌ "incredible"
- ❌ "mind-blowing"

**GOOD SIGNALS:**
- ✅ Opening hooks the reader with plain, direct language
- ✅ Body flows naturally with varied sentence length
- ✅ Story escalates logically (background → points → implications)
- ✅ Closing delivers "wow" factor without hyperbole
- ✅ Reads naturally when spoken aloud
- ✅ Sticks to facts from the content
- ✅ Feels like Daniel sharing something interesting

## STEP 7: Format Complete Output

Present the final story explanation:

```markdown
In this [content type], [opening hook that sets up the content - 15-25 words, first person].

[Body sentence 1 - background/context].

[Body sentence 2 - main point].

[Body sentence 3 - example or elaboration].

[Body sentence 4 - implication or insight].

[Continue for 5-15 total body sentences with natural flow and varied length]

[Closing sentence - "wow" factor without hyperbole, 15-25 words, first person].
```

## STEP 8: Save Output to Scratchpad

Save final story explanation to scratchpad:
- `${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_story-explanation-[topic]/final-story-explanation.md`

**Optional:** If analysis methodology is exceptionally valuable, archive to:
- `${PAI_DIR}/History/Research/YYYY-MM/YYYY-MM-DD-HHMMSS_AGENT-default_RESEARCH_[topic]-narrative-framing-analysis.md`

Include:
- Final story explanation
- UltraThink analysis notes
- Explanation of why the chosen framing was selected

## ERROR HANDLING

**If content is too short:**
- Notify user: "The content is quite brief - I can generate a story explanation, but it will be on the shorter side (around 3-5 body sentences). Proceed?"
- Wait for confirmation

**If narrative framing unclear:**
- Present 2-3 framing options discovered through UltraThink
- Ask user to choose: "I see multiple compelling angles: [Option 1], [Option 2], [Option 3]. Which framing would you prefer?"
- Wait for user selection before proceeding

**If UltraThink analysis is unclear:**
- Present 2-3 top framing options discovered
- Ask user to choose preferred angle

**If content extraction fails:**
- For YouTube: Try alternative methods or ask user to provide transcript
- For URLs: Explain issue and ask for text paste as fallback
- Provide clear error message and recovery options

## PRESENTATION

Present the complete story explanation with:
- Clear structure (opening → body → closing)
- Natural conversational flow
- Daniel's casual, first-person voice
- Line breaks between sentences for readability
- No section headers in final output (just the narrative)

**Important:**
- Use UltraThink to explore 5-7 different narrative possibilities
- Select the SINGLE most compelling framing
- Output in 3-part format (opening/body/closing)
- Daniel's voice is critical - casual, first person, direct, genuinely curious
- Story should feel like telling someone about something interesting you read
- Avoid cliches, journalistic language, hyperbole
- Stick to facts - don't extrapolate beyond the input

Execute this workflow now.
