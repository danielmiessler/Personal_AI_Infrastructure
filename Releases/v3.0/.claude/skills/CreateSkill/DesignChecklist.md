# Skill Design Checklist

Reference checklist for skill creation. Load during any CreateSkill workflow.

---

## 1. The Front Matter Formula

```
description: {What it does -- concrete, specific}. USE WHEN {trigger phrases separated by commas}.
```

- The description is Level 1 -- it determines whether the skill fires AT ALL
- Every character counts. Max 1,024 characters (Anthropic hard limit)
- The "what" portion must disambiguate from ALL other skills in the index
- Triggers must be exact phrases a user would type, not semantic descriptions

**Good:** `Convert, parse, and summarize document files. USE WHEN .docx, .pdf, parse document, extract text from file.`

**Bad:** `Helps with document processing. USE WHEN documents, files, processing.`

---

## 2. The Three Tests

Run all three before shipping any skill:

1. **Triggering Test** -- Open a fresh terminal, type a trigger phrase naturally. Does the skill appear in the loaded skills list? Test at least 3 trigger phrases.
2. **Functional Test** -- Run the skill 4-5 times with different inputs. Does it produce correct output each time?
3. **Benchmark Test** -- Could this be a simple script instead? Skills add cognitive overhead to every session (Level 1 loads at startup). If a bash script or TS file achieves 90% of the value, it should NOT be a skill.

---

## 3. Character Budget

| Target | Usage |
|--------|-------|
| Under 300 chars | Most skills |
| 300-600 chars | Skills with many trigger phrases |
| 600-1,024 chars | Multi-capability skills (rare) |
| Over 1,024 chars | IMPOSSIBLE -- hard limit, will be truncated |

**Wasted characters to eliminate:**
- `SkillSearch('x') for docs.` -- model already knows how to find skill docs; this burns Level 1 budget on model-facing guidance
- Filler words: "helps with", "assists in", "provides support for"
- Redundant triggers that are substrings of each other

Every word in the description must earn its place.

---

## 4. Trigger Quality Rules

- Exact phrases > semantic matching (the model matches triggers literally first)
- Include file types when relevant (`.docx`, `.pdf`, `YouTube URL`)
- Include tool/platform names (`wrangler`, `Bright Data`, `Apify`)
- Include both formal AND casual phrasing (`scrape URL` AND `web scraping`)
- No overlap with other skills -- check existing skill descriptions before finalizing
- Never use generic English words alone (`help`, `do`, `make`, `run`)

**Validation step:** For each trigger, ask: "If a user types ONLY this phrase, should this skill -- and no other -- fire?" If the answer is no, the trigger is too broad.

---

## 5. Five Design Patterns

| Pattern | When | Example |
|---------|------|---------|
| Sequential | Steps must run in order | Research -> Extract -> Summarize |
| Multi-MCP | Orchestrates multiple external tool servers | Browser + API + Database |
| Iterative Refinement | Output improves over rounds | Draft -> Review -> Revise |
| Conditional Branching | Different paths based on input type | URL vs file vs text |
| Domain-Specific Intelligence | Deep domain knowledge baked in | Security assessment, legal analysis |

Most skills are Sequential or Conditional Branching. Reach for Multi-MCP and Iterative Refinement only when the task genuinely requires them.

---

## 6. Anti-Patterns

**Description anti-patterns:**
- "Helps with projects" -- could apply to ANY skill, zero signal
- Buzzwords without specifics -- "management", "workflows", "processing" alone
- Descriptions that fit 5+ other skills unchanged
- Adding `SkillSearch('x') for docs.` to the description

**Trigger anti-patterns:**
- Single common English words (`help`, `do`, `create` without qualifier)
- Triggers that are subsets of another skill's triggers
- Semantic-only triggers with no exact phrase match (`when the user wants to organize things`)

**Structural anti-patterns:**
- Duplicating functionality that exists in another skill (check the index first)
- Building a skill for something a 10-line bash script handles
- SKILL.md over 100 lines without using the dynamic loading pattern
- Context files buried in subdirectories instead of skill root
