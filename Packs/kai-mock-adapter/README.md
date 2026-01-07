# kai-mock-adapter

Mock secrets adapter for testing and development.

## Overview

This adapter provides an in-memory secrets store with support for simulated latency, failure rates, and test fixtures. It's designed for unit testing, integration testing, and development environments.

## Installation

```bash
bun add kai-mock-adapter
```

## Usage

### Basic Usage

```typescript
import MockAdapter from 'kai-mock-adapter';

const adapter = new MockAdapter({
  secrets: {
    API_KEY: 'test-api-key',
    DATABASE_URL: 'postgres://localhost:5432/test'
  }
});

const secret = await adapter.get('API_KEY');
console.log(secret.value.reveal()); // 'test-api-key'
```

### Test Fixtures

```typescript
import { createTestProvider, createSlowProvider, createFlakyProvider } from 'kai-mock-adapter/fixtures';

// Fast provider with pre-populated secrets
const provider = createTestProvider({
  API_KEY: 'test-key',
  DATABASE_URL: 'postgres://localhost/test'
});

// Slow provider for timeout testing
const slowProvider = createSlowProvider(500); // 500ms delay

// Flaky provider for retry testing
const flakyProvider = createFlakyProvider(0.5); // 50% failure rate
```

### Dynamic Secret Management

```typescript
const adapter = new MockAdapter();

// Add secrets at runtime
adapter.setSecret('NEW_KEY', 'new-value');

// Remove secrets
adapter.deleteSecret('NEW_KEY');

// Clear all secrets
adapter.clearSecrets();
```

### Simulated Failures

```typescript
const adapter = new MockAdapter({
  failureRate: 0.3, // 30% of requests fail
  failureError: 'ECONNRESET'
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| secrets | Record<string, string> | {} | Initial secrets |
| latencyMs | number | 0 | Simulated latency |
| failureRate | number | 0 | Failure probability (0-1) |
| failureError | string | 'MOCK_ERROR' | Error message on failure |

## API

### MockAdapter

Implements `SecretsProvider` interface plus test helpers:

- `get(key)`: Retrieve a secret
- `getBatch(keys)`: Retrieve multiple secrets
- `list(pattern?)`: List secret keys
- `healthCheck()`: Always returns healthy
- `setSecret(key, value)`: Add or update a secret
- `deleteSecret(key)`: Remove a secret
- `clearSecrets()`: Remove all secrets

## License

MIT
