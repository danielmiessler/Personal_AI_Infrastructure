# Infisical Adapter Installation

Infisical secrets adapter for secure secrets management. Supports both self-hosted and cloud Infisical instances.

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS** (for Keychain authentication)
- **Infisical account** with API access
- **Infisical Service Token or Universal Auth credentials**
- **mai-secrets-core** package (peer dependency)

---

## Step 1: Verify Environment

```bash
# Check Bun is installed
bun --version

# Check PAI directory
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# Check for existing token
security find-generic-password -s "infisical-token" -a "claude-code" -w 2>/dev/null && echo "Token found in Keychain" || echo "Token NOT in Keychain - setup required"
```

---

## Step 2: Create Infisical Token

### Option A: Service Token (Recommended for CI/CD)

1. Go to Infisical: **Project > Settings > Service Tokens**
2. Click **Create Token**
3. Select environment (e.g., `production`, `staging`)
4. Set permissions:
   - **Read** - Fetch secrets
   - **Write** - Create/update secrets (if needed)
5. Set expiration (or "Never" for permanent)
6. Copy the token (starts with `st.`)

### Option B: Universal Auth (Machine Identity)

1. Go to Infisical: **Organization > Access Control > Machine Identities**
2. Create a new machine identity
3. Add the identity to your project with appropriate role
4. Create client credentials (Client ID + Client Secret)

---

## Step 3: Store Token in macOS Keychain

```bash
# Store token securely in Keychain (recommended)
security add-generic-password -s "infisical-token" -a "claude-code" -w "st.your_service_token_here"
```

**Alternative: Environment Variable**
```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export INFISICAL_TOKEN="st.your_service_token_here"
```

---

## Step 4: Install Dependencies

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-infisical-adapter"

# If installed as part of PAI system
cd "$PACK_DIR" && bun install

# Or if using as npm package
bun add mai-infisical-adapter
```

---

## Step 5: Configure Provider

Add to `providers.yaml`:

```yaml
domains:
  secrets:
    primary: infisical
    adapters:
      infisical:
        url: https://app.infisical.com      # Required (or self-hosted URL)
        project: your-project-id            # Required: Project ID from Infisical
        environment: production             # Optional, default: development
        timeout: 30000                      # Optional, default: 30000ms
        auth:
          type: keychain                    # Use macOS Keychain
          service: infisical-token          # Keychain service name
```

**Alternative auth configurations:**

```yaml
# Environment variable
auth:
  type: env
  var: INFISICAL_TOKEN

# With fallback chain
auth:
  type: keychain
  service: infisical-token
  fallback:
    type: env
    var: INFISICAL_TOKEN
```

---

## Step 6: Verify Installation

See [VERIFY.md](./VERIFY.md) for the complete verification checklist.

**Quick verification:**

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-infisical-adapter"

# Run unit tests
cd "$PACK_DIR" && bun test

# Check TypeScript compilation
cd "$PACK_DIR" && bun run typecheck

# Verify token access
security find-generic-password -s "infisical-token" -a "claude-code" -w >/dev/null 2>&1 && echo "Token OK" || echo "Token MISSING"
```

---

## Troubleshooting

### "Failed to retrieve token from keychain"

1. Verify token exists:
```bash
security find-generic-password -s "infisical-token" -a "claude-code"
```

2. Re-add if missing:
```bash
security add-generic-password -s "infisical-token" -a "claude-code" -w "st.your_token"
```

### "401 Unauthorized" / "AuthenticationError"

1. Token may be expired - generate a new service token in Infisical
2. Token may lack required permissions
3. Token may be for wrong project

### "SecretNotFoundError"

1. Secret key doesn't exist in the specified environment
2. Environment name may be incorrect (case-sensitive)

### "Missing project" error

1. Ensure `project` is set in providers.yaml config
2. Or pass project ID when calling provider methods

### Self-hosted Infisical connection issues

1. Verify `url` in providers.yaml points to your instance
2. Check that your Infisical instance is accessible
3. Ensure SSL certificates are valid

### mai-secrets-core not found

Ensure the core package is installed:
```bash
cd ../mai-secrets-core && bun install
cd ../mai-infisical-adapter && bun install
```

---

## Infisical Concepts

### Environments

Infisical organizes secrets by environment (e.g., `development`, `staging`, `production`). The adapter defaults to `development` but can be overridden per-request:

```typescript
const secret = await provider.get('API_KEY', { environment: 'staging' });
```

### Projects

Each Infisical project has a unique ID. Find your project ID in the Infisical dashboard URL or project settings.

### Secret Paths

Secrets can be organized in folders. Use paths like `/backend/database/` to scope secrets.

---

## File Locations

After installation:

```
mai-infisical-adapter/
├── adapter.yaml          # Adapter metadata
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── README.md             # Documentation
├── INSTALL.md            # This file
├── VERIFY.md             # Verification checklist
├── src/
│   ├── InfisicalAdapter.ts    # Main adapter implementation
│   └── index.ts               # Package exports
└── tests/
    └── InfisicalAdapter.test.ts   # Unit tests
```
