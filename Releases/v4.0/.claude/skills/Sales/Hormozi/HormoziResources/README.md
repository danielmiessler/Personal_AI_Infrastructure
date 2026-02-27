# Hormozi Skill - Complete Business Methodology

**Created:** October 29, 2025
**Status:** Complete and operational
**Knowledge Base:** Comprehensive (15+ frameworks, 50+ tactics, 100+ quotes)

---

## Overview

This skill provides complete access to Alex Hormozi's business methodology including all books, frameworks, techniques, philosophy, and content strategy. It features auto-update capabilities to keep the knowledge base current with new content.

## Skill Structure

```
~/.claude/skills/hormozi/
├── SKILL.md                    # Main skill file with functions and usage
├── README.md                   # This file
├── context/                    # Knowledge base context files
│   ├── books-and-frameworks.md      # All books and 15+ frameworks
│   ├── business-wisdom.md           # Philosophy, mindset, principles
│   └── youtube-content.md           # Channel info and content strategy
├── updates/                    # Update tracking
│   └── knowledge-updates.log        # Log of all knowledge base updates
└── tools/                      # Implementation tools
    ├── harvest-knowledge.ts         # Extract content from URLs
    └── update-knowledge.ts          # Check for new content
```

## Knowledge Base Contents

### Books (4 Total)
- $100M Offers (2021) - 1M+ copies sold
- $100M Leads (2023)
- $100M Money Models (2025) - Guinness World Record launch
- Gym Launch Secrets (Early work)

### Frameworks (15+)
- Value Equation
- Grand Slam Offer (6-step construction)
- Core Four (Lead generation matrix)
- CLOSER Sales Framework
- Triple A Objection Handling
- More Better New (Scaling)
- Rule of 100 (Momentum building)
- Lead Getters (4 types)
- Guarantee Frameworks (4 types)
- Delivery Cube (DIY/DWY/DFY)
- Pricing Psychology (8+ strategies)
- Content Strategy (93-7 rule)
- BSL Framework (Building, Selling, Leading)
- ICE Decision Framework
- Leverage Stack

### Business Wisdom
- Philosophy and mindset
- Core mantras ("I cannot lose if I do not quit", etc.)
- Decision-making frameworks
- Life philosophy (optimistic nihilism)
- Long-term vs short-term greedy
- 50+ memorable quotes

### YouTube & Content
- Official channel: https://www.youtube.com/@AlexHormozi (3.69M subs)
- Content strategy (Twitter-first, 93-7 rule)
- Repurposing system
- Best videos by topic
- Platform optimization strategies

## How to Use This Skill

### 1. Apply Hormozi Methodology

**Usage:**
```
"Apply Hormozi frameworks to [my offering]"
"Use Hormozi's Value Equation for [my product]"
"Help me create a Grand Slam Offer for [service]"
```

**What {DAIDENTITY.NAME} does:**
1. Loads relevant Hormozi frameworks
2. Asks for details about your offering
3. Applies frameworks systematically
4. Provides specific recommendations
5. References quotes and principles

### 2. Harvest New Content

**Usage:**
```
"Harvest hormozi knowledge from [URL]"
"Add this Hormozi video to the knowledge base: [URL]"
```

**What {DAIDENTITY.NAME} does:**
1. Detects content type (YouTube, blog, podcast)
2. Extracts content (fabric -y for YouTube)
3. Analyzes for new insights/frameworks
4. Updates appropriate context files
5. Logs update to knowledge-updates.log

**Supported Sources:**
- YouTube videos (uses fabric -y for transcripts)
- Blog posts (uses WebFetch)
- Podcasts (uses WebFetch for transcripts)
- Articles and interviews

### 3. Update All Knowledge

**Usage:**
```
"Update hormozi knowledge"
"Check for new Hormozi content"
```

**What {DAIDENTITY.NAME} does:**
1. Reads last update timestamp from log
2. Searches for new YouTube videos
3. Searches for new blog posts/articles
4. Harvests content from all new sources
5. Updates context files systematically
6. Logs all updates with timestamps

### 4. Query Knowledge

**Usage:**
```
"What does Hormozi say about pricing?"
"How does the Core Four work?"
"Explain Hormozi's value equation"
"What's the Rule of 100?"
```

**What {DAIDENTITY.NAME} does:**
1. Searches context files for relevant information
2. Provides comprehensive answer
3. Includes specific frameworks
4. References quotes and principles
5. Gives application examples

## Knowledge Base Maintenance

### Initial Research
- **Date:** October 29, 2025
- **Method:** 24 parallel research agents
- **Coverage:** All books, frameworks, wisdom, YouTube strategy
- **Confidence:** High (90%+ for core frameworks)

### Updates Log
**Location:** `updates/knowledge-updates.log`

**Format:**
```
YYYY-MM-DD HH:MM:SS | UPDATE | Source: [url] | Type: [video|blog|podcast] | Added: [summary] | Files: [files updated]
```

**Last Update:** 2025-10-29 16:30:00 (Initial comprehensive research)

### Recommended Update Frequency
- **Manual harvesting:** As new important content is discovered
- **Full update check:** Monthly
- **Major content:** Immediately (new books, major frameworks)

## Implementation Details

### Harvest Function
**Tool:** `tools/harvest-knowledge.ts`

**Process:**
1. Takes URL as input
2. Detects content type
3. Extracts content:
   - YouTube → `fabric -y [url]` for transcript
   - Web → WebFetch for content
4. Outputs structured content for {DAIDENTITY.NAME} to analyze
5. {DAIDENTITY.NAME} integrates into knowledge base

