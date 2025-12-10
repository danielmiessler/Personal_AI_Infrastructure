# CreateArticle Workflow

Research, write, and optimize a blog article from concept to publish-ready draft.

## Trigger Phrases
- "write an article about"
- "create a blog post"
- "help me write about"
- "draft content on"

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| topic | Yes | Article topic or title |
| target_keyword | No | Primary SEO keyword |
| content_type | No | blog, tutorial, announcement (default: blog) |
| target_length | No | Word count target (default: 1500) |
| site_path | No | Where to save the article |

## Workflow Steps

### Step 1: Research Phase

**Keyword Research** (if target_keyword not provided):
```markdown
## Keyword Analysis for: [Topic]

### Primary Keyword Options
1. [keyword] - Volume: [X], Difficulty: [Y]
2. [keyword] - Volume: [X], Difficulty: [Y]

### Recommended Primary: [keyword]
Reason: [Why this keyword?]

### Secondary Keywords
- [keyword]
- [keyword]
- [keyword]
```

**Competitive Analysis**:
```markdown
## Top 5 Ranking Articles

1. **[Title]** - [URL]
   - Covers: [topics]
   - Misses: [gaps]
   - Word count: ~[X]

2. **[Title]** - [URL]
   ...
```

**Unique Angle**:
```markdown
## Our Angle

What makes this article different:
- [Differentiator 1]
- [Differentiator 2]
- [Unique insight or experience]
```

### Step 2: Outline Creation

Generate structured outline:

```markdown
# [Article Title]

## Introduction
- Hook: [Attention grabber]
- Problem: [Why this matters]
- Promise: [What reader will learn]

## Section 1: [Topic]
- Point A
- Point B
- Example/Code

## Section 2: [Topic]
- Point A
- Point B
- Example/Code

## Section 3: [Topic]
- Point A
- Point B
- Example/Code

## Conclusion
- Summary
- Call to action
```

### Step 3: Draft Writing

Write each section following the outline:

**Writing Guidelines**:
- Write conversationally (imagine explaining to a colleague)
- Use active voice
- Short paragraphs (2-4 sentences)
- Include code examples for technical content
- Add subheadings every 300 words

**Section Template**:
```markdown
## [Section Title]

[Opening sentence - what this section covers]

[Main content - explanation, examples, details]

[Transition to next section]
```

### Step 4: SEO Optimization

**Frontmatter**:
```yaml
---
title: "[Keyword-rich title under 60 chars]"
description: "[Compelling description, 150-160 chars, includes keyword]"
date: YYYY-MM-DD
author: "[Author name]"
tags: [tag1, tag2, tag3]
image: "/images/blog/[slug]/cover.webp"
draft: false
---
```

**Content Optimization Checklist**:
- [ ] Primary keyword in title
- [ ] Primary keyword in first 100 words
- [ ] Secondary keywords in H2 headings
- [ ] Image alt text includes keywords
- [ ] Internal links to 2-3 related articles
- [ ] External links to authoritative sources
- [ ] Meta description is compelling

### Step 5: Media Assets

**Images**:
- Cover image (1200x630 for social sharing)
- In-article images as needed
- Compress all images (WebP preferred)

```bash
# Image optimization example
# Uses imagemagick or similar
convert input.png -resize 1200x630 -quality 85 output.webp
```

**Code Blocks**:
- Syntax highlighting enabled
- Copy button if supported by theme
- Comments explaining key parts

### Step 6: Final Review

**Pre-publish Checklist**:
- [ ] Read aloud for flow
- [ ] Check spelling and grammar
- [ ] Verify all links work
- [ ] Preview on mobile
- [ ] Check code blocks render correctly
- [ ] Confirm images load
- [ ] Review meta/OG tags

### Step 7: Save Article

Save to repository:

```bash
# Create article directory
mkdir -p content/blog/2025/01-january/article-slug

# Save article
# content/blog/2025/01-january/article-slug/index.md
```

## Output

Complete article with:
- Optimized frontmatter
- Well-structured content
- SEO optimization applied
- Images prepared
- Ready for publish or review

## Integration Points

- **Cloudflare Pages**: Deploy target
- **ScheduledPublishing**: If article should publish later
- **GitLab**: Optional PR workflow for review

## Templates

### Blog Post
```markdown
---
title: ""
description: ""
date: YYYY-MM-DD
tags: []
---

[Introduction - 100-150 words]

## [Section 1]

[Content]

## [Section 2]

[Content]

## [Section 3]

[Content]

## Conclusion

[Summary and CTA]
```

### Tutorial
```markdown
---
title: "How to [Goal]"
description: ""
date: YYYY-MM-DD
tags: [tutorial]
---

In this tutorial, you'll learn how to [goal].

## Prerequisites

- [Requirement 1]
- [Requirement 2]

## Step 1: [Action]

[Explanation]

\`\`\`[language]
[code]
\`\`\`

## Step 2: [Action]

[Continue pattern]

## Testing

[How to verify it works]

## Next Steps

[Where to go from here]
```

## Tips

1. **Research first**: 30 minutes of research saves hours of rewriting
2. **Outline before writing**: Structure prevents rambling
3. **Write ugly first**: Get ideas down, then edit
4. **One idea per section**: Keep it focused
5. **End with action**: Tell readers what to do next
