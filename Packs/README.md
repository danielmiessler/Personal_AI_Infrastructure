# PAI Packs

Standalone, AI-installable capabilities for Claude Code and other AI agent systems.

Each pack is a directory containing everything needed for an AI agent to install it autonomously:

```
PackName/
├── README.md    # What it does, why it exists, how it works
├── INSTALL.md   # Step-by-step wizard for AI-assisted installation
├── VERIFY.md    # Post-install verification checklist
└── src/         # Source files to copy
```

## How to Install a Pack

Point your AI to the pack directory:

```
"Install the WorkCommand pack from PAI/Packs/WorkCommand/"
```

Your AI reads `INSTALL.md` and walks through a 5-phase wizard: system analysis, user questions, backup, installation, verification.

Or manually: read `INSTALL.md`, copy files from `src/` to the specified locations, run `VERIFY.md` checks.

## Available Packs

| Pack | Description |
|------|-------------|
| [WorkCommand](WorkCommand/) | `/w` and `/work` — search prior work sessions by topic |

## Creating a Pack

See [PAIPackTemplate.md](../Tools/PAIPackTemplate.md) for the full specification.
