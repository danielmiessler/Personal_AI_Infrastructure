# Installation Guide

Complete installation instructions for the kai-devsecops-agents pack.

## Prerequisites

### Required

- **kai-council-framework** >= 1.0.0
  - The Council Framework must be installed and configured
  - Verify with: `ls $PAI_DIR/skills/Council/`

### Recommended

- **PAI Core** environment configured
  - `$PAI_DIR` environment variable set
  - Standard PAI directory structure in place

## Installation Methods

### Method 1: Copy Files (Recommended for Production)

Copy the agent pack files to your PAI skills directory:

```bash
# Navigate to pack location
cd /path/to/kai-devsecops-agents

# Copy agents to Council directory
cp -r Agents/* $PAI_DIR/skills/Council/agents/

# Copy rosters
cp -r Rosters/* $PAI_DIR/skills/Council/rosters/

# Copy domain mapping
cp DomainMapping.yaml $PAI_DIR/skills/Council/config/
```

### Method 2: Symlink (Recommended for Development)

Symlink for easy updates during development:

```bash
# Link agents directory
ln -s $(pwd)/Agents $PAI_DIR/skills/Council/agents/devsecops

# Link rosters
ln -s $(pwd)/Rosters $PAI_DIR/skills/Council/rosters/devsecops

# Link domain mapping
ln -s $(pwd)/DomainMapping.yaml $PAI_DIR/skills/Council/config/devsecops-domains.yaml
```

### Method 3: Git Submodule

Add as a git submodule in your PAI repository:

```bash
cd $PAI_DIR
git submodule add <repo-url> packs/kai-devsecops-agents
ln -s packs/kai-devsecops-agents/Agents skills/Council/agents/devsecops
```

## Directory Structure After Installation

Your Council skill directory should look like this:

```
$PAI_DIR/skills/Council/
├── agents/
│   ├── Daniel-SecurityEngineer.md
│   ├── Mary-BusinessAnalyst.md
│   ├── Clay-TechLead.md
│   ├── Hefley-ProductManager.md
│   ├── Amy-QaLead.md
│   ├── Geoff-NetworkSpecialist.md
│   ├── Justin-Sre.md
│   ├── Rekha-ProjectManager.md
│   └── Roger-PlatformEngineer.md
├── rosters/
│   ├── full-team.yaml
│   ├── security-review.yaml
│   ├── architecture-review.yaml
│   ├── planning-estimation.yaml
│   └── quick-review.yaml
└── config/
    └── DomainMapping.yaml
```

## Verification

### Step 1: Verify Agent Files

```bash
# List all agents
ls -la $PAI_DIR/skills/Council/agents/*.md

# Expected output: 9 agent files
# Daniel-SecurityEngineer.md
# Mary-BusinessAnalyst.md
# Clay-TechLead.md
# Hefley-ProductManager.md
# Amy-QaLead.md
# Geoff-NetworkSpecialist.md
# Justin-Sre.md
# Rekha-ProjectManager.md
# Roger-PlatformEngineer.md
```

### Step 2: Verify Rosters

```bash
# List all rosters
ls -la $PAI_DIR/skills/Council/rosters/*.yaml

# Expected output: 5 roster files
# full-team.yaml
# security-review.yaml
# architecture-review.yaml
# planning-estimation.yaml
# quick-review.yaml
```

### Step 3: Verify Domain Mapping

```bash
# Check domain mapping exists
cat $PAI_DIR/skills/Council/config/DomainMapping.yaml | head -20

# Should show version and domain definitions
```

### Step 4: Test Council Framework Integration

```bash
# If Council Framework has a test command
council test-agents

# Or manually verify an agent loads
council describe-agent Daniel
```

## Configuration

### Environment Variables

Ensure these are set in your shell profile:

```bash
export PAI_DIR="$HOME/PAI"  # Or your PAI installation path
```

### Council Framework Configuration

The Council Framework may need configuration to recognize the new agents. Check your Council Framework documentation for:

1. Agent discovery settings
2. Roster loading configuration
3. Domain mapping integration

## Troubleshooting

### Agents Not Found

**Symptom**: Council Framework doesn't recognize agents

**Solution**:
1. Verify file permissions: `chmod 644 $PAI_DIR/skills/Council/agents/*.md`
2. Check file encoding is UTF-8
3. Verify YAML frontmatter is valid in each agent file

### Roster Loading Fails

**Symptom**: Roster files not loading

**Solution**:
1. Validate YAML syntax: `yamllint rosters/*.yaml`
2. Ensure agent names in rosters match agent file names
3. Check for typos in agent names

### Domain Mapping Not Working

**Symptom**: Agent selection ignores keywords

**Solution**:
1. Verify DomainMapping.yaml is in the correct location
2. Check Council Framework config points to the mapping file
3. Validate YAML syntax

### Permission Errors

**Symptom**: Cannot read agent files

**Solution**:
```bash
# Fix permissions
chmod -R 644 $PAI_DIR/skills/Council/agents/
chmod -R 644 $PAI_DIR/skills/Council/rosters/
```

## Upgrading

### From Previous Versions

1. Backup existing agents: `cp -r $PAI_DIR/skills/Council/agents agents.backup`
2. Remove old files: `rm $PAI_DIR/skills/Council/agents/*.md`
3. Install new version following steps above
4. Migrate any custom modifications from backup

### Preserving Customizations

If you've customized agents:
1. Document your changes
2. Use git diff to track modifications
3. Re-apply customizations after upgrade

## Uninstallation

To remove the agent pack:

```bash
# Remove agent files
rm $PAI_DIR/skills/Council/agents/Daniel-SecurityEngineer.md
rm $PAI_DIR/skills/Council/agents/Mary-BusinessAnalyst.md
rm $PAI_DIR/skills/Council/agents/Clay-TechLead.md
rm $PAI_DIR/skills/Council/agents/Hefley-ProductManager.md
rm $PAI_DIR/skills/Council/agents/Amy-QaLead.md
rm $PAI_DIR/skills/Council/agents/Geoff-NetworkSpecialist.md
rm $PAI_DIR/skills/Council/agents/Justin-Sre.md
rm $PAI_DIR/skills/Council/agents/Rekha-ProjectManager.md
rm $PAI_DIR/skills/Council/agents/Roger-PlatformEngineer.md

# Remove rosters
rm $PAI_DIR/skills/Council/rosters/full-team.yaml
rm $PAI_DIR/skills/Council/rosters/security-review.yaml
rm $PAI_DIR/skills/Council/rosters/architecture-review.yaml
rm $PAI_DIR/skills/Council/rosters/planning-estimation.yaml
rm $PAI_DIR/skills/Council/rosters/quick-review.yaml

# Remove domain mapping
rm $PAI_DIR/skills/Council/config/DomainMapping.yaml
```

## Support

For issues with this pack:
1. Check the troubleshooting section above
2. Review the Council Framework documentation
3. Open an issue in the PAI repository

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-06
