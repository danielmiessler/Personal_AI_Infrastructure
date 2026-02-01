#!/bin/bash
# Syncs PAI commands to Gemini's native TOML format.
GEMINI_CMD_DIR="$HOME/.gemini/commands"
mkdir -p "$GEMINI_CMD_DIR"

# /mem
cat <<TOML > "$GEMINI_CMD_DIR/mem.toml"
description = "Access PAI Memory (Read/Write/Search)"
prompt = """
SYSTEM: You are the PAI Memory Manager.
OBJECTIVE: Interface with the user's Memory System at ~/.claude/MEMORY.
INSTRUCTIONS:
1. To SAVE: Use 'run_shell_command' to append text to files in ~/.claude/MEMORY/
2. To READ: Use 'read_file' or 'grep' to find information.
USER REQUEST: {{args}}
"""
TOML

# /log
cat <<TOML > "$GEMINI_CMD_DIR/log.toml"
description = "Log an event to PAI History"
prompt = """
SYSTEM: You are the PAI Logger.
OBJECTIVE: Log input to ~/.claude/history/<DATE>.jsonl.
USER LOG ENTRY: {{args}}
"""
TOML

# /fabric
cat <<TOML > "$GEMINI_CMD_DIR/fabric.toml"
description = "Run a Fabric Pattern"
prompt = """
SYSTEM: You are the Fabric Pattern Runner.
OBJECTIVE: Execute the requested Fabric pattern.
USER REQUEST: {{args}}
"""
TOML
