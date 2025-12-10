#!/bin/bash
# Deploy sanitized changes from dev branch to release branch
#
# Usage:
#   ./deploy-to-release.sh                    # Interactive mode
#   ./deploy-to-release.sh --version 1.0.0    # With version
#   ./deploy-to-release.sh --dry-run          # Preview only
#
# This script:
#   1. Checks you're on feature/context-system
#   2. Creates/updates release/context-skill branch
#   3. Cherry-picks or merges sanitized changes
#   4. Optionally creates version tag

set -e

# Configuration
DEV_BRANCH="feature/context-system"
RELEASE_BRANCH="release/context-skill"
TAG_PREFIX="context-skill-v"

# Parse arguments
DRY_RUN=false
VERSION=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --version) VERSION="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "═══════════════════════════════════════════════════════════════════"
echo "  Deploy to Release Branch"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "$DEV_BRANCH" ]; then
    echo "⚠️  Warning: Not on $DEV_BRANCH"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Uncommitted changes detected"
    echo "   Please commit or stash changes first"
    exit 1
fi

# Get list of changed files in context skill
echo ""
echo "📋 Files to deploy (context skill only):"
echo "────────────────────────────────────────────────────────────────────"

SKILL_PATHS=(
    "bin/ingest"
    "bin/obs"
    ".claude/skills/context"
    ".github/workflows/context-skill*.yml"
)

for path in "${SKILL_PATHS[@]}"; do
    if [ -e "$path" ] || ls $path 2>/dev/null; then
        echo "  ✓ $path"
    fi
done

# Check for personal data patterns
echo ""
echo "🔍 Checking for personal data..."
echo "────────────────────────────────────────────────────────────────────"

PATTERNS=(
    "/Users/andreas"
    "andreas_brain"
    "mellanon"  # May be okay in some places
)

FOUND_PERSONAL=false
for pattern in "${PATTERNS[@]}"; do
    if grep -r "$pattern" bin/ingest bin/obs .claude/skills/context \
        --include="*.ts" --include="*.md" --include="*.json" 2>/dev/null \
        | grep -v "node_modules" | grep -v "test/fixtures" | head -5; then
        echo "  ⚠️  Found: $pattern"
        FOUND_PERSONAL=true
    fi
done

if [ "$FOUND_PERSONAL" = true ]; then
    echo ""
    echo "⚠️  Personal data patterns detected!"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "  ✓ No personal data detected"
fi

# Preview mode
if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "🔍 DRY RUN - No changes will be made"
    echo ""
    echo "Would execute:"
    echo "  1. git checkout $RELEASE_BRANCH (or create)"
    echo "  2. git merge $CURRENT_BRANCH --no-ff"
    if [ -n "$VERSION" ]; then
        echo "  3. git tag ${TAG_PREFIX}${VERSION}"
    fi
    exit 0
fi

# Create or checkout release branch
echo ""
echo "📦 Deploying to $RELEASE_BRANCH..."
echo "────────────────────────────────────────────────────────────────────"

if git show-ref --verify --quiet refs/heads/$RELEASE_BRANCH; then
    echo "  Checking out existing $RELEASE_BRANCH"
    git checkout $RELEASE_BRANCH
    git pull origin $RELEASE_BRANCH 2>/dev/null || true
else
    echo "  Creating new $RELEASE_BRANCH from main"
    git checkout main
    git pull origin main 2>/dev/null || true
    git checkout -b $RELEASE_BRANCH
fi

# Merge from dev branch
echo "  Merging from $CURRENT_BRANCH"
git merge $CURRENT_BRANCH --no-ff -m "Release: Merge $CURRENT_BRANCH into $RELEASE_BRANCH"

# Tag if version specified
if [ -n "$VERSION" ]; then
    TAG="${TAG_PREFIX}${VERSION}"
    echo ""
    echo "🏷️  Creating tag: $TAG"
    git tag -a "$TAG" -m "Context Skill v${VERSION}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  ✅ Deploy Complete"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review changes: git log --oneline -10"
echo "  2. Push branch:    git push origin $RELEASE_BRANCH"
if [ -n "$VERSION" ]; then
    echo "  3. Push tag:       git push origin ${TAG_PREFIX}${VERSION}"
fi
echo "  4. Create PR to upstream (when ready)"
echo ""
echo "To go back to dev:"
echo "  git checkout $DEV_BRANCH"

