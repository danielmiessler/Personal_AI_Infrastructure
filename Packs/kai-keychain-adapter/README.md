# kai-keychain-adapter

macOS Keychain adapter for the KAI secrets domain.

## Overview

This adapter provides access to secrets stored in the macOS Keychain, using the `security` command-line tool. It's designed for local development on macOS systems.

## Installation

```bash
bun add kai-keychain-adapter
```

## Configuration

Configure in `providers.yaml`:

```yaml
domains:
  secrets:
    primary: keychain
    adapters:
      keychain:
        servicePrefix: kai      # Optional, default: 'kai'
        defaultAccount: claude-code  # Optional
```

## Usage

### Storing Secrets

Use the macOS `security` command to add secrets:

```bash
# Add a secret
security add-generic-password -s "kai:API_KEY" -a "claude-code" -w "your-secret-value"

# Update an existing secret
security add-generic-password -U -s "kai:API_KEY" -a "claude-code" -w "new-secret-value"
```

### Retrieving Secrets

```typescript
import { getSecretsProvider } from 'kai-secrets-core';

const provider = await getSecretsProvider({ adapter: 'keychain' });
const secret = await provider.get('API_KEY');
console.log(secret.value.reveal()); // Outputs the actual secret
```

### Service Name Format

Secrets are stored with the service name format: `{servicePrefix}:{key}`

For example, with default settings:
- Key: `API_KEY` → Service: `kai:API_KEY`
- Key: `DATABASE_PASSWORD` → Service: `kai:DATABASE_PASSWORD`

## Security Notes

- Secrets are stored in the user's login keychain
- Access is controlled by macOS Keychain Access permissions
- The `security` command may prompt for keychain access on first use
- Consider locking the keychain when not in use

## Platform Support

This adapter only works on macOS. For cross-platform support, use the `kai-env-adapter` or configure a fallback:

```yaml
domains:
  secrets:
    primary: keychain
    fallback: env
```

## API

### KeychainAdapter

Implements `SecretsProvider` interface:

- `get(key, options?)`: Retrieve a single secret
- `getBatch(keys, options?)`: Retrieve multiple secrets
- `list(pattern?, options?)`: List available secret keys
- `healthCheck()`: Verify keychain access

## License

MIT
