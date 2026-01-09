# DevSecOps Agents Pack Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `Agents/` directory exists with 9 agent files
- [ ] `Rosters/` directory exists with 5 roster files
- [ ] `DomainMapping.yaml` exists
- [ ] `package.json` exists

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "Checking directories..."
ls -la "$PACK_DIR/"
echo ""
echo "Agents:"
ls "$PACK_DIR/Agents/"
echo ""
echo "Rosters:"
ls "$PACK_DIR/Rosters/"
```

### Expected Agent Files (9)

| File | Agent | Role |
|------|-------|------|
| `Daniel-SecurityEngineer.md` | Daniel | Security Engineer / CMMC Compliance |
| `Mary-BusinessAnalyst.md` | Mary | Business Analyst |
| `Clay-TechLead.md` | Clay | Scrum Master / Tech Lead |
| `Hefley-ProductManager.md` | Hefley | Test Architect / Product Manager |
| `Amy-QaLead.md` | Amy | QA Lead / Test Automation |
| `Geoff-NetworkSpecialist.md` | Geoff | Network Specialist |
| `Justin-Sre.md` | Justin | SRE |
| `Rekha-ProjectManager.md` | Rekha | Project Manager |
| `Roger-PlatformEngineer.md` | Roger | Platform Engineer |

### Expected Roster Files (5)

| File | Purpose |
|------|---------|
| `full-team.yaml` | All 9 agents for comprehensive review |
| `security-review.yaml` | Security-focused analysis (Daniel leads) |
| `architecture-review.yaml` | System design review |
| `planning-estimation.yaml` | Timeline and capacity planning |
| `quick-review.yaml` | Low-risk decisions, fast turnaround |

---

## YAML Syntax Validation

- [ ] `DomainMapping.yaml` is valid YAML
- [ ] All roster files are valid YAML

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== YAML Validation ==="
echo ""

# Check if yamllint is available
if command -v yamllint &> /dev/null; then
    echo "Using yamllint..."
    yamllint "$PACK_DIR/DomainMapping.yaml"
    yamllint "$PACK_DIR/Rosters/"*.yaml
else
    # Fallback: use python yaml module
    echo "yamllint not found, using Python yaml module..."
    python3 -c "
import yaml
import sys
import os

pack_dir = os.environ.get('PACK_DIR', '.')
files = [
    f'{pack_dir}/DomainMapping.yaml',
    f'{pack_dir}/Rosters/full-team.yaml',
    f'{pack_dir}/Rosters/security-review.yaml',
    f'{pack_dir}/Rosters/architecture-review.yaml',
    f'{pack_dir}/Rosters/planning-estimation.yaml',
    f'{pack_dir}/Rosters/quick-review.yaml'
]

errors = 0
for f in files:
    try:
        with open(f) as fh:
            yaml.safe_load(fh)
        print(f'✓ {os.path.basename(f)}')
    except Exception as e:
        print(f'✗ {os.path.basename(f)}: {e}')
        errors += 1

sys.exit(errors)
"
fi
```

---

## Agent File Completeness

- [ ] All agent files have valid YAML frontmatter
- [ ] All agents have required fields: `name`, `role`, `expertise`, `personality`
- [ ] Agents with veto power have `vetoCriteria` defined

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== Agent Frontmatter Validation ==="
echo ""

for agent in "$PACK_DIR/Agents/"*.md; do
    filename=$(basename "$agent")

    # Extract frontmatter (between --- markers)
    frontmatter=$(sed -n '/^---$/,/^---$/p' "$agent" | sed '1d;$d')

    # Check required fields
    if echo "$frontmatter" | grep -q "^name:"; then
        name_ok="✓"
    else
        name_ok="✗"
    fi

    if echo "$frontmatter" | grep -q "^role:"; then
        role_ok="✓"
    else
        role_ok="✗"
    fi

    if echo "$frontmatter" | grep -q "^expertise:"; then
        expertise_ok="✓"
    else
        expertise_ok="✗"
    fi

    if echo "$frontmatter" | grep -q "^personality:"; then
        personality_ok="✓"
    else
        personality_ok="✗"
    fi

    # Check veto power consistency
    has_veto=$(echo "$frontmatter" | grep "^vetoPower: true" || true)
    has_criteria=$(echo "$frontmatter" | grep "^vetoCriteria:" || true)

    if [ -n "$has_veto" ] && [ -z "$has_criteria" ]; then
        veto_ok="✗ (vetoPower=true but no vetoCriteria)"
    else
        veto_ok="✓"
    fi

    echo "$filename: name=$name_ok role=$role_ok expertise=$expertise_ok personality=$personality_ok veto=$veto_ok"
