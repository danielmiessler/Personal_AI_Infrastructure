#!/bin/bash

# validate-installation.sh - PAI-Boilerplate Installation Validation
# Usage: ./validate-installation.sh

echo "PAI-Boilerplate Installation Validation"
echo "========================================"
echo ""

errors=0
warnings=0

# Check Claude Code
if command -v claude &> /dev/null; then
  echo "✅ Claude Code: Installed"
else
  echo "❌ Claude Code: Not found"
  ((errors++))
fi

# Check Bun
if command -v bun &> /dev/null; then
  echo "✅ Bun: Installed ($(bun --version))"
else
  echo "⚠️  Bun: Not found (optional, but recommended)"
  ((warnings++))
fi

# Check ~/.claude directory
if [ -d "$HOME/.claude" ]; then
  echo "✅ ~/.claude: Directory exists"
else
  echo "❌ ~/.claude: Directory missing"
  ((errors++))
fi

# Check settings.json
if [ -f "$HOME/.claude/settings.json" ]; then
  echo "✅ settings.json: Exists"
else
  echo "❌ settings.json: Missing"
  ((errors++))
fi

# Check .mcp.json
if [ -f "$HOME/.claude/.mcp.json" ]; then
  echo "✅ .mcp.json: Exists"
else
  echo "⚠️  .mcp.json: Missing (optional)"
  ((warnings++))
fi

# Check context directory
if [ -d "$HOME/.claude/context" ]; then
  echo "✅ context/ directory: Exists"
else
  echo "⚠️  context/ directory: Missing"
  ((warnings++))
fi

# Check scratchpad directory
if [ -d "$HOME/.claude/scratchpad" ]; then
  echo "✅ scratchpad/ directory: Exists"
else
  echo "⚠️  scratchpad/ directory: Missing"
  ((warnings++))
fi

echo ""
echo "Summary:"
echo "  Errors: $errors"
echo "  Warnings: $warnings"
echo ""

if [ $errors -gt 0 ]; then
  echo "❌ Installation validation failed"
  echo "   Run ./install.sh to fix issues"
  exit 1
else
  echo "✅ Installation validation passed"
  if [ $warnings -gt 0 ]; then
    echo "   Some optional components missing (not critical)"
  fi
  exit 0
fi
