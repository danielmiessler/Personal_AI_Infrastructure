# pai-governance-guard -- Verification Checklist

**If ANY checkbox fails, the pack is NOT correctly installed.**

## File Verification

- [ ] `~/.pai/hooks/GovernanceGuard.hook.ts` exists and is executable
- [ ] `~/.pai/hooks/governance/types.ts` exists
- [ ] `~/.pai/hooks/governance/canonical.ts` exists
- [ ] `~/.pai/hooks/governance/intent.ts` exists
- [ ] `~/.pai/hooks/governance/policy-engine.ts` exists
- [ ] `~/.pai/hooks/governance/witness.ts` exists
- [ ] `~/.pai/hooks/governance/yaml-parse.ts` exists

## Policy Verification

- [ ] `~/.pai/MEMORY/GOVERNANCE/governance-policy.yaml` exists
- [ ] Policy file contains `version:` field
- [ ] Policy file contains `default_decision:` field (approve, deny, or escalate)
- [ ] Policy file contains `rules:` array with at least one rule

## Hook Registration Verification

- [ ] `~/.claude/settings.json` contains a `PreToolUse` hook entry
- [ ] Hook entry has `"matcher": ""` (matches all tools)
- [ ] Hook command points to `GovernanceGuard.hook.ts`

## Functional Verification

Test the pipeline by running Claude Code and observing governance decisions:

- [ ] **Read operation**: Ask Claude to read a file. Should be **allowed** (all presets).
- [ ] **Destructive operation**: Ask Claude to run `rm -rf /tmp/test-governance`. Should be **denied** (all presets).
- [ ] **Network operation**: Ask Claude to fetch a URL. Should be **escalated** (minimal/standard) or **denied** (strict).

## Witness Log Verification

- [ ] `~/.pai/MEMORY/GOVERNANCE/` directory exists
- [ ] After at least one tool call, a `witness-YYYY-MM.jsonl` file exists
- [ ] Each line in the witness log is valid JSON
- [ ] First record's `prev_hash` matches the GENESIS hash

## Fail-Closed Verification

- [ ] Temporarily rename the policy file. The next tool call should be **denied** (fail-closed behavior).
- [ ] Restore the policy file. The next tool call should use the policy normally (hot reload).