**{DAIDENTITY.NAME}'s Role:**
- Analyze extracted content
- Identify new frameworks/insights
- Determine which context file(s) to update
- Update files with new knowledge
- Log update to knowledge-updates.log

### Update Function
**Tool:** `tools/update-knowledge.ts`

**Process:**
1. Reads knowledge-updates.log for last update date
2. Checks YouTube for new videos since then
3. Checks for new blog posts/articles
4. Outputs list of new sources
5. {DAIDENTITY.NAME} harvests each source
6. Integrates all new knowledge

**{DAIDENTITY.NAME}'s Role:**
- Search for new content since last update
- Run harvest for each new source
- Analyze all new content
- Update context files systematically
- Log all updates

## Context Files

### books-and-frameworks.md (91KB)
- Complete book catalog
- All 15+ frameworks with step-by-step processes
- Implementation by business type (B2B/B2C)
- Stage-based application (Startup/Growth/Scale)

### business-wisdom.md (25KB)
- Core business principles
- Mindset and psychology
- Decision-making frameworks
- Life philosophy
- 50+ memorable quotes
- Contrarian views

### youtube-content.md (15KB)
- Official YouTube channel info
- Most popular videos
- Content strategy (93-7 rule, Twitter-first)
- Platform optimization
- Repurposing system
- Content evolution

## Examples

### Example 1: Apply to Offering
```
User: "Apply Hormozi to my coaching business"

{DAIDENTITY.NAME}:
1. Loads hormozi skill
2. Asks for details about coaching offering
3. Applies Value Equation analysis
4. Suggests Grand Slam Offer improvements
5. Recommends pricing psychology tactics
6. Provides CLOSER framework for sales
7. References specific Hormozi quotes
```

### Example 2: Harvest Content
```
User: "Harvest hormozi knowledge from https://youtube.com/watch?v=abc123"

{DAIDENTITY.NAME}:
1. Runs: bun harvest-knowledge.ts [url]
2. Gets transcript via fabric -y
3. Analyzes for new insights
4. Updates youtube-content.md with video info
5. Updates books-and-frameworks.md if new framework found
6. Logs to knowledge-updates.log:
   2025-11-15 14:30:00 | UPDATE | Source: [url] | Type: video | Added: New framework "Certainty Stack" | Files: books-and-frameworks.md
```

### Example 3: Update All
```
User: "Update hormozi knowledge"

{DAIDENTITY.NAME}:
1. Runs: bun update-knowledge.ts
2. Last update: 2025-10-29
3. Searches YouTube for new videos since then
4. Finds 5 new videos
5. Harvests each video:
   - Extracts transcript
   - Analyzes content
   - Updates context files
6. Logs all 5 updates to knowledge-updates.log
7. Reports summary of what was learned
```

## Quick Reference

### Core Principles
- "I cannot lose if I do not quit"
- Volume over perfection: "Do so much volume it would be unreasonable to suck"
- Value Equation: (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort)
- Cash flow over appreciation
- Long-term greedy: Build trust for years, monetize for decades

### Key Frameworks
- **Offers:** Value Equation, Grand Slam Offer, Guarantees, Pricing
- **Leads:** Core Four, More Better New, Rule of 100, Lead Getters
- **Sales:** CLOSER, Triple A Objection Handling
- **Scaling:** BSL Framework, Leverage Stack, Delivery Cube

### YouTube Channel
https://www.youtube.com/@AlexHormozi
- 3.69M subscribers
- 813M+ views
- Business-focused content
- No fluff, all actionable

## Technical Notes

### Dependencies
- **bun**: Runtime for TypeScript tools
- **fabric**: CLI tool for YouTube transcript extraction (`fabric -y`)
- **WebFetch**: Built-in tool for web content extraction
- **WebSearch**: Built-in tool for finding new content

### File Permissions
All tools are executable (`chmod +x tools/*.ts`)

### Error Handling
- Tools output errors to stderr
- Structured content to stdout
- {DAIDENTITY.NAME} handles integration logic
- Updates log tracks all changes

## Future Enhancements

### Potential Additions
1. **Interactive Offer Builder** - Step-by-step Grand Slam Offer creation wizard
2. **Framework Selector** - Recommend best framework for specific situation
3. **Quote Search** - Find relevant quotes by topic/situation
4. **Case Study Library** - Expand with more real-world examples
5. **Integration Templates** - Pre-built applications for common scenarios

### Monitoring
- Track which frameworks are most requested
- Monitor new content frequency from Hormozi
- Identify knowledge gaps for research

## Support

### Troubleshooting

**Issue:** Harvest fails to extract YouTube content
**Solution:** Ensure fabric is installed and working: `fabric -y [test-url]`

**Issue:** Update finds no new content
**Solution:** Check knowledge-updates.log for last update date, verify searching correct date range

**Issue:** Context files seem outdated
**Solution:** Run update function to check for new content, manually harvest important recent videos

### Maintenance

**Weekly:** Check for important new videos/content
**Monthly:** Run full update check
**Quarterly:** Review and organize knowledge base
**Annually:** Comprehensive audit of all frameworks

---

## Summary

This skill provides:
✅ Complete Hormozi methodology (15+ frameworks)
✅ All books knowledge (Offers, Leads, Money Models)
✅ Business wisdom and philosophy
✅ YouTube and content strategy
✅ Auto-update capabilities
✅ Knowledge harvesting from URLs
✅ Comprehensive and current knowledge base

**Ready to use for:**
- Offer creation and optimization
- Lead generation planning
- Sales process design
- Pricing strategy
- Business scaling decisions
- Mindset and philosophy application

---

**The Hormozi skill is complete, comprehensive, and continuously updated to provide the most current business methodology from Alex Hormozi.**
