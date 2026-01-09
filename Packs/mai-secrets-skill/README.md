# mai-secrets-skill

User-facing skill for secrets management in PAI.

## Overview

This skill provides workflows and CLI tools for retrieving secrets from various backends. It uses mai-secrets-core for the provider abstraction and supports multiple adapters.

## Installation

Add to your PAI skills:

```yaml
# In your PAI config
skills:
  - mai-secrets-skill
```

## Usage

### Via Claude Code

```
User: "Get the DATABASE_URL secret"
Charles: *Uses GetSecret workflow*
The DATABASE_URL secret value is: [revealed value]
```

### Via CLI

```bash
# Get a secret
bun run Tools/get.ts API_KEY

# List secrets
bun run Tools/list.ts --pattern "AWS_*"

# Check health
bun run Tools/health.ts
```

## Workflows

- **GetSecret.md** - Retrieve a single secret
- **ListSecrets.md** - List available keys
- **CheckHealth.md** - Verify provider status

## Configuration

Requires a `providers.yaml` configuration. See SKILL.md for details.

## License

MIT
