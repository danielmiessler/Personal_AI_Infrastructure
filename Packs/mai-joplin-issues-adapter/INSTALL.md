# mai-joplin-issues-adapter Installation

Use Joplin todo notes as an issue tracker via the IssuesProvider interface.

## Prerequisites

- **Joplin Desktop** installed and running
- **Web Clipper** enabled in Joplin (Tools -> Options -> Web Clipper)
- **Bun** runtime installed
- **macOS Keychain** for API token storage

---

## Step 1: Enable Web Clipper in Joplin

1. Open Joplin Desktop
2. Navigate to **Tools -> Options -> Web Clipper**
3. Enable the Web Clipper service
4. Note the port number (default: 41184)
5. Under **Advanced Options**, copy your API token

---

## Step 2: Store API Token in Keychain

```bash
security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
```

Replace `<your-token>` with the token from Step 1.

---

## Step 3: Install the Package

```bash
cd ${PAI_DIR:-$HOME/.config/pai}/Packs/mai-joplin-issues-adapter
bun install
```

---

## Step 4: Configure providers.yaml

Add to your `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
```

---

## Step 5: Verify Installation

See [VERIFY.md](./VERIFY.md) for verification steps.

Quick check:

```bash
# Verify Joplin is running and accessible
curl -s http://localhost:41184/ping | grep -q "JoplinClipperServer" && echo "OK" || echo "FAIL"
```

---

## Troubleshooting

### "Connection refused" error

**Cause:** Joplin Desktop is not running or Web Clipper is disabled.

**Solution:**
1. Ensure Joplin Desktop is running
2. Check Web Clipper is enabled: Tools -> Options -> Web Clipper
3. Verify the port number matches your configuration

### "Unauthorized" error

**Cause:** API token is missing or incorrect.

**Solution:**
```bash
# Verify token is stored
security find-generic-password -s "joplin-token" -a "claude-code" -w

# Update token if needed
security add-generic-password -U -s "joplin-token" -a "claude-code" -w "<new-token>"
```

### Notes not appearing as issues

**Cause:** Notes must be marked as todos to appear in issue queries.

**Solution:** Ensure notes are created with `is_todo: 1` or use the checkbox toggle in Joplin.

---

## File Locations

```
${PAI_DIR:-$HOME/.config/pai}/
├── Packs/
│   └── mai-joplin-issues-adapter/
│       ├── package.json
│       ├── src/
│       │   └── index.ts
│       ├── README.md
│       ├── INSTALL.md
│       └── VERIFY.md
└── providers.yaml
```
