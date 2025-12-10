#!/bin/bash
#
# Sanitization Check for Public Fork Contribution
#
# Run this BEFORE pushing to the public fork to ensure no personal data leaks.
# Usage: ./scripts/sanitize-for-contrib.sh [--fix]
#
# With --fix: Attempts to replace personal data with placeholders
# Without --fix: Reports issues only (default, safe)

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FIX_MODE=false
if [[ "${1:-}" == "--fix" ]]; then
    FIX_MODE=true
    echo -e "${YELLOW}Running in FIX mode - will modify files${NC}"
fi

ISSUES_FOUND=0

echo "=========================================="
echo "  PAI Contribution Sanitization Check"
echo "=========================================="
echo ""

# Personal data patterns to check (name|pattern pairs)
PATTERN_NAMES=(
    "Telegram Bot Token"
    "Telegram Chat ID"
    "Vault Path"
    "Username in metadata"
    "API Key Pattern"
)
PATTERN_REGEXES=(
    'bot[0-9]+:[A-Za-z0-9_-]{35}'
    '-100[0-9]{10}'
    '/Users/[a-z]+/Documents/[a-z_]+_brain'
    '\[user:[a-z]+\]'
    'sk-[A-Za-z0-9]{48}'
)

# Files to always exclude from contribution
EXCLUDED_FILES=(
    ".env"
    ".env.local"
    "profiles/zettelkasten.json"
    ".claude/skills/Context/tags.json"
)

echo "Checking for personal data patterns..."
echo ""

for i in "${!PATTERN_NAMES[@]}"; do
    name="${PATTERN_NAMES[$i]}"
    pattern="${PATTERN_REGEXES[$i]}"
    matches=$(grep -rE "$pattern" \
        --include="*.ts" --include="*.json" --include="*.md" --include="*.sh" \
        --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build \
        --exclude="sanitize-for-contrib.sh" \
        bin/ shortcuts/ .claude/ docs/ scripts/ 2>/dev/null || true)

    if [[ -n "$matches" ]]; then
        echo -e "${RED}FOUND: $name${NC}"
        echo "$matches" | head -5
        if [[ $(echo "$matches" | wc -l) -gt 5 ]]; then
            echo "  ... and more"
        fi
        echo ""
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}OK: $name - not found${NC}"
    fi
done

echo ""
echo "Checking for files that should be excluded..."
echo ""

for file in "${EXCLUDED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}EXCLUDE: $file exists (should not be committed to fork)${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

echo ""
echo "=========================================="

if [[ $ISSUES_FOUND -gt 0 ]]; then
    echo -e "${RED}ISSUES FOUND: $ISSUES_FOUND${NC}"
    echo ""
    echo "Before contributing:"
    echo "  1. Replace personal data with placeholders (YOUR_*, etc.)"
    echo "  2. Add sensitive files to .gitignore"
    echo "  3. Use environment variables for paths/tokens"
    echo ""
    echo "Run with --fix to attempt automatic replacement (review changes!)"
    exit 1
else
    echo -e "${GREEN}ALL CLEAR - Safe to push to public fork${NC}"
    exit 0
fi
