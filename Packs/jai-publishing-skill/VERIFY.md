# Verification - JAI Publishing Skill

Run these steps to verify the skill is installed correctly.

## Quick Verification

```bash
# 1. Check skill files exist
ls ~/PAI/skills/Publishing/
# Expected: README.md, SKILL.md, INSTALL.md, VERIFY.md, Workflows/

# 2. Check workflows exist
ls ~/PAI/skills/Publishing/Workflows/
# Expected: SiteReview.md, KeywordResearch.md, KeywordPlan.md,
#           CreateArticle.md, BatchArticles.md, PublishSchedule.md

# 3. Check dependency (jai-publishing-core)
ls ~/PAI/packs/jai-publishing-core/Tools/
# Expected: Calendar.ts, KeywordQueue.ts, SeoChecker.ts, types.ts
```

## Functional Verification

### Test 1: Keyword Queue Access

```bash
# Should show help or empty queue
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list --site=pispy
```

Expected: Shows keyword list or "No keywords found"

### Test 2: Calendar Access

```bash
# Should show calendar or empty
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts list --site=pispy
```

Expected: Shows calendar entries or "No entries found"

### Test 3: Site Context Exists

```bash
# Check site context file
cat ~/sites/pispycameras.com/.pai/site-context.md 2>/dev/null || echo "Site context not found - create it!"
```

Expected: Shows site context or reminder to create it

### Test 4: Workflow Triggers (Manual)

Ask Claude (with Publishing skill loaded):

1. "Show me the keyword queue for pispy"
   - Should route to KeywordPlan.md workflow

2. "What's the publishing schedule?"
   - Should route to PublishSchedule.md workflow

3. "Site review for pispycameras"
   - Should route to SiteReview.md workflow

## Integration Verification

### GitLab CI/CD (if configured)

```bash
# Check runner is registered
gitlab-runner list

# Test pipeline trigger (dry run)
cd ~/sites/pispycameras.com
gitlab-ci-lint .gitlab-ci.yml
```

### Claude CLI Integration

```bash
# Test claude -p with skill invocation
claude -p "Use jai-publishing-skill: Show keyword queue stats for pispy" --max-turns 3
```

Expected: Returns keyword queue statistics

## All Tests Passed?

If all verification steps complete successfully:

1. Skill is correctly installed at `~/PAI/skills/Publishing/`
2. Core dependency (jai-publishing-core) is working
3. Workflows are accessible
4. Site context is configured

The skill is ready for use.

## Troubleshooting

### "Skill not found"
- Check skill is in correct location: `~/PAI/skills/Publishing/`
- Verify SKILL.md exists and has correct frontmatter

### "Tools not found"
- Ensure jai-publishing-core is installed: `ls ~/PAI/packs/jai-publishing-core/`
- Run `bun install` in the core pack directory

### "Site context missing"
- Create `.pai/` directory in site repo
- Add `site-context.md` and `article-template.md`

### "Calendar/Keywords empty"
- Initialize with sample data:
  ```bash
  bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts add "test keyword" --site=pispy --topic="Test"
  bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts init --site=pispy
  ```

### GitLab Runner Issues
- Check runner status: `gitlab-runner status`
- Verify tags match: `vps, pai, publishing`
- Check logs: `journalctl -u gitlab-runner -f`
