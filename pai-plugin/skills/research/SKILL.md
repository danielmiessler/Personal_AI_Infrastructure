---
name: research
description: Multi-source comprehensive research using perplexity-researcher, claude-researcher, and gemini-researcher agents. Launches up to 10 parallel research agents for fast results. USE WHEN user says 'do research', 'research X', 'find information about', 'investigate', 'analyze trends', 'current events', or any research-related request.
---

# Research Skill

## When to Use This Skill

This skill activates when the user requests research or information gathering:
- "Do research on X"
- "Research this topic"
- "Find information about X"
- "Investigate this subject"
- "Analyze trends in X"
- "Current events research"
- Any comprehensive information gathering request

## How to Execute

**Execute the `/conduct-research` slash command**, which handles the complete workflow:

1. Decomposing research questions into 3-10 sub-questions
2. Launching up to 10 parallel research agents (perplexity, claude, gemini)
3. Collecting results in 15-30 seconds
4. Synthesizing findings with confidence levels
5. Formatting comprehensive report with source attribution

## Available Research Agents

- All agents with "researcher" in their name in the agents directory.

## Speed Benefits

- ❌ **Old approach**: Sequential searches → 5-10 minutes
- ✅ **New approach**: 10 parallel agents → Under 1 minute

## Full Workflow Reference

For complete step-by-step instructions: `read ${CLAUDE_PLUGIN_ROOT}/commands/conduct-research.md`
