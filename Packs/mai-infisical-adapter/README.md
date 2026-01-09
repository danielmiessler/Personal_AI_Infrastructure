# mai-infisical-adapter

Infisical secrets adapter for the KAI secrets domain.

## Overview

This adapter provides access to secrets stored in Infisical, a modern secrets management platform. It supports both self-hosted and cloud Infisical instances.

## Installation

```bash
bun add mai-infisical-adapter
```

## Configuration

Configure in `providers.yaml`:

```yaml
domains:
  secrets:
    primary: infisical
    adapters:
      infisical:
        url: https://app.infisical.com
        auth:
          type: keychain
          service: infisical-token
        environment: production
        project: your-project-id
        timeout: 30000
```

### Authentication Options

1. **Keychain (recommended for local development)**:
```yaml
auth:
  type: keychain
  service: infisical-token
```

2. **Environment variable**:
```yaml
auth:
  type: env
  var: INFISICAL_TOKEN
```

3. **With fallback chain**:
```yaml
auth:
  type: keychain
  service: infisical-token
  fallback:
    type: env
    var: INFISICAL_TOKEN
```

## Usage

```typescript
import { getSecretsProvider } from 'mai-secrets-core';

const provider = await getSecretsProvider({ adapter: 'infisical' });
const secret = await provider.get('DATABASE_URL');
console.log(secret.value.reveal());
```

### Environment Override

Override the default environment per request:

```typescript
const secret = await provider.get('API_KEY', { environment: 'staging' });
```

## API

### InfisicalAdapter

Implements `SecretsProvider` interface:

- `get(key, options?)`: Retrieve a single secret
- `getBatch(keys, options?)`: Retrieve multiple secrets
- `list(pattern?, options?)`: List available secret keys
- `healthCheck()`: Verify Infisical API access

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| url | string | yes | - | Infisical API base URL |
| auth | AuthReference | yes | - | Authentication configuration |
| environment | string | no | development | Default environment |
| project | string | no | - | Default project ID |
| timeout | number | no | 30000 | Request timeout (ms) |

## Features

- Token caching with automatic refresh on 401
- Retry with exponential backoff on transient failures
- SecretValue wrapper prevents accidental exposure
- Supports all Infisical environments and projects
- Full metadata including version and timestamps

## Error Handling

- `SecretNotFoundError`: Secret doesn't exist in the specified environment
- `AuthenticationError`: Token is invalid or expired
- `ProviderError`: API request failed (network issues, rate limits, etc.)

## License

MIT
