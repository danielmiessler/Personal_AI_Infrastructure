# mai-linear-adapter Installation

Linear.app adapter for project management via the IssuesProvider interface.

## Prerequisites

- **Linear account** with API access
- **Linear API key** (Personal API Key)
- **Bun** runtime installed
- **macOS Keychain** for API key storage (or alternative secrets provider)

---

## Step 1: Generate Linear API Key

1. Open [Linear Settings](https://linear.app/settings/api)
2. Navigate to **Settings -> API -> Personal API Keys**
3. Click **Create Key**
4. Copy the generated key (it will only be shown once)

---

## Step 2: Store API Key in Keychain

```bash
security add-generic-password -s "linear-api-key" -a "claude-code" -w "<your-api-key>"
```

Replace `<your-api-key>` with the key from Step 1.

---

## Step 3: Get Your Team ID

```bash
# Using the Linear GraphQL API (requires API key)
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ teams { nodes { id name } } }"}' | jq '.data.teams.nodes'
```

Or find it in Linear: Team Settings -> Copy team ID from URL.

---

## Step 4: Install the Package

```bash
cd ${PAI_DIR:-$HOME/.config/pai}/Packs/mai-linear-adapter
bun install
```

---

## Step 5: Configure providers.yaml

Add to your `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  issues:
    primary: linear
    adapters:
      linear:
        teamId: your-team-id
        apiUrl: https://api.linear.app/graphql  # Optional, default
```

---

## Step 6: Verify Installation

See [VERIFY.md](./VERIFY.md) for verification steps.

Quick check:

```bash
# Test API connectivity
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $(security find-generic-password -s 'linear-api-key' -a 'claude-code' -w)" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name } }"}' | jq '.data.viewer.name'
```

---

## Troubleshooting

### "Invalid API key"

**Cause:** API key is missing, expired, or incorrectly stored.

**Solution:**
```bash
# Verify key is stored
security find-generic-password -s "linear-api-key" -a "claude-code" -w

# Regenerate key in Linear and update
security add-generic-password -U -s "linear-api-key" -a "claude-code" -w "<new-key>"
```

### "Team not found"

**Cause:** Invalid team ID or insufficient permissions.

**Solution:**
```bash
# List all teams you have access to
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $(security find-generic-password -s 'linear-api-key' -a 'claude-code' -w)" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ teams { nodes { id name } } }"}' | jq
```

### Rate limit exceeded

**Cause:** Linear limits to 1500 requests per hour.

**Solution:**
- The adapter uses exponential backoff retry automatically
- Wait for rate limit to reset (shown in error response)
- Consider caching responses for read-heavy operations

### Issues not mapping correctly

**Cause:** Linear state types may not match expected mappings.

**Solution:** Check the state type mappings in README.md:
- `backlog`, `unstarted`, `triage` -> `open`
- `started` -> `in_progress`
- `completed` -> `done`
- `canceled` -> `cancelled`

---

## File Locations

```
${PAI_DIR:-$HOME/.config/pai}/
├── Packs/
│   └── mai-linear-adapter/
│       ├── package.json
│       ├── src/
│       │   └── index.ts
│       ├── README.md
│       ├── INSTALL.md
│       └── VERIFY.md
└── providers.yaml
```
