# CSE - Create Story Explanation

This command creates comprehensive story explanations from blog posts, articles, or any content using the Foundry MCP service.

## When to Use This Command

**USE THIS COMMAND WHEN:**
- User asks to "explain this story"
- User wants a detailed story explanation or breakdown
- User asks for "CSE" or mentions the CSE command
- User wants a comprehensive narrative explanation
- User needs a full understanding of content structure and meaning

**DO NOT:**
- Write explanations manually
- Use other summarization tools
- Use CSE5 if user specifically wants 5 lines
- Create bullet points or other formats without the explanation

**THIS IS THE PRIMARY TOOL** for creating comprehensive story explanations.

## How It Works

1. **Check if input is a URL**:
   - If the input starts with http:// or https://
   - First run: `fabric -y <URL>` to fetch the content
   - Use the fetched content as input for step 2

2. **Call Foundry MCP** - Use the `mcp__Foundry__create_story_explanation` tool with the input content
3. **Receive the explanation** - Get the detailed narrative explanation from Foundry
4. **Output the result** - Display the full story explanation

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

## Implementation Steps

1. **Check for URL Input**:
   - Detect if input is a URL (starts with http:// or https://)
   - If URL: Run `fabric -y <URL>` to fetch content
   - Store fetched content as input for next step

2. **Call Foundry MCP Service**:
   ```
   Use mcp__Foundry__create_story_explanation with the input content
   (Either direct content or content fetched from URL)
   ```

3. **Output the Result**:
   - Display the full explanation from Foundry
   - No need to reformat or restructure
   - Present it cleanly and readably

## Example

**Input**: Blog post about AI and UBI

**Output**: A comprehensive narrative that explains the article's argument about how AI-driven inequality will require both UBI for financial support and government-funded immersive games to provide meaning and purpose, preventing social unrest as traditional career paths disappear for many people.

## Usage

```
/cse [content to explain]
```

Or provide content and say "run CSE on this" or "explain this story"

## Notes

- The Foundry service provides a complete narrative explanation
- More detailed than CSE5 (5-line version)
- Use CSE5 when user wants brevity
- Use CSE when user wants comprehensive understanding
- The explanation captures both content and context
