---
title: Create Abridged Story Explanation
description: Generate 5-line story explanations from URLs, YouTube videos, or raw text
type: prompt
---

# Create Abridged Story Explanation

This command creates ultra-concise 5-line story explanations (5-12 words per line) from any source: articles, YouTube videos, or raw text.

## When to Use This Command

**USE THIS COMMAND WHEN:**
- User asks to "create abridged story explanation"
- User wants a "5-line summary" from a URL, YouTube video, or text
- User needs ultra-concise story format with strict word limits
- User asks for shortened explanation of content

**DO NOT:**
- Write summaries manually
- Use other summarization tools
- Create longer formats

## How It Works

1. **Detect Input Type**:
   - **YouTube URL**: Contains "youtube.com" or "youtu.be"
   - **Regular URL**: Starts with http:// or https://
   - **Raw Text**: Everything else

2. **Fetch Content**:
   - **YouTube**: Run `yt --transcript <URL>` to get video transcript
   - **URL**: Run `fabric -y <URL>` to fetch web content
   - **Raw Text**: Use directly as input

3. **Process with Foundry MCP**:
   - Call `mcp__Foundry__create-story-explanation-5` with the fetched/provided content

4. **Output**: Display the 5-line explanation with strict word limits

## Output Format

Exactly 5 lines with 5-12 words per line:

```
[Line 1: Setup - 5-12 words]

[Line 2: Background - 5-12 words]

[Line 3: Main Point - 5-12 words]

[Line 4: Implication - 5-12 words]

[Line 5: Impact - 5-12 words]
```

## Quality Requirements

**CRITICAL**:
- Exactly 5 lines, no more, no less
- Each line contains 5-12 words ONLY
- Period at end of each line
- Single line break between lines
- No bullet points or numbers
- No additional commentary
- Daniel's casual, conversational voice

## Implementation Steps

### Step 1: Detect Input Type

Check the user's input:
- If contains "youtube.com" or "youtu.be" → YouTube video
- If starts with "http://" or "https://" → Regular URL
- Otherwise → Raw text

### Step 2: Fetch Content Based on Type

**For YouTube Videos**:
```bash
yt --transcript <YOUTUBE_URL>
```

**For URLs**:
```bash
fabric -y <URL>
```

**For Raw Text**:
- Use the provided text directly

### Step 3: Call Foundry MCP Service

```
Use mcp__Foundry__create-story-explanation-5 with:
{
  "input": "[fetched content or raw text]"
}
```

### Step 4: Format Output

- Take the result from Foundry MCP
- Verify each line is 5-12 words
- Ensure proper formatting (line breaks, periods)
- Output the clean 5-line format

## Example Workflows

### Example 1: YouTube Video

**User Input**:
```
/create-abridged-story-explanation https://youtube.com/watch?v=abc123
```

**Process**:
1. Detect: YouTube URL
2. Fetch: `yt --transcript https://youtube.com/watch?v=abc123`
3. Process: Send transcript to Foundry MCP
4. Output: 5-line explanation

### Example 2: Article URL

**User Input**:
```
/create-abridged-story-explanation https://example.com/article
```

**Process**:
1. Detect: Regular URL
2. Fetch: `fabric -y https://example.com/article`
3. Process: Send content to Foundry MCP
4. Output: 5-line explanation

### Example 3: Raw Text

**User Input**:
```
/create-abridged-story-explanation A new study shows that AI models can develop unexpected behaviors...
```

**Process**:
1. Detect: Raw text
2. Skip fetch: Use text directly
3. Process: Send text to Foundry MCP
4. Output: 5-line explanation

## Output Example

```
This researcher studied how AI language models learn and evolve.

They discovered these models develop abilities nobody explicitly programmed in.

The surprising finding suggests consciousness-like properties emerge from sheer complexity.

This challenges our assumptions about what creates genuine awareness.

It means consciousness might not require biological brains after all.
```

## Error Handling

**If YouTube transcript fails**:
- Try alternative method or inform user transcript unavailable

**If URL fetch fails**:
- Inform user the URL couldn't be fetched
- Suggest providing raw text instead

**If input is unclear**:
- Ask user to clarify if it's a URL, YouTube link, or raw text

## Usage

```bash
# YouTube video
/create-abridged-story-explanation https://youtube.com/watch?v=VIDEO_ID

# Article URL
/create-abridged-story-explanation https://example.com/article

# Raw text
/create-abridged-story-explanation [paste your content here]
```

## Notes

- The Foundry MCP service handles the AI processing
- Your job is to detect input type, fetch content, and format output
- Focus on the 5-12 word limit per line - this is non-negotiable
- Use Daniel's voice: casual, direct, conversational
- No flowery language or journalistic clichés
