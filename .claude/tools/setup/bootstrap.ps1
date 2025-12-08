# PAI Bootstrap Script for Windows
# Checks prerequisites and runs the setup wizard
#
# Usage:
#   & "$env:USERPROFILE\.claude\.claude\tools\setup\bootstrap.ps1"

$ErrorActionPreference = "Stop"

# Banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗"
Write-Host "║                    PAI Setup Bootstrap                        ║"
Write-Host "║         Personal AI Infrastructure Configuration              ║"
Write-Host "╚══════════════════════════════════════════════════════════════╝"
Write-Host ""

# Check and install Bun
function Test-Bun {
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        $version = bun --version
        Write-Host "✓ Bun is installed (v$version)" -ForegroundColor Green
        return $true
    }

    Write-Host "⚠ Bun is not installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Bun is required to run PAI. It's a fast JavaScript runtime."
    Write-Host ""
    $response = Read-Host "   Install Bun now? (y/n)"

    if ($response -eq 'y') {
        Write-Host "→ Installing Bun..." -ForegroundColor Cyan
        irm bun.sh/install.ps1 | iex

        # Refresh PATH to include newly installed Bun
        $env:BUN_INSTALL = "$env:USERPROFILE\.bun"
        $env:PATH = "$env:BUN_INSTALL\bin;$env:PATH"

        if (Get-Command bun -ErrorAction SilentlyContinue) {
            Write-Host "✓ Bun installed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "! You may need to restart PowerShell after setup completes." -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "✗ Bun installation failed" -ForegroundColor Red
            Write-Host "   Try manually: irm bun.sh/install.ps1 | iex"
            exit 1
        }
    } else {
        Write-Host "✗ Bun is required. Install it and run this script again." -ForegroundColor Red
        exit 1
    }
}

# Check for Claude Code
function Test-ClaudeCode {
    Write-Host ""
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        Write-Host "✓ Claude Code is installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Claude Code not found in PATH" -ForegroundColor Yellow
        Write-Host "   Install from: https://code.claude.com"
        Write-Host "   (You can continue setup without it)"
        Write-Host ""
    }
}

# Run the TypeScript setup wizard
function Start-Wizard {
    param(
        [Parameter(ValueFromRemainingArguments=$true)]
        [string[]]$Arguments
    )

    Write-Host ""
    Write-Host "→ Installing setup dependencies..." -ForegroundColor Cyan

    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    Push-Location $scriptDir

    try {
        bun install --silent

        Write-Host ""
        Write-Host "→ Starting PAI Setup Wizard..." -ForegroundColor Cyan
        Write-Host ""

        if ($Arguments) {
            bun run setup.ts @Arguments
        } else {
            bun run setup.ts
        }
    }
    finally {
        Pop-Location
    }
}

# Main execution
Test-Bun
Test-ClaudeCode
Start-Wizard @args
