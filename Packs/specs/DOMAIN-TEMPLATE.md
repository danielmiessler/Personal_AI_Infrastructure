# {Domain Name} Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: YYYY-MM-DD
**Phase**: {N}

---

## Overview

{Brief description of what this domain provides and why it exists.}

### Goals
- {Primary goal}
- {Secondary goal}
- {Tertiary goal}

### Non-Goals
- {What this domain explicitly does NOT do}
- {Scope limitations}

### Design Decisions

{Document key architectural decisions and their rationale. Example:}

**Why {Decision}?**

{Explanation of the decision and why alternatives were rejected. This helps future readers understand the intent, not just the implementation.}

---

## Pack Structure

```
kai-{domain}-core/           # Interface + discovery + shared utilities
kai-{vendor1}-adapter/       # Vendor 1 implementation
kai-{vendor2}-adapter/       # Vendor 2 implementation
kai-mock-adapter/            # Mock adapter for testing (REQUIRED)
kai-{domain}-skill/          # User-facing workflows
```

**Note**: Every domain MUST include a mock adapter for testing skills and integration tests without real backends.

---

## kai-{domain}-core

### Purpose
{What the core pack provides: interfaces, discovery, shared utilities.}

### Directory Structure

```
kai-{domain}-core/
├── README.md
├── VERIFY.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── {Domain}Provider.ts     # Provider interface
│   ├── types/
│   │   └── {SensitiveValue}.ts     # Wrapper for sensitive data (if needed)
│   ├── auth/                       # If domain needs auth
│   │   ├── AuthReference.ts        # Auth reference types
│   │   └── resolveAuth.ts          # Auth resolution with fallback
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discovery with caching
│   │   ├── ConfigLoader.ts         # Configuration loading
│   │   └── ProviderFactory.ts      # Provider instantiation
│   └── utils/
│       ├── errors.ts               # Domain-specific errors
│       ├── logger.ts               # Audit logging
│       └── retry.ts                # Retry with exponential backoff
└── tests/
    ├── *.test.ts
    └── fixtures.ts                 # Shared test fixtures
```

### Provider Interface

```typescript
// src/interfaces/{Domain}Provider.ts

export interface {Domain}Provider {
  /** Provider identifier */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Define domain-specific methods:
  // - What operations does this domain support?
  // - What are the inputs and outputs?
  // - What errors can be thrown?

  /** Check if provider is available */
  healthCheck(): Promise<HealthStatus>;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
```

### Sensitive Value Wrapper (If Applicable)

If the domain handles sensitive data (credentials, tokens, PII), create a wrapper to prevent accidental exposure:

```typescript
// src/types/{SensitiveValue}.ts

export class {SensitiveValue} {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  /** Explicitly reveal the value - use intentionally */
  reveal(): string {
    return this.value;
  }

  /** Redact in string contexts */
  toString(): string {
    return '[REDACTED]';
  }

  /** Redact in Node.js inspect */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[REDACTED]';
  }

  /** Redact in JSON serialization */
  toJSON(): string {
    return '[REDACTED]';
  }
}
```

### Adapter Discovery with Caching

To avoid expensive filesystem scans on every provider instantiation:

```typescript
// src/discovery/AdapterLoader.ts

interface CacheEntry {
  adapters: AdapterManifest[];
  timestamp: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds
const adapterCache = new Map<string, CacheEntry>();

export async function discoverAdapters(domain: string): Promise<AdapterManifest[]> {
  const cached = adapterCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.adapters;
  }

  const adapters = await scanForAdapters(domain);
  adapterCache.set(domain, { adapters, timestamp: Date.now() });
  return adapters;
}

export function invalidateAdapterCache(domain?: string): void {
  if (domain) {
    adapterCache.delete(domain);
  } else {
    adapterCache.clear();
  }
}
```

### Retry with Exponential Backoff

All adapters should use retry logic for transient failures:

```typescript
// src/utils/retry.ts

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '503', '429']
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      if (attempt >= opts.maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelayMs
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}
```

### Domain Errors

```typescript
// src/utils/errors.ts

export class {Domain}Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = '{Domain}Error';
  }
}

// Add domain-specific error classes:
export class {Resource}NotFoundError extends {Domain}Error {
  constructor(resource: string, provider?: string) {
    super(`{Resource} not found: ${resource}`, '{RESOURCE}_NOT_FOUND', provider);
    this.name = '{Resource}NotFoundError';
  }
}

export class AuthenticationError extends {Domain}Error {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends {Domain}Error {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

export class AdapterNotFoundError extends {Domain}Error {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}
```

