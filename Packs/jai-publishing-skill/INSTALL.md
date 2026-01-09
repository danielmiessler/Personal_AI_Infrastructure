# Installation - JAI Publishing Skill

## Prerequisites

1. **jai-publishing-core** must be installed first
   ```bash
   ls ~/PAI/packs/jai-publishing-core/
   ```

2. **Site repositories** cloned to `~/sites/`
   ```bash
   ls ~/sites/pispycameras.com/
   ls ~/sites/pg101/  # when available
   ```

3. **Site context files** created
   ```bash
   ls ~/sites/[site]/.pai/site-context.md
   ls ~/sites/[site]/.pai/article-template.md
   ```

## Installation Steps

### 1. Copy Skill to PAI

```bash
cp -r ~/src/pai/Personal_AI_Infrastructure/Packs/jai-publishing-skill ~/PAI/skills/Publishing
```

### 2. Verify Structure

```bash
ls ~/PAI/skills/Publishing/
# Expected:
# README.md
# SKILL.md
# INSTALL.md
# VERIFY.md
# Workflows/
```

### 3. Update Skill Index (if applicable)

If your PAI setup uses a skill index:

```bash
# Add to ~/PAI/skills/skill-index.json
{
  "Publishing": {
    "path": "~/PAI/skills/Publishing",
    "triggers": ["site review", "keyword research", "create article", "batch articles", "publishing schedule"]
  }
}
```

### 4. Create Site Context (if not exists)

For each site, create the `.pai/` directory with context files:

```bash
mkdir -p ~/sites/pispycameras.com/.pai
```

Create `site-context.md`:
```markdown
# Site Context: pispycameras.com

## Identity
- **Niche:** Trail cameras and outdoor surveillance
- **Audience:** Hunters, wildlife enthusiasts, property owners
- **Tone:** Helpful, authoritative, practical

## Content Guidelines
- Focus on product comparisons and buying guides
- Include real-world use cases
- Honest pros/cons for each product

## Affiliate Program
- Amazon Associates
- Direct manufacturer programs

## Legal
- FTC disclosure required on all affiliate content
- Amazon attribution requirements apply
```

Create `article-template.md`:
```markdown
# Article Template

## Structure
1. Introduction (hook + problem)
2. Quick Answer (TL;DR)
3. Top Picks (3-5 products)
4. Detailed Reviews
5. Buying Guide
6. FAQ
7. Conclusion

## SEO Requirements
- Primary keyword in title
- H2s contain keyword variations
- Meta description 120-160 chars
- Internal links to related articles

## Affiliate Requirements
- Disclosure at top of article
- Amazon attribution on product images
- Nofollow on affiliate links
```

## Post-Installation

1. Run verification: `See VERIFY.md`
2. Test with: `"Show me the keyword queue for pispycameras"`
3. Configure GitLab CI/CD for automation (optional)

## Uninstallation

```bash
rm -rf ~/PAI/skills/Publishing
# Remove from skill-index.json if applicable
```
