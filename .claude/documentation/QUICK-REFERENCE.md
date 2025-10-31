# PAI Quick Reference Card

**Bookmark this page!** This is your quick reference for common PAI commands and tasks.

> [!NOTE]
> **📦 v0.6.0 Update:** Repository now uses `.claude/` directory structure.
> - On your system: `~/.claude/` contains your PAI installation
> - Path references below use `~/.claude/` for installed system
> - Repository structure: `PAI/.claude/` for development

---

## 🚀 Getting Started

### First Time Setup

```bash
# Run the automated setup script
curl -fsSL https://raw.githubusercontent.com/danielmiessler/Personal_AI_Infrastructure/main/.claude/setup.sh | bash

# Or manual setup - see documentation/how-to-start.md
```

### Environment Check

```bash
# Verify PAI is installed
echo $PAI_DIR                    # Should show: /Users/yourname/PAI

# Go to PAI directory
cd $PAI_DIR

# See what's available
ls -la
```

---

## 📁 Essential Directories

| Directory | What's There | Example |
|-----------|--------------|---------|
| `$PAI_DIR/skills/` | All available skills | `ls $PAI_DIR/skills/` |
| `$PAI_DIR/commands/` | Pre-built commands | `ls $PAI_DIR/commands/` |
| `$PAI_DIR/documentation/` | Help and guides | `open $PAI_DIR/documentation/` |
| `$PAI_DIR/agents/` | Specialized AI agents | `ls $PAI_DIR/agents/` |
| `$PAI_DIR/hooks/` | Automation scripts | `ls $PAI_DIR/hooks/` |
| `$PAI_DIR/.env` | Your API keys and settings | `open -e $PAI_DIR/.env` |

---

## ⚙️ Common Commands

### Update PAI

```bash
# Pull latest version
cd $PAI_DIR && git pull

# Check what changed
git log -5 --oneline

# See current version info
cat $PAI_DIR/README.md | head -50
```

### View Available Skills

```bash
# List all skills
ls $PAI_DIR/skills/

# See what a skill does
cat $PAI_DIR/skills/research/SKILL.md

# Search for a specific skill
find $PAI_DIR/skills -name "*research*"
```

### Manage Environment Variables

```bash
# Check current settings
echo $PAI_DIR                    # PAI location
echo $DA                         # AI assistant name
echo $DA_COLOR                   # Display color

# Edit environment variables
open -e ~/.zshrc                 # or ~/.bashrc

# Reload after changes
source ~/.zshrc                  # or source ~/.bashrc
```

### Configure API Keys

```bash
# Edit API keys
open -e $PAI_DIR/.env

# View current keys (safe - doesn't show values)
grep "^[A-Z]" $PAI_DIR/.env | cut -d= -f1

# Copy example env file
cp $PAI_DIR/.env.example $PAI_DIR/.env
```

---

## 🎯 Voice Server

### Start Voice Server

```bash
# Start in background
cd $PAI_DIR/voice-server && bun server.ts &

# Start in foreground (see logs)
cd $PAI_DIR/voice-server && bun server.ts
```

### Test Voice Server

```bash
# Check if running
curl -s http://localhost:8888/health

# Send test message
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from PAI!"}'
```

### Stop Voice Server

```bash
# Find process
lsof -i :8888

# Kill by port
kill $(lsof -t -i:8888)
```

---

## 🔍 Troubleshooting

### PAI_DIR Not Found

```bash
# Check if set
echo $PAI_DIR

# If empty, add to shell config
echo 'export PAI_DIR="$HOME/PAI"' >> ~/.zshrc
source ~/.zshrc
```

### Skills Not Loading

```bash
# Verify skills exist
ls -la $PAI_DIR/skills/

# Check permissions
chmod -R u+r $PAI_DIR/skills/

# Look for SKILL.md files
find $PAI_DIR/skills -name "SKILL.md"
```

### Environment File Issues

```bash
# Check if .env exists
ls -la $PAI_DIR/.env

# Create from template
cp $PAI_DIR/.env.example $PAI_DIR/.env

# Verify format (no quotes around values)
cat $PAI_DIR/.env
```

### Claude Code Not Recognizing PAI

```bash
# Check if settings are linked
ls -la ~/.claude/settings.json

# Create symbolic link
ln -sf $PAI_DIR/settings.json ~/.claude/settings.json

# Restart Claude Code
```

### Git Issues

```bash
# Check remote
cd $PAI_DIR && git remote -v

# Reset to latest
cd $PAI_DIR && git fetch && git reset --hard origin/main

# Check status
cd $PAI_DIR && git status
```

---

## 🎨 Customization

### Customize PAI Skill

```bash
# Open main PAI skill
open -e $PAI_DIR/skills/CORE/SKILL.md

# Look for [CUSTOMIZE:] markers
grep -n "CUSTOMIZE:" $PAI_DIR/skills/CORE/SKILL.md
```

### Change AI Assistant Name

```bash
# Edit shell config
open -e ~/.zshrc

# Find this line and change "Kai" to your preference:
export DA="Kai"

# Reload
source ~/.zshrc
```

### Change Display Color

```bash
# Edit shell config
open -e ~/.zshrc

# Options: purple, blue, green, cyan, red, yellow
export DA_COLOR="purple"

# Reload
source ~/.zshrc
```

---

## 📚 Skills Quick Reference

