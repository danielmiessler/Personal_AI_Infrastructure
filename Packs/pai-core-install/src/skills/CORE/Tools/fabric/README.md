# Native Fabric Patterns for PAI

This directory contains local copies of all Fabric patterns for native use within PAI.

## Why Native Patterns?

Instead of calling `fabric -p pattern_name` for every pattern-based task, PAI can:
1. Read the pattern's `system.md` file directly
2. Apply the pattern as a native prompt
3. Execute faster without spawning external processes

## When to Still Use the Fabric CLI

Only use the `fabric` command for:
- `-U` - Update patterns (or use `./update-patterns.sh`)
- `-y` - Extract YouTube transcripts
- `-l` - List available patterns

For all pattern-based processing, use the native patterns in `./Patterns/`.

## Updating Patterns

Run the update script to pull the latest patterns:
```bash
./update-patterns.sh
```

This will:
1. Run `fabric -U` to fetch upstream updates
2. Sync patterns to this directory

## Pattern Structure

Each pattern directory contains:
- `system.md` - The main prompt/instructions
- `README.md` - Documentation (optional)
- Other supporting files (optional)

## Usage in PAI

When a task requires a Fabric pattern, PAI will:
1. Locate the pattern in `./Patterns/{pattern_name}/system.md`
2. Read the system prompt
3. Apply it directly to the content
4. Return results without external CLI calls
