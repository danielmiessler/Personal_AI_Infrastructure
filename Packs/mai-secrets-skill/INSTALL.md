# mai-secrets-skill Installation

User-facing skill for secrets management. Provides CLI tools and workflows for retrieving secrets from various backends (Keychain, Infisical, etc.).

## Prerequisites

- Bun runtime (v1.0+)
- `mai-secrets-core` installed
- A secrets adapter (e.g., `mai-keychain-adapter`)
- Configured backend with secrets

---

## Step 1: Install Dependencies

Ensure the core package and an adapter are installed first:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Install core
cd "$PAI_DIR/packs/mai-secrets-core"
bun install

# Install an adapter (e.g., Keychain for macOS)
cd "$PAI_DIR/packs/mai-keychain-adapter"
bun install
```

---

## Step 2: Install the Skill

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
SKILLS_DIR="$PAI_DIR/skills"

# Create skills directory
mkdir -p "$SKILLS_DIR"

# Copy or link the skill
cp -r /path/to/mai-secrets-skill "$SKILLS_DIR/Secrets"

# Install skill dependencies
cd "$SKILLS_DIR/Secrets"
bun install
```

---

## Step 3: Configure Secrets Backend

Create or update `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  secrets:
    primary: keychain
    fallback: env
    adapters:
      keychain:
        servicePrefix: pai
      infisical:
        url: https://app.infisical.com
        project: your-project-id
        auth:
          type: keychain
          service: infisical-token
```

### Adapter Configuration Examples

#### macOS Keychain

```yaml
adapters:
  keychain:
    servicePrefix: pai  # secrets stored as "pai-<key>"
```

#### Infisical

```yaml
adapters:
  infisical:
    url: https://app.infisical.com
    project: your-project-id
    environment: production  # or dev, staging
    auth:
      type: keychain
      service: infisical-token
```

#### Environment Variables (Simple)

```yaml
adapters:
  env:
    prefix: PAI_  # reads PAI_<KEY> from environment
```

---

## Step 4: Add Some Test Secrets

### For Keychain (macOS)

```bash
# Add a test secret
security add-generic-password -s "pai-test-secret" -a "default" -w "my-secret-value"

# Verify it exists
security find-generic-password -s "pai-test-secret" -a "default" -w
```

### For Environment Variables

```bash
export PAI_TEST_SECRET="my-secret-value"
```

---

## Step 5: Verify Installation

See `VERIFY.md` for the complete checklist, or run:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Secrets/Tools"

# Check health
bun run "$TOOLS/health.ts"

# List available secrets
bun run "$TOOLS/list.ts"

# Get a specific secret
bun run "$TOOLS/get.ts" test-secret
```

---

## Step 6: Test CLI Tools

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Secrets/Tools"

# Get a secret
bun run "$TOOLS/get.ts" API_KEY

# Get with specific environment
bun run "$TOOLS/get.ts" API_KEY --env production

# Get from specific adapter
bun run "$TOOLS/get.ts" API_KEY --adapter keychain

# JSON output
bun run "$TOOLS/get.ts" API_KEY --json

# List secrets
bun run "$TOOLS/list.ts"

# List with pattern filter
bun run "$TOOLS/list.ts" --pattern "AWS_*"

# Health check
bun run "$TOOLS/health.ts"

# Health for specific adapter
bun run "$TOOLS/health.ts" --adapter infisical
```

---

## Troubleshooting

### "Secret not found" error

1. Verify the secret exists in your backend
2. Check the service prefix matches your config
3. For keychain:
   ```bash
   security find-generic-password -s "pai-YOUR_KEY" -w
   ```

### Health check fails

1. Check adapter is properly configured in `providers.yaml`
2. Verify backend connectivity (network, auth)
3. For Infisical, ensure token is valid

### "Provider not found" error

1. Ensure core package is installed:
   ```bash
   cd "${PAI_DIR:-$HOME/.config/pai}/packs/mai-secrets-core"
   bun install
   ```

2. Ensure adapter is installed:
   ```bash
   cd "${PAI_DIR:-$HOME/.config/pai}/packs/mai-keychain-adapter"
   bun install
   ```

### Module/import errors

```bash
cd "${PAI_DIR:-$HOME/.config/pai}/skills/Secrets"
bun install
```

### Keychain access denied (macOS)

If prompted for keychain access, click "Always Allow" to prevent repeated prompts, or use:

```bash
security unlock-keychain
```

---

## File Locations

After installation:

```
${PAI_DIR:-$HOME/.config/pai}/
  providers.yaml
  skills/
    Secrets/
      SKILL.md              # Skill definition and workflow routing
      README.md
      VERIFY.md
      INSTALL.md
      package.json
      Tools/
        get.ts              # Retrieve a single secret
        list.ts             # List available keys
        health.ts           # Check provider health
      Workflows/
        GetSecret.md
        ListSecrets.md
        CheckHealth.md
```

---

## Usage Examples

### Via CLI

```bash
# Basic get
bun run Tools/get.ts DATABASE_URL

# With environment
bun run Tools/get.ts DATABASE_URL --env production

# List all secrets
bun run Tools/list.ts

# List with pattern
bun run Tools/list.ts --pattern "DB_*"

# JSON output for scripting
bun run Tools/get.ts API_KEY --json
```

### Via Claude Code

The skill integrates with Claude Code workflows:

- "Get the DATABASE_URL secret" -> GetSecret workflow
- "What secrets are available?" -> ListSecrets workflow
- "Is the secrets provider working?" -> CheckHealth workflow

---

## Security Notes

1. **Secrets are wrapped** - All values are returned as `SecretValue` which shows `[REDACTED]` by default
2. **Explicit reveal required** - You must call `.reveal()` to access the actual value
3. **Audit logging** - All access is logged (values are never logged)
4. **Use keychain for local dev** - Environment variables are less secure
5. **Use Infisical for teams** - Provides access control and audit trails

---

## Next Steps

1. Populate your secrets backend with required secrets
2. Set up fallback chains for reliability
3. Configure environment-specific secrets (dev, staging, prod)
4. Enable audit logging for compliance
