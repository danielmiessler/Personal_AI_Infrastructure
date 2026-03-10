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

## Windows Compatibility Notes

### Hook Execution

Claude Code executes hooks via Git Bash on Windows. Git Bash is bundled with Git for Windows, which is a prerequisite for PAI. The `${PAI_DIR}` variable expansion in `settings.json` hook commands (e.g., `bun ${PAI_DIR}/hooks/VoiceGate.hook.ts`) is handled by Claude Code internally before passing to the shell.

PAI also provides `expandEnvVars()` in `lib/platform.ts` for any PAI code that needs to expand `${VAR}` (Unix-style) or `%VAR%` (Windows-style) environment variables in command strings at runtime.

### Voice Server

The voice server supports all three platforms via `VoiceServer/manage.ts`:
- **macOS:** `launchctl` with LaunchAgent plist (auto-start at login, restart on failure)
- **Linux:** `systemd` user service (auto-start, restart on failure)
- **Windows:** Task Scheduler via `schtasks.exe` (runs at logon, with fallback to direct spawn)
- **WSL:** Background process with shell profile auto-start suggestion

Usage: `bun VoiceServer/manage.ts install|start|stop|restart|status|uninstall`

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
Claude Code uses Git Bash for hook execution on Windows. Ensure Git for Windows is installed (`winget install Git.Git`) and that Git Bash is on your PATH. Restart your terminal after installation.

### Settings.json not found
Verify PAI_DIR is set correctly:
```powershell
echo $env:PAI_DIR
# Should output: C:\Users\YourName\.claude
```
