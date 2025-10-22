# Fabric One-Line Installer

This directory contains the official one-line installer scripts for Fabric.

## Quick Start

### Unix/Linux/macOS

Install Fabric with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/danielmiessler/fabric/main/scripts/installer/install.sh | bash
```

### Windows (PowerShell)

Install Fabric with a single PowerShell command:

```powershell
iwr -useb https://raw.githubusercontent.com/danielmiessler/fabric/main/scripts/installer/install.ps1 | iex
```

## Custom Installation Directory

### Unix/Linux/macOS

By default, Fabric is installed to `~/.local/bin`. To install elsewhere:

```bash
curl -fsSL https://raw.githubusercontent.com/danielmiessler/fabric/main/scripts/installer/install.sh | INSTALL_DIR=/usr/local/bin bash
```

For system-wide installation (requires sudo):

```bash
curl -fsSL https://raw.githubusercontent.com/danielmiessler/fabric/main/scripts/installer/install.sh | sudo INSTALL_DIR=/usr/local/bin bash
```

### Windows (PowerShell)

By default, Fabric is installed to `%USERPROFILE%\.local\bin`. To install elsewhere:

```powershell
$env:INSTALL_DIR="C:\tools"; iwr -useb https://raw.githubusercontent.com/danielmiessler/fabric/main/scripts/installer/install.ps1 | iex
```

## Supported Systems

- **Operating Systems**: Darwin (macOS), Linux, Windows
- **Architectures**: x86_64, arm64, i386 (Windows only)

## What It Does

1. **Detects** your OS and architecture automatically
2. **Downloads** the latest Fabric release from GitHub
3. **Extracts** only the `fabric` binary (not the full archive)
4. **Installs** to your chosen directory (default: `~/.local/bin`)
5. **Verifies** the installation works correctly
6. **Provides** PATH setup instructions if needed

## Features

- ✅ **Cross-platform** - Unix/Linux/macOS (bash) and Windows (PowerShell)
- ✅ **Zero dependencies** - No additional tools required
- ✅ **Automatic detection** - OS and architecture
- ✅ **Smart extraction** - Only the binary, not extra files
- ✅ **Error handling** - Clear messages and graceful failures
- ✅ **PATH guidance** - Helps you set up your environment
- ✅ **Verification** - Tests the installation before completing

## Requirements

### Unix/Linux/macOS

- `curl` or `wget` for downloading
- `tar` for extraction (standard on all Unix systems)
- Write permissions to the installation directory

### Windows

- PowerShell (built into Windows)
- Write permissions to the installation directory

## After Installation

1. **Configure Fabric**: Run `fabric --setup`
2. **Add API keys**: Follow the setup prompts
3. **Start using**: Try `fabric --help` or `fabric --listpatterns`

## Troubleshooting

**Permission denied?**

- Try with `sudo` for system directories
- Or choose a directory you can write to: `INSTALL_DIR=~/bin`

**Binary not found after install?**

- Add the install directory to your PATH
- The installer provides specific instructions for your shell

**Download fails?**

- Check your internet connection
- Verify GitHub is accessible from your network

## Alternative Installation Methods

If the one-liner doesn't work for you, see the main [Installation Guide](../../README.md#installation) for:

- Binary downloads
- Package managers (Homebrew, winget, AUR)
- Docker images
- Building from source
