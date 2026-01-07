---
name: Secrets
description: Retrieve and manage secrets from various backends (Keychain, Infisical, etc.)
---

# Secrets Skill

Portable secrets management across multiple backends.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| GetSecret | Retrieve a single secret by key | Secret value (revealed) |
| ListSecrets | List available secret keys | Array of key names |
| CheckHealth | Verify secrets provider connectivity | Health status |

## Examples

### Get a secret

```
User: "Get the API_KEY secret"
Skill: GetSecret workflow
Output: Reveals the secret value
```

### List available secrets

```
User: "What secrets are available?"
Skill: ListSecrets workflow
Output: Lists all secret keys matching pattern
```

### Check provider health

```
User: "Is the secrets provider working?"
Skill: CheckHealth workflow
Output: Provider health status with diagnostics
```

## CLI Tools

### get.ts

Retrieve a single secret:

```bash
bun run Tools/get.ts API_KEY
bun run Tools/get.ts API_KEY --env production
bun run Tools/get.ts API_KEY --adapter keychain
bun run Tools/get.ts API_KEY --json
```

### list.ts

List secret keys:

```bash
bun run Tools/list.ts
bun run Tools/list.ts --pattern "API_*"
bun run Tools/list.ts --limit 10
bun run Tools/list.ts --adapter infisical
```

### health.ts

Check provider health:

```bash
bun run Tools/health.ts
bun run Tools/health.ts --adapter keychain
```

## Configuration

Configure in `~/.config/kai/providers.yaml`:

```yaml
domains:
  secrets:
    primary: keychain
    fallback: env
    adapters:
      keychain:
        servicePrefix: kai
      infisical:
        url: https://app.infisical.com
        auth:
          type: keychain
          service: infisical-token
        project: your-project-id
```

## Security

- All secrets are wrapped in `SecretValue` which redacts on toString/JSON
- Secrets are only revealed when explicitly calling `.reveal()`
- Audit logging tracks all access (never logs values)
- Use keychain for local development, Infisical for team/CI

## Adapters

| Adapter | Best For | Platform |
|---------|----------|----------|
| keychain | Local development | macOS only |
| infisical | Team/CI secrets | Cross-platform |
| mock | Testing | Cross-platform |
| env | Simple deployments | Cross-platform |

## Integration

This skill works with:
- **kai-security-skill**: Secrets for security scanning
- **kai-deployment-skill**: Environment-specific secrets
- **kai-standup-skill**: Can discuss secrets architecture