done
```

---

## Roster Agent References

- [ ] All roster files reference valid agent names
- [ ] Agent names in rosters match agent file names

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== Roster Agent Reference Check ==="
echo ""

# Get list of valid agent names from filenames
valid_agents=$(ls "$PACK_DIR/Agents/"*.md | xargs -n1 basename | sed 's/-.*\.md//')

for roster in "$PACK_DIR/Rosters/"*.yaml; do
    roster_name=$(basename "$roster")
    echo "Checking $roster_name..."

    # Extract agent names from roster
    agents_in_roster=$(grep -E "^\s*-\s+[A-Z][a-z]+" "$roster" | sed 's/.*-\s*//' | sed 's/#.*//' | tr -d ' ')

    all_valid=true
    for agent in $agents_in_roster; do
        if echo "$valid_agents" | grep -q "^$agent$"; then
            echo "  ✓ $agent"
        else
            echo "  ✗ $agent (not found in Agents/)"
            all_valid=false
        fi
    done
done
```

---

## Domain Mapping Validation

- [ ] DomainMapping.yaml has required sections: `version`, `domains`, `agents`, `selection`
- [ ] All agents referenced in domains exist in agents section

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== Domain Mapping Structure Check ==="
echo ""

python3 -c "
import yaml
import os

pack_dir = os.environ.get('PACK_DIR', '.')

with open(f'{pack_dir}/DomainMapping.yaml') as f:
    dm = yaml.safe_load(f)

# Check required sections
required = ['version', 'domains', 'agents', 'selection']
for section in required:
    if section in dm:
        print(f'✓ {section} section exists')
    else:
        print(f'✗ {section} section missing')

# Check domain count
print(f'')
print(f'Domains defined: {len(dm.get(\"domains\", {}))}')
print(f'Agents defined: {len(dm.get(\"agents\", {}))}')

# Validate agent references in domains
print(f'')
print('Checking agent references in domains...')
valid_agents = set(dm.get('agents', {}).keys())
errors = 0

for domain, config in dm.get('domains', {}).items():
    for agent in config.get('primary_agents', []) + config.get('secondary_agents', []):
        if agent not in valid_agents:
            print(f'  ✗ Domain \"{domain}\" references unknown agent: {agent}')
            errors += 1

if errors == 0:
    print('  ✓ All agent references valid')
