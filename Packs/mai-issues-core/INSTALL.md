# Issues Core Installation

Core interfaces and utilities for the PAI issues/PM domain. Provides the `IssuesProvider` interface that adapters implement to enable portable issue tracking across different backends (Joplin, Linear, Jira).

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Environment

```bash
# Check Bun is installed
bun --version

# Check PAI directory
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"
```

---

## Step 2: Install Dependencies

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-issues-core"

cd "$PACK_DIR" && bun install

# Or if using as npm package
bun add mai-issues-core
```

---

## Step 3: Configure Provider System (Optional)

If using the PAI provider discovery system, create `providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin        # Default backend
    fallback: linear       # Fallback if primary fails
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
      linear:
        teamId: your-team-id
```

**Configuration search order:**
1. `$PAI_CONFIG` environment variable
2. `./providers.yaml` (project-local)
3. `${PAI_DIR:-$HOME/.config/pai}/providers.yaml` (user config)
4. `/etc/pai/providers.yaml` (system config)

---

## Step 4: Verify Installation

See [VERIFY.md](./VERIFY.md) for the complete verification checklist.

**Quick verification:**

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-issues-core"

# Run unit tests
cd "$PACK_DIR" && bun test

# Check TypeScript compilation
cd "$PACK_DIR" && bun run typecheck
```

**Expected output:**
```
bun test v1.x.x
...
 PASS  tests/...
```

---

## Usage

```typescript
import { createProvider, IssuesProvider, Issue } from 'mai-issues-core';

// Create provider from configuration
const provider: IssuesProvider = await createProvider();

// List open issues
const issues: Issue[] = await provider.listIssues({ status: 'open' });

// Create an issue
const issue = await provider.createIssue({
  title: 'Fix login bug',
  type: 'bug',
  priority: 'high'
});

// Update issue status
await provider.updateIssue(issue.id, { status: 'done' });

// Health check
const health = await provider.healthCheck();
console.log(health.healthy ? 'Connected' : 'Connection failed');
```

---

## Available Adapters

Install the adapter(s) for your backend(s):

| Adapter | Backend | Install |
|---------|---------|---------|
| mai-joplin-issues-adapter | Joplin todo notes | `bun add mai-joplin-issues-adapter` |
| mai-linear-adapter | Linear PM | `bun add mai-linear-adapter` |
| mai-mock-issues-adapter | Testing/development | `bun add mai-mock-issues-adapter` |

---

## Troubleshooting

### "AdapterNotFoundError"

No adapter is configured for the issues domain. Ensure:
1. `providers.yaml` exists and has an `issues` domain
2. The adapter package is installed (e.g., `mai-joplin-issues-adapter`)
3. The adapter is listed in `domains.issues.adapters`

### "ConfigurationError"

The providers.yaml file is invalid. Check:
1. YAML syntax is correct
2. Required fields are present (`primary`, `adapters`)

### TypeScript errors

Ensure dependencies are installed:
```bash
cd "$PACK_DIR" && bun install
```

---

## Core Interface

The `IssuesProvider` interface that adapters implement:

```typescript
interface IssuesProvider {
  readonly name: string;
  readonly version: string;

  // CRUD operations
  createIssue(issue: CreateIssueInput): Promise<Issue>;
  getIssue(id: string): Promise<Issue>;
  updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;

  // Query operations
  listIssues(query?: IssueQuery): Promise<Issue[]>;
  searchIssues(text: string, options?: SearchOptions): Promise<Issue[]>;

  // Project operations (optional)
  listProjects?(): Promise<Project[]>;
  getProject?(id: string): Promise<Project>;

  // Label operations
  listLabels(): Promise<Label[]>;
  addLabel(issueId: string, labelId: string): Promise<void>;
  removeLabel(issueId: string, labelId: string): Promise<void>;

  // Health check
  healthCheck(): Promise<HealthStatus>;
}
```

---

## File Locations

After installation:

```
mai-issues-core/
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── README.md             # Documentation
├── INSTALL.md            # This file
├── VERIFY.md             # Verification checklist
├── src/
│   ├── index.ts          # Package exports
│   ├── types.ts          # Core type definitions
│   ├── errors.ts         # Error classes
│   ├── discovery.ts      # Adapter discovery system
│   └── utils.ts          # Retry, logging utilities
└── tests/
    └── *.test.ts         # Unit tests
```