### Audit Logging

```typescript
// src/utils/logger.ts

export interface AuditLogEntry {
  timestamp: Date;
  operation: string;  // Domain-specific operations
  provider: string;
  target?: string;    // Resource identifier (NEVER log sensitive values)
  success: boolean;
  errorCode?: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLogger {
  log(entry: AuditLogEntry): void;
}

export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditLogEntry): void {
    const { timestamp, operation, provider, target, success, errorCode, latencyMs } = entry;
    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    console.log(
      `[{DOMAIN}] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider} target=${target || '-'} status=${status} latency=${latencyMs}ms`
    );
  }
}
```

---

## kai-{vendor}-adapter

### Purpose
{What this adapter provides: which vendor/service it integrates with.}

### Adapter Manifest

```yaml
# adapter.yaml
name: {vendor}
version: 1.0.0
domain: {domain}
interface: {Domain}Provider
entry: ./src/{Vendor}Adapter.ts
description: {Vendor} adapter for {domain} domain

config:
  required:
    - {required_config_1}
  optional:
    - {optional_config_1}: {default_value}

requires:
  runtime: bun >= 1.0
  platform: [{supported_platforms}]

integrations:
  cicd: {true|false}
  kubernetes: {true|false}
  local: {true|false}
```

### Implementation Requirements

All adapters MUST:

1. **Use retry utility** for all external API calls
2. **Handle token refresh** on 401 responses (if using token auth)
3. **Use sensitive value wrappers** for any sensitive data returned
4. **Implement all interface methods** including healthCheck
5. **Log operations** via the audit logger (never log sensitive values)

### Token Refresh Pattern (If Applicable)

```typescript
private token: string | null = null;

private async fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  return withRetry(async () => {
    const token = await this.getToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options?.headers
      }
    });

    // Token expired - clear cache and retry
    if (response.status === 401) {
      this.token = null;
      throw new Error('401');  // Will be retried with fresh token
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json() as T;
  }, {
    maxRetries: 2,
    retryableErrors: ['401', '503', '429', 'ECONNRESET']
  });
}
```

### Implementation Notes

{Key implementation details:}
- {Authentication method}
- {API version/endpoints}
- {Rate limiting considerations}
- {Error handling specifics}

---

## kai-mock-adapter (REQUIRED)

### Purpose
Provides a mock {Domain}Provider for testing skills and integration tests without requiring real backends.

### Adapter Manifest

```yaml
# adapter.yaml
name: mock
version: 1.0.0
domain: {domain}
interface: {Domain}Provider
entry: ./src/MockAdapter.ts
description: Mock adapter for testing

config:
  required: []
  optional:
    - data: {}            # Pre-populated data
    - simulateLatency: 0  # Simulated latency in ms
    - failureRate: 0      # Percentage of requests to fail (0-100)

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Implementation

The mock adapter should:

1. **Accept pre-populated data** via constructor config
2. **Provide test helper methods** to add/remove/clear data
3. **Support simulated latency** for testing timeout handling
4. **Support simulated failures** for testing retry logic
5. **Use the same interfaces** as real adapters

### Test Fixtures

```typescript
// tests/fixtures.ts

import { MockAdapter } from 'kai-mock-adapter';

export function createTestProvider(): MockAdapter {
  return new MockAdapter({
    data: {
      // Pre-populated test data
    }
  });
}

export function createSlowProvider(): MockAdapter {
  return new MockAdapter({
    data: { /* ... */ },
    simulateLatency: 500
  });
}

export function createFlakyProvider(): MockAdapter {
  return new MockAdapter({
    data: { /* ... */ },
    failureRate: 50  // 50% failure rate
  });
}
```

---

## kai-{domain}-skill

### Purpose
{What workflows this skill provides to users.}

### SKILL.md

```yaml
---
name: {Domain}
description: {Description}. USE WHEN {trigger conditions}.
type: skill
version: "1.0"
---

# {Domain} Skill

{Brief description}

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| {Workflow1} | {Condition} | {Output} |
| {Workflow2} | {Condition} | {Output} |

## Examples

### Example 1: {Use Case}
```
User: "{User request}"
Skill loads: {Domain} → {Workflow}
Output: {Expected output}
```

## CLI Tools

