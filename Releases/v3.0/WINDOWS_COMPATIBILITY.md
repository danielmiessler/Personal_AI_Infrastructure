# Windows Compatibility Guide

> PAI on Windows is community-supported. The automated installer (`install.sh`) currently targets macOS and Linux. This guide covers manual installation on Windows.

**Related issues:** [#440](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/440) | [#543](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/543) | [#385](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/385)

---

## Prerequisites

| Tool | Install | Verify |
|------|---------|--------|
| **Git for Windows** | [git-scm.com](https://git-scm.com/download/win) (includes Git Bash) | `git --version` |
| **Bun** | `powershell -c "irm bun.sh/install.ps1 \| iex"` | `bun --version` |
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` | `claude --version` |
| **Windows Terminal** | [Microsoft Store](https://aka.ms/terminal) (recommended) | — |

---

## Manual Installation

### 1. Clone the repository

```bash
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Releases/v3.0
```

### 2. Copy the release to your home directory

From Git Bash:
```bash
cp -r .claude ~/
```

Or from PowerShell:
```powershell
Copy-Item -Recurse -Force .\.claude $HOME\.claude
```

### 3. Create required directories

```bash
mkdir -p ~/.claude/MEMORY/{STATE,LEARNING,WORK,RELATIONSHIP,VOICE,RESEARCH}
mkdir -p ~/.claude/Plans ~/.claude/tasks
```

### 4. Configure `settings.json`

Edit `~/.claude/settings.json` and update these fields:

```json
{
  "env": {
    "PAI_DIR": "C:/Users/YOUR_USERNAME/.claude"
  },
  "principal": {
    "name": "Your Name",
    "timezone": "America/Your_Timezone"
  },
  "daidentity": {
    "name": "Your AI Name"
  }
}
```

### 5. Install hook dependencies

```bash
cd ~/.claude && bun install
```

---

## Known Issues and Fixes

### Hook commands fail with `Module not found "${PAI_DIR}/hooks/..."`

**Root cause:** Claude Code does NOT expand `${VAR}` syntax in hook command strings. On macOS/Linux, the shell (`/bin/sh`) expands environment variables before execution. On Windows, hooks run through `cmd.exe` which uses `%VAR%` syntax instead.

**Fix:** Replace all `${PAI_DIR}` references in hook commands with the absolute path. Use forward slashes for Bun/Node compatibility:

```bash
# From Git Bash — replaces all occurrences in settings.json
sed -i 's|\${PAI_DIR}|C:/Users/YOUR_USERNAME/.claude|g' ~/.claude/settings.json
```

Also ensure all `.ts` hook commands are prefixed with `bun`:
```json
"command": "bun \"C:/Users/YOUR_USERNAME/.claude/hooks/SecurityValidator.hook.ts\""
```

> **Note:** If you run the installer's TypeScript configuration step (`bun run PAI-Install/main.ts`), it will resolve these paths automatically.

### `Bun.stdin.text()` returns empty on Windows/MSYS ([#385](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/385))

**Root cause:** Bun's `stdin.text()` doesn't work with piped input on Windows/MSYS.

**Workaround:** Hooks that use `Bun.stdin.text()` should fall back to `process.stdin`:

```typescript
async function readStdin(): Promise<string> {
  // Bun.stdin.text() fails on Windows/MSYS — use Node-compatible approach
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data); });
    setTimeout(() => { if (!data) resolve('{}'); }, 100);
  });
}
```

### `$PAI_DIR` in `statusLine` command

The `statusLine.command` field in `settings.json` also uses `$PAI_DIR`. Apply the same fix:

```json
"statusLine": {
  "type": "command",
  "command": "C:/Users/YOUR_USERNAME/.claude/statusline-command.sh"
}
```

### Path separators

Use **forward slashes** (`/`) in `settings.json` paths. Both Bun and Node.js handle forward slashes correctly on Windows. Avoid backslashes in JSON as they require double-escaping (`\\`).

### Filenames with colons ([#457](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/457))

Some files in the repository contain colons (`:`) in their names (URL-style paths). Windows does not allow colons in filenames. If `git clone` fails:

```bash
git clone -c core.protectNTFS=false https://github.com/danielmiessler/PAI.git
```

Or selectively clone only the release directory you need.

---

## Voice Server on Windows

The voice server (`VoiceServer/`) uses macOS-specific LaunchAgent for auto-start. On Windows:

1. Start manually: `cd ~/.claude/VoiceServer && bun run server.ts`
2. Or create a Windows Task Scheduler entry to run it at login
3. See [#405](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues/405) for browser-based audio playback alternative

---

## Contributing Windows Fixes

If you get PAI working on Windows and find additional issues or fixes, please:

1. Open an issue describing the problem and your solution
2. Submit a PR with the fix — tag it with `windows` in the title
3. Update this guide if applicable
