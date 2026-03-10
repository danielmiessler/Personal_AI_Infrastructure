## ISC Decomposition Methodology

**The core principle: each ISC criterion = one atomic verifiable thing.** If a criterion can fail in two independent ways, it's two criteria. Granularity is not optional — it's what makes the system work. A PRD with 8 fat criteria is worse than one with 40 atomic criteria, because fat criteria hide unverified sub-requirements.

**The Splitting Test — apply to EVERY criterion before finalizing:**

1. **"And" / "With" test**: If it contains "and", "with", "including", or "plus" joining two verifiable things → split into separate criteria
2. **Independent failure test**: Can part A pass while part B fails? → they're separate criteria
3. **Scope word test**: "All", "every", "complete", "full" → enumerate what "all" means. "All tests pass" for 4 test files = 4 criteria, one per file
4. **Domain boundary test**: Does it cross UI/API/data/logic boundaries? → one criterion per boundary

**Decomposition by domain:**

| Domain | Decompose per... | Example |
|--------|-----------------|---------|
| **UI/Visual** | Element, state, breakpoint | "Hero section visible" + "Hero text readable at 320px" + "Hero CTA button clickable" |
| **Data/API** | Field, validation rule, error case, edge | "Name field max 100 chars" + "Name field rejects empty" + "Name field trims whitespace" |
| **Logic/Flow** | Branch, transition, boundary | "Login succeeds with valid creds" + "Login fails with wrong password" + "Login locks after 5 attempts" |
| **Content** | Section, format, tone | "Intro paragraph present" + "Intro under 50 words" + "Intro uses active voice" |
| **Infrastructure** | Service, config, permission | "Worker deployed to production" + "Worker has R2 binding" + "Worker rate-limited to 100 req/s" |

**Granularity example — same task at two decomposition depths:**

Coarse (8 ISC — WRONG for Extended+):
```
- [ ] ISC-1: Blog publishing workflow handles draft to published transition
- [ ] ISC-2: Markdown content renders correctly with all formatting
- [ ] ISC-3: SEO metadata generated and validated for each post
```

Atomic (showing 3 of those same areas decomposed to ~12 criteria each):
```
Draft-to-Published:
- [ ] ISC-1: Draft status stored in frontmatter YAML field
- [ ] ISC-2: Published status stored in frontmatter YAML field
- [ ] ISC-3: Status transition requires explicit user confirmation
- [ ] ISC-4: Published timestamp set on first publish only
- [ ] ISC-5: Slug auto-generated from title on draft creation
- [ ] ISC-6: Slug immutable after first publish

Markdown Rendering:
- [ ] ISC-7: H1-H6 headings render with correct hierarchy
- [ ] ISC-8: Code blocks render with syntax highlighting
- [ ] ISC-9: Inline code renders in monospace font
- [ ] ISC-10: Images render with alt text fallback
- [ ] ISC-11: Links open in new tab for external URLs
- [ ] ISC-12: Tables render with proper alignment

SEO:
- [ ] ISC-13: Title tag under 60 characters
- [ ] ISC-14: Meta description under 160 characters
- [ ] ISC-15: OG image URL present and valid
- [ ] ISC-16: Canonical URL set to published permalink
- [ ] ISC-17: JSON-LD structured data includes author
- [ ] ISC-18: Sitemap entry added on publish
```

The coarse version has 3 criteria that each hide 6+ verifiable sub-requirements. The atomic version makes each independently testable. **Always write atomic.**
