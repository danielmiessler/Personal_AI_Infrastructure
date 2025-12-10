#!/bin/bash
# Entrypoint for PAI Context Skill Clean Room
#
# Commands:
#   validate    - Quick deployment validation (default)
#   test        - Run test suite
#   shell       - Interactive shell
#   ci          - Full CI pipeline
#   <custom>    - Run any command

set -e

# Source environment if exists
if [ -f /pai/config/.env ]; then
    export $(grep -v '^#' /pai/config/.env | xargs)
fi

# Ensure PAI_DIR is set
export PAI_DIR="${PAI_DIR:-/pai/repo}"
export OBSIDIAN_VAULT_PATH="${OBSIDIAN_VAULT_PATH:-/pai/vault}"

case "${1:-validate}" in
    validate)
        echo "🧪 Running deployment validation..."
        exec /pai/validate.sh "${@:2}"
        ;;
    
    test)
        # Handle "test unit", "test all", etc.
        echo "🧪 Running tests: ${2:-all}"
        exec /pai/run-tests.sh "${2:-all}"
        ;;
    
    unit|integration|cli|acceptance|all)
        echo "🧪 Running tests: $1"
        exec /pai/run-tests.sh "$1"
        ;;
    
    shell)
        echo "🐚 Starting interactive shell..."
        echo "   PAI_DIR=$PAI_DIR"
        echo "   OBSIDIAN_VAULT_PATH=$OBSIDIAN_VAULT_PATH"
        echo ""
        exec /bin/bash
        ;;
    
    ci)
        echo "🚀 Running full CI pipeline..."
        /pai/validate.sh
        /pai/run-tests.sh all
        echo ""
        echo "✅ CI pipeline completed successfully"
        ;;
    
    *)
        # Run arbitrary command
        exec "$@"
        ;;
esac

