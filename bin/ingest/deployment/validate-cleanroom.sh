#!/bin/bash
# True Clean Room Validation
#
# This validates that a NEW USER can successfully use the context skill
# after cloning upstream PAI and applying the skill contribution.

set -e

echo "═══════════════════════════════════════════════════════════════════════"
echo "  PAI Context Skill - Clean Room Validation"
echo "  Simulating: New user + your skill contribution"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  PAI_DIR:             ${PAI_DIR}"
echo "  OBSIDIAN_VAULT_PATH: ${OBSIDIAN_VAULT_PATH}"
echo ""

ERRORS=()
WARNINGS=()

check_pass() { echo "  ✅ $1"; }
check_fail() { echo "  ❌ $1"; ERRORS+=("$1"); }
check_warn() { echo "  ⚠️  $1"; WARNINGS+=("$1"); }

section() {
    echo ""
    echo "📋 $1"
    echo "────────────────────────────────────────────────────────────────────"
}

# ═══════════════════════════════════════════════════════════════════════════
section "1. Verify Upstream + Skill Merge"

cd "$PAI_DIR"

# Check git history shows the merge
if git log --oneline -5 | grep -q "context"; then
    check_pass "Git history shows skill merge"
else
    check_warn "Git merge message not found (may be okay)"
fi

# Check skill files exist
if [ -d ".claude/skills/context" ]; then
    check_pass "Skill directory exists: .claude/skills/context/"
else
    check_fail "Skill directory missing: .claude/skills/context/"
fi

if [ -f ".claude/skills/context/SKILL.md" ]; then
    check_pass "SKILL.md exists"
else
    check_fail "SKILL.md missing"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "2. Verify CLI Installation"

# Check obs CLI
if [ -f "bin/obs/obs.ts" ]; then
    check_pass "obs CLI exists: bin/obs/obs.ts"
else
    check_fail "obs CLI missing"
fi

# Check ingest CLI
if [ -f "bin/ingest/ingest.ts" ]; then
    check_pass "ingest CLI exists: bin/ingest/ingest.ts"
else
    check_fail "ingest CLI missing"
fi

# Check dependencies installed
if [ -d "bin/obs/node_modules" ]; then
    check_pass "obs dependencies installed"
else
    check_fail "obs dependencies missing"
fi

if [ -d "bin/ingest/node_modules" ]; then
    check_pass "ingest dependencies installed"
else
    check_fail "ingest dependencies missing"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "3. Smoke Tests (as new user would run)"

# Test obs --help
if bun bin/obs/obs.ts --help > /dev/null 2>&1; then
    check_pass "obs --help works"
else
    check_fail "obs --help failed"
fi

# Test ingest --help
if bun bin/ingest/ingest.ts --help > /dev/null 2>&1; then
    check_pass "ingest --help works"
else
    check_fail "ingest --help failed"
fi

# Test obs tags (requires vault)
if bun bin/obs/obs.ts tags > /dev/null 2>&1; then
    check_pass "obs tags works"
else
    check_warn "obs tags failed (vault may need notes)"
fi

# Test obs search
if bun bin/obs/obs.ts search --tag project > /dev/null 2>&1; then
    check_pass "obs search works"
else
    check_warn "obs search returned no results (okay for empty vault)"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "4. Documentation Check"

# Check key docs exist
if [ -f "bin/ingest/README.md" ] || [ -f "docs/skills/context/QUICKSTART.md" ]; then
    check_pass "Documentation exists"
else
    check_warn "Documentation may be incomplete"
fi

# Check install script exists and is executable
if [ -x "bin/ingest/install.sh" ]; then
    check_pass "install.sh is executable"
else
    check_warn "install.sh missing or not executable"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "5. Unit Tests"

cd bin/ingest

if [ -d "test/unit" ]; then
    echo "  Running unit tests..."
    if bun test test/unit/ 2>&1; then
        check_pass "Unit tests pass"
    else
        check_fail "Unit tests failed"
    fi
else
    check_warn "No unit tests found in test/unit/"
fi

# ═══════════════════════════════════════════════════════════════════════════
section "Summary"

echo ""
TOTAL_ERRORS=${#ERRORS[@]}
TOTAL_WARNINGS=${#WARNINGS[@]}

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "  ✅ CLEAN ROOM VALIDATION PASSED"
    echo ""
    echo "  Your skill contribution works on a fresh PAI installation!"
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
    echo "  ❌ CLEAN ROOM VALIDATION FAILED"
    echo ""
    echo "  Your skill may not work for new users!"
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

