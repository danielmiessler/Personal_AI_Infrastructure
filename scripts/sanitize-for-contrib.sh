#!/bin/bash
#
# Sanitization Check for Public Fork Contribution
#
# Run this BEFORE pushing to the public fork to ensure no personal data leaks.
# Usage: ./scripts/sanitize-for-contrib.sh [--fix]
#
# With --fix: Attempts to replace personal data with placeholders
# Without --fix: Reports issues only (default, safe)

set -euo pipefail

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

# Personal data patterns to check
declare -A PATTERNS=(
    ["Telegram Bot Token"]='bot[0-9]+:[A-Za-z0-9_-]{35}'
    ["Telegram Chat ID"]='-100[0-9]{10}'
    ["Vault Path"]='/Users/[a-z]+/Documents/[a-z_]+_brain'
    ["Username andreas"]='user.*andreas|andreas.*user'
    ["API Key Pattern"]='sk-[A-Za-z0-9]{48}'
)

# Files to always exclude from contribution
EXCLUDED_FILES=(
    ".env"
    ".env.local"
    ".env.*.local"
    "profiles/zettelkasten.json"
    ".claude/skills/Context/tags.json"
)

echo "Checking for personal data patterns..."
echo ""

for name in "${!PATTERNS[@]}"; do
    pattern="${PATTERNS[$name]}"
    matches=$(grep -rE "$pattern" --include="*.ts" --include="*.json" --include="*.md" --include="*.sh" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "sanitize-for-contrib.sh" || true)

    if [[ -n "$matches" ]]; then
        echo -e "${RED}FOUND: $name${NC}"
        echo "$matches" | head -5
        if [[ $(echo "$matches" | wc -l) -gt 5 ]]; then
            echo "  ... and more"
        fi
        echo ""
        ((ISSUES_FOUND++))
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
        ((ISSUES_FOUND++))
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
