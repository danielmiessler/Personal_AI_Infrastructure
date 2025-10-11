#!/usr/bin/env bun
/**
 * Delegation System - Comprehensive Documentation & Configuration
 *
 * This file contains:
 * 1. User guide and quick start
 * 2. Configuration (YAML-style markdown)
 * 3. Tool status checking
 * 4. Technical documentation
 *
 * For Kai: Read this file to understand delegation config and available tools
 * For Users: Edit the config section or tell Kai to adjust settings
 */

import { $ } from "bun";

// ============================================================================
// QUICK START GUIDE
// ============================================================================

/**
 * # Delegation System - Quick Start
 *
 * **TL;DR:** Kai automatically delegates heavy tasks to save context. No setup needed if you have the tools installed.
 *
 * ## 30-Second Start
 *
 * 1. **Install tools** (optional, use what you have):
 *    ```bash
 *    npm install -g @augmentcode/cli  # auggie
 *    pip install aider-chat            # aider
 *    # gemini - see gemini-cli-setup.md
 *    ```
 *
 * 2. **That's it!** Kai will automatically delegate when appropriate.
 *
 * ## How It Works
 *
 * **You:** "Analyze the ~/dev/myproject codebase"
 *
 * **Kai:**
 * ```
 * 📊 Delegating to auggie (847 files detected)...
 * Estimated token savings: ~15,000
 *
 * ✅ Analysis complete!
 * [Synthesized results from auggie]
 * ```
 *
 * ## Configuration
 *
 * Edit the CONFIG section below, or just tell Kai:
 * - "Don't use auggie anymore"
 * - "Increase delegation timeouts"
 * - "I added a new tool called X"
 *
 * ## When Delegation Happens
 *
 * **Kai delegates:**
 * - ✅ Analyzing >10 files
 * - ✅ Processing >20K tokens
 * - ✅ Codebase-wide operations
 * - ✅ Large document summaries
 *
 * **Kai handles directly:**
 * - ❌ Small tasks (<5K tokens)
 * - ❌ Interactive conversations
 * - ❌ When you want Kai's perspective
 *
 * ## Available Tools
 *
 * - **auggie** - Codebase analysis (best for projects)
 * - **gemini** - Fast text processing (best for speed)
 * - **aider** - Direct file editing (best for refactoring)
 *
 * Check status: Run this file directly (`bun delegate.md`)
 *
 * ## Benefits
 *
 * - 💰 Save 60-80% tokens on large tasks
 * - ⚡ Faster parallel processing
 * - 🎯 Right tool for the job
 * - 🤝 Better conversations (more context for chat)
 *
 * ## FAQ
 *
 * **Q: How does Kai know when to delegate?**
 *
 * A: Kai analyzes your request. If it involves >10 files or >20K tokens, delegation triggers automatically.
 *
 * **Q: Can I force a specific tool?**
 *
 * A: Yes! Just say "Use gemini to analyze this" and Kai will use that tool specifically.
 *
 * **Q: What if delegation fails?**
 *
 * A: Kai will ask you what to do - try another tool, have Kai handle it directly, or skip the task.
 *
 * **Q: Do I need all three tools?**
 *
 * A: No! Install what you want. Kai uses what's available and falls back gracefully.
 *
 * **Q: How do I disable delegation?**
 *
 * A: Change `enabled: true` to `enabled: false` in the config below, or tell Kai "Disable delegation system".
 *
 * **Q: Can I add my own tools?**
 *
 * A: Absolutely! Add a tool section to the config below (copy the auggie format) and tell Kai about it.
 *
 * ## That's It!
 *
 * No wizards, no complex setup. Just install tools and let Kai delegate intelligently.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * # Delegation System Configuration
 *
 * **Last Updated:** 2025-10-11
 * **Version:** 1.0.0
 *
 * ## System Status
 *
 * ```yaml
 * enabled: true
 * autoDelegate: true
 * announceDelegate: true
 * askBeforeFallback: true  # Ask user if delegation fails
 * ```
 *
 * ## Available Tools
 *
 * ### auggie
 * ```yaml
 * enabled: true
 * command: auggie
 * priority: 1
 * timeout: 120000  # 2 minutes
 *
 * bestFor:
 *   - codebase-analysis (>10 files)
 *   - architecture-review
 *   - project-understanding
 *
 * strengths:
 *   - Codebase-aware indexing
 *   - Full project context
 *   - Interactive and automated modes
 *
 * usage: |
 *   auggie -p -q "task description" /path/to/project
 * ```
 *
 * ### gemini
 * ```yaml
 * enabled: true
 * command: gemini
 * priority: 2
 * timeout: 60000  # 1 minute
 *
 * bestFor:
 *   - fast-text-generation
 *   - document-summarization (>5K tokens)
 *   - code-generation
 *   - web-research
 *
 * strengths:
 *   - Speed and efficiency
 *   - Large context window
 *   - Web search capability
 *
 * usage: |
 *   gemini "task description"
 *   # or with file: gemini "@file.txt task"
 * ```
 *
 * ### aider
 * ```yaml
 * enabled: true
 * command: aider
 * priority: 3
 * timeout: 180000  # 3 minutes
 *
 * bestFor:
 *   - direct-file-editing
 *   - code-refactoring (1-20 files)
 *   - implementation-tasks
 *
 * strengths:
 *   - Direct file manipulation
 *   - Git-aware changes
 *   - Multi-file refactoring
 *
 * usage: |
 *   aider --yes --message "task description" file.py
 * ```
 *
 * ## Delegation Rules
 *
 * ### When Kai Delegates
 *
 * **Always delegate:**
 * - Analyzing >10 files → auggie
 * - Processing >20,000 tokens → auggie or gemini
 * - Document summarization >5,000 tokens → gemini
 * - Batch code generation → gemini
 * - Multi-file refactoring → aider
 *
 * **Never delegate:**
 * - Single file operations (<3 files)
 * - Small tasks (<5,000 tokens)
 * - Interactive conversations
 * - Tasks requiring Kai's perspective
 *
 * ### Tool Selection Logic
 *
 * ```
 * Task Type: analyze + Scope: codebase → auggie (fallback: gemini)
 * Task Type: summarize + Size: large → gemini (fallback: auggie)
 * Task Type: generate + Any size → gemini (fallback: auggie)
 * Task Type: refactor + Multi-file → aider (fallback: auggie)
 * Task Type: research + Web → gemini (no fallback)
 * ```
 *
 * ## Configuration Notes
 *
 * ### Adding Custom Tools
 *
 * To add a new tool, add a section like:
 *
 * ```yaml
 * ### my-tool
 * enabled: true
 * command: my-tool
 * priority: 4
 * timeout: 60000
 *
 * bestFor:
 *   - custom-analysis
 *
 * strengths:
 *   - What it does well
 *
 * usage: |
 *   my-tool --flag "task"
 * ```
 *
 * Then tell Kai: "I added my-tool to delegation config, please use it for X tasks"
 *
 * ### Adjusting Settings
 *
 * Edit this file directly, then tell Kai:
 * - "Kai, reload delegation config"
 * - "I updated delegation timeouts"
 * - "I disabled auggie delegation"
 *
 * Kai will re-read this file and adjust behavior.
 *
 * ### Disabling Tools
 *
 * Change `enabled: true` to `enabled: false`, or tell Kai:
 * - "Don't use auggie for delegation anymore"
 * - "Disable gemini delegation"
 *
 * ### Changing Priorities
 *
 * Lower number = higher priority. Adjust the `priority:` value.
 */