```bash
# {Tool 1}
bun run Tools/{tool1}.ts {args}

# {Tool 2}
bun run Tools/{tool2}.ts {args}
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  {domain}:
    primary: {adapter}
    adapters:
      {adapter}:
        {config_key}: {config_value}
```
```

---

## VERIFY.md Template

```markdown
# Verification Checklist - kai-{pack}-{type}

## Prerequisites
- [ ] {Required setup step 1}
- [ ] {Required setup step 2}

## Core Functionality
- [ ] {Functionality check 1}
- [ ] {Functionality check 2}

## Sensitive Data Handling (If Applicable)
- [ ] Sensitive values use wrapper class
- [ ] toString() returns '[REDACTED]'
- [ ] Values never appear in logs
- [ ] Values never appear in error messages

## Error Handling
- [ ] {Error scenario 1}
- [ ] {Error scenario 2}
- [ ] Retry logic handles transient failures
- [ ] Token refresh works on 401

## Integration
- [ ] Adapter loads via core discovery
- [ ] adapter.yaml validates against schema
- [ ] Works with providers.yaml configuration
- [ ] Discovery caching works correctly

## Tests
- [ ] Unit tests pass: `bun test`
- [ ] Type checking passes: `bun run typecheck`
- [ ] Integration tests pass with mock adapter

## Cleanup
- [ ] {Cleanup step if needed}
```

---

## Implementation Checklist

### Phase {N}.1: kai-{domain}-core
- [ ] Create package structure (README.md, package.json, tsconfig.json)
- [ ] Create src/index.ts with public exports
- [ ] Define {Domain}Provider interface in src/interfaces/
- [ ] Implement {SensitiveValue} wrapper class (if applicable)
- [ ] Implement AuthReference types (if applicable)
- [ ] Implement resolveAuth with fallback chain (if applicable)
- [ ] Implement adapter discovery with 60s caching
- [ ] Implement cache invalidation function
- [ ] Implement config loading with precedence
- [ ] Implement provider factory
- [ ] Implement retry utility with exponential backoff
- [ ] Add domain-specific error classes
- [ ] Add audit logging (never log sensitive values)
- [ ] Write unit tests for each module
- [ ] Create VERIFY.md and verify all items

### Phase {N}.2: kai-{vendor1}-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement {Vendor1}Adapter class
- [ ] Implement all interface methods
- [ ] Use retry utility for API calls
- [ ] Implement token refresh on 401 (if applicable)
- [ ] Use sensitive value wrapper (if applicable)
- [ ] Write unit tests with mocked API
- [ ] Create VERIFY.md and verify all items

### Phase {N}.3: kai-{vendor2}-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement {Vendor2}Adapter class
- [ ] Implement all interface methods
- [ ] Use retry utility for API calls
- [ ] Implement token refresh on 401 (if applicable)
- [ ] Use sensitive value wrapper (if applicable)
- [ ] Write unit tests with mocked API
- [ ] Create VERIFY.md and verify all items

### Phase {N}.4: kai-mock-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement MockAdapter class with test helpers
- [ ] Implement setData/deleteData/clearData methods
- [ ] Implement simulated latency
- [ ] Implement simulated failures
- [ ] Create tests/fixtures.ts with factory functions
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify all items

### Phase {N}.5: kai-{domain}-skill
- [ ] Create package structure
- [ ] Create SKILL.md with workflow routing
- [ ] Create CLI tools in Tools/
- [ ] Use {SensitiveValue}.reveal() in tools (if applicable)
- [ ] Create workflow documentation in Workflows/
- [ ] Write integration tests using mock adapter
- [ ] Create VERIFY.md and verify all items

### Phase {N}.6: Integration Testing
- [ ] End-to-end test: skill → core → mock adapter
- [ ] End-to-end test: skill → core → {vendor1} adapter (if available)
- [ ] End-to-end test: skill → core → {vendor2} adapter (if available)
- [ ] Verify fallback chain works
- [ ] Verify audit logging captures all operations
- [ ] Verify sensitive values are never exposed
- [ ] Test retry behavior with flaky mock adapter
- [ ] Document lessons learned for next domain

---

## Domain-Specific Sections

{Add any sections unique to this domain:}
- Security considerations
- Performance requirements
- Compliance requirements
- Data retention policies
- Rate limiting requirements
- etc.

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Reference implementation (Phase 1)

---

## Changelog

### 1.0.0 - YYYY-MM-DD
- Initial specification
