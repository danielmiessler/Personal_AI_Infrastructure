# PAI Infrastructure Pack System - Architecture Overview

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-06
**Authors**: Joey Barkley, Charles (AI Assistant)

---

## Executive Summary

This specification defines the architecture for a portable infrastructure pack system that abstracts vendor-specific implementations behind common interfaces. The system enables the same workflows to operate across different environments (home lab vs enterprise) by swapping adapters without changing skills or user-facing code.

---

## Design Principles

1. **Portability First**: Same skills work at home (UniFi, Infisical, Linear) and work (Cisco, CyberArk, Jira)
2. **Interface Segregation**: Core packs define interfaces; adapters implement them
3. **Convention Over Configuration**: Predictable patterns reduce cognitive load
4. **Secrets Never Inline**: All sensitive values use references, never plaintext
5. **Self-Documenting**: Adapters declare capabilities via manifests
6. **Fail-Safe Fallbacks**: Tiered resolution with graceful degradation

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SKILL LAYER                               │
│  User-facing workflows that consume provider interfaces          │
│  Examples: kai-secrets-skill, kai-network-skill, kai-agile-skill │
├─────────────────────────────────────────────────────────────────┤
│                       ADAPTER LAYER                              │
│  Vendor-specific implementations of provider interfaces          │
│  Examples: kai-infisical-adapter, kai-unifi-adapter              │
├─────────────────────────────────────────────────────────────────┤
│                        CORE LAYER                                │
│  Interfaces, shared utilities, adapter discovery/loading         │
│  Examples: kai-secrets-core, kai-network-core, kai-issues-core   │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### Core Layer (`kai-{domain}-core`)
- Defines TypeScript interfaces for the domain
- Provides adapter discovery and loading utilities
- Implements shared validation and error handling
- Contains no vendor-specific code
- Exports types for adapters to implement

#### Adapter Layer (`kai-{vendor}-adapter`)
- Implements one or more provider interfaces from a core pack
- Contains all vendor-specific API calls and logic
- Declares capabilities via `adapter.yaml` manifest
- Handles authentication using AuthReference pattern
- Self-registers on installation

#### Skill Layer (`kai-{domain}-skill`)
- Provides user-facing workflows (SKILL.md)
- Consumes provider interfaces, not specific adapters
- Routes to appropriate adapter based on configuration
- Contains workflow documentation and examples

---

## Provider Interface Pattern

Interfaces live in `-core` packs, following the Kubernetes pattern where CRDs define interfaces and controllers implement them.

### Example: SecretsProvider Interface

```typescript
// kai-secrets-core/src/interfaces/SecretsProvider.ts

export interface Secret {
  key: string;
  value: string;
  metadata?: Record<string, string>;
}

export interface SecretsProvider {
  /** Provider identifier (e.g., 'infisical', 'cyberark', 'keychain') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  /** Retrieve a secret by key */
  get(key: string, options?: GetOptions): Promise<Secret>;

  /** List secrets matching a pattern */
  list(pattern?: string): Promise<string[]>;

  /** Check if provider is available and authenticated */
  healthCheck(): Promise<HealthStatus>;
}

export interface GetOptions {
  /** Environment/scope (e.g., 'production', 'development') */
  environment?: string;
  /** Project/workspace identifier */
  project?: string;
  /** Path prefix for hierarchical secrets */
  path?: string;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
}
```

---

## Authentication Reference Pattern

Sensitive values are NEVER stored inline. Instead, configuration files contain references that resolve at runtime.

### AuthReference Interface

```typescript
// kai-secrets-core/src/auth/AuthReference.ts

export type AuthType = 'keychain' | 'env' | 'file' | 'secretsManager';

export interface AuthReference {
  /** Resolution method */
  type: AuthType;

  /** macOS Keychain service name (type: 'keychain') */
  service?: string;

  /** macOS Keychain account (type: 'keychain', defaults to 'claude-code') */
  account?: string;

  /** Environment variable name (type: 'env') */
  var?: string;

  /** File path containing the secret (type: 'file') */
  path?: string;

  /** Secrets manager key path (type: 'secretsManager') */
  key?: string;

  /** Fallback if primary resolution fails */
  fallback?: AuthReference;
}
```

