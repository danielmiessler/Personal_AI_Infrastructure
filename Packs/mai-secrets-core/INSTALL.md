# mai-secrets-core Installation

Core interfaces and utilities for the PAI Secrets domain. This package provides the `SecretsProvider` interface, `SecretValue` wrapper for secure handling, authentication resolution, and adapter discovery.

## Prerequisites

- Bun runtime (v1.0+)
- TypeScript 5.x
- A secrets adapter (e.g., `mai-keychain-adapter`, `mai-infisical-adapter`)

---

## Step 1: Install the Package

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACKS_DIR="$PAI_DIR/packs"

# Create packs directory if needed
mkdir -p "$PACKS_DIR"

# Clone or copy the pack
cp -r /path/to/mai-secrets-core "$PACKS_DIR/"

# Install dependencies
cd "$PACKS_DIR/mai-secrets-core"
bun install
```

---

## Step 2: Install an Adapter

The core package requires at least one adapter. Choose based on your needs:

| Adapter | Package | Best For | Platform |
|---------|---------|----------|----------|
| keychain | mai-keychain-adapter | Local development | macOS only |
| infisical | mai-infisical-adapter | Team/CI secrets | Cross-platform |
| mock | mai-mock-adapter | Testing | Cross-platform |
| env | (built-in) | Simple deployments | Cross-platform |

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# For macOS Keychain
cd "$PAI_DIR/packs/mai-keychain-adapter"
bun install

# For Infisical
cd "$PAI_DIR/packs/mai-infisical-adapter"
bun install
```

---

## Step 3: Configure providers.yaml

Create or update `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  secrets:
    primary: keychain
    fallback: env  # optional fallback chain
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

### Configuration Options

| Option | Description |
|--------|-------------|
| `primary` | Default adapter to use |
| `fallback` | Fallback adapter if primary fails |
| `adapters` | Adapter-specific configuration |

### Authentication Reference Types

The `auth` field supports multiple resolution methods:

```yaml
# Environment variable
auth:
  type: env
  var: MY_TOKEN

# macOS Keychain
auth:
  type: keychain
  service: service-name
  account: account-name  # optional, defaults to "default"

# File-based
auth:
  type: file
  path: /path/to/token

# With fallback chain
auth:
  type: keychain
  service: api-token
  fallback:
    type: env
    var: API_TOKEN
```

---

## Step 4: Verify Installation

See `VERIFY.md` for the complete checklist, or run:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$PAI_DIR/packs/mai-secrets-core"

cd "$PACK_DIR"

# Run all tests
bun test

# Type check
bun run typecheck
```

Expected output: `89 pass, 0 fail`

---

## Troubleshooting

### "Adapter not found" error

1. Verify the adapter package is installed
2. Check that `providers.yaml` references a valid adapter name
3. Ensure adapter's `adapter.yaml` manifest exists

### "Configuration not found" error

The config loader checks these paths in order:
1. `$PROVIDERS_CONFIG` environment variable
2. `./providers.yaml` (current directory)
3. `~/.config/pai/providers.yaml`
4. `/etc/pai/providers.yaml`

### Keychain resolution fails (macOS)

1. Verify the secret exists in Keychain:
   ```bash
   security find-generic-password -s your-service -a your-account
   ```

2. Add a secret to Keychain:
   ```bash
   security add-generic-password -s your-service -a your-account -w "your-secret"
   ```

### Environment variable not found

```bash
# Check if variable is set
echo $YOUR_VAR

# Export for current session
export YOUR_VAR="your-value"
```

### SecretValue not revealing

Remember to call `.reveal()` explicitly:

```typescript
const secret = await provider.get('my-key');
console.log(secret.value);           // '[REDACTED]'
console.log(secret.value.reveal());  // actual value
```

---

## File Locations

After installation:

```
${PAI_DIR:-$HOME/.config/pai}/
  providers.yaml              # Domain configuration
  packs/
    mai-secrets-core/
      package.json
      tsconfig.json
      README.md
      VERIFY.md
      INSTALL.md
      src/
        index.ts              # Main exports
        interfaces/
          SecretsProvider.ts
          index.ts
        types/
          SecretValue.ts
          index.ts
        auth/
          resolve.ts          # Auth reference resolution
          index.ts
        discovery/
          adapters.ts
          config.ts
          provider.ts
          index.ts
        utils/
          errors.ts
          retry.ts
          logger.ts           # Audit logging
          index.ts
      tests/
        SecretValue.test.ts
        errors.test.ts
        retry.test.ts
        logger.test.ts
        auth.test.ts
        discovery.test.ts
```

---

## Security Features

### SecretValue Wrapper

All secrets are returned wrapped in `SecretValue` which prevents accidental exposure:

```typescript
const secret = await provider.get('api-key');

// These all show [REDACTED]:
console.log(secret.value);              // toString() -> [REDACTED]
JSON.stringify(secret.value);           // toJSON() -> "[REDACTED]"
util.inspect(secret.value);             // custom inspect -> [REDACTED]

// Only reveal() returns the actual value:
const actualValue = secret.value.reveal();
```

### Audit Logging

All secret access is logged (values are never logged):

```typescript
import { setAuditLogger, ConsoleAuditLogger } from 'mai-secrets-core';

// Enable console logging
setAuditLogger(new ConsoleAuditLogger());

// Now all get/list operations are logged with:
// - operation type
// - key accessed
// - timestamp
// - success/failure
```

---

## Next Steps

1. Install an adapter (`mai-keychain-adapter` or `mai-infisical-adapter`)
2. Install the secrets skill for CLI tools (`mai-secrets-skill/INSTALL.md`)
3. Add secrets to your backend
4. Configure fallback chains for reliability
