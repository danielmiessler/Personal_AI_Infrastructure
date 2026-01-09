# mai-keychain-adapter Installation

macOS Keychain adapter for secure secret storage.

## Prerequisites

- **macOS** (this adapter is macOS-only)
- **Bun** runtime installed
- **Keychain Access** (built into macOS)

---

## Step 1: Verify macOS Environment

```bash
# Confirm you're on macOS
uname -s | grep -q "Darwin" && echo "OK: macOS detected" || echo "FAIL: This adapter requires macOS"

# Verify security command is available
which security
```

---

## Step 2: Install the Package

```bash
cd ${PAI_DIR:-$HOME/.config/pai}/Packs/mai-keychain-adapter
bun install
```

---

## Step 3: Configure providers.yaml

Add to your `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  secrets:
    primary: keychain
    adapters:
      keychain:
        servicePrefix: kai           # Optional, default: 'kai'
        defaultAccount: claude-code  # Optional
```

### Cross-Platform Fallback

For systems that may not always be macOS:

```yaml
domains:
  secrets:
    primary: keychain
    fallback: env                    # Falls back to environment variables
```

---

## Step 4: Store Initial Secrets

```bash
# Add a secret
security add-generic-password -s "kai:API_KEY" -a "claude-code" -w "your-secret-value"

# Format: kai:{KEY_NAME} where 'kai' is the servicePrefix
```

---

## Step 5: Verify Installation

See [VERIFY.md](./VERIFY.md) for verification steps.

Quick check:

```bash
# Retrieve a test secret
security find-generic-password -s "kai:API_KEY" -a "claude-code" -w
```

---

## Troubleshooting

### "The specified item could not be found"

**Cause:** Secret does not exist in keychain.

**Solution:**
```bash
# List existing secrets with kai prefix
security dump-keychain | grep "kai:"

# Add the missing secret
security add-generic-password -s "kai:YOUR_KEY" -a "claude-code" -w "value"
```

### Keychain access prompt appearing

**Cause:** First-time access or keychain permissions reset.

**Solution:**
1. Click "Allow" or "Always Allow" when prompted
2. To set permanent access: Open Keychain Access -> Find the item -> Access Control tab -> Add your application

### "The user name or passphrase you entered is not correct"

**Cause:** Keychain is locked.

**Solution:**
```bash
# Unlock keychain
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

### Updating an existing secret

**Cause:** `add-generic-password` fails if secret exists.

**Solution:**
```bash
# Use -U flag to update existing secret
security add-generic-password -U -s "kai:API_KEY" -a "claude-code" -w "new-value"
```

---

## Security Notes

- Secrets are stored in your login keychain
- Access is controlled by macOS Keychain Access permissions
- Consider locking keychain when not in use: `security lock-keychain`
- Use unique service names to avoid conflicts with other applications

---

## File Locations

```
${PAI_DIR:-$HOME/.config/pai}/
├── Packs/
│   └── mai-keychain-adapter/
│       ├── package.json
│       ├── src/
│       │   └── index.ts
│       ├── README.md
│       ├── INSTALL.md
│       └── VERIFY.md
└── providers.yaml

~/Library/Keychains/
└── login.keychain-db         # macOS login keychain
```
