# PAI for OpenCode - Installation Script (Windows PowerShell)
# Version: 1.0.0

#Requires -Version 5.1

$ErrorActionPreference = "Stop"

# Banner
Write-Host @"

╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ██████╗  █████╗ ██╗    ███████╗ ██████╗ ██████╗                ║
║   ██╔══██╗██╔══██╗██║    ██╔════╝██╔═══██╗██╔══██╗               ║
║   ██████╔╝███████║██║    █████╗  ██║   ██║██████╔╝               ║
║   ██╔═══╝ ██╔══██║██║    ██╔══╝  ██║   ██║██╔══██╗               ║
║   ██║     ██║  ██║██║    ██║     ╚██████╔╝██║  ██║               ║
║   ╚═╝     ╚═╝  ╚═╝╚═╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝               ║
║                                                                   ║
║        Personal AI Infrastructure - OpenCode Edition              ║
║                       v1.0.0 - Windows                            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Blue

Write-Host ""
Write-Host "This installer will set up PAI for OpenCode on Windows." -ForegroundColor Yellow
Write-Host ""

# Function to ask yes/no questions
function Ask-YesNo {
    param(
        [string]$Prompt,
        [bool]$Default = $true
    )

    $choices = '&Yes', '&No'
    $defaultChoice = if ($Default) { 0 } else { 1 }

    $decision = $Host.UI.PromptForChoice('', $Prompt, $choices, $defaultChoice)
    return $decision -eq 0
}

# Function to ask for input with default
function Ask-Input {
    param(
        [string]$Prompt,
        [string]$Default
    )

    $value = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Default
    }
    return $value
}

# Detect platform
Write-Host "✓ Detected platform: Windows" -ForegroundColor Green
Write-Host "✓ PowerShell version: $($PSVersionTable.PSVersion)" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Blue
Write-Host ""

# Check for Bun
try {
    $bunVersion = & bun --version 2>$null
    Write-Host "✓ Bun found: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Bun not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bun is required to run PAI tools."
    Write-Host "Install it from: https://bun.sh"
    Write-Host ""
    Write-Host "For Windows:"
    Write-Host "  powershell -c ""irm bun.sh/install.ps1|iex"""
    Write-Host ""
    exit 1
}

# Check for OpenCode
try {
    $null = Get-Command opencode -ErrorAction Stop
    Write-Host "✓ OpenCode found" -ForegroundColor Green
} catch {
    Write-Host "⚠ OpenCode not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OpenCode should be installed before continuing."
    Write-Host "Install from: https://opencode.ai"
    Write-Host ""
    if (-not (Ask-YesNo "Continue anyway?")) {
        exit 1
    }
}

Write-Host ""

# Set up directories
$OpencodeDir = Join-Path $env:USERPROFILE ".opencode"
$PaiDir = Join-Path $OpencodeDir "pai"
$ConfigFile = Join-Path $env:USERPROFILE ".opencode.json"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "  CONFIGURATION" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Gather configuration
$DaName = Ask-Input "What would you like to name your AI assistant?" "Kai"
$UserName = Ask-Input "What is your name?" "User"

# Get timezone (Windows)
$DefaultTimezone = [System.TimeZoneInfo]::Local.Id
# Convert to IANA format if possible
$TimezoneMap = @{
    "Pacific Standard Time" = "America/Los_Angeles"
    "Mountain Standard Time" = "America/Denver"
    "Central Standard Time" = "America/Chicago"
    "Eastern Standard Time" = "America/New_York"
}
$DefaultIanaTimezone = if ($TimezoneMap.ContainsKey($DefaultTimezone)) {
    $TimezoneMap[$DefaultTimezone]
} else {
    "America/New_York"
}

$TimeZone = Ask-Input "What's your timezone (IANA format)?" $DefaultIanaTimezone

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Assistant Name: $DaName"
Write-Host "  User Name: $UserName"
Write-Host "  Timezone: $TimeZone"
Write-Host "  PAI Directory: $PaiDir"
Write-Host ""

