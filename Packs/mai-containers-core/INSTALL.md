# mai-containers-core Installation

Core interfaces and utilities for the KAI Containers domain. This pack provides the `PlatformProvider` interface and shared utilities for container/deployment operations across Docker, Kubernetes, and other platforms.

## Prerequisites

- **Bun** v1.0.0 or later
- **TypeScript** v5.0.0 or later (for development)
- macOS, Linux, or Windows with WSL

---

## Step 1: Clone or Copy the Pack

If not already present in your Packs directory:

```bash
# Navigate to your Packs directory
cd "${PAI_PACKS:-$HOME/PAI/Packs}"

# Clone or copy the pack
# (If using git)
git clone <repository-url> mai-containers-core

# Or copy from existing location
cp -r /path/to/mai-containers-core ./
```

---

## Step 2: Install Dependencies

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun install
```

This installs:
- `yaml` - YAML parsing for configuration files
- `bun-types` - TypeScript types for Bun runtime
- `typescript` - TypeScript compiler

---

## Step 3: Verify TypeScript Compilation

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun run typecheck
```

Expected: No output (clean compilation with no errors).

---

## Step 4: Run Unit Tests

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun test
```

Expected: All 5 test files pass:
- `tests/discovery.test.ts`
- `tests/errors.test.ts`
- `tests/logger.test.ts`
- `tests/retry.test.ts`
- `tests/types.test.ts`

---

## Step 5: Verify Installation

See `VERIFY.md` for comprehensive verification steps, or run the quick test:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun -e "
import {
  getPlatformProvider,
  PlatformError,
  withRetry,
  ConsoleAuditLogger
} from './src/index.ts';

console.log('Exports verified:');
console.log('  - getPlatformProvider:', typeof getPlatformProvider);
console.log('  - PlatformError:', typeof PlatformError);
console.log('  - withRetry:', typeof withRetry);
console.log('  - ConsoleAuditLogger:', typeof ConsoleAuditLogger);
"
```

Expected output:
```
Exports verified:
  - getPlatformProvider: function
  - PlatformError: function
  - withRetry: function
  - ConsoleAuditLogger: function
```

---

## Troubleshooting

### "Cannot find package 'yaml'"

Dependencies not installed. Run:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun install
```

### TypeScript errors during typecheck

Ensure you have TypeScript 5.0+ and Bun is up to date:
```bash
bun upgrade
```

### Tests fail with import errors

Check that `src/index.ts` exists and exports the expected interfaces. The pack may be incomplete or corrupted.

---

## File Locations

After installation, the pack structure should be:

```
mai-containers-core/
├── src/
│   ├── index.ts              # Main exports
│   ├── interfaces/           # PlatformProvider interface
│   │   ├── PlatformProvider.ts
│   │   └── index.ts
│   ├── types/                # Type definitions
│   │   ├── Container.ts
│   │   ├── Deployment.ts
│   │   ├── Namespace.ts
│   │   ├── Resource.ts
│   │   ├── Service.ts
│   │   └── index.ts
│   ├── discovery/            # Adapter discovery utilities
│   │   ├── AdapterLoader.ts
│   │   ├── ConfigLoader.ts
│   │   ├── ProviderFactory.ts
│   │   └── index.ts
│   └── utils/                # Utility functions
│       ├── errors.ts
│       ├── logger.ts
│       └── retry.ts
├── tests/                    # Unit tests
│   ├── discovery.test.ts
│   ├── errors.test.ts
│   ├── logger.test.ts
│   ├── retry.test.ts
│   └── types.test.ts
├── package.json
├── tsconfig.json
├── README.md
├── INSTALL.md
└── VERIFY.md
```

---

## Exported Types

The pack exports the following types for use by adapters and skills:

### Types
- `Namespace`, `NamespaceStatus`
- `Deployment`, `DeploymentStatus`
- `Container`, `ContainerStatus`, `ContainerQuery`
- `LogOptions`, `ExecResult`
- `Service`, `ServiceType`, `ServicePort`
- `PortInfo`, `PortMapping`, `PortForwardHandle`
- `ResourceSpec`, `ResourceQuantity`, `ResourceUsage`, `ResourceMetric`
- `HealthStatus`

### Interfaces
- `PlatformProvider` - Main provider interface

### Discovery Functions
- `discoverAdapters()` - Find available adapters
- `loadAdapter()` - Load adapter by name
- `loadConfig()` - Load providers.yaml
- `getPlatformProvider()` - Get primary provider
- `getPlatformProviderWithFallback()` - Get provider with fallback

### Error Classes
- `PlatformError` - Base error class
- `NamespaceNotFoundError`
- `DeploymentNotFoundError`
- `ContainerNotFoundError`
- `ServiceNotFoundError`
- `AuthenticationError`
- `ConfigurationError`
- `AdapterNotFoundError`
- `ExecError`
- `ScaleError`
- `ConnectionError`

### Utilities
- `withRetry()` - Retry with exponential backoff
- `ConsoleAuditLogger` - Audit logging utility

---

## Next Steps

After installing `mai-containers-core`, you'll typically want to:

1. **Install a containers adapter**:
   - `mai-docker-adapter` for Docker environments
   - `mai-k8s-adapter` for Kubernetes environments
2. **Install the containers skill** - `mai-containers-skill` for user-facing workflows
3. **Configure providers** - Set up `providers.yaml` with your container backends

See the related packs for their installation instructions.