### Resolution Order

The standard fallback chain is:

1. **Keychain** (macOS) - Most secure for local development
2. **Environment Variable** - Standard for CI/CD
3. **File** - For containerized/mounted secrets
4. **Secrets Manager** - For production/enterprise

### Example Configuration

```yaml
# providers.yaml
secrets:
  primary: infisical
  adapters:
    infisical:
      url: https://secrets.example.com
      auth:
        type: keychain
        service: infisical-token
        account: claude-code
        fallback:
          type: env
          var: INFISICAL_TOKEN
          fallback:
            type: file
            path: /run/secrets/infisical-token
```

### Resolution Implementation

```typescript
// kai-secrets-core/src/auth/resolveAuth.ts

export async function resolveAuth(ref: AuthReference): Promise<string> {
  try {
    switch (ref.type) {
      case 'keychain':
        return await resolveKeychain(ref);
      case 'env':
        return resolveEnv(ref);
      case 'file':
        return await resolveFile(ref);
      case 'secretsManager':
        return await resolveSecretsManager(ref);
      default:
        throw new Error(`Unknown auth type: ${ref.type}`);
    }
  } catch (error) {
    if (ref.fallback) {
      return resolveAuth(ref.fallback);
    }
    throw error;
  }
}

async function resolveKeychain(ref: AuthReference): Promise<string> {
  const service = ref.service;
  const account = ref.account || 'claude-code';

  const result = await $`security find-generic-password -s ${service} -a ${account} -w`.quiet();
  if (result.exitCode !== 0) {
    throw new Error(`Keychain entry not found: ${service}/${account}`);
  }
  return result.stdout.trim();
}

function resolveEnv(ref: AuthReference): string {
  const value = process.env[ref.var!];
  if (!value) {
    throw new Error(`Environment variable not set: ${ref.var}`);
  }
  return value;
}

async function resolveFile(ref: AuthReference): Promise<string> {
  const content = await Bun.file(ref.path!).text();
  return content.trim();
}
```

---

## Adapter Manifest Schema

Each adapter declares its capabilities in an `adapter.yaml` file at the package root.

### Schema Definition

```yaml
# adapter.yaml schema
name: string              # Adapter identifier (e.g., 'infisical')
version: string           # Semantic version
domain: string            # Domain this adapter serves (e.g., 'secrets')
interface: string         # Interface(s) implemented (e.g., 'SecretsProvider')
entry: string             # Entry point relative to package root
description: string       # Human-readable description

# Configuration requirements
config:
  required:               # Required config keys
    - url
  optional:               # Optional config keys with defaults
    - timeout: 30000
    - retries: 3

# Runtime requirements
requires:
  runtime: string         # e.g., 'bun >= 1.0'
  platform: string[]      # e.g., ['darwin', 'linux']

# Integration metadata
integrations:
  cicd: boolean          # Works in CI/CD environments
  kubernetes: boolean    # Works in K8s pods
  local: boolean         # Works in local development
```

### Example: Infisical Adapter Manifest

```yaml
# kai-infisical-adapter/adapter.yaml
name: infisical
version: 1.0.0
domain: secrets
interface: SecretsProvider
entry: ./src/InfisicalAdapter.ts
description: Infisical secrets management adapter

config:
  required:
    - url
  optional:
    - timeout: 30000
    - projectId: null
    - environment: development

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: true
  local: true
```

---

## Adapter Discovery and Registration

### Convention-Based Discovery

Adapters are discovered by scanning for packages matching the pattern `kai-*-adapter` that contain an `adapter.yaml` manifest.

