# mai-cicd-core Installation

Core interfaces and utilities for the KAI CI/CD domain. This pack provides the `CICDProvider` interface that all CI/CD adapters implement, plus shared utilities for adapter discovery, configuration loading, error handling, and retry logic.

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
git clone <repository-url> mai-cicd-core

# Or copy from existing location
cp -r /path/to/mai-cicd-core ./
```

---

## Step 2: Install Dependencies

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
bun install
```

This installs:
- `yaml` - YAML parsing for configuration files
- `bun-types` - TypeScript types for Bun runtime
- `typescript` - TypeScript compiler

---

## Step 3: Verify TypeScript Compilation

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
bun run typecheck
```

Expected: No output (clean compilation with no errors).

---

## Step 4: Run Unit Tests

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
bun test
```

Expected: All tests pass (discovery, errors, logger, retry, types).

---

## Step 5: Verify Installation

See `VERIFY.md` for comprehensive verification steps, or run the quick test:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
bun -e "
import { CICDError, getCICDProvider, withRetry } from './src/index.ts';
console.log('CICDError:', typeof CICDError);
console.log('getCICDProvider:', typeof getCICDProvider);
console.log('withRetry:', typeof withRetry);
console.log('Exports OK');
"
```

Expected output:
```
CICDError: function
getCICDProvider: function
withRetry: function
Exports OK
```

---

## Troubleshooting

### "Cannot find package 'yaml'"

Dependencies not installed. Run:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
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
mai-cicd-core/
├── src/
│   ├── index.ts              # Main exports
│   ├── interfaces/           # CICDProvider interface
│   │   ├── CICDProvider.ts
│   │   └── index.ts
│   ├── types/                # Type definitions
│   │   ├── Pipeline.ts
│   │   ├── Run.ts
│   │   ├── Job.ts
│   │   ├── Artifact.ts
│   │   ├── HealthStatus.ts
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
├── package.json
├── tsconfig.json
├── README.md
├── INSTALL.md
└── VERIFY.md
```

---

## Next Steps

After installing `mai-cicd-core`, you'll typically want to:

1. **Install a CI/CD adapter** - `mai-github-cicd-adapter` or `mai-gitlab-cicd-adapter`
2. **Install the CI/CD skill** - `mai-cicd-skill` for user-facing workflows
3. **Configure providers** - Set up `providers.yaml` with your CI/CD backends

See the related packs for their installation instructions.
