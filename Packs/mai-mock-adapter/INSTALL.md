# mai-mock-adapter Installation

Mock secrets adapter for testing and development environments.

## Prerequisites

- **Bun** runtime installed

No external services or credentials required - this is a mock adapter.

---

## Step 1: Install the Package

```bash
cd ${PAI_DIR:-$HOME/.config/pai}/Packs/mai-mock-adapter
bun install
```

---

## Step 2: Configure providers.yaml (Optional)

For development/testing environments, add to `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  secrets:
    primary: mock
    adapters:
      mock:
        secrets:
          API_KEY: test-api-key
          DATABASE_URL: postgres://localhost:5432/test
        latencyMs: 0           # Optional: simulate latency
        failureRate: 0         # Optional: simulate failures (0-1)
```

---

## Step 3: Verify Installation

See [VERIFY.md](./VERIFY.md) for verification steps.

Quick check:

```typescript
import MockAdapter from 'mai-mock-adapter';

const adapter = new MockAdapter({
  secrets: { TEST_KEY: 'test-value' }
});

const result = await adapter.healthCheck();
console.log(result.healthy); // true
```

---

## Usage Examples

### Basic Testing

```typescript
import MockAdapter from 'mai-mock-adapter';

const adapter = new MockAdapter({
  secrets: {
    API_KEY: 'test-api-key',
    DATABASE_URL: 'postgres://localhost:5432/test'
  }
});

const secret = await adapter.get('API_KEY');
console.log(secret.value.reveal()); // 'test-api-key'
```

### Using Test Fixtures

```typescript
import { createTestProvider, createSlowProvider, createFlakyProvider } from 'mai-mock-adapter/fixtures';

// Fast provider with pre-populated secrets
const provider = createTestProvider({
  API_KEY: 'test-key'
});

// Slow provider for timeout testing (500ms delay)
const slowProvider = createSlowProvider(500);

// Flaky provider for retry testing (50% failure rate)
const flakyProvider = createFlakyProvider(0.5);
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

---

## Troubleshooting

### Secret not found

**Cause:** Secret was not initialized in the adapter.

**Solution:**
```typescript
// Add the secret dynamically
adapter.setSecret('MISSING_KEY', 'value');

// Or initialize with secrets
const adapter = new MockAdapter({
  secrets: { MISSING_KEY: 'value' }
});
```

### Simulated failures

**Cause:** Adapter configured with `failureRate > 0`.

**Solution:** Check configuration or set failure rate to 0:
```typescript
const adapter = new MockAdapter({
  failureRate: 0  // Disable failures
});
```

---

## File Locations

```
${PAI_DIR:-$HOME/.config/pai}/
├── Packs/
│   └── mai-mock-adapter/
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   └── fixtures.ts
│       ├── README.md
│       ├── INSTALL.md
│       └── VERIFY.md
└── providers.yaml
```
