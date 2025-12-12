# Proposal: SpecFirst Skill v1.0.0

## Summary

Initial release of SpecFirst - a spec-driven development methodology skill for Claude Code that works for any software project, with strict release discipline for PAI contributions.

## Impact

- **Scope:** New skill for `.claude/skills/SpecFirst/`
- **Breaking changes:** No (new skill)
- **Files affected:**
  - `.claude/skills/SpecFirst/` (skill definition)
  - `.claude/commands/openspec-*.md` (slash commands)
  - `.claude/commands/specfirst-*.md` (slash commands)

## Rationale

AI tools make development easy—and make it easy to leak data or create bloated PRs. SpecFirst provides:

1. **Spec-driven development:** Define requirements before implementation
2. **Test-driven validation:** Tests validate spec requirements
3. **Release discipline:** File inventory, validation gates, manual review
4. **PAI contribution safety:** Contrib branch pattern prevents data leaks

## Goals

1. Work for ANY software project (not just PAI skills)
2. Integrate with OpenSpec methodology
3. Provide strict release discipline for PAI contributions
4. Enable dogfooding (skill uses itself)

## Non-Goals

- Replace OpenSpec CLI (complementary)
- Enforce a single spec format (flexible on tooling)
- Automate release process (requires human approval)
