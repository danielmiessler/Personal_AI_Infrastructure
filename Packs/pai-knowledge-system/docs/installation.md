# Installation Guide

This guide will walk you through installing the PAI Knowledge System step by step. Don't worry if you're not a developer - we'll explain everything clearly.

## What You'll Need

Before starting, make sure you have:

1. **A computer with:**
   - macOS, Linux, or Windows with WSL
   - At least 2GB of free RAM
   - At least 1GB of disk space

2. **Software installed:**
   - Podman or Docker (for running containers)
   - Bun (JavaScript runtime)
   - An OpenAI API key (or compatible service)

3. **Dependent systems:**
   - PAI History System (should be installed first)

## What is a Container?

Before we begin, a quick explanation: This system uses "containers" to run the knowledge graph software. Think of a container like a self-contained app that includes everything it needs to run. You don't need to install complex database software - the container handles all that for you.

## Step-by-Step Installation

### Step 1: Get Your API Key

The system uses AI to understand your knowledge, so you need an API key from an AI provider.

**For OpenAI (Recommended):**

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. Keep it safe - you'll need it soon

**Cost:** About $0.50-2.00 per month for typical personal use. The system uses the efficient gpt-4o-mini model by default.

### Step 2: Check if You Have Podman

Podman is what runs the knowledge system in a container.

Open your terminal and type:

```bash
podman --version
```

**If you see a version number:** Great! Skip to Step 3.

**If you see "command not found":**

Install Podman:

**On macOS:**
```bash
brew install podman
podman machine init
podman machine start
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install podman
```

**On Windows:** Use Windows Subsystem for Linux (WSL) and follow Ubuntu instructions.

### Step 3: Check if You Have Bun

Bun is the JavaScript runtime that makes everything fast.

```bash
bun --version
```

**If you see a version number:** Great! Skip to Step 4.

**If you see "command not found":**

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

Then close and reopen your terminal.

### Step 4: Navigate to the Pack Directory

The PAI Knowledge System is in your PAI packs folder:

```bash
cd ~/.config/pai/Packs/pai-knowledge-system
```

**Can't find it?** If you installed PAI somewhere else, look for `Packs/pai-knowledge-system` in your PAI directory.

### Step 5: Configure Your API Key

Create your configuration file:

```bash
cp config/.env.example config/.env
```

Now edit the file to add your API key:

```bash
nano config/.env
```

Find this line:
```
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

Replace `sk-your-openai-api-key-here` with your actual API key.

**Save the file:**
- Press `Ctrl + O` to save
- Press `Enter` to confirm
- Press `Ctrl + X` to exit

### Step 6: Start the Knowledge System

Now start the MCP server (this runs the knowledge graph):

```bash
bun run src/server/run.ts
```

You'll see output like:
```
Starting PAI Knowledge System...
Creating network: pai-knowledge-net
Starting FalkorDB container...
Starting Graphiti MCP server...
Server is running at http://localhost:8000
```

**This will take 1-2 minutes the first time** as it downloads the container images.

**Keep this terminal window open** - the server runs here.

### Step 7: Verify It's Working

Open a new terminal window and check the status:

```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/status.ts
```

You should see:
```
PAI Knowledge System Status:

Containers:
  pai-knowledge-graph-mcp: running
  pai-knowledge-falkordb: running

MCP Server: http://localhost:8000/sse
  Status: healthy
```

### Step 8: Configure in Your PAI Environment

The system needs to be registered in your PAI configuration:

```bash
# This adds the knowledge system to your PAI environment
export PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
```

Add the MCP server to your PAI configuration file (`~/.config/pai/.env`):

```bash
# PAI Knowledge System
PAI_KNOWLEDGE_OPENAI_API_KEY=your-key-here
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o-mini
PAI_KNOWLEDGE_LLM_PROVIDER=openai
```

### Step 9: Install History Sync Hook (Optional but Recommended)

This hook automatically syncs your learning captures from the PAI History System to your knowledge graph:

```bash
bun run src/server/install.ts
```

Follow the prompts to:
1. Verify your history directory location
2. Install the sync hook
3. Configure automatic syncing

**What does this do?** When you capture "learnings" or "research" in your AI sessions, they'll automatically be added to your knowledge graph.

### Step 10: Test the Installation

Time to test everything! In your AI assistant (like Claude Code), try:

```
Remember that the PAI Knowledge System was just installed today.
```

The assistant should respond with something like:

```
Knowledge Captured

