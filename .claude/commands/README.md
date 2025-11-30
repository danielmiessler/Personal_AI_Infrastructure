# Custom Slash Commands

This directory contains custom slash commands that extend Claude Code.

## How Slash Commands Work

Files in this directory become available as `/command-name` in Claude Code. For example:
- `example.md` → `/example`
- `my-workflow.md` → `/my-workflow`

## Creating a Slash Command

1. Create a markdown file in this directory
2. The file content becomes the prompt that runs when you invoke the command
3. Use `$ARGUMENTS` to capture any text after the command

### Example: `/summarize`

```markdown
Summarize the following content in 3 bullet points:

$ARGUMENTS
```

Then use it: `/summarize [paste your content here]`

## Included Examples

- `example.md` - A simple example showing the pattern

## Your Commands

Add your own slash commands here. Common use cases:
- Research workflows
- Code review templates
- Writing assistance
- Daily standup formats
- Custom analysis patterns

These are personal to your setup - add whatever helps your workflow.
