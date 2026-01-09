# mai-standup-skill Installation

User-facing skill for running multi-agent standups and council sessions using the Council Framework.

## Prerequisites

- Personal AI Infrastructure (PAI) system installed
- [Bun](https://bun.sh/) runtime (v1.0+)
- **mai-council-framework** (>= 1.0.0) - Core orchestration engine
- **mai-devsecops-agents** (>= 1.0.0) - Agent pack with specialist personas

---

## Step 1: Install Dependencies

This skill requires the Council Framework and an agent pack. Install them first:

### Install mai-council-framework

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

cd ~/PAI/Packs/mai-council-framework
bun install
```

### Install mai-devsecops-agents

```bash
cd ~/PAI/Packs/mai-devsecops-agents
# Agent packs typically don't need bun install (markdown-based)
```

---

## Step 2: Install the Standup Skill

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

cd ~/PAI/Packs/mai-standup-skill
bun install
```

Or copy to PAI skills directory:

```bash
cp -r mai-standup-skill "$PAI_DIR/skills/Standup"
cd "$PAI_DIR/skills/Standup"
bun install
```

---

## Step 3: Configure the Skill

Review and customize `Config/standup.yaml`:

```yaml
defaults:
  visibility: full      # full | progress | summary
  adapters:
    - console           # Always enabled
  agentPack: mai-devsecops-agents

outputDestinations:
  joplin:
    enabled: false      # Enable if using mai-joplin-skill
    notebookName: Standups
  file:
    enabled: false
    path: ~/workshop/standups
```

### Visibility Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `full` | Complete transcript with all agent statements | Deep analysis, learning |
| `progress` | Round summaries and key events | Normal standups |
| `summary` | Final synthesis only | Quick status updates |

---

## Step 4: Verify Installation

Reference the full verification checklist in [VERIFY.md](VERIFY.md) or run the quick verification:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$PAI_DIR/skills/Standup"

# Alternative: Check in Packs directory
# PACK_DIR="$HOME/PAI/Packs/mai-standup-skill"

echo "=== Standup Skill Verification ==="

echo "1. Directory Structure..."
[ -d "$PACK_DIR" ] && echo "Pack directory OK" || echo "MISSING"
[ -f "$PACK_DIR/SKILL.md" ] && echo "SKILL.md OK" || echo "MISSING"
[ -f "$PACK_DIR/Config/standup.yaml" ] && echo "Config OK" || echo "MISSING"

echo "2. Workflows..."
[ -f "$PACK_DIR/Workflows/RunStandup.md" ] && echo "RunStandup.md OK" || echo "MISSING"
[ -f "$PACK_DIR/Workflows/QuickReview.md" ] && echo "QuickReview.md OK" || echo "MISSING"
[ -f "$PACK_DIR/Workflows/SecurityReview.md" ] && echo "SecurityReview.md OK" || echo "MISSING"

echo "3. Dependencies..."
[ -d "$HOME/PAI/Packs/mai-council-framework" ] && echo "council-framework OK" || echo "MISSING"
[ -d "$HOME/PAI/Packs/mai-devsecops-agents" ] && echo "devsecops-agents OK" || echo "MISSING"

echo "4. Configuration..."
grep -q "visibility:" "$PACK_DIR/Config/standup.yaml" 2>/dev/null && echo "visibility OK" || echo "MISSING"
grep -q "rosterPresets:" "$PACK_DIR/Config/standup.yaml" 2>/dev/null && echo "rosterPresets OK" || echo "MISSING"

echo "=== Verification Complete ==="
```

---

## Step 5: Test the Skill

Test the skill triggers by running standups:

### Basic Standup
```
standup about authentication design
```
Expected: Auto-selects roster, runs 3 rounds, presents synthesis.

### Quick Review
```
quick review this caching approach
```
Expected: Uses Clay + Hefley, single round, streamlined output.

### Security Review
```
security review the API authentication flow
```
Expected: Uses security roster with Daniel as lead, includes compliance check.

---

## Troubleshooting

### "Agent pack not found"

**Symptom:** Error stating agent pack cannot be loaded.

**Solution:**
```bash
# Verify agent pack exists
ls ~/PAI/Packs/mai-devsecops-agents/

# If missing, install it
cd ~/PAI/Packs
git clone <repo> mai-devsecops-agents
```

### "Council framework not available"

**Symptom:** Standup fails to start, orchestrator not found.

**Solution:**
```bash
cd ~/PAI/Packs/mai-council-framework
bun install

# Verify installation
bun test
```

### "Joplin adapter failed"

**Symptom:** Standup runs but fails to save to Joplin.

**Solution:**
1. Check that Joplin is running
2. Enable the Web Clipper service in Joplin preferences
3. Verify API token in your Joplin skill configuration
4. If not using Joplin, set `joplin.enabled: false` in standup.yaml

### Visibility mode not changing

**Symptom:** Output always shows full transcript despite configuration.

**Solution:**
1. Check Config/standup.yaml syntax is valid YAML
2. Ensure the visibility key is at the correct indentation level
3. Try specifying visibility inline: `standup about X with summary visibility`

### Standup seems stuck

**Symptom:** Standup runs but no output appears.

**Solution:**
1. Enable debug mode in Config/standup.yaml:
   ```yaml
   debug:
     enabled: true
     logLevel: verbose
   ```
2. Check for conflicts between agents that might cause deadlock
3. The council framework will escalate to user after timeout

---

## File Locations

After successful installation:

```
$PAI_DIR/
├── skills/
│   └── Standup/
│       ├── SKILL.md              # Skill definition and triggers
│       ├── README.md             # Documentation
│       ├── METHODOLOGY.md        # Multi-agent standup philosophy
│       ├── VERIFY.md             # Verification checklist
│       ├── INSTALL.md            # This file
│       ├── package.json          # Package configuration
│       ├── Config/
│       │   └── standup.yaml      # Default configuration
│       └── Workflows/
│           ├── RunStandup.md     # Main standup workflow
│           ├── QuickReview.md    # Lightweight 2-agent review
│           └── SecurityReview.md # Security-focused standup
└── Packs/
    ├── mai-council-framework/    # Required dependency
    └── mai-devsecops-agents/     # Required dependency
```

Where `PAI_DIR` defaults to `$HOME/.config/pai` if not set.

---

## Quick Reference

### Trigger Patterns

| Pattern | Workflow | Description |
|---------|----------|-------------|
| `standup` | RunStandup | Interactive topic prompt |
| `standup about {topic}` | RunStandup | Full multi-agent standup |
| `standup on {topic}` | RunStandup | Full multi-agent standup |
| `council on {topic}` | RunStandup | Full multi-agent standup |
| `team review {topic}` | RunStandup | Full multi-agent standup |
| `quick review {topic}` | QuickReview | Lightweight 2-agent review |
| `fast review {topic}` | QuickReview | Lightweight 2-agent review |
| `security review {topic}` | SecurityReview | Security-focused with veto power |
| `sec review {topic}` | SecurityReview | Security-focused with veto power |

### Roster Presets

| Preset | Agents | Use Case |
|--------|--------|----------|
| `full-team` | All 9 | Comprehensive review |
| `security-review` | Daniel, Clay, Amy, Geoff | Security analysis |
| `architecture-review` | Clay, Daniel, Amy, Roger | System design |
| `planning-estimation` | Clay, Hefley, Amy, Rekha | Sprint planning |
| `quick-review` | Clay, Hefley | Fast decisions |

### Options

```
# Specify agents
standup about deployment with Roger, Justin, and Daniel

# Use a preset roster
standup about security using security-review roster

# Control visibility
standup about database schema with summary visibility

# Save to Joplin
council on API design, save to Joplin
```
