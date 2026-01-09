# Create Article Workflow

Generate a single SEO-optimized affiliate article.

## Trigger

User says: "write article about [topic]", "create article for [keyword]", "generate article"

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| site | Yes | Target site (pispy, pg101) |
| keyword | Yes | Primary keyword or topic |
| products | No | Specific products to feature |

## Workflow Steps

### 1. Load Site Context

```bash
cat ~/sites/[site]/.pai/site-context.md
cat ~/sites/[site]/.pai/article-template.md
```

### 2. Get Keyword from Queue (if applicable)

```bash
# If using queue, get next high-priority keyword
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts next --site=[site]
```

### 3. Research Phase

#### Competitor Analysis
- Search for existing articles on the keyword
- Identify content gaps and unique angles
- Note common questions answered

#### Product Research
- Identify relevant products for affiliate links
- Gather product specifications
- Note price points and features

### 4. Create Article Outline

Structure based on site template:
1. **Hook/Introduction** - Problem or question addressed
2. **Quick Answer** - TL;DR for skimmers
3. **Product Recommendations** - Featured products with affiliate links
4. **Detailed Analysis** - In-depth comparison/review
5. **Buying Guide** - What to look for
6. **FAQ Section** - Common questions
7. **Conclusion** - Summary and top pick

### 5. Write Article Content

Generate article following:
- Site voice and tone from context
- SEO best practices (keyword density, headers)
- Natural affiliate link integration
- Proper product attribution

### 6. Add Media

- **Hero Image:** Use Art skill or stock photo
- **Product Images:** From Amazon or manufacturer
- **Comparison Tables:** For multiple products
- **YouTube Embeds:** Relevant review videos

### 7. SEO Validation

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/SeoChecker.ts ~/sites/[site]/src/pages/articles/[slug].astro
```

Fix any issues:
- Title length
- Meta description
- Header structure
- Keyword usage
- Internal links

### 8. Output Article File

Create Astro file at:
```
~/sites/[site]/src/pages/articles/[slug].astro
```

### 9. Update Tracking

```bash
# Mark keyword as complete
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts update [id] --status=published

# Add to content calendar if scheduling
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts add "[title]" --site=[site] --date=[date]
```

## Output Format

```markdown
## Article Created

### Details
- **Title:** [title]
- **Keyword:** [keyword]
- **File:** ~/sites/[site]/src/pages/articles/[slug].astro
- **Word Count:** [count]

### SEO Score
- **Overall:** [score]/100
- **Issues:** [count]

### Products Featured
1. [product name] - [affiliate status]
2. [product name] - [affiliate status]

### Next Steps
- [ ] Review article content
- [ ] Verify affiliate links work
- [ ] Add to publishing schedule
- [ ] Commit and deploy
```

## Automation (GitLab CI/CD)

For scheduled article generation:

```bash
claude -p "Use jai-publishing-skill: Create article from next keyword in [site] queue" --max-turns 15
```

## Related Workflows

- `KeywordPlan.md` - Review keywords before writing
- `BatchArticles.md` - Queue multiple articles
- `PublishSchedule.md` - Schedule publication
