# CSE - Create Story Explanation

This command creates comprehensive story explanations from blog posts, articles, or any content using an embedded Foundry-style prompt.

## When to Use This Command

**USE THIS COMMAND WHEN:**
- User asks to "explain this story"
- User wants a detailed story explanation or breakdown
- User asks for "CSE" or mentions the CSE command
- User wants a comprehensive narrative explanation
- User needs a full understanding of content structure and meaning
- User specifies a number of lines (e.g., CSE3, CSE24, /cse 10)

**DO NOT:**
- Write explanations manually without using the prompt
- Use other summarization tools
- Create bullet points or other formats without the explanation

**THIS IS THE PRIMARY TOOL** for creating comprehensive story explanations.

## Command Syntax

**Format:** `/cse [NUMBER] [content]` or `/cse[NUMBER] [content]`

**Examples:**
- `/cse leaky abstraction` → 8 lines (default)
- `/cse 3 leaky abstraction` → 3 lines
- `/cse3 leaky abstraction` → 3 lines
- `/cse 24 leaky abstraction` → 24 lines
- `/cse24 https://example.com/article` → 24 lines from URL

**Number Parsing:**
- If no number specified: default to 8 lines
- If number provided (space-separated or concatenated): use that number
- Minimum: 3 lines
- Maximum: 50 lines (practical limit)

## How It Works

1. **Parse the number argument**:
   - Check if command has a number (e.g., `/cse3`, `/cse 24`)
   - Extract the number from command or arguments
   - Default to 8 if no number specified
   - Validate: minimum 3, maximum 50

2. **Check if input is a URL**:
   - If the input starts with http:// or https://
   - First run: `fabric -y <URL>` to fetch the content
   - Use the fetched content as input for next step

3. **Apply the Story Explanation Prompt** - Use the embedded Foundry prompt below with the input content and line count
4. **Generate the explanation** - Follow the prompt instructions exactly with specified number of lines
5. **Output the result** - Display the full story explanation with requested number of lines

## The Story Explanation Prompt

```
# Background

You excel at understanding complex content and explaining it in a conversational, story-like format that helps readers grasp the impact and significance of ideas.

# Task

Transform the provided content into a clear, approachable summary that walks readers through the key concepts in a flowing narrative style.

# Instructions

## Analysis approach

- Take time to deeply examine the content from multiple perspectives
- Look at it from different angles until you truly understand what makes it significant
- Identify the core ideas and how they connect
- Find the most compelling way to explain this - the way you'd actually explain it if you spent hours understanding it and then shared it with a friend
- Ask yourself: "What would make someone think 'wow, I get it now!' and want to share this?"

## Output structure

Create a numbered narrative summary with N lines (specified by command, default 8):

**Format:**
```
📖 STORY EXPLANATION:
1. [First sentence - 8-16 words]
2. [Second sentence - 8-16 words]
3. [Third sentence - 8-16 words]
... (continue for N lines)
N. [Final sentence - 8-16 words]
```

**Requirements:**
- Exactly N numbered lines (where N is specified by user, default 8)
- Each line 8-16 words (VARY the length naturally - some short, some longer)
- Numbered 1 through N for consistency
- Period at end of each sentence
- Varied sentence starters (Don't start every sentence with "I" or "The")
- Natural conversational flow (like explaining to a friend)
- Escalating story-based flow: background → main points → examples → implications → wow factor
- Written in 9th-grade English (conversational, not dumbed down)
- Adjust depth and coverage based on line count (3 lines = high-level, 24 lines = detailed)

**Example (8 lines - default):**
```
📖 STORY EXPLANATION:
1. The speaker is a scientist who studies DNA and the brain.
2. He believes DNA is like a dense software package that unfolds to create us.
3. This software not only creates our bodies but our minds and souls too.
4. Consciousness is second-order perception designed to help us thrive in his model.
5. He also links this thinking to Anamism where all living things have souls.
6. This connects ancient spiritual beliefs with modern molecular biology in interesting ways.
7. His theory suggests consciousness emerges from DNA's unfolding instructions over time.
8. If he's right, he basically just explained consciousness and free will together.
```

**Example (3 lines - concise):**
```
📖 STORY EXPLANATION:
1. Joel Spolsky's Law of Leaky Abstractions states all non-trivial abstractions leak implementation details.
2. SQL databases and TCP networking both abstract complexity but expose internals when stressed.
3. Experienced developers must understand lower layers because complexity relocates rather than disappears.
```

**Example (12 lines - detailed):**
```
📖 STORY EXPLANATION:
1. A leaky abstraction is when simplified interfaces fail to hide underlying complexity.
2. Joel Spolsky coined the Law of Leaky Abstractions in software engineering.
3. The law states all non-trivial abstractions eventually leak their implementation details.
4. Abstractions are created to hide complexity and make things easier to use.
5. But these abstractions inevitably expose details when things go wrong or get stressed.
6. SQL databases abstract file systems but expose indexes when queries slow down.
7. TCP/IP promises reliable transfer but you face timeouts when connections fail.
8. Each abstraction layer leaks, creating stacks of partially-hidden complexity that compound.
9. This means developers can't just learn the high-level interface they work with.
10. They must understand six layers beneath because leaks expose lower implementation details.
11. Experienced developers need deep knowledge of supposedly irrelevant lower-level systems.
12. The core insight: complexity can't be eliminated, only relocated until it surfaces.
```

## Voice and style

Write as Daniel Miessler sharing something interesting with his audience:
- First person perspective
- Casual, direct, genuinely curious and excited
- Natural conversational tone (like telling a friend after you really got it)
- Never flowery, emotional, or journalistic
- Let the content speak for itself

**Avoid all cliche phrases:**
- "sitting on a knife's edge"
- "game-changer" / "game changing"
- "double-edged sword"
- "paradigm shift"
- "revolutionary"
- "groundbreaking"
- "alarming"
- "shocking"
- "incredible"
- "mind-blowing"

## Formatting

- Output Markdown only
- No bullet markers - separate sentences with line breaks
- Period at end of each sentence
- Stick to the facts - don't extrapolate beyond the input
```

