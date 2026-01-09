# GitLab CI/CD Adapter Installation

GitLab CI/CD adapter for pipeline management, job monitoring, and artifact handling. Works with gitlab.com and self-hosted GitLab instances.

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS** (for Keychain authentication)
- **GitLab Personal Access Token** with required scopes
- **mai-cicd-core** package (peer dependency)

---

## Step 1: Verify Environment

```bash
# Check Bun is installed
bun --version

# Check PAI directory
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# Check for existing token
security find-generic-password -s "gitlab-token" -a "claude-code" -w 2>/dev/null && echo "Token found in Keychain" || echo "Token NOT in Keychain - setup required"
```

---

## Step 2: Create GitLab Personal Access Token

1. Go to GitLab: **User Settings > Access Tokens**
2. Or navigate directly to: `https://gitlab.com/-/user_settings/personal_access_tokens`
3. Enter a token name (e.g., "PAI CI/CD Adapter")
4. Set expiration date
5. Select scopes:
   - `api` - Full API access (recommended)
   - Or for read-only: `read_api` + `read_repository`
6. Click **Create personal access token**
7. Copy the token (starts with `glpat-`)

---

## Step 3: Store Token in macOS Keychain

```bash
# Store token securely in Keychain
security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-your_token_here"
```

**Alternative: Environment Variable**
```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export GITLAB_TOKEN="glpat-your_token_here"
```

---

## Step 4: Configure GitLab Host (Optional)

For self-hosted GitLab instances:

```bash
# Add to your shell profile
export GITLAB_URL="https://gitlab.example.com"
```

Default is `gitlab.com`.

---

## Step 5: Install Dependencies

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-gitlab-cicd-adapter"

# If installed as part of PAI system
cd "$PACK_DIR" && bun install

# Or if using as npm package
bun add mai-gitlab-cicd-adapter
```

---

## Step 6: Configure Provider (Optional)

If using with the PAI provider system, add to `providers.yaml`:

```yaml
domains:
  cicd:
    primary: gitlab
    adapters:
      gitlab:
        host: gitlab.com      # Required
        apiVersion: v4        # Optional, default: v4
```

---

## Step 7: Verify Installation

See [VERIFY.md](./VERIFY.md) for the complete verification checklist.

**Quick verification:**

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-gitlab-cicd-adapter"

# Run unit tests
cd "$PACK_DIR" && bun test

# Check TypeScript compilation
cd "$PACK_DIR" && bun run typecheck

# Verify token access
security find-generic-password -s "gitlab-token" -a "claude-code" -w >/dev/null 2>&1 && echo "Token OK" || echo "Token MISSING"
```

---

## Troubleshooting

### "Failed to retrieve token from keychain"

1. Verify token exists:
```bash
security find-generic-password -s "gitlab-token" -a "claude-code"
```

2. Re-add if missing:
```bash
security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-your_token"
```

### "401 Unauthorized" errors

1. Token may be expired - generate a new one on GitLab
2. Token may be revoked - check GitLab Access Tokens page

### "403 Forbidden" errors

Your token lacks required scopes. Ensure it has `api` scope (or `read_api` for read-only operations).

### "404 Not Found" errors

1. Project path may be incorrect - use format `group/project` or numeric ID
2. You may not have access to the project

### Self-hosted GitLab connection issues

1. Verify GITLAB_URL is set correctly (no trailing slash)
2. Check that your GitLab instance is accessible from your machine
3. Ensure SSL certificates are valid

### mai-cicd-core not found

Ensure the core package is installed:
```bash
cd ../mai-cicd-core && bun install
cd ../mai-gitlab-cicd-adapter && bun install
```

---

## GitLab-Specific Notes

### Pipeline vs Workflow

GitLab uses `.gitlab-ci.yml` for all pipeline definitions. Unlike GitHub Actions which has separate workflow files, the adapter treats `gitlab-ci` as a single pipeline definition.

### Artifacts

In GitLab, artifacts are attached to jobs, not pipelines. When downloading artifacts, provide the job ID, not the pipeline ID.

### Variables

When triggering a pipeline, the `inputs` parameter is converted to GitLab pipeline variables.

---

## File Locations

After installation:

```
mai-gitlab-cicd-adapter/
├── adapter.yaml          # Adapter metadata
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── README.md             # Documentation
├── INSTALL.md            # This file
├── VERIFY.md             # Verification checklist
├── src/
│   ├── GitLabCICDAdapter.ts   # Main adapter implementation
│   └── index.ts               # Package exports
└── tests/
    └── GitLabCICDAdapter.test.ts   # Unit tests
```
