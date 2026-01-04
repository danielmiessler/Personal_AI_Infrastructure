# PAI Knowledge System - User Guide

Welcome to the PAI Knowledge System! This guide will help you understand and use your personal knowledge management system.

## What is the PAI Knowledge System?

Think of the PAI Knowledge System as your AI's memory. Instead of forgetting what you discussed yesterday or last week, it remembers everything you tell it to remember. It's like having a smart notebook that:

- Automatically organizes information as you add it
- Finds connections between different topics
- Lets you search using everyday language
- Keeps track of when you learned things
- Never forgets what you taught it

## What Can You Do With It?

### Store Information

Just say "remember this" and the system captures what you're talking about:

```
You: "Remember that I prefer using gpt-4o-mini for everyday tasks because it's faster and cheaper."
```

The system will automatically:
- Extract key concepts (gpt-4o-mini, preferences, cost optimization)
- Note relationships (preference, reason: speed and cost)
- Store it with today's date

### Find Information

Ask questions in plain English:

```
You: "What do I know about Podman?"
```

The system searches your knowledge and shows you:
- Everything you've stored about Podman
- Related topics (Docker, containers, etc.)
- When you learned each piece of information

### Discover Connections

See how different topics relate:

```
You: "How are Graphiti and FalkorDB connected?"
```

The system traces the relationships in your knowledge graph and explains how these concepts link together.

## Quick Start

### Before You Begin

You'll need:
1. The PAI Knowledge System installed (see [installation guide](installation.md))
2. The MCP server running in the background
3. An OpenAI API key (or similar service)

### Your First Knowledge Capture

Try this simple example:

```
You: "Remember that bun is faster than npm for installing packages."
```

The system responds with something like:

```
Knowledge Captured

Stored episode: Bun Performance Comparison

Entities extracted:
- Bun (Tool)
- npm (Tool)
- package installation (Procedure)

Relationships identified:
- Bun -> faster than -> npm
- Bun -> used for -> package installation
```

### Your First Search

Now try finding what you just stored:

```
You: "What do I know about bun?"
```

The system shows you:

```
Knowledge Found: Bun

Based on your knowledge graph:

Key Entities:
1. Bun (Tool)
   - Fast JavaScript runtime and package manager
   - Alternative to npm and Node.js
   - Known for faster package installation

Relationships:
- Bun -> faster than -> npm
- Bun -> used for -> package installation

Episodes:
- "Bun Performance Comparison" (today)
```

## Common Use Cases

### For Developers

**Capture technical decisions:**
```
"Remember that we chose PostgreSQL over MongoDB because we need strong consistency and complex relationships."
```

**Store configuration snippets:**
```
"Save this: my preferred VS Code settings are 2-space tabs, auto-save on focus change, and Dracula theme."
```

**Document solutions to problems:**
```
"Remember: when Podman containers can't reach the network, check if the firewall is blocking the CNI plugins."
```

### For Learning

**Capture research findings:**
```
"Store this research: Graphiti uses LLMs to automatically extract entities from text, unlike traditional knowledge graphs that require manual annotation."
```

**Track concept connections:**
```
"Remember that FalkorDB is a Redis module that adds graph database capabilities, which is why Graphiti can use it as a backend."
```

### For Personal Organization

**Save preferences:**
```
"Remember that I prefer morning meetings between 9-11 AM and need at least 30 minutes between back-to-back calls."
```

**Track decisions:**
```
"Store this decision: I'm going to use weekly reviews instead of daily standups for my solo projects."
```

## Key Concepts

### Episodes

Every time you add knowledge, the system creates an "episode." Think of episodes as diary entries - each one captures:
- What you said
- When you said it
- What entities and relationships were found

### Entities

These are the "things" in your knowledge - people, places, tools, concepts, preferences, procedures, etc. The system automatically identifies these as you add information.

Common entity types:
- **People**: Names of individuals
- **Organizations**: Companies, teams, groups
- **Locations**: Places, servers, repositories
- **Concepts**: Ideas, technologies, methodologies
- **Procedures**: How-to guides, workflows
- **Preferences**: Your choices and opinions
- **Requirements**: Features, needs, specifications

### Relationships

Relationships show how entities connect. For example:
- "Bun is faster than npm" creates a relationship
- "PostgreSQL requires strong consistency" creates another
- "I prefer morning meetings" connects you to a preference

### Groups

You can organize knowledge into separate groups (like different notebooks). By default, everything goes into the "main" group, but you can create separate groups for work, personal, research, etc.

## How It Works Behind the Scenes

When you say "remember this," here's what happens:

1. **Your words go to the system** - The PAI skill recognizes you want to store knowledge

2. **Content is sent to the MCP server** - This is the brain that processes your information

3. **An LLM extracts entities** - Using AI (like GPT-4), the system identifies important concepts in what you said

4. **Relationships are mapped** - The system figures out how these concepts relate to each other

5. **Embeddings are created** - Your knowledge is converted into vector form so it can be searched semantically (by meaning, not just keywords)

6. **Everything is stored in FalkorDB** - A graph database saves all the entities, relationships, and the original text

When you search, the system uses vector similarity to find relevant knowledge, even if you use different words than you originally used.

## Next Steps

Ready to dive deeper? Check out:

- [Installation Guide](installation.md) - Set up the system step by step
- [Usage Guide](usage.md) - Detailed examples and commands
- [Concepts Guide](concepts.md) - Deep dive into how the system works
- [Troubleshooting](troubleshooting.md) - Fix common issues

## Getting Help

If something isn't working:

1. Check if the MCP server is running: `bun run src/server/status.ts`
2. Look at the logs: `bun run src/server/logs.ts`
3. Read the [troubleshooting guide](troubleshooting.md)
4. Review the main [README](/Users/seaton/.config/pai/Packs/pai-knowledge-system/README.md) for technical details

## Tips for Success

1. **Be specific**: Instead of "remember Docker," say "remember that Docker requires a daemon process, unlike Podman which is daemonless"

2. **Add context**: The more detail you provide, the better the entity extraction works

3. **Use it regularly**: The more knowledge you add, the more useful the system becomes

4. **Review recent additions**: Periodically check what you've stored with "show me recent knowledge"

5. **Don't worry about organization**: The system automatically organizes information - you just focus on capturing it