```typescript
// kai-secrets-core/src/discovery/AdapterLoader.ts

export async function discoverAdapters(domain: string): Promise<AdapterManifest[]> {
  const adapters: AdapterManifest[] = [];

  // Scan known locations
  const searchPaths = [
    path.join(process.cwd(), 'node_modules'),
    path.join(os.homedir(), 'PAI', 'packs'),
    '/usr/local/share/kai/adapters'
  ];

  for (const searchPath of searchPaths) {
    const pattern = `${searchPath}/kai-*-adapter/adapter.yaml`;
    const manifests = await glob(pattern);

    for (const manifestPath of manifests) {
      const manifest = await loadManifest(manifestPath);
      if (manifest.domain === domain) {
        adapters.push(manifest);
      }
    }
  }

  return adapters;
}
```

### Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User installs adapter: bun add kai-infisical-adapter         │
├─────────────────────────────────────────────────────────────────┤
│ 2. Post-install hook triggers adapter registration              │
├─────────────────────────────────────────────────────────────────┤
│ 3. Core discovers adapter via kai-*-adapter pattern             │
├─────────────────────────────────────────────────────────────────┤
│ 4. Core validates adapter.yaml against schema                   │
├─────────────────────────────────────────────────────────────────┤
│ 5. Adapter becomes available for configuration in providers.yaml│
└─────────────────────────────────────────────────────────────────┘
```

### Discovery Caching

To avoid expensive filesystem scans on every provider instantiation:

```typescript
// kai-secrets-core/src/discovery/AdapterLoader.ts

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

---

## Configuration Schema

### Global Provider Configuration

```yaml
# ~/.config/kai/providers.yaml (user-level)
# OR
# ./providers.yaml (project-level, takes precedence)

version: "1.0"

# Domain configurations
domains:
  secrets:
    primary: infisical          # Default adapter for this domain
    fallback: keychain          # Fallback if primary fails
    adapters:
      infisical:
        url: https://secrets.bfinfrastructure.com
        projectId: pai-home
        auth:
          type: keychain
          service: infisical-token
      keychain:
        # No additional config needed for keychain
      cyberark:
        url: https://cyberark.company.com
        auth:
          type: env
          var: CYBERARK_TOKEN

  network:
    primary: unifi
    adapters:
      unifi:
        controller: https://192.168.1.1:8443
        site: default
        auth:
          type: keychain
          service: unifi-credentials
      opnsense:
        url: https://opnsense.local
        auth:
          type: keychain
          service: opnsense-api

  issues:
    primary: linear
    adapters:
      linear:
        auth:
          type: keychain
          service: linear-api-key
      joplin:
        port: 41184
        auth:
          type: keychain
          service: joplin-token
```

### Configuration Precedence

1. **Environment variables** (highest priority)
2. **Project-level** `./providers.yaml`
3. **User-level** `~/.config/kai/providers.yaml`
4. **System-level** `/etc/kai/providers.yaml`
5. **Adapter defaults** (lowest priority)

---

## Directory Structure

### Core Pack Structure

```
kai-{domain}-core/
├── README.md                    # Pack documentation
├── SKILL.md                     # Optional: if core provides skill triggers
├── VERIFY.md                    # Verification checklist
├── package.json                 # Package metadata
├── tsconfig.json                # TypeScript configuration
├── src/
│   ├── index.ts                 # Public exports
│   ├── interfaces/
│   │   ├── index.ts             # Interface exports
│   │   └── {Domain}Provider.ts  # Provider interface
│   ├── auth/
│   │   ├── AuthReference.ts     # Auth reference types
│   │   └── resolveAuth.ts       # Auth resolution logic
│   ├── discovery/
│   │   ├── AdapterLoader.ts     # Adapter discovery
│   │   └── ConfigLoader.ts      # Configuration loading
│   └── utils/
│       ├── errors.ts            # Domain-specific errors
│       └── validation.ts        # Input validation
└── tests/
    └── *.test.ts                # Unit tests
```

### Adapter Pack Structure