Stored episode: PAI Knowledge System Installation

Entities extracted:
- PAI Knowledge System (Tool)
- installation (Event)
- today (Temporal)

Relationships identified:
- PAI Knowledge System -> was installed -> today
```

Then try searching:

```
What do I know about PAI?
```

You should see your newly stored knowledge!

## What Just Happened?

Let's review what you installed:

1. **FalkorDB** - A graph database (like a smart filing cabinet)
2. **Graphiti MCP Server** - The AI brain that processes your knowledge
3. **PAI Skill** - The interface that lets you talk to the system naturally
4. **Sync Hook** - Automatically captures learnings to your knowledge graph

All of these work together so you can simply say "remember this" and have your AI build a knowledge graph automatically.

## Starting and Stopping

### To Stop the Server

In the terminal where it's running, press `Ctrl + C`.

Or from another terminal:
```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/stop.ts
```

### To Start Again

```bash
cd ~/.config/pai/Packs/pai-knowledge-system
bun run src/server/start.ts
```

### Check Status Anytime

```bash
bun run src/server/status.ts
```

### View Logs

If something goes wrong:
```bash
bun run src/server/logs.ts
```

## Optional: Add to Your Shell Startup

Want the server to start automatically when you open your terminal?

Add this to your shell configuration file (`~/.zshrc` or `~/.bashrc`):

```bash
# Auto-start PAI Knowledge System
if ! podman ps | grep -q "pai-knowledge-graph-mcp"; then
    cd ~/.config/pai/Packs/pai-knowledge-system && bun run src/server/start.ts
fi
```

## Customization Options

### Using a Different AI Model

The default model is `gpt-4o-mini` (fast and cheap). You can change it to:
- `gpt-4o` - More accurate but costs more
- `gpt-3.5-turbo` - Cheaper but less accurate

Edit `config/.env`:
```bash
PAI_KNOWLEDGE_MODEL_NAME=gpt-4o
```

Then restart the server.

### Using Multiple Knowledge Graphs

Want separate graphs for work and personal? Use group IDs:

In `config/.env`:
```bash
PAI_KNOWLEDGE_GROUP_ID=work
```

Or specify when capturing:
```
Remember this in my work knowledge: [your information]
```

### Adjusting Concurrency

If you hit API rate limits, reduce the concurrent requests:

In `config/.env`:
```bash
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=5
```

Lower numbers = slower but less likely to hit rate limits.

## Next Steps

Now that everything is installed:

1. Read the [Usage Guide](usage.md) to learn all the commands
2. Check out [Concepts](concepts.md) to understand how it works
3. Start using it! The more you capture, the more valuable it becomes

## Troubleshooting

**Problem: "Port already in use"**
- Another service is using port 8000 or 6379
- Stop the other service or change ports in `src/server/run.ts`

**Problem: "API key invalid"**
- Check your API key in `config/.env`
- Verify it has credits at https://platform.openai.com/usage

**Problem: "Container won't start"**
- Check Docker/Podman is running: `podman ps`
- View logs: `bun run src/server/logs.ts`
- Try restarting: `bun run src/server/stop.ts && bun run src/server/start.ts`

**Problem: "No entities extracted"**
- Add more detail to what you're capturing
- Try a different model (gpt-4o instead of gpt-4o-mini)
- Make sure your content has clear concepts and relationships

For more help, see the [Troubleshooting Guide](troubleshooting.md).