"
```

---

## Veto Power Agents

The following agents have veto power and their criteria:

| Agent | Veto Criteria |
|-------|---------------|
| Daniel | CRITICAL vulnerabilities (CVSS >= 9.0) or CMMC blockers |
| Amy | Untestable designs or missing quality gates |

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== Veto Power Verification ==="
echo ""

for agent in "$PACK_DIR/Agents/"*.md; do
    filename=$(basename "$agent")
    frontmatter=$(sed -n '/^---$/,/^---$/p' "$agent" | sed '1d;$d')

    has_veto=$(echo "$frontmatter" | grep "^vetoPower: true" || true)
    if [ -n "$has_veto" ]; then
        name=$(echo "$frontmatter" | grep "^name:" | sed 's/name: //')
        criteria=$(echo "$frontmatter" | grep "^vetoCriteria:" | sed 's/vetoCriteria: //')
        echo "✓ $name has veto power"
        echo "  Criteria: $criteria"
    fi
done
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | ☐ |
| Agent files (9) | ☐ |
| Roster files (5) | ☐ |
| DomainMapping.yaml | ☐ |
| YAML syntax valid | ☐ |
| Agent frontmatter complete | ☐ |
| Roster references valid | ☐ |
| Domain mapping structure | ☐ |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== DevSecOps Agents Pack Verification ==="
echo ""

# 1. File count checks
echo "1. Checking file counts..."
agent_count=$(ls "$PACK_DIR/Agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
roster_count=$(ls "$PACK_DIR/Rosters/"*.yaml 2>/dev/null | wc -l | tr -d ' ')

if [ "$agent_count" -eq 9 ]; then
    echo "   ✓ Agents: $agent_count/9"
else
    echo "   ✗ Agents: $agent_count/9"
fi

if [ "$roster_count" -eq 5 ]; then
    echo "   ✓ Rosters: $roster_count/5"
else
    echo "   ✗ Rosters: $roster_count/5"
fi

if [ -f "$PACK_DIR/DomainMapping.yaml" ]; then
    echo "   ✓ DomainMapping.yaml exists"
else
    echo "   ✗ DomainMapping.yaml missing"
fi
echo ""

# 2. YAML validation
echo "2. Validating YAML syntax..."
python3 -c "
import yaml
import os
import glob

pack_dir = os.environ.get('PACK_DIR', '.')
errors = 0

# Check DomainMapping
try:
    with open(f'{pack_dir}/DomainMapping.yaml') as f:
        yaml.safe_load(f)
    print('   ✓ DomainMapping.yaml')
except Exception as e:
    print(f'   ✗ DomainMapping.yaml: {e}')
    errors += 1

# Check rosters
for roster in glob.glob(f'{pack_dir}/Rosters/*.yaml'):
    try:
        with open(roster) as f:
            yaml.safe_load(f)
        print(f'   ✓ {os.path.basename(roster)}')
    except Exception as e:
        print(f'   ✗ {os.path.basename(roster)}: {e}')
        errors += 1

exit(errors)
" && echo "" || echo "   Some YAML files have errors"
echo ""

# 3. Agent frontmatter
echo "3. Checking agent frontmatter..."
errors=0
for agent in "$PACK_DIR/Agents/"*.md; do
    filename=$(basename "$agent")
    frontmatter=$(sed -n '/^---$/,/^---$/p' "$agent" | sed '1d;$d')

    missing=""
    echo "$frontmatter" | grep -q "^name:" || missing="$missing name"
    echo "$frontmatter" | grep -q "^role:" || missing="$missing role"
    echo "$frontmatter" | grep -q "^expertise:" || missing="$missing expertise"
    echo "$frontmatter" | grep -q "^personality:" || missing="$missing personality"

    if [ -z "$missing" ]; then
        echo "   ✓ $filename"
    else
        echo "   ✗ $filename (missing:$missing)"
        errors=$((errors + 1))
    fi
done
echo ""

# 4. Summary
echo "=== Verification Complete ==="
echo ""
echo "Expected structure:"
echo "  mai-devsecops-agents/"
echo "  ├── Agents/ (9 .md files)"
echo "  ├── Rosters/ (5 .yaml files)"
echo "  ├── DomainMapping.yaml"
echo "  ├── package.json"
echo "  ├── README.md"
echo "  └── INSTALL.md"
```

---

## Post-Installation Test

After copying to Council Framework location, verify integration:

```bash
# Set your PAI directory
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
COUNCIL_DIR="$PAI_DIR/skills/Council"

echo "=== Post-Installation Check ==="
echo ""

# Check agents are in place
echo "1. Agent files in Council..."
if [ -d "$COUNCIL_DIR/agents" ]; then
    agent_count=$(ls "$COUNCIL_DIR/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
    echo "   Found $agent_count agent files"
else
    echo "   ✗ $COUNCIL_DIR/agents not found"
fi

# Check rosters
echo ""
echo "2. Roster files in Council..."
if [ -d "$COUNCIL_DIR/rosters" ]; then
    roster_count=$(ls "$COUNCIL_DIR/rosters/"*.yaml 2>/dev/null | wc -l | tr -d ' ')
    echo "   Found $roster_count roster files"
else
    echo "   ✗ $COUNCIL_DIR/rosters not found"
fi

# Check domain mapping
echo ""
echo "3. Domain mapping..."
if [ -f "$COUNCIL_DIR/config/DomainMapping.yaml" ]; then
    echo "   ✓ DomainMapping.yaml in place"
else
    echo "   ✗ DomainMapping.yaml not found in $COUNCIL_DIR/config/"
fi
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-08