| Skill | Trigger Words | Example |
|-------|---------------|---------|
| **research** | research, investigate, find | "Research quantum computing" |
| **development** | build, create, implement | "Build a meditation app" |
| **fabric** | threat model, summarize, extract | "Summarize this article" |
| **blogging** | blog, write, publish | "Write a blog post about AI" |
| **design** | design, UI, UX | "Design a dashboard" |
| **ffuf** | pentest, security, fuzz | "Test this API endpoint" |
| **web-scraping** | scrape, extract, crawl | "Scrape data from this site" |
| **chrome-devtools** | browser, screenshot, debug | "Take a screenshot" |

---

## 🛠️ Useful One-Liners

```bash
# Quick PAI status check
echo "PAI: $PAI_DIR" && ls $PAI_DIR/skills | wc -l | xargs echo "Skills:"

# Count commands
find $PAI_DIR/commands -name "*.md" | wc -l

# Find all skill files
find $PAI_DIR/skills -name "SKILL.md"

# View recent PAI updates
cd $PAI_DIR && git log --oneline -10

# Search for a keyword in all skills
grep -r "keyword" $PAI_DIR/skills/

# Backup your .env file
cp $PAI_DIR/.env $PAI_DIR/.env.backup

# View all environment variables related to PAI
env | grep PAI
```

---

## 🆘 Emergency Commands

### Complete Reset

```bash
# WARNING: This removes your customizations!

# Backup first
cp $PAI_DIR/.env $PAI_DIR/.env.backup
cp ~/.zshrc ~/.zshrc.backup

# Re-clone PAI
cd ~ && mv PAI PAI.old
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git PAI

# Restore your .env
cp PAI.old/.env PAI/.env
```

### Reinstall Everything

```bash
# Re-run setup script
cd ~ && curl -fsSL https://raw.githubusercontent.com/danielmiessler/Personal_AI_Infrastructure/main/.claude/setup.sh | bash
```

---

## 📞 Getting Help

### Check Logs

```bash
# System logs (if configured)
ls -la ~/Library/Logs/pai*

# Git history
cd $PAI_DIR && git log --oneline -20

# Voice server logs (if running in background)
tail -f ~/Library/Logs/pai-voice-server.log
```

### Documentation

```bash
# View all documentation
ls $PAI_DIR/documentation/

# Getting started guide
open $PAI_DIR/documentation/how-to-start.md

# Skills system explanation
open $PAI_DIR/documentation/skills-system.md

# Architecture overview
open $PAI_DIR/documentation/architecture.md
```

### Community

- 🐛 **Report Issues:** https://github.com/danielmiessler/Personal_AI_Infrastructure/issues
- 💬 **Discussions:** https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions
- ⭐ **Star the Repo:** https://github.com/danielmiessler/Personal_AI_Infrastructure
- 📝 **Blog:** https://danielmiessler.com/blog/personal-ai-infrastructure
- 🎬 **Video:** https://youtu.be/iKwRWwabkEc

---

## 🔑 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PAI_DIR` | PAI installation location | `/Users/daniel/PAI` |
| `PAI_HOME` | Your home directory | `/Users/daniel` |
| `DA` | AI assistant name | `Kai` |
| `DA_COLOR` | Display color | `purple` |
| `PORT` | Voice server port | `8888` |
| `PERPLEXITY_API_KEY` | Perplexity research | `pk-...` |
| `GOOGLE_API_KEY` | Gemini AI | `AIza...` |
| `REPLICATE_API_TOKEN` | AI generation | `r8_...` |
| `OPENAI_API_KEY` | GPT integration | `sk-...` |

---

## 💡 Pro Tips

### Aliases for Speed

Add these to your `~/.zshrc`:

```bash
# Quick navigation
alias pai='cd $PAI_DIR'
alias pskills='ls $PAI_DIR/skills'
alias pcmds='ls $PAI_DIR/commands'

# Quick edits
alias pai-env='open -e $PAI_DIR/.env'
alias pai-skill='open -e $PAI_DIR/skills/CORE/SKILL.md'
alias pai-shell='open -e ~/.zshrc'

# Updates
alias pai-update='cd $PAI_DIR && git pull'
alias pai-status='cd $PAI_DIR && git status'

# Voice
alias pai-voice='cd $PAI_DIR/voice-server && bun server.ts &'
alias pai-test='curl -X POST http://localhost:8888/notify -d "{\"message\":\"Test\"}"'
```

### Keyboard Shortcuts in Terminal

- `Ctrl+R` - Search command history
- `Ctrl+A` - Jump to start of line
- `Ctrl+E` - Jump to end of line
- `Ctrl+U` - Clear line
- `Ctrl+C` - Cancel current command
- `Ctrl+D` - Exit terminal

---

## 📱 Quick Access URLs

Keep these bookmarked:

- **GitHub Repo:** https://github.com/danielmiessler/Personal_AI_Infrastructure
- **Issues:** https://github.com/danielmiessler/Personal_AI_Infrastructure/issues
- **Discussions:** https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions
- **Claude Code:** https://claude.ai/code
- **Perplexity API:** https://www.perplexity.ai/settings/api
- **Google AI Studio:** https://aistudio.google.com/app/apikey
- **Replicate:** https://replicate.com/account/api-tokens

---

**Last Updated:** October 2025

**Questions?** File an issue or start a discussion on GitHub!

---

*Keep this page bookmarked for quick reference!* 🔖
