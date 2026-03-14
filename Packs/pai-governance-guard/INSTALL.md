# pai-governance-guard -- Installation

## Prerequisites

- Claude Code CLI installed
- Node.js >= 20 or Bun runtime
- PAI directory at `~/.pai/` (or `$PAI_DIR`)

## Step 1: Copy Hook Files

Copy the governance source files to your PAI hooks directory:

```bash
# Create governance directory
mkdir -p ~/.pai/hooks/governance

# Copy hook entry point
cp src/hooks/GovernanceGuard.hook.ts ~/.pai/hooks/GovernanceGuard.hook.ts

# Copy governance modules
cp src/governance/types.ts ~/.pai/hooks/governance/types.ts
cp src/governance/canonical.ts ~/.pai/hooks/governance/canonical.ts
cp src/governance/intent.ts ~/.pai/hooks/governance/intent.ts
cp src/governance/policy-engine.ts ~/.pai/hooks/governance/policy-engine.ts
cp src/governance/witness.ts ~/.pai/hooks/governance/witness.ts
cp src/governance/yaml-parse.ts ~/.pai/hooks/governance/yaml-parse.ts
```

## Step 2: Choose and Install a Policy

Copy one of the three policy presets to your PAI governance directory:

```bash
# Create governance memory directory
mkdir -p ~/.pai/MEMORY/GOVERNANCE

# Option A: Minimal (blocks destructive + credentials, allows everything else)
cp policies/minimal.yaml ~/.pai/MEMORY/GOVERNANCE/governance-policy.yaml

# Option B: Standard (deny-default, explicit allows) -- RECOMMENDED
cp policies/standard.yaml ~/.pai/MEMORY/GOVERNANCE/governance-policy.yaml

# Option C: Strict (read-only, denies everything else)
cp policies/strict.yaml ~/.pai/MEMORY/GOVERNANCE/governance-policy.yaml
```

You can also place a project-specific policy at `.claude/governance-policy.yaml` in any project directory. Project-level policies take precedence over user-level policies.

## Step 3: Register the Hook

Add the governance-guard hook to your Claude Code settings. Merge the following into `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ~/.pai/hooks/GovernanceGuard.hook.ts",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

If you use Node.js instead of Bun, replace `bun run` with `node --import tsx`.

**Important:** If you already have PreToolUse hooks (like SecurityValidator), add the governance-guard entry to the existing array. Both hooks will run for each tool call.

## Step 4: Verify Installation

Run the verification checklist in [VERIFY.md](VERIFY.md).

## Policy Customization

Edit your `governance-policy.yaml` to customize rules. See [references/policy-schema.md](references/policy-schema.md) for the full policy format documentation.

**Hot reload:** Policy changes take effect on the next tool call -- no restart required.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PAI_DIR` | PAI root directory | `~/.pai` |
| `GOVERNANCE_POLICY` | Explicit policy file path | Auto-resolved |

## Uninstall

1. Remove the hook entry from `~/.claude/settings.json`
2. Delete `~/.pai/hooks/GovernanceGuard.hook.ts` and `~/.pai/hooks/governance/`
3. Optionally delete `~/.pai/MEMORY/GOVERNANCE/` (contains witness logs)
