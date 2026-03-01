# PAI — Personal AI Infrastructure

> **PAI 3.0 Alpha** — Under active development.

## Install

```bash
bash ~/.claude/install.sh
```

That's it. The script installs Bun (if needed), then walks you through setup:

- Your name and AI assistant name
- ElevenLabs voice configuration (optional)
- File permissions and directory structure
- Voice server startup

After the wizard finishes, activate the `pai` command and launch:

```bash
source ~/.zshrc
pai
```

The `pai` command displays the PAI banner, announces your AI's startup catchphrase via voice, and launches Claude Code with full PAI infrastructure.

## What's Inside

| Directory | Purpose |
|-----------|---------|
| `skills/` | Skill modules (PAI core + domain skills) |
| `hooks/` | Lifecycle event handlers (20 hooks) |
| `agents/` | Named agent configurations |
| `VoiceServer/` | ElevenLabs TTS service |
| `MEMORY/` | Session history and learnings |

## Documentation

- **[PAI-Install/README.md](PAI-Install/README.md)** — Detailed installation guide
- **[skills/PAI/SKILL.md](skills/PAI/SKILL.md)** — Full system documentation
- **[github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)** — Source repository
