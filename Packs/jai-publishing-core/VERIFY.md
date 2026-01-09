# Verification - JAI Publishing Core

Run these steps to verify the pack is installed correctly.

## Quick Verification

```bash
cd ~/PAI/packs/jai-publishing-core

# 1. Check tools exist
ls -la Tools/*.ts
# Expected: Calendar.ts, KeywordQueue.ts, SeoChecker.ts, types.ts

# 2. Check schemas exist
ls -la schemas/*.json
# Expected: keywords.schema.json, calendar.schema.json, products.schema.json

# 3. Test Calendar help
bun run Tools/Calendar.ts --help
# Expected: Shows usage information

# 4. Test KeywordQueue help
bun run Tools/KeywordQueue.ts --help
# Expected: Shows usage information

# 5. Test SeoChecker help
bun run Tools/SeoChecker.ts --help
# Expected: Shows usage information
```

## Functional Verification

### Test Calendar

```bash
# Create temp test directory
mkdir -p /tmp/jai-test && cd /tmp/jai-test

# Initialize calendar
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts init --site=test
# Expected: "Created content-calendar.json for site: test"

# List entries
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts list
# Expected: Shows example entry

# Add entry
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts add "Test Article" --site=test --date=2026-01-15
# Expected: "Added: Test Article" with ID and date

# Cleanup
rm -rf /tmp/jai-test
```

### Test KeywordQueue

```bash
mkdir -p /tmp/jai-test && cd /tmp/jai-test

# Add keyword
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts add "test keyword" --topic="Test topic" --site=test
# Expected: "Added: test keyword" with ID

# List queue
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list
# Expected: Shows the keyword entry

# View stats
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts stats
# Expected: Shows queue statistics

# Cleanup
rm -rf /tmp/jai-test
```

### Test SeoChecker

```bash
# Create test markdown file
cat > /tmp/test-article.md << 'EOF'
---
title: "Test Article Title for SEO"
description: "This is a test description that should be between 120 and 160 characters for optimal SEO performance."
---

# Test Article Title for SEO

## Introduction

This is a test article with some content.

## Section Two

More content here with enough words to pass the minimum word count check.

## Conclusion

Final thoughts and summary of the article content.
EOF

# Run SEO check
bun run ~/PAI/packs/jai-publishing-core/Tools/SeoChecker.ts /tmp/test-article.md
# Expected: Shows SEO score and checks

# Cleanup
rm /tmp/test-article.md
```

## All Tests Passed?

If all verification steps complete successfully:

1. Pack is correctly installed
2. Tools are executable
3. Data files can be created/modified
4. SEO analysis works

The pack is ready for use with `jai-publishing-skill` workflows.

## Troubleshooting

If any test fails, check:

1. **Bun installed?** `bun --version`
2. **Dependencies installed?** `cd ~/PAI/packs/jai-publishing-core && bun install`
3. **File permissions?** `ls -la ~/PAI/packs/jai-publishing-core/Tools/`
4. **TypeScript errors?** `bun run Tools/Calendar.ts --help 2>&1`
