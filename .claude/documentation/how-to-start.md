# 🚀 How to Get Started with PAI

**Welcome! Let's get your Personal AI Infrastructure up and running.**

> [!NOTE]
> **📦 v0.6.0 Repository Structure**
> As of v0.6.0, the PAI repository uses a `.claude/` directory structure to match the actual working system:
> - Repository structure: `/PAI/.claude/` contains all infrastructure
> - Your system: `~/.claude/` contains your personal PAI instance
> - Simply copy or symlink `.claude/` from the repo to `~/.claude/` on your system

---

## 👋 Hey there!

First things first: **Don't worry, this is easier than it looks.**

I know that setting up developer infrastructure can feel intimidating, especially if you're not super technical. But here's the thing - PAI is designed to be accessible to everyone, and this guide is going to walk you through everything step by step.

Think of this as having a friend guide you through the setup process. We'll go slow, explain everything, and by the end of this, you'll have your own personal AI assistant that actually knows about YOUR life, YOUR projects, and YOUR goals.

**Two ways to do this:**
1. 🤖 **Automated Setup** - Run one command and let the script handle everything (recommended if you're nervous!)
2. 📖 **Manual Setup** - Follow along step-by-step (recommended if you want to understand what's happening)

Choose whichever makes you comfortable. Both get you to the same place!

---

## 🤖 Option 1: Automated Setup (The Easy Button)

**Just want it to work? Run this:**

```bash
# Download and run the automated setup script
curl -fsSL https://raw.githubusercontent.com/danielmiessler/Personal_AI_Infrastructure/main/.claude/setup.sh | bash
```

That's it! The script will:
- ✅ Check what you have installed (and install what's missing)
- ✅ Clone the PAI repository
- ✅ Set up your environment variables
- ✅ Create all necessary directories
- ✅ Configure your shell
- ✅ Test everything to make sure it works

**The script will ask you questions along the way, so you're always in control.**

After it finishes, skip to the [🎉 You're Done!](#-youre-done) section.

---

## 📖 Option 2: Manual Setup (Step by Step)

**Want to understand what's happening? Let's do this together.**

---

### Step 1: Prerequisites (What You Need Installed)

Before we start, let's make sure you have the basics. Don't worry - we'll walk through installing each one.

#### Required:

**1. macOS** (PAI is primarily built for Mac)
   - You probably already have this! If you're reading this on a Mac, you're good.
   - **Version needed:** macOS 11 (Big Sur) or newer
   - **How to check:** Click the Apple menu  → "About This Mac"

**2. Git** (for downloading PAI)
   - **What it is:** A tool for downloading and managing code
   - **Check if you have it:** Open Terminal and type: `git --version`
   - **Don't have it?** Install it:
     ```bash
     # Install Xcode Command Line Tools (includes Git)
     xcode-select --install
     ```
   - Click "Install" when the popup appears, wait a few minutes, done!

**3. Bun** (JavaScript runtime)
   - **What it is:** A fast JavaScript engine (like Node.js but better)
   - **Why you need it:** Powers the voice server and various PAI features
   - **Check if you have it:** `bun --version`
   - **Don't have it?** Install it:
     ```bash
     # Install Homebrew first (if you don't have it)
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

     # Then install Bun
     brew install oven-sh/bun/bun
     ```

**4. Claude Code** (or another AI assistant)
   - **What it is:** The AI interface you'll use to interact with PAI
   - **Get it:** Visit [https://claude.ai/code](https://claude.ai/code)
   - **Alternatives:** You can also use GPT, Gemini, or other AI platforms - PAI is designed to work with any of them

#### Optional (but recommended):

**5. API Keys** (for advanced features)
   - These unlock extra capabilities, but PAI works without them too
   - We'll set these up later - no need to worry about them now

---

### Step 2: Download PAI

Okay, you've got the prerequisites. Now let's grab PAI!

**Open your Terminal** (Applications → Utilities → Terminal) and run:

```bash
# Go to a good place to download PAI
# (You can change this to wherever you want - ~/Projects, ~/Documents, etc.)
cd ~

# Download PAI from GitHub
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git PAI

# Go into the PAI directory
cd PAI

# Check that it worked - you should see a bunch of folders
ls -la
```

**What you should see:**
```
agents/
commands/
documentation/
hooks/
skills/
README.md
settings.json
... and more
```

**If you see that, you're doing great!** 🎉

---

### Step 3: Set Up Environment Variables

**What are environment variables?**
Think of them as settings your computer remembers every time you open Terminal. We need to tell your computer where PAI lives.

**Here's what we're going to do:**

1. **Open your shell configuration file:**
   ```bash
   # If you use zsh (default on modern Macs)
   open -e ~/.zshrc

   # If you use bash
   open -e ~/.bashrc
   ```

2. **Add these lines to the very bottom of the file:**
   ```bash
   # ========== PAI Configuration ==========
   # Where PAI is installed (change this to YOUR path!)
   export PAI_DIR="$HOME/PAI"

   # Your home directory (this is automatic)
   export PAI_HOME="$HOME"

   # (Optional) Your AI assistant's name
   export DA="Kai"  # Change "Kai" to whatever you want to call your AI

   # (Optional) Display color for your AI
   export DA_COLOR="purple"  # Options: purple, blue, green, cyan, red, yellow
   ```

3. **Save the file** (Command+S) and close it

4. **Load the new settings:**
   ```bash
   source ~/.zshrc  # or source ~/.bashrc if you use bash
   ```

5. **Test that it worked:**
   ```bash
   echo $PAI_DIR
   ```
   **You should see:** `/Users/yourname/PAI` (or wherever you put it)

**If you see that path, you're golden!** ✨

---

### Step 4: Configure Your Environment File

PAI uses a `.env` file to store API keys and settings. Let's set that up.

```bash
# Go to your PAI directory
cd $PAI_DIR

# Copy the example environment file
cp .env.example .env

# Open it in a text editor
open -e .env
```

**What you'll see in the file:**

```bash
# ============ REQUIRED CONFIGURATION ============
PAI_DIR="/path/to/PAI"                  # Your PAI location
PAI_HOME="$HOME"                        # Your home directory

# ============ RESEARCH AGENTS (Optional) ============
PERPLEXITY_API_KEY=""                   # For web research
GOOGLE_API_KEY=""                       # For Gemini research
# Claude WebSearch is built-in - no key needed!

# ============ AI GENERATION (Optional) ============
REPLICATE_API_TOKEN=""                  # For AI images/videos
OPENAI_API_KEY=""                       # For GPT features

# ============ SYSTEM CONFIGURATION ============
PORT="8888"                             # Voice server port

# ============ YOUR AI ASSISTANT ============
DA="Assistant"                          # Your AI's name
DA_COLOR="purple"                       # Display color
```

**What to do:**

1. **Update PAI_DIR** to your actual PAI path (should already be correct if you followed Step 3)
2. **Leave the API keys blank for now** - PAI works without them!
3. **Customize DA name** if you want (I call mine "Kai")
4. **Save the file** (Command+S)

**Important:** Your `.env` file contains sensitive information! PAI automatically keeps it private (it's in `.gitignore`), so don't worry about accidentally sharing it.

---

### Step 5: Optional - Voice Server Setup

**Do you want your AI to talk to you?** This is totally optional but pretty cool!

PAI can use macOS's built-in Premium voices (they're free, high-quality, and work offline).

**To set this up:**

1. **Download a Premium voice:**
   - Go to: System Settings → Accessibility → Spoken Content
   - Click "System Voice" → "Manage Voices..."
   - Download a Premium or Enhanced voice (try "Zoe" or "Samantha" - they're great!)

2. **Start the voice server:**
   ```bash
   cd $PAI_DIR/voice-server
   bun install  # Install dependencies
   bun server.ts &  # Start in background
   ```

3. **Test it:**
   ```bash
   curl -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello! Your voice server is working!"}'
   ```

   **You should hear your computer speak!** 🔊

**Don't hear anything?** No worries - skip this for now. You can always set it up later. The voice server is completely optional.

---

### Step 6: Configure Your AI Assistant (Claude Code)

Almost there! Now let's connect Claude Code to PAI.

1. **Open Claude Code**
   - Download from [https://claude.ai/code](https://claude.ai/code) if you haven't already
   - Sign in with your Anthropic account

2. **Point Claude Code to your PAI settings:**

   Claude Code looks for settings in `~/.claude/settings.json`. We need to tell it to use PAI's settings instead.

   ```bash
   # Create a symbolic link from Claude's settings location to PAI's settings
   ln -sf $PAI_DIR/settings.json ~/.claude/settings.json
   ```

3. **Restart Claude Code** (just close and reopen it)

4. **Test PAI:**

   Open Claude Code and say something like:
   ```
   "Hey, what's my name?"
   ```

   Claude should load PAI's context and know that it's operating as your personal AI infrastructure!

---

### Step 7: Understanding Your Setup

Congratulations! PAI is installed. But let's take a moment to understand what you just set up.

**Here's what you have now:**

```
PAI/
├── agents/          # Specialized AI agents (researcher, engineer, designer, etc.)
├── commands/        # Custom commands you can run
├── documentation/   # Help files (you're reading one!)
├── hooks/           # Automation that runs when you do things
├── skills/          # Specialized capabilities (research, coding, design, etc.)
├── settings.json    # Your Claude Code configuration
├── .env             # Your API keys and settings
└── voice-server/    # Voice notification system
```

**How it works:**

1. **You talk to Claude Code** (or your AI of choice)
2. **PAI recognizes your intent** ("I want to research something", "Build an app", etc.)
3. **PAI loads the right context** (skills, tools, knowledge)
4. **Specialized agents help** if needed (researcher for research, engineer for coding, etc.)
5. **You get smart, personalized assistance** that knows about YOUR projects and YOUR life

---

### Step 8: Customize PAI for YOU

This is where it gets fun! PAI is completely customizable. Here are some things you can do:

**Add your own projects:**
```bash
# Create a new project context
mkdir -p $PAI_DIR/skills/my-project
echo "# My Amazing Project" > $PAI_DIR/skills/my-project/SKILL.md
# Then edit that file with information about your project
```

**Customize the PAI skill** (tells PAI who you are):
```bash
# Open the main PAI skill
open -e $PAI_DIR/skills/CORE/SKILL.md

# Look for lines that say [CUSTOMIZE:] and update them with YOUR information
```

**Add API keys for advanced features:**
```bash
# Open your .env file
open -e $PAI_DIR/.env

# Add API keys for services you want to use:
# - PERPLEXITY_API_KEY for web research
# - GOOGLE_API_KEY for Gemini AI
# - REPLICATE_API_TOKEN for AI image generation
```

**Create custom commands:**
```bash
# Look at existing commands for inspiration
ls $PAI_DIR/commands/

# Create your own!
touch $PAI_DIR/commands/my-custom-command.md
```

---

## 🎉 You're Done!

**Seriously! Your Personal AI Infrastructure is ready to go.**

Here's what you can do now:

### Try These to Test Your Setup:

1. **Just chat:**
   ```
   "Hey, tell me about yourself"
   ```
   PAI should introduce itself as your personal AI assistant!

2. **Do some research:**
   ```
   "Research the latest developments in quantum computing"
   ```
   PAI will launch research agents and find information for you!

3. **Start a project:**
   ```
   "Help me build a meditation timer app"
   ```
   PAI will load development skills and start helping you build!

4. **Explore skills:**
   ```
   "What skills do you have available?"
   ```
   PAI will show you all the specialized capabilities it has!

---

## 🆘 Troubleshooting

**Something not working? Don't panic.** Here are the most common issues:

### "PAI_DIR not found" or "command not found: PAI_DIR"

**Fix:**
```bash
# Make sure you added the environment variables to your shell config
open -e ~/.zshrc  # or ~/.bashrc

# Make sure you see these lines:
export PAI_DIR="$HOME/PAI"
export PAI_HOME="$HOME"

# Save the file, then reload:
source ~/.zshrc  # or source ~/.bashrc

# Test it:
echo $PAI_DIR  # Should show /Users/yourname/PAI
```

### Claude Code doesn't seem to know about PAI

**Fix:**
```bash
# Make sure the symbolic link is created:
ls -la ~/.claude/settings.json

# If it's not pointing to PAI, create it:
ln -sf $PAI_DIR/settings.json ~/.claude/settings.json

# Restart Claude Code
```

### Voice server not working

**Fix:**
```bash
# Check if Bun is installed:
bun --version

# Try starting the voice server manually:
cd $PAI_DIR/voice-server
bun server.ts

# Check for errors in the output

# Make sure you have a Premium voice installed:
# System Settings → Accessibility → Spoken Content → System Voice → Manage Voices
```

### API Keys not working

**Fix:**
```bash
# Make sure your .env file exists:
ls -la $PAI_DIR/.env

# Open it and check the keys:
open -e $PAI_DIR/.env

# API keys should NOT have quotes around them:
# ✅ CORRECT:   PERPLEXITY_API_KEY=pk-abc123def456
# ❌ INCORRECT: PERPLEXITY_API_KEY="pk-abc123def456"
```

### Skills not loading

**Fix:**
```bash
# List your skills:
ls -la $PAI_DIR/skills/

# Make sure each skill has a SKILL.md file:
find $PAI_DIR/skills -name "SKILL.md"

# Check permissions:
chmod -R u+r $PAI_DIR/skills
```

**Still stuck?**
- Check the [full documentation](./README.md)
- Look at [architecture.md](./architecture.md) to understand how things work
- File an issue on [GitHub](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues)
- Review the logs: `ls -la ~/Library/Logs/`

---

## 🎓 What's Next?

Now that PAI is set up, here's how to get the most out of it:

### 1. **Learn about Skills** (5 minutes)
Skills are the core of PAI - they're like apps for your AI.

Read: [skills-system.md](./skills-system.md)

**Quick overview:**
- `research` - Multi-source research with parallel agents
- `development` - Full-stack app building
- `fabric` - 242+ AI patterns for everything
- `blogging` - Write and publish blog posts
- And many more!

### 2. **Explore Commands** (10 minutes)
Commands are pre-built tasks you can run.

```bash
# See what's available:
ls $PAI_DIR/commands/

# Try one:
# (Ask Claude: "Show me the available commands")
```

### 3. **Customize Your Experience** (30 minutes)
Make PAI truly yours:

**Edit the PAI skill:**
```bash
open -e $PAI_DIR/skills/CORE/SKILL.md
```

Look for `[CUSTOMIZE:]` markers and update:
- Your key contacts
- Your preferences (tech stack, coding style, etc.)
- Your security settings
- Your voice preferences

**Create your first custom skill:**
```bash
# Use the create-skill skill to guide you!
# In Claude Code, just say:
"Help me create a custom skill for [your use case]"
```

### 4. **Read the Deep Dive** (Optional, 30+ minutes)
Want to really understand how PAI works?

- [architecture.md](./architecture.md) - How PAI is structured
- [skills-system.md](./skills-system.md) - Deep dive on skills
- [hook-system.md](./hook-system.md) - Automation with hooks
- [agent-system.md](./agent-system.md) - How agents work

---

## 🎯 Quick Reference

**Essential Commands:**

```bash
# Check if PAI is set up correctly
echo $PAI_DIR                    # Should show your PAI path

# Go to PAI directory
cd $PAI_DIR                      # Quick way to navigate to PAI

# Update PAI to latest version
cd $PAI_DIR && git pull          # Get latest features and fixes

# Start voice server (optional)
cd $PAI_DIR/voice-server && bun server.ts &

# Reload shell configuration
source ~/.zshrc                  # Apply any changes you made

# View available skills
ls $PAI_DIR/skills/              # See what PAI can do

# View available commands
ls $PAI_DIR/commands/            # See pre-built tasks
```

**File Locations:**

| What | Where |
|------|-------|
| PAI main directory | `$PAI_DIR` (usually `~/PAI`) |
| Your settings | `$PAI_DIR/.env` |
| Skills | `$PAI_DIR/skills/` |
| Commands | `$PAI_DIR/commands/` |
| Documentation | `$PAI_DIR/documentation/` |
| Voice server | `$PAI_DIR/voice-server/` |
| Logs | `~/Library/Logs/` |

**Important Environment Variables:**

| Variable | What it does | Example |
|----------|--------------|---------|
| `PAI_DIR` | Where PAI is installed | `/Users/daniel/PAI` |
| `PAI_HOME` | Your home directory | `/Users/daniel` |
| `DA` | Your AI's name | `Kai` |
| `DA_COLOR` | Display color | `purple` |

---

## 💬 Final Thoughts

**You did it!** You now have a personal AI infrastructure that grows with you.

This is just the beginning. PAI is designed to adapt to YOUR life, YOUR projects, and YOUR goals. As you use it, you'll discover new ways to customize it, automate your workflows, and make your AI assistant truly personal.

**Remember:**
- ✅ Start simple - you don't need to use everything at once
- ✅ Customize as you go - add things when you need them
- ✅ Don't be afraid to experiment - you can't break anything permanently
- ✅ The community is here to help - ask questions if you get stuck

**Welcome to the PAI community!** 🎉

You're now part of the journey toward Human 3.0 - humans augmented with AI to amplify their capabilities.

---

## 📚 Additional Resources

- **Official PAI Blog Post:** [Read the deep-dive on danielmiessler.com](https://danielmiessler.com/blog/personal-ai-infrastructure)
- **GitHub Repository:** [Star the repo to stay updated](https://github.com/danielmiessler/Personal_AI_Infrastructure)
- **Human 3.0 Vision:** [How PAI fits into the bigger picture](https://danielmiessler.com/blog/how-my-projects-fit-together)
- **Claude Code Docs:** [Learn more about Claude Code](https://claude.ai/code)
- **Video Walkthrough:** [Watch the PAI overview video](https://youtu.be/iKwRWwabkEc)

---

**Questions? Issues? Ideas?**

- 🐛 [Report bugs](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues)
- 💬 [Join discussions](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions)
- ⭐ [Star the repo](https://github.com/danielmiessler/Personal_AI_Infrastructure) to support the project!

---

*Built with ❤️ by [Daniel Miessler](https://danielmiessler.com) and the PAI community*

*Last updated: October 2025*
