# Installation - JAI Publishing Core

## Prerequisites

- Bun runtime installed
- Access to site directories (e.g., `~/sites/pispycameras.com/`)

## Installation Steps

### 1. Install to PAI

Copy or link to your PAI installation:

```bash
# Option A: Copy to PAI packs
cp -r ~/src/pai/Personal_AI_Infrastructure/Packs/jai-publishing-core ~/PAI/packs/

# Option B: Symlink (for development)
ln -s ~/src/pai/Personal_AI_Infrastructure/Packs/jai-publishing-core ~/PAI/packs/jai-publishing-core
```

### 2. Install Dependencies

```bash
cd ~/PAI/packs/jai-publishing-core
bun install
```

### 3. Initialize Site Data (per site)

For each affiliate site, initialize the data files:

```bash
# Navigate to site directory
cd ~/sites/pispycameras.com

# Initialize content calendar
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts init --site=pispy

# Verify files created
ls -la keywords.json content-calendar.json
```

### 4. Add to PATH (Optional)

For convenience, create aliases:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias pub-calendar="bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts"
alias pub-keywords="bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts"
alias pub-seo="bun run ~/PAI/packs/jai-publishing-core/Tools/SeoChecker.ts"
```

## Configuration

### Site Directory Structure

Each site should have this structure:

```
~/sites/your-site.com/
├── keywords.json          # Created by KeywordQueue.ts init
├── content-calendar.json  # Created by Calendar.ts init
└── src/
    └── pages/
        └── articles/      # Where generated articles go
```

### Multiple Sites

Run tools from each site's directory, or specify path:

```bash
# From site directory
cd ~/sites/pispycameras.com
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list

# Or specify path
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list --path=~/sites/pispycameras.com
```

## Troubleshooting

### "Cannot find module" errors

Ensure bun dependencies are installed:
```bash
cd ~/PAI/packs/jai-publishing-core && bun install
```

### Permission denied

Check file permissions on data files:
```bash
chmod 644 keywords.json content-calendar.json
```

### Data file corruption

Validate against schemas:
```bash
# Use any JSON schema validator
npx ajv validate -s schemas/keywords.schema.json -d keywords.json
```