if (-not (Ask-YesNo "Proceed with installation?")) {
    Write-Host "Installation cancelled."
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "  INSTALLATION" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Create directory structure
Write-Host "Creating directory structure..." -ForegroundColor Yellow

$directories = @(
    (Join-Path $PaiDir "skills\CORE\workflows"),
    (Join-Path $PaiDir "skills\CORE\tools"),
    (Join-Path $PaiDir "history\sessions"),
    (Join-Path $PaiDir "history\learnings"),
    (Join-Path $PaiDir "history\decisions"),
    (Join-Path $PaiDir "tools"),
    (Join-Path $PaiDir "mcp-servers")
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "✓ Directories created" -ForegroundColor Green

# Generate SKILL.md
Write-Host "Generating SKILL.md..." -ForegroundColor Yellow
$SkillMd = @"
---
name: CORE
description: Personal AI Infrastructure core. AUTO-LOADS at session start. USE WHEN any session begins OR user asks about identity, response format, contacts, stack preferences.
---

# CORE - Personal AI Infrastructure

**Auto-loads at session start.** This skill defines your AI's identity, response format, and core operating principles.

## Identity

**Assistant:**
- Name: $DaName
- Role: $UserName's AI assistant
- Operating Environment: Personal AI infrastructure built on OpenCode

**User:**
- Name: $UserName

---

## First-Person Voice (CRITICAL)

Your AI should speak as itself, not about itself in third person.

**Correct:**
- "for my system" / "in my architecture"
- "I can help" / "my delegation patterns"
- "we built this together"

**Wrong:**
- "for $DaName" / "for the $DaName system"
- "the system can" (when meaning "I can")

---

## Stack Preferences

Default preferences (customize in CoreStack.md):

- **Language:** TypeScript preferred over Python
- **Package Manager:** bun (NEVER npm/yarn/pnpm)
- **Runtime:** Bun
- **Markup:** Markdown (NEVER HTML for basic content)
- **Platform:** Windows, Linux, macOS

---

## Response Format (Optional)

Define a consistent response format for task-based responses:

``````
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
➡️ NEXT: [Recommended next steps]
``````

Customize this format in SKILL.md to match your preferences.
"@

Set-Content -Path (Join-Path $PaiDir "skills\CORE\SKILL.md") -Value $SkillMd -Encoding UTF8
Write-Host "✓ SKILL.md created" -ForegroundColor Green

# Generate Contacts.md
Write-Host "Generating Contacts.md..." -ForegroundColor Yellow
$ContactsMd = @"
# Contact Directory

Quick reference for frequently contacted people.

---

## Contacts

| Name | Role | Email | Notes |
|------|------|-------|-------|
| [Add contacts here] | [Role] | [email] | [Notes] |

---

## Adding Contacts

To add a new contact, edit this file following the table format above.
"@

Set-Content -Path (Join-Path $PaiDir "skills\CORE\Contacts.md") -Value $ContactsMd -Encoding UTF8
Write-Host "✓ Contacts.md created" -ForegroundColor Green

# Generate CoreStack.md
Write-Host "Generating CoreStack.md..." -ForegroundColor Yellow
$CurrentDate = Get-Date -Format "yyyy-MM-dd"
$CoreStackMd = @"
# Core Stack Preferences

Technical preferences for code generation and tooling.

Generated: $CurrentDate

---

## Language Preferences

| Priority | Language | Use Case |
|----------|----------|----------|
| 1 | TypeScript | Primary for all new code |
| 2 | Python | Data science, ML, when required |
| 3 | PowerShell | Windows automation and scripting |

---

## Package Managers

| Language | Manager | Never Use |
|----------|---------|-----------|
| JavaScript/TypeScript | bun | npm, yarn, pnpm |
| Python | uv | pip, pip3 |

---

## Runtime

| Purpose | Tool |
|---------|------|
| JavaScript Runtime | Bun |
| Serverless | Cloudflare Workers |

---

## Platform-Specific

| Platform | Shell | Package Manager |
|----------|-------|-----------------|
| Windows | PowerShell | winget, chocolatey |
| Linux | bash | apt, yum, pacman |
| macOS | zsh | brew |

---

## Markup Preferences

| Format | Use | Never Use |
|--------|-----|-----------|
| Markdown | All content, docs, notes | HTML for basic content |
| YAML | Configuration, frontmatter | - |
| JSON | API responses, data | - |

---

## Code Style

- Prefer explicit over clever
- No unnecessary abstractions
- Comments only where logic isn't self-evident
- Error messages should be actionable
- Cross-platform compatibility when possible
"@

Set-Content -Path (Join-Path $PaiDir "skills\CORE\CoreStack.md") -Value $CoreStackMd -Encoding UTF8
Write-Host "✓ CoreStack.md created" -ForegroundColor Green

# Create .env file
Write-Host "Creating .env file..." -ForegroundColor Yellow
$EnvContent = @"
# PAI Environment Configuration
# Created by PAI for OpenCode installer - $CurrentDate

DA=$DaName
TIME_ZONE=$TimeZone
PAI_DIR=$PaiDir

# Add API keys below as needed
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# ELEVENLABS_API_KEY=
"@

Set-Content -Path (Join-Path $PaiDir ".env") -Value $EnvContent -Encoding UTF8
Write-Host "✓ .env created" -ForegroundColor Green

# Create or update .opencode.json
Write-Host "Configuring OpenCode..." -ForegroundColor Yellow

if (Test-Path $ConfigFile) {
    Write-Host "⚠ Existing .opencode.json found" -ForegroundColor Yellow
    if (Ask-YesNo "Backup and update existing config?") {
        Copy-Item $ConfigFile "$ConfigFile.backup"
        Write-Host "✓ Backup created: $ConfigFile.backup" -ForegroundColor Green
    }
}

# Create basic OpenCode config with PAI context server
# Note: Using forward slashes in JSON paths for cross-platform compatibility
$PaiDirJson = $PaiDir -replace '\\', '/'
$OpencodeConfig = @{
    data = @{
        directory = $OpencodeDir -replace '\\', '/'
    }
    mcpServers = @{
        "pai-context" = @{
            command = "bun"
            args = @("run", "$PaiDirJson/mcp-servers/context-server.ts")
            env = @{
                PAI_DIR = $PaiDirJson
                DA = $DaName
                TIME_ZONE = $TimeZone
            }
        }
    }
} | ConvertTo-Json -Depth 10

Set-Content -Path $ConfigFile -Value $OpencodeConfig -Encoding UTF8
Write-Host "✓ OpenCode configuration created" -ForegroundColor Green

# Create MCP context server
Write-Host "Creating MCP context server..." -ForegroundColor Yellow
$ContextServer = @"
#!/usr/bin/env bun
/**
 * PAI Context Server for OpenCode
 *
 * This MCP server loads your CORE skill (identity, contacts, stack preferences)
 * and makes it available to OpenCode at session start.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || process.env.USERPROFILE || '', '.opencode', 'pai');
const SKILL_PATH = join(PAI_DIR, 'skills', 'CORE', 'SKILL.md');

// MCP server stdin/stdout protocol
process.stdin.setEncoding('utf8');

// Handle MCP requests
process.stdin.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString());

    if (request.method === 'initialize') {
      // Load CORE skill content
      let skillContent = '';
      if (existsSync(SKILL_PATH)) {
        skillContent = readFileSync(SKILL_PATH, 'utf-8');
      }

      // Return context to OpenCode
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          context: skillContent,
          metadata: {
            name: 'PAI Context',
            version: '1.0.0',
            description: 'Personal AI Infrastructure context loader'
          }
        }
      };

      process.stdout.write(JSON.stringify(response) + '\n');
    }
  } catch (error) {
    console.error('MCP server error:', error);
  }
});

// Keep server alive
process.stdin.resume();
"@

Set-Content -Path (Join-Path $PaiDir "mcp-servers\context-server.ts") -Value $ContextServer -Encoding UTF8
Write-Host "✓ MCP context server created" -ForegroundColor Green

# Installation complete
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "  INSTALLATION COMPLETE" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""
Write-Host "Your PAI system is configured for OpenCode:" -ForegroundColor Green
Write-Host ""
Write-Host "  📁 PAI Directory: $PaiDir"
Write-Host "  🤖 Assistant Name: $DaName"
Write-Host "  👤 User: $UserName"
Write-Host "  🌍 Timezone: $TimeZone"
Write-Host "  ⚙️  OpenCode Config: $ConfigFile"
Write-Host ""
Write-Host "Files created:" -ForegroundColor Yellow
Write-Host "  - $PaiDir\skills\CORE\SKILL.md"
Write-Host "  - $PaiDir\skills\CORE\Contacts.md"
Write-Host "  - $PaiDir\skills\CORE\CoreStack.md"
Write-Host "  - $PaiDir\.env"
Write-Host "  - $ConfigFile"
Write-Host "  - $PaiDir\mcp-servers\context-server.ts"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Start OpenCode:"
Write-Host "     > opencode"
Write-Host ""
Write-Host "  2. Your CORE skill will auto-load via the PAI context MCP server"
Write-Host ""
Write-Host "  3. (Optional) Install additional PAI packs:"
Write-Host "     - Browse packs in ..\Packs\"
Write-Host "     - Give pack files to OpenCode to install"
Write-Host ""
Write-Host "For more information, see OpenCode\README.md" -ForegroundColor Green
Write-Host ""
