# kai-secrets-core

Core interfaces and utilities for the KAI secrets domain.

## Overview

This package provides:
- `SecretsProvider` interface for secrets backends
- `SecretValue` wrapper to prevent accidental secret exposure
- `AuthReference` types for secure credential resolution
- Adapter discovery with caching
- Retry utilities with exponential backoff
- Audit logging infrastructure

## Installation

```bash
bun add kai-secrets-core
```

## Usage

```typescript
import { getSecretsProvider } from 'kai-secrets-core';

const provider = await getSecretsProvider();
const secret = await provider.get('database-password');

// Use reveal() to access the actual value
const password = secret.value.reveal();
```

## Configuration

Configure via `providers.yaml`:

```yaml
domains:
  secrets:
    primary: infisical
    fallback: keychain
    adapters:
      infisical:
        url: https://secrets.example.com
        auth:
          type: keychain
          service: infisical-token
```

## Adapters

This core package works with:
- `kai-keychain-adapter` - macOS Keychain
- `kai-infisical-adapter` - Infisical
- `kai-mock-adapter` - Testing

## API

### SecretsProvider Interface

```typescript
interface SecretsProvider {
  readonly name: string;
  readonly version: string;
  get(key: string, options?: GetOptions): Promise<Secret>;
  getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>>;
  list(pattern?: string, options?: ListOptions): Promise<string[]>;
  healthCheck(): Promise<HealthStatus>;
}
```

### SecretValue

Wrapper that prevents accidental exposure:

```typescript
const secret = await provider.get('api-key');

console.log(secret.value);           // '[REDACTED]'
console.log(secret.value.reveal());  // 'actual-api-key-value'
```

## License

MIT
