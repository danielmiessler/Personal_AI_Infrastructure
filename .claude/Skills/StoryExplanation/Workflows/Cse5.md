---
title: CSE5 - Create Story Explanation (5-Line)
description: Generate clean 5-line story explanations from content using Foundry MCP
type: prompt
---

# CSE5 - Create Story Explanation (5-Line)

This command creates clean, scannable 5-line story explanations from blog posts, articles, or any content using the Foundry MCP service.

## When to Use This Command

**USE THIS COMMAND WHEN:**
- User asks to "explain this story in 5 lines"
- User wants a "5-line summary" or "5-line explanation"
- User asks for "CSE5" or mentions the CSE5 command
- User wants a clean, numbered breakdown of a story/article
- User needs a scannable, digestible explanation format

**DO NOT:**
- Write summaries manually
- Use other summarization tools
- Create bullet points or other formats
- Use regular create_story_explanation without the 5-line formatting

**THIS IS THE PRIMARY TOOL** for creating clean, numbered 5-line story explanations.

## How It Works

1. **Check if input is a URL**:
   - If the input starts with http:// or https://
   - First run: `fabric -y <URL>` to fetch the content
   - Use the fetched content as input for step 2

2. **Call Foundry MCP** - Use the `mcp__Foundry__create-story-explanation-5` tool with the input content
3. **Parse the output** - Take the detailed explanation from Foundry
4. **Reformat to 5 lines** - Convert to clean, numbered, scannable format
5. **Output the result** - Display the 5-line explanation

## Output Format

The output must be exactly 5 lines, numbered, with one clear concept per line:

```
1. [First key point - setup/context]
2. [Second key point - problem/challenge]
3. [Third key point - solution/approach]
4. [Fourth key point - implementation/action]
5. [Fifth key point - outcome/impact]
```

## Quality Requirements

**CRITICAL**:
- Exactly 5 lines, no more, no less
- Each line is one complete, clear sentence
- No complex nested clauses or run-on sentences
- Numbered for easy scanning
- Each line covers one distinct concept
- Lines flow logically from 1 to 5
- Simple, readable language
- No fluff or filler words

## Implementation Steps

1. **Check for URL Input**:
   - Detect if input is a URL (starts with http:// or https://)
   - If URL: Run `fabric -y <URL>` to fetch content
   - Store fetched content as input for next step

2. **Call Foundry MCP Service**:
   ```
   Use mcp__Foundry__create-story-explanation-5 with the input content
   (Either direct content or content fetched from URL)
   ```

3. **Analyze the Output**:
   - Read the full explanation from Foundry
   - Identify the 5 key points
   - Determine the logical flow

4. **Format to 5 Lines**:
   - Create numbered list (1-5)
   - One clear sentence per line
   - Ensure logical progression
   - Keep language simple and scannable

5. **Output**:
   - Display the clean 5-line format
   - No extra commentary or explanation
   - Just the numbered list

## Example

**Input**: Blog post about AI and UBI

**Output**:
```
1. AI creates a 90-10 economy where most people can't find work
2. Governments provide UBI for money but people still need purpose
3. Tech companies get contracted to build hyper-immersive game worlds
4. People build entire lives in these games as an alternative to traditional careers
5. This prevents social unrest by replacing work-based meaning with digital fulfillment
```

## Usage

```
/cse5 [content to explain]
```

Or provide content and say "run CSE5 on this" or "explain this in 5 lines"

## Notes

- The Foundry service does the heavy lifting of understanding the story
- Your job is to reformat it into the clean 5-line structure
- Focus on making it scannable and digestible
- Each line should be self-contained but flow with the others
- Keep it simple - no jargon unless necessary
