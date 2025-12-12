# /specfirst-release

Prepare a release with strict discipline - file inventory, validation, and sanitization.

## When Invoked

1. **Ask for release details:**
   > What are you releasing? (skill name, version)

2. **Create RELEASE-vX.Y.Z.md with file inventory:**

```markdown
# [Skill] Release vX.Y.Z

## Release Info
| Field | Value |
|-------|-------|
| Version | vX.Y.Z |
| Date | YYYY-MM-DD |
| Status | In Progress |

## File Inventory

| # | File | Include | Reason |
|---|------|---------|--------|
| 1 | path/to/file | Yes/No | Why |

## Pre-Release Checklist
- [ ] File inventory complete
- [ ] No PII or secrets
- [ ] Tests pass
- [ ] CHANGELOG.md updated
```

3. **Run pre-release checks:**
   - Verify files match inventory
   - Check for secrets/PII patterns
   - Run test suite

4. **Guide through git workflow:**
   ```bash
   # Create contrib branch
   git checkout -b contrib-[skill]-vX.Y.Z upstream/main

   # Cherry-pick from file inventory
   git checkout [tag] -- [files from inventory]

   # Verify and commit
   git diff --name-only --cached
   ```

5. **Only proceed to push after explicit approval**

## Reference

See `.claude/skills/SpecFirst/workflows/Release.md` for full workflow.
