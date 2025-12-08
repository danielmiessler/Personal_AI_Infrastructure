#!/bin/bash
# Deployment Validation Script for PAI Context Skill
#
# This script validates that the context skill can be deployed
# and run on a fresh machine with minimal configuration.
#
# Usage:
#   ./validate.sh              # Basic validation
#   ./validate.sh --verbose    # Detailed output
#   ./validate.sh --with-claude # Include Claude CLI check

set -e

VERBOSE=false
WITH_CLAUDE=false
ERRORS=()
WARNINGS=()

# Parse arguments
for arg in "$@"; do
    case $arg in
        --verbose|-v) VERBOSE=true ;;
        --with-claude) WITH_CLAUDE=true ;;
    esac
done

echo "═══════════════════════════════════════════════════════════════════════"
echo "  PAI Context Skill - Deployment Validation"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  PAI_DIR:             ${PAI_DIR:-NOT SET}"
echo "  OBSIDIAN_VAULT_PATH: ${OBSIDIAN_VAULT_PATH:-NOT SET}"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"

# Helper functions
check_pass() { echo "  ✅ $1"; }
check_fail() { echo "  ❌ $1"; ERRORS+=("$1"); }
check_warn() { echo "  ⚠️  $1"; WARNINGS+=("$1"); }
check_skip() { echo "  ⏭️  $1 (skipped)"; }

section() {
    echo ""
    echo "📋 $1"
    echo "────────────────────────────────────────────────────────────────────"
}

# ═══════════════════════════════════════════════════════════════════════════
section "Prerequisites"

# Check Bun
if command -v bun &> /dev/null; then
    check_pass "bun: $(bun --version)"
else
    check_fail "bun: NOT FOUND (required)"
fi

# Check Node.js
if command -v node &> /dev/null; then
    check_pass "node: $(node --version)"
else
    check_warn "node: NOT FOUND (optional, needed for some features)"
fi

# Check Git
if command -v git &> /dev/null; then
    check_pass "git: $(git --version | head -1)"
else
    check_warn "git: NOT FOUND (optional)"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "Required Configuration"

# Check PAI_DIR
if [ -n "$PAI_DIR" ] && [ -d "$PAI_DIR" ]; then
    check_pass "PAI_DIR: $PAI_DIR"
else
    check_fail "PAI_DIR: NOT SET or directory doesn't exist"
fi

# Check OBSIDIAN_VAULT_PATH
if [ -n "$OBSIDIAN_VAULT_PATH" ] && [ -d "$OBSIDIAN_VAULT_PATH" ]; then
    check_pass "OBSIDIAN_VAULT_PATH: $OBSIDIAN_VAULT_PATH"
    # Count markdown files
    MD_COUNT=$(find "$OBSIDIAN_VAULT_PATH" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    check_pass "  Found $MD_COUNT markdown files"
else
    check_fail "OBSIDIAN_VAULT_PATH: NOT SET or directory doesn't exist"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "Optional Configuration"

# OpenAI (for semantic search)
if [ -n "$OPENAI_API_KEY" ]; then
    check_pass "OPENAI_API_KEY: Set (${OPENAI_API_KEY:0:7}...)"
else
    check_warn "OPENAI_API_KEY: NOT SET (semantic search disabled)"
fi

# Anthropic (for Claude/acceptance tests)
if [ -n "$ANTHROPIC_API_KEY" ]; then
    check_pass "ANTHROPIC_API_KEY: Set (${ANTHROPIC_API_KEY:0:7}...)"
else
    check_warn "ANTHROPIC_API_KEY: NOT SET (acceptance tests disabled)"
fi

# Telegram (for ingestion)
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    check_pass "TELEGRAM_BOT_TOKEN: Set"
else
    check_warn "TELEGRAM_BOT_TOKEN: NOT SET (Telegram ingestion disabled)"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "CLI Installation"

cd "$PAI_DIR"

# Check if node_modules exists (may be pre-installed or mounted)
if [ -d "bin/obs/node_modules" ]; then
    check_pass "bin/obs: node_modules exists"
else
    echo "  Installing obs dependencies..."
    if (cd bin/obs && bun install --silent 2>/dev/null); then
        check_pass "bin/obs: dependencies installed"
    else
        check_warn "bin/obs: bun install failed (may work anyway if deps bundled)"
    fi
fi

if [ -d "bin/ingest/node_modules" ]; then
    check_pass "bin/ingest: node_modules exists"
else
    echo "  Installing ingest dependencies..."
    if (cd bin/ingest && bun install --silent 2>/dev/null); then
        check_pass "bin/ingest: dependencies installed"
    else
        check_warn "bin/ingest: bun install failed (may work anyway if deps bundled)"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
section "Smoke Tests"

# obs --help
if bun bin/obs/obs.ts --help > /dev/null 2>&1; then
    check_pass "obs --help: works"
else
    check_fail "obs --help: failed"
fi

# ingest --help
if bun bin/ingest/ingest.ts --help > /dev/null 2>&1; then
    check_pass "ingest --help: works"
else
    check_fail "ingest --help: failed"
fi

# obs tags (requires vault)
if [ -n "$OBSIDIAN_VAULT_PATH" ]; then
    if bun bin/obs/obs.ts tags > /dev/null 2>&1; then
        check_pass "obs tags: works"
    else
        check_warn "obs tags: failed (vault may be empty)"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
section "Claude Code CLI (Optional)"

if [ "$WITH_CLAUDE" = true ]; then
    if command -v claude &> /dev/null; then
        check_pass "claude CLI: $(claude --version 2>/dev/null || echo 'installed')"
        
        if [ -n "$ANTHROPIC_API_KEY" ]; then
            # Test Claude CLI works
            if echo "test" | claude -p "Reply with just 'ok'" > /dev/null 2>&1; then
                check_pass "claude CLI: functional (API key valid)"
            else
                check_warn "claude CLI: API call failed"
            fi
        else
            check_warn "claude CLI: ANTHROPIC_API_KEY not set"
        fi
    else
        check_warn "claude CLI: NOT FOUND (acceptance tests disabled)"
    fi
else
    check_skip "claude CLI check"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "Summary"

echo ""
TOTAL_ERRORS=${#ERRORS[@]}
TOTAL_WARNINGS=${#WARNINGS[@]}

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "  ✅ VALIDATION PASSED"
    echo "═══════════════════════════════════════════════════════════════════════"
    if [ $TOTAL_WARNINGS -gt 0 ]; then
        echo ""
        echo "  Warnings ($TOTAL_WARNINGS):"
        for w in "${WARNINGS[@]}"; do
            echo "    - $w"
        done
    fi
    echo ""
    exit 0
else
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "  ❌ VALIDATION FAILED"
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Errors ($TOTAL_ERRORS):"
    for e in "${ERRORS[@]}"; do
        echo "    - $e"
    done
    if [ $TOTAL_WARNINGS -gt 0 ]; then
        echo ""
        echo "  Warnings ($TOTAL_WARNINGS):"
        for w in "${WARNINGS[@]}"; do
            echo "    - $w"
        done
    fi
    echo ""
    exit 1
fi