```
kai-{vendor}-adapter/
├── README.md                    # Adapter documentation
├── adapter.yaml                 # Adapter manifest (REQUIRED)
├── VERIFY.md                    # Verification checklist
├── package.json                 # Package metadata
├── tsconfig.json                # TypeScript configuration
├── src/
│   ├── index.ts                 # Public exports
│   ├── {Vendor}Adapter.ts       # Provider implementation
│   └── client/
│       └── {Vendor}Client.ts    # Vendor API client
└── tests/
    └── *.test.ts                # Unit tests (with mocks)
```

### Skill Pack Structure

```
kai-{domain}-skill/
├── README.md                    # Pack documentation
├── SKILL.md                     # Skill triggers and routing (REQUIRED)
├── VERIFY.md                    # Verification checklist
├── package.json                 # Package metadata
├── Workflows/
│   ├── {Workflow1}.md           # Workflow documentation
│   └── {Workflow2}.md           # Workflow documentation
├── Tools/                       # Optional: CLI tools
│   └── *.ts                     # Bun-executable CLI tools
└── Templates/                   # Optional: output templates
    └── *.md                     # Handlebars/markdown templates
```

---

## Naming Conventions

| Component | Pattern | Example |
|-----------|---------|---------|
| Core pack | `kai-{domain}-core` | `kai-secrets-core` |
| Adapter pack | `kai-{vendor}-adapter` | `kai-infisical-adapter` |
| Skill pack | `kai-{domain}-skill` | `kai-secrets-skill` |
| Interface | `{Domain}Provider` | `SecretsProvider` |
| Adapter class | `{Vendor}Adapter` | `InfisicalAdapter` |
| CLI tool | `{Action}.ts` | `GetSecret.ts` |

---

## Domain Overview

| Phase | Domain | Core Pack | Adapters | Skill Pack |
|-------|--------|-----------|----------|------------|
| 1 | Secrets | kai-secrets-core | keychain, infisical, cyberark, env | kai-secrets-skill |
| 2 | Methodology | kai-methodology-core | (universal) | kai-methodology-skill |
| 3 | Issues/PM | kai-issues-core | linear, jira, joplin | kai-agile-skill |
| 4 | Network | kai-network-core | unifi, opnsense, cisco | kai-network-skill |
| 5 | CI/CD | kai-cicd-core | gitlab, github, jenkins | kai-cicd-skill |
| 6 | Containers | kai-containers-core | k8s, docker, podman | kai-containers-skill |
| 7 | Observability | kai-observability-core | prometheus, datadog | kai-observability-skill |

---

## Security Considerations

1. **No Secrets in Source Control**: All sensitive values use AuthReference pattern
2. **Keychain Preferred Locally**: macOS Keychain is the default for local development
3. **Minimal Permissions**: Adapters request only required scopes
4. **Audit Logging**: All secret access is logged (without exposing values)
5. **Credential Rotation**: Adapters support credential refresh without restart
6. **Secret Masking**: Use `SecretValue` wrapper to prevent accidental exposure in logs/traces
7. **Rate Limiting**: Adapters should implement rate limiting for secret access (100 req/min default)

### SecretValue Wrapper Pattern

To prevent accidental secret exposure in logs, error messages, and stack traces:

```typescript
// kai-secrets-core/src/types/SecretValue.ts

export class SecretValue {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  /** Explicitly reveal the secret value */
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

// Usage in Secret interface
export interface Secret {
  key: string;
  value: SecretValue;  // Not string!
  metadata?: SecretMetadata;
}
```

---

## Testing Requirements

### Core Packs
- Unit tests for all exported functions
- Integration tests with mock adapters
- Type coverage for interfaces

### Adapter Packs
- Unit tests with mocked vendor APIs
- Integration tests against real services (optional, CI-gated)
- Manifest validation tests

### Skill Packs
- Workflow documentation tests (examples are executable)
- Integration tests with mock providers

---

## Verification Checklist

Every pack must include a `VERIFY.md` with domain-specific verification steps. See individual domain specs for requirements.

---

## Related Specifications

- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Secrets domain specification
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Generic domain template

---

## Changelog

### 1.0.0 - 2026-01-06
- Initial specification based on standup decisions
- Three-layer architecture defined
- AuthReference pattern documented
- Adapter manifest schema defined