// ============================================================================
// TOOL STATUS CHECKER
// ============================================================================

async function checkToolStatus() {
  const tools = [
    {
      name: "auggie",
      command: "auggie",
      versionFlag: "--version",
      description: "Augment Code CLI - Codebase-aware AI assistant"
    },
    {
      name: "gemini",
      command: "gemini",
      versionFlag: "--version",
      description: "Gemini CLI - Fast text processing and generation"
    },
    {
      name: "aider",
      command: "aider",
      versionFlag: "--version",
      description: "Aider - AI pair programming with direct file editing"
    }
  ];

  console.log("🔍 Delegation System - Tool Status\n");
  console.log("═".repeat(60));

  for (const tool of tools) {
    try {
      // Check if tool exists
      const whichResult = await $`which ${tool.command}`.text();
      const path = whichResult.trim();

      if (!path) {
        console.log(`\n❌ ${tool.name}`);
        console.log(`   Status: Not installed`);
        console.log(`   Description: ${tool.description}`);
        continue;
      }

      // Get version
      let version = "unknown";
      try {
        const versionResult = await $`${tool.command} ${tool.versionFlag}`.text();
        version = versionResult.trim().split("\n")[0];
      } catch {
        version = "installed (version unknown)";
      }

      console.log(`\n✅ ${tool.name}`);
      console.log(`   Status: Available`);
      console.log(`   Path: ${path}`);
      console.log(`   Version: ${version}`);
      console.log(`   Description: ${tool.description}`);
    } catch (error) {
      console.log(`\n❌ ${tool.name}`);
      console.log(`   Status: Not installed`);
      console.log(`   Description: ${tool.description}`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("\n📦 Installation Commands:");
  console.log("\n  auggie:  npm install -g @augmentcode/cli");
  console.log("  gemini:  See PAI reference docs for gemini-cli setup");
  console.log("  aider:   pip install aider-chat");
  console.log("           or: brew install aider\n");
}

// ============================================================================
// TECHNICAL DOCUMENTATION
// ============================================================================

/**
 * # Delegation System - Technical Documentation
 *
 * ## Architecture
 *
 * The delegation system consists of two main components:
 *
 * 1. **delegate.md** (this file) - Configuration and documentation
 * 2. **delegate-router.md** - Smart routing engine that executes delegations
 *
 * ## How It Works
 *
 * ### 1. Task Analysis
 *
 * When Kai receives a request, it analyzes:
 * - **File count**: How many files are involved?
 * - **Token estimate**: How large is the context?
 * - **Task type**: Analysis, generation, refactoring, etc.
 * - **Scope**: Single file, multi-file, or codebase-wide?
 *
 * ### 2. Delegation Decision
 *
 * Triggers delegation if:
 * - File count > 10, OR
 * - Estimated tokens > 20,000, OR
 * - Explicit tool request (e.g., "use auggie to...")
 *
 * ### 3. Tool Selection
 *
 * The router:
 * 1. Reads this config file
 * 2. Filters enabled tools
 * 3. Matches task type to tool capabilities
 * 4. Selects by priority (lower number = higher priority)
 * 5. Falls back to next tool if primary fails
 * 6. **Asks user if all tools fail** (no auto-fallback to Kai)
 *
 * ### 4. Execution
 *
 * The router:
 * 1. Constructs appropriate command
 * 2. Executes with configured timeout
 * 3. Captures stdout/stderr
 * 4. Returns results to Kai
 *
 * ### 5. Synthesis
 *
 * Kai:
 * 1. Receives raw tool output
 * 2. Synthesizes into coherent response
 * 3. Presents to user in structured format
 * 4. Credits the tool used
 *
 * ## Token Savings
 *
 * Example scenarios:
 *
 * **Scenario 1: Codebase Analysis (850 files)**
 * - Without delegation: ~40,000 tokens (reading all files)
 * - With auggie delegation: ~7,000 tokens (auggie summary + synthesis)
 * - **Savings: ~82%**
 *
 * **Scenario 2: Large Document Summary (100KB text)**
 * - Without delegation: ~25,000 tokens (full document in context)
 * - With gemini delegation: ~5,000 tokens (gemini summary + synthesis)
 * - **Savings: ~80%**
 *
 * **Scenario 3: Multi-file Refactoring (15 files)**
 * - Without delegation: ~30,000 tokens (all files + edits)
 * - With aider delegation: ~3,000 tokens (aider handles edits)
 * - **Savings: ~90%**
 *
 * ## Tool Capabilities
 *
 * ### Auggie (Priority 1)
 *
 * **Best for:**
 * - Large codebases (>10 files)
 * - Understanding project architecture
 * - Finding patterns across files
 * - Comprehensive analysis
 *
 * **How it works:**
 * - Indexes entire codebase
 * - Uses vector embeddings for semantic search
 * - Understands code relationships
 * - Can answer specific questions about code
 *
 * **Example tasks:**
 * - "Analyze the authentication system"
 * - "Find all API endpoints"
 * - "Explain the database schema"
 * - "Map out the component hierarchy"
 *
 * ### Gemini (Priority 2)
 *
 * **Best for:**
 * - Fast text generation
 * - Document summarization
 * - Code generation from scratch
 * - Web research
 *
 * **How it works:**
 * - Large context window (1M+ tokens)
 * - Extremely fast inference
 * - Can search web for current info
 * - Good at creative generation
 *
 * **Example tasks:**
 * - "Summarize this 50-page document"
 * - "Generate boilerplate for X"
 * - "Research current best practices for Y"
 * - "Create test data for Z"
 *
 * ### Aider (Priority 3)
 *
 * **Best for:**
 * - Direct file editing
 * - Multi-file refactoring
 * - Implementation tasks
 * - Git-aware changes
 *
 * **How it works:**
 * - Reads files directly from disk
 * - Makes precise edits
 * - Creates git commits
 * - Can work with multiple files
 *
 * **Example tasks:**
 * - "Add docstrings to all functions"
 * - "Refactor class X to use pattern Y"
 * - "Update all imports to use new path"
 * - "Add error handling to these 10 files"
 *
 * ## Configuration Format
 *
 * The config uses YAML-style markdown for readability. Kai parses this file by:
 *
 * 1. Reading the entire file as text
 * 2. Extracting tool sections (### tool-name)
 * 3. Parsing YAML-like key-value pairs
 * 4. Building internal config object
 *
 * This is the PAI pattern: human-readable markdown that Kai can parse.
 *
 * ## Natural Language Configuration
 *
 * You can configure the system by talking to Kai:
 *
 * **Disable a tool:**
 * - "Don't use auggie anymore"
 * - "Disable aider delegation"
 *
 * **Adjust timeouts:**
 * - "Increase auggie timeout to 5 minutes"
 * - "Set gemini timeout to 30 seconds"
 *
 * **Change priorities:**
 * - "Make gemini the first choice for analysis"
 * - "Prefer aider over auggie for refactoring"
 *
 * **Add new tool:**
 * - "I installed a new tool called 'cursor-ai'"
 * - "Add cursor-ai to delegation with priority 4"
 *
 * Kai will update this file and confirm the changes.
 *
 * ## Extending the System
 *
 * To add a new AI tool:
 *
 * 1. **Install the tool** and verify it works
 * 2. **Add config section** (copy existing tool format)
 * 3. **Tell Kai** about it: "I added tool X, use it for Y tasks"
 * 4. **Test it**: Ask Kai to delegate a task to your new tool
 *
 * Example:
 *
 * ```yaml
 * ### cursor-ai
 * enabled: true
 * command: cursor-ai
 * priority: 4
 * timeout: 90000
 *
 * bestFor:
 *   - interactive-editing
 *   - ide-integration
 *
 * strengths:
 *   - Real-time suggestions
 *   - IDE integration
 *
 * usage: |
 *   cursor-ai analyze "task" --path /project
 * ```
 *
 * ## Troubleshooting
 *
 * ### Tools not found
 *
 * Run this file: `bun delegate.md`
 *
 * This checks which tools are installed and where they are.
 *
 * ### Delegation not triggering
 *
 * Check the thresholds:
 * - Is your task >10 files?
 * - Is your task >20K tokens?
 *
 * You can force delegation: "Use auggie to analyze this single file"
 *
 * ### Tool timeouts
 *
 * If tools are timing out, increase the timeout in config:
 * - auggie: 120000 (2 min) → 300000 (5 min)
 * - gemini: 60000 (1 min) → 120000 (2 min)
 * - aider: 180000 (3 min) → 360000 (6 min)
 *
 * Or tell Kai: "Increase auggie timeout to 5 minutes"
 *
 * ### Wrong tool selected
 *
 * Adjust priorities or force specific tool:
 * - "Use gemini instead of auggie for this"
 * - "Always prefer aider for refactoring tasks"
 *
 * ## Security Considerations
 *
 * - Tools run with your user permissions
 * - Tools can read/write files in delegated paths
 * - Review tool output before accepting changes
 * - Aider can modify files directly (use git!)
 * - Gemini can make web requests
 *
 * ## Performance Tips
 *
 * 1. **Use auggie for codebases** - It's optimized for project analysis
 * 2. **Use gemini for speed** - Fastest for text generation
 * 3. **Use aider for editing** - Direct file manipulation is faster
 * 4. **Adjust timeouts** - Complex tasks need more time
 * 5. **Enable only needed tools** - Reduces decision overhead
 *
 * ## Integration with PAI
 *
 * The delegation system is designed for the Personal AI (PAI) ecosystem:
 *
 * - **Markdown-first**: Config is readable markdown, not JSON
 * - **Natural language**: Configure by talking to Kai
 * - **Zero-setup**: Works if tools are installed
 * - **Consistent patterns**: Follows PAI conventions
 * - **Extensible**: Easy to add new tools
 *
 * ## Related Documentation
 *
 * - **Auggie CLI**: https://docs.augmentcode.com
 * - **Gemini CLI**: https://github.com/gemini-cli (see PAI reference docs for setup)
 * - **Aider Docs**: https://aider.chat
 * - **PAI Documentation**: See PAI README and reference docs
 *
 * ## Version History
 *
 * - **1.0.0** (2025-10-11) - Initial release
 *   - Three tools: auggie, gemini, aider
 *   - Smart routing with priorities
 *   - Natural language configuration
 *   - Markdown-based config
 *   - Ask-user-on-failure behavior
 *
 * ---
 *
 * **That's it!** This is the complete delegation system documentation and configuration.
 */

// ============================================================================
// MAIN - Tool Status Check
// ============================================================================

// When run directly, check tool status
if (import.meta.main) {
  await checkToolStatus();
}

export { checkToolStatus };
