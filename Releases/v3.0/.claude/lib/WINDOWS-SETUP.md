# PAI — Windows 11 Setup Guide

> Native Windows 11 support for PAI (Personal AI Infrastructure).
> This guide covers installation and configuration on Windows 11 without WSL.

## Prerequisites

| Tool | Required | Install Command |
|------|----------|----------------|
| **Bun** | Yes | `winget install Oven-sh.Bun` or `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| **Git** | Yes | `winget install Git.Git` |
| **Claude Code** | Yes | `npm install -g @anthropic-ai/claude-code` |
| **Windows Terminal** | Recommended | Pre-installed on Windows 11, or `winget install Microsoft.WindowsTerminal` |

### Verify Prerequisites

Open **PowerShell** or **Windows Terminal** and run:

```powershell
bun --version        # Should show 1.x+
git --version        # Should show 2.x+
claude --version     # Should show Claude Code version
```

## Installation

### Option A: Fresh Install (Recommended)

```powershell
# 1. Clone PAI repository
git clone https://github.com/danielmiessler/PAI.git "$HOME\.claude"

# 2. Run the installer
cd "$HOME\.claude"
bun PAI-Install/cli/install.ts
```

### Option B: Manual Setup

If the installer doesn't work on Windows yet, set up manually:

```powershell
# 1. Clone repository
git clone https://github.com/danielmiessler/PAI.git "$HOME\.claude"

# 2. Create required directories
$dirs = @(
    "MEMORY", "MEMORY\STATE", "MEMORY\LEARNING", "MEMORY\WORK",
    "MEMORY\RELATIONSHIP", "MEMORY\VOICE", "Plans", "tasks"
)
foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path "$HOME\.claude\$dir" | Out-Null
}

# 3. Create settings.json (edit values below)
$settings = @{
    env = @{
        PAI_DIR = "$HOME\.claude"
        PAI_CONFIG_DIR = "$env:APPDATA\PAI"
    }
    principal = @{
        name = "YourName"
        timezone = (Get-TimeZone).Id
    }
    daidentity = @{
        name = "PAI"
        color = "#3B82F6"
    }
} | ConvertTo-Json -Depth 4

Set-Content -Path "$HOME\.claude\settings.json" -Value $settings
```

## Configuration

### Environment Variables

PAI uses these environment variables (set them in System → Advanced → Environment Variables, or in your PowerShell profile):

| Variable | Purpose | Default |
|----------|---------|---------|
| `PAI_DIR` | PAI installation directory | `%USERPROFILE%\.claude` |
| `PAI_CONFIG_DIR` | Configuration directory | `%APPDATA%\PAI` |

To set permanently in PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("PAI_DIR", "$HOME\.claude", "User")
[Environment]::SetEnvironmentVariable("PAI_CONFIG_DIR", "$env:APPDATA\PAI", "User")
```

### PowerShell Alias

Add to your PowerShell profile (`$PROFILE`):

```powershell
# Open profile for editing:
notepad $PROFILE

# Add this line:
function pai { bun "$HOME\.claude\skills\PAI\Tools\pai.ts" @args }
```

## Known Limitations (Native Windows)

### Hook Execution (Upstream Blocker)

Claude Code currently executes hooks via `bash -c "command"`. On native Windows, this fails because bash is not a native Windows tool. This is tracked as upstream issue [#22700](https://github.com/anthropics/claude-code/issues/22700).

**Status:** This is an **upstream dependency on Anthropic** — Claude Code needs to add native PowerShell/cmd.exe hook execution support. PAI's platform abstractions are fully validated and ready (113/113 smoke test), but hooks cannot execute until Claude Code supports native Windows shell execution.

**Our position:** We do NOT work around this by requiring Git Bash or any Unix shell emulator. PAI targets TRUE NATIVE Windows 11. The correct fix is for Claude Code to support `powershell.exe -Command "command"` or `cmd.exe /c "command"` as alternatives to `bash -c`.

### `${PAI_DIR}` in Hook Commands

The `settings.json` hook commands use `${PAI_DIR}/hooks/MyHook.ts` syntax. This is bash-specific variable expansion. On native Windows, environment variables use `%PAI_DIR%` (cmd.exe) or `$env:PAI_DIR` (PowerShell).

**Status:** This is part of the hook execution upstream blocker above. When Claude Code adds native Windows hook support, they will also need to handle platform-appropriate env var expansion in command strings. There is also an open feature request (#4276) for Claude Code to perform internal `${VAR}` pre-substitution before passing commands to any shell.

### Voice Server

The voice server (ElevenLabs TTS) uses `launchctl` on macOS and `systemd` on Linux. On Windows, it would use Task Scheduler, but this integration is not yet implemented. Voice features are deferred for the initial Windows release.

### Kitty Terminal

Kitty terminal is not available on Windows. The PAI terminal adapter pattern gracefully degrades — `isKittyAvailable()` returns `false` on Windows, and `WindowsTerminalAdapter` provides ANSI title-setting support.

## Running the Smoke Test

Verify your Windows installation works:

```powershell
cd "$HOME\.claude"
bun lib/smoke-test-windows.ts
```

Expected output: All checks should PASS, with Windows-specific values for paths, commands, and terminal detection.

## Architecture

PAI's Windows support is built on a centralized `platform.ts` abstraction layer:

- **`lib/platform.ts`** — All platform-specific logic (OS detection, path resolution, command mapping, terminal detection, audio/notifications, service management)
- **`lib/terminal.ts`** — Terminal adapter pattern (KittyTerminalAdapter, WindowsTerminalAdapter, GenericTerminalAdapter)
- **`hooks/lib/stdin.ts`** — Cross-platform stdin reading with timeout
- **`hooks/lib/paths.ts`** — Cross-platform path resolution with sanitization
- **`statusline-command.ts`** — Cross-platform TypeScript statusline (replaces bash version)

No inline `process.platform` checks are scattered across the codebase. All platform logic flows through `platform.ts`.

## Troubleshooting

### "bun: command not found"
Ensure Bun is installed and in PATH:
```powershell
winget install Oven-sh.Bun
# Restart terminal after installation
```

### Hooks fail with "bash not recognized"
This is an upstream Claude Code limitation — hooks currently require bash. This is tracked as [issue #22700](https://github.com/anthropics/claude-code/issues/22700). PAI's platform abstractions work correctly on native Windows; the blocker is Claude Code's hook execution engine. Check for updates to Claude Code that add PowerShell hook support.

### Settings.json not found
Verify PAI_DIR is set correctly:
```powershell
echo $env:PAI_DIR
# Should output: C:\Users\YourName\.claude
```
