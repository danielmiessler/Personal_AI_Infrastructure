# GitHub CI/CD Adapter Installation

GitHub Actions CI/CD adapter for pipeline management, run monitoring, and artifact handling.

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS** (for Keychain authentication)
- **GitHub Personal Access Token** with required permissions
- **mai-cicd-core** package (peer dependency)

---

## Step 1: Verify Environment

```bash
# Check Bun is installed
bun --version

# Check PAI directory
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# Check for existing token
security find-generic-password -s "github-token" -a "claude-code" -w 2>/dev/null && echo "Token found in Keychain" || echo "Token NOT in Keychain - setup required"
```

---

## Step 2: Create GitHub Personal Access Token

1. Go to GitHub: **Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Click **Generate new token (classic)**
3. Set expiration as needed
4. Select these scopes:
   - `repo` - Full control of private repositories (for contents:read)
   - `workflow` - Update GitHub Action workflows (for actions:write)
   - Or fine-grained: `actions:read`, `actions:write`, `contents:read`
5. Click **Generate token**
6. Copy the token (starts with `ghp_`)

---

## Step 3: Store Token in macOS Keychain

```bash
# Store token securely in Keychain
security add-generic-password -s "github-token" -a "claude-code" -w "ghp_your_token_here"
```

**Alternative: Environment Variable**
```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export GITHUB_TOKEN="ghp_your_token_here"
```

---

## Step 4: Install Dependencies

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-github-cicd-adapter"

# If installed as part of PAI system
cd "$PACK_DIR" && bun install

# Or if using as npm package
bun add mai-github-cicd-adapter
```

---

## Step 5: Configure Provider (Optional)

If using with the PAI provider system, add to `providers.yaml`:

```yaml
domains:
  cicd:
    primary: github
    adapters:
      github:
        # Optional: for GitHub Enterprise
        apiUrl: https://api.github.com
```

---

## Step 6: Verify Installation

See [VERIFY.md](./VERIFY.md) for the complete verification checklist.

**Quick verification:**

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs/mai-github-cicd-adapter"

# Run unit tests
cd "$PACK_DIR" && bun test

# Check TypeScript compilation
cd "$PACK_DIR" && bun run typecheck

# Verify token access
security find-generic-password -s "github-token" -a "claude-code" -w >/dev/null 2>&1 && echo "Token OK" || echo "Token MISSING"
```

---

## Troubleshooting

### "Failed to retrieve token from keychain"

1. Verify token exists:
```bash
security find-generic-password -s "github-token" -a "claude-code"
```

2. Re-add if missing:
```bash
security add-generic-password -s "github-token" -a "claude-code" -w "ghp_your_token"
```

### "401 Unauthorized" errors

1. Token may be expired - generate a new one on GitHub
2. Token lacks required scopes - check `actions:read`, `actions:write`, `contents:read`

### "403 Forbidden" errors

Your token may not have access to the repository. Ensure the token has appropriate repository access.

### Rate limiting (429 errors)

GitHub API has a 5,000 requests/hour limit. The adapter handles rate limiting automatically with exponential backoff.

### mai-cicd-core not found

Ensure the core package is installed:
```bash
cd ../mai-cicd-core && bun install
cd ../mai-github-cicd-adapter && bun install
```

---

## File Locations

After installation:

```
mai-github-cicd-adapter/
├── adapter.yaml          # Adapter metadata
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── README.md             # Documentation
├── INSTALL.md            # This file
├── VERIFY.md             # Verification checklist
├── src/
│   ├── GitHubCICDAdapter.ts   # Main adapter implementation
│   └── index.ts               # Package exports
└── tests/
    └── GitHubCICDAdapter.test.ts   # Unit tests
```
