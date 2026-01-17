# Extract Alpha

Extract the highest-alpha ideas from content using deep thinking analysis.

Finds the most surprising, insightful, and novel ideas through systematic deep reasoning.
Focuses on what's genuinely new, counterintuitive, and profound.

USE WHEN analyzing podcasts, videos, articles, essays, or any content where you want to capture
the most important and surprising insights without missing subtle but profound ideas.

## Core Philosophy

Based on Claude Shannon's information theory: **real information is what's different, not what's the same.**

This skill finds:
- Net new ideas and novel presentations
- New frameworks for combining ideas
- Surprising insights that challenge assumptions
- Subtle but profound observations
- Non-obvious connections and implications

**The Problem This Solves:** Standard extraction often misses:
- Subtle philosophical implications
- Non-obvious connections between ideas
- Counterintuitive observations buried in conversation
- Novel frameworks that aren't explicitly stated
- Surprising reframings of common concepts
- Low-probability but brilliant insights

## When to Activate This Skill

- Analyzing YouTube videos, podcasts, interviews
- Processing essays, articles, blog posts
- Deep content analysis where missing insights is unacceptable
- User says "extract the most important ideas"
- Need to find alpha/novelty in dense content
- Standard patterns failed to capture key insights
- User explicitly requests "extract alpha" or "deep analysis"

## The Five-Step Process

### Step 1: Content Extraction

**For YouTube videos:**
```bash
fabric -y "YOUTUBE_URL"
```

**For other content:**
- Paste text directly
- Use WebFetch for articles
- Read from files

### Step 2: Deep Thinking Analysis

Before extracting anything, engage in extended deep thinking:

**Deep Thinking Protocol:**
```
DEEP ANALYSIS MODE:

Think deeply and extensively about this content:

1. SURFACE SCAN - What are the obvious main points?
2. DEPTH PROBE - What implications aren't explicitly stated?
3. CONNECTION MAP - What unusual connections exist between ideas?
   - WONDER TRIGGER: What makes you stop and think "wait, how does THAT work?"
   - CROSS-DOMAIN PATTERNS: What seemingly different things share the same underlying principle?
   - PERSONAL RELEVANCE: What applies to YOUR life in a surprising way?
   - AHA MOMENTS: What connections make you see familiar things differently?
4. ASSUMPTION CHALLENGE - What conventional wisdom is being questioned?
5. NOVELTY DETECTION - What's genuinely new or surprising here?
6. FRAMEWORK EXTRACTION - What mental models or frameworks emerge?
7. SUBTLE INSIGHTS - What quiet observations carry profound weight?
8. CONTRARIAN ANGLES - What goes against common thinking?
9. FUTURE IMPLICATIONS - What does this suggest about what's coming?
10. SYNTHESIS - What are the highest-alpha ideas across all dimensions?

Allow thinking to wander and make unexpected connections.
Question every assumption about what's "important."
Look for ideas that make you pause and reconsider.
Prioritize novelty and surprise over comprehensiveness.
```

### Step 3: Extract Insights

After deep thinking, extract the highest-alpha insights:

**Extraction Protocol:**
```
Generate 24-30 highest-alpha ideas from your deep analysis.

For each insight:
- Write in 8-12 word bullets (allow flexibility for clarity)
- Use approachable Paul Graham style
- Prioritize ideas that:
  * Make you pause and think "wait, WHAT?"
  * Spark curiosity or wonder
  * Reveal cross-domain patterns
  * Expose underlying associations that weren't obvious
  * Feel personally relevant or change how you see yourself
  * Challenge how you understand familiar things
  * Make you want to tell someone else
  * Create "holy shit" or "aha!" moments
  * Include specific details WHEN they enhance the surprise/insight
  * Make you reconsider your assumptions about the world

Focus on low-probability insights that are coherent and valuable.
Avoid obvious takeaways and surface-level observations.
Capture the subtle genius buried in the content.
```

### Step 4: File Organization

**Working Files (Scratch):** `~/.claude/MEMORY/WORK/{current_work}/scratch/`

**Permanent Output (History):** `~/.claude/History/research/YYYY-MM-DD_description/`
- `extract_alpha.md` - Final 24-30 insights
- `deep-analysis.md` - Full deep thinking analysis
- `README.md` - Documentation of the research session

### Step 5: Output

Simple markdown list with blank lines between items:

```markdown
# EXTRACT ALPHA

- First high-alpha insight in approachable style

- Second surprising idea that challenges assumptions

- Novel framework or mental model discovered

- Non-obvious connection between concepts

- Counterintuitive observation with implications

- Subtle but profound philosophical point

[... continue for 24-30 items total ...]
```

**Quality over quantity:** If content only has 15 truly novel insights, extract 15. Don't pad with obvious ideas.

## What to Look For

### HIGH-ALPHA SIGNALS:
- Makes you stop and reconsider something you thought you knew
- Connects ideas from different domains unexpectedly
- Challenges industry consensus or common wisdom
- Reframes a familiar concept in a surprising way
- Has second-order implications not explicitly stated
- Feels counterintuitive but makes sense upon reflection
- Represents a novel mental model or framework
- Captures a subtle observation with profound weight

### LOW-ALPHA SIGNALS (avoid):
- Restates common knowledge
- Obvious implications or direct quotes of main points
- Generic advice that could apply to anything
- Surface-level observations without depth
- Ideas you've heard many times before
- Purely factual information without insight

## Key Principles

1. **Think first, extract second** - deep thinking before output
2. **Focus on low-probability insights** - Don't just grab obvious ideas
3. **Prioritize surprise** - Novel > comprehensive
4. **Capture subtlety** - Profound quiet observations matter
5. **Challenge assumptions** - What's the conventional wisdom being questioned?
6. **Find connections** - Non-obvious links between ideas
7. **Flexible length** - 8-12 words, whatever achieves clarity
8. **Quality threshold** - Better 15 brilliant insights than 30 padded ones
9. **Cross-domain patterns** - Same principles across different fields
10. **Personal relevance** - What changes how you see things?

## Success Criteria

You've succeeded with this skill when:
- User says "YES! That's exactly the insight I was thinking about!"
- Extracted ideas include subtle observations you almost missed
- Low-probability but profound insights are captured
- Novel frameworks and mental models are identified
- Reading the extraction makes you reconsider your understanding
- No important surprising ideas are missing from the output
