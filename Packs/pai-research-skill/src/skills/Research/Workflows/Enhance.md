# Enhance Content Workflow

Comprehensive content enhancement for blog posts and articles.

## CRITICAL: Link Verification Rules

**NEVER CREATE DEAD LINKS**
- Always verify internal blog post URLs exist before creating links
- Check the actual markdown files for the correct slug
- Never guess URLs - always verify with `ls cms/blog/[slug].md`

## Features

### Link Enhancement
- Identifies key terms, tools, products, or concepts
- Researches official/authoritative links
- Adds hyperlinks to body text only (never headers)
- Preserves existing links

### Image Enhancement
- Ensures all images have width and height attributes
- Makes images clickable links to full-size versions
- Adds or updates captions with "(click for full size)"
- Formats as: `[![Alt](/image.png)](/image.png) <!-- width="X" height="Y" -->`

### Code Block Enhancement
- Adds language syntax highlighting to code blocks
- Ensures proper formatting with triple backticks
- Supports line highlighting where appropriate

### Content Structure
- Identifies and wraps standalone wisdom/insights in `<aside>` tags
- Wraps important information in `<callout>` tags
- Uses `<tutorial>` for technical tips or narrator voice
- Adds `<caption>` tags after tables
- Ensures proper use of `<blockquote>` with `<cite>`

### Other Enhancements
- Converts natural language content hints to proper formatting
- Ensures all note entries end with periods
- Maintains frontmatter integrity
- Preserves markdown structure

## Usage

```bash
# Enhance a single blog post
cat my-post.md | enhance-content > my-post-enhanced.md

# Process multiple files
for file in *.md; do
  cat "$file" | enhance-content > "enhanced-$file"
done

# Preview changes
cat post.md | enhance-content | diff post.md -
```

## Formatting Rules Applied

The workflow applies all formatting rules including:
- Image dimensions and clickable links
- Proper code block formatting
- Aside/callout/tutorial components
- Table captions
- Natural language conversion
- Link addition to key terms
