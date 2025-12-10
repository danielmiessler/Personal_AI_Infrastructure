#!/bin/bash
# Test Runner for PAI Context Skill
#
# Usage:
#   ./run-tests.sh unit          # Unit tests only
#   ./run-tests.sh integration   # Integration tests (needs mocks or APIs)
#   ./run-tests.sh cli           # CLI tests
#   ./run-tests.sh acceptance    # Acceptance tests (needs Claude)
#   ./run-tests.sh all           # All tests
#   ./run-tests.sh ci            # CI-safe tests (no live APIs)

set -e

cd "${PAI_DIR:-/pai/repo}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

section() {
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "════════════════════════════════════════════════════════════════════"
}

run_unit_tests() {
    section "🧪 Unit Tests"
    cd bin/ingest
    
    # Check if unit tests exist
    if [ -d "test/unit" ]; then
        bun test test/unit/
    else
        echo "Running main test suite (unit layer)..."
        bun run ingest.ts test run --skip-daemon
    fi
}

run_integration_tests() {
    section "🔗 Integration Tests"
    cd bin/ingest
    
    # Check for mock services or live APIs
    if [ -n "$TELEGRAM_API_URL" ] || [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        echo "Running integration tests..."
        bun run ingest.ts test integration --skip-daemon
    else
        echo -e "${YELLOW}⚠️  Skipping integration tests (no Telegram config)${NC}"
    fi
}

run_cli_tests() {
    section "💻 CLI Tests"
    cd bin/ingest
    
    echo "Running CLI tests..."
    bun run ingest.ts test cli
}

run_acceptance_tests() {
    section "🎯 Acceptance Tests"
    
    # Check for Claude
    if ! command -v claude &> /dev/null; then
        echo -e "${YELLOW}⚠️  Skipping acceptance tests (claude CLI not found)${NC}"
        return 0
    fi
    
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo -e "${YELLOW}⚠️  Skipping acceptance tests (ANTHROPIC_API_KEY not set)${NC}"
        return 0
    fi
    
    cd bin/ingest
    echo "Running acceptance tests with Claude..."
    bun run ingest.ts test acceptance
}

run_ci_tests() {
    section "🤖 CI Pipeline (Mock-Safe Tests)"
    
    # Only run tests that don't need live APIs
    run_unit_tests
    run_cli_tests
    
    echo ""
    echo -e "${GREEN}✅ CI tests completed${NC}"
}

run_all_tests() {
    section "🧪 Full Test Suite"
    
    run_unit_tests
    run_integration_tests
    run_cli_tests
    run_acceptance_tests
    
    echo ""
    echo -e "${GREEN}✅ All tests completed${NC}"
}

# Main
case "${1:-all}" in
    unit)
        run_unit_tests
        ;;
    integration)
        run_integration_tests
        ;;
    cli)
        run_cli_tests
        ;;
    acceptance)
        run_acceptance_tests
        ;;
    ci)
        run_ci_tests
        ;;
    all)
        run_all_tests
        ;;
    *)
        echo "Usage: $0 {unit|integration|cli|acceptance|ci|all}"
        exit 1
        ;;
esac