## Output Format

The output is a comprehensive narrative explanation that:
- Explains the core story and key points
- Provides context and background
- Highlights the main arguments or themes
- Describes the flow and structure
- Captures the author's intent and message

## Quality Requirements

**CRITICAL**:
- Complete, detailed explanation
- Clear narrative flow
- Captures all key concepts
- Explains the "so what" and implications
- Readable and accessible language
- Maintains the author's perspective
- Follows the prompt format EXACTLY (opening, bullets, closing)

## Implementation Steps

1. **Parse Command Arguments**:
   - Extract number from command: `/cse3` → 3, `/cse 24` → 24, `/cse` → 8 (default)
   - Validate: minimum 3, maximum 50 lines
   - Store the line count for use in output generation

2. **Check for URL Input**:
   - Detect if remaining input is a URL (starts with http:// or https://)
   - If URL: Run `fabric -y <URL>` to fetch content
   - Store fetched content as input for next step

3. **Apply the Embedded Prompt**:
   - Use the Story Explanation Prompt above
   - Specify the exact number of lines required
   - Replace {{input}} with the actual content
   - Follow all instructions in the prompt
   - Generate the explanation with specified line count

4. **Output the Result**:
   - Display the full explanation
   - Ensure it has exactly N numbered lines (1 through N)
   - Each line 8-16 words
   - Present it cleanly and readably

## Example

**Input**: Blog post about AI and UBI

**Output**: A comprehensive narrative that explains the article's argument about how AI-driven inequality will require both UBI for financial support and government-funded immersive games to provide meaning and purpose, preventing social unrest as traditional career paths disappear for many people.

## Usage

**Basic:**
```
/cse [content to explain]
```
Default: 8 lines

**With custom line count:**
```
/cse [NUMBER] [content to explain]
/cse[NUMBER] [content to explain]
```

**Examples:**
```
/cse leaky abstraction
/cse 3 leaky abstraction
/cse3 leaky abstraction
/cse 24 https://example.com/article
/cse24 https://example.com/article
```

Or provide content and say:
- "run CSE on this" (8 lines)
- "run CSE3 on this" (3 lines)
- "explain this story with 24 lines" (24 lines)

## Notes

- Uses the Foundry-style prompt embedded directly in this workflow
- More detailed than CSE5 (5-line version)
- Use CSE5 when user wants brevity
- Use CSE when user wants comprehensive understanding
- The explanation captures both content and context
- No external MCP dependencies required
