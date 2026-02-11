# PAI Trading Skill — Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** — For user decisions and confirmations
2. **TaskCreate/TaskUpdate** — For progress tracking
3. **Bash/Read/Write** — For actual installation
4. **VERIFY.md** — For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing the Trading skill — your SMB Capital-style intraday trading
workflow with broker CSV ingestion, trade journaling, playbook management,
and daily/weekly review.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Checks

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check PAI core skill
if [ -f "$PAI_DIR/skills/CORE/SKILL.md" ]; then
  echo "OK: CORE skill installed"
else
  echo "MISSING: CORE skill — install pai-core-install first"
fi

# Check Bun runtime
which bun && bun --version

# Check tradekit CLI
uv run tradekit --help 2>/dev/null && echo "OK: tradekit CLI available" || echo "WARN: tradekit CLI not found"

# Check Trade_Review folder
TRADE_REVIEW="$HOME/OneDrive/Documents/Trade_Review"
if [ -d "$TRADE_REVIEW" ]; then
  echo "OK: Trade_Review folder found at $TRADE_REVIEW"
  ls "$TRADE_REVIEW" 2>/dev/null
else
  echo "INFO: Trade_Review folder not at default path"
fi

# Check for existing Trading skill
if [ -d "$PAI_DIR/skills/Trading" ]; then
  echo "EXISTING: Trading skill found — will need backup"
else
  echo "OK: Clean install (no existing Trading skill)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- PAI CORE: [installed / NOT INSTALLED — REQUIRED]
- Bun: [installed vX.X / NOT INSTALLED — REQUIRED]
- tradekit: [available / not found — optional but recommended]
- Trade_Review: [found at path / not at default path]
- Existing Trading skill: [Yes at path / No]"
```

**Blockers:** CORE skill and Bun are required. If missing, instruct the user to install them first.

---

## Phase 2: User Questions

### Question 1: Risk Profile

```json
{
  "questions": [{
    "question": "What is your account size?",
    "header": "Account",
    "options": [
      { "label": "$25,000", "description": "Default — PDT minimum" },
      { "label": "$50,000", "description": "Mid-size account" },
      { "label": "$100,000", "description": "Larger account" }
    ],
    "multiSelect": false
  }]
}
```

### Question 2: Max Daily Loss

```json
{
  "questions": [{
    "question": "What is your max daily loss tolerance?",
    "header": "Max Loss",
    "options": [
      { "label": "2% of account (Recommended)", "description": "Conservative — standard for developing traders" },
      { "label": "1% of account", "description": "Very conservative" },
      { "label": "3% of account", "description": "Moderate — for experienced traders" }
    ],
    "multiSelect": false
  }]
}
```

### Question 3: Trade_Review Path

If not found at default:
```json
{
  "questions": [{
    "question": "Where is your Trade_Review folder (broker CSV exports)?",
    "header": "CSV Path",
    "options": [
      { "label": "~/OneDrive/Documents/Trade_Review", "description": "Default OneDrive location" },
      { "label": "~/Documents/Trade_Review", "description": "Local Documents folder" }
    ],
    "multiSelect": false
  }]
}
```

### Question 4: Chart Preference

```json
{
  "questions": [{
    "question": "How do you want to review charts?",
    "header": "Charts",
    "options": [
      { "label": "Generate interactive charts (Recommended)", "description": "ChartGen creates HTML charts with TradingView lightweight-charts" },
      { "label": "Platform screenshots only", "description": "Link existing JPG screenshots from Trade_Review folder" }
    ],
    "multiSelect": false
  }]
}
```

---

## Phase 3: Backup (if needed)

If an existing Trading skill was found:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/skills/Trading.backup.$(date +%Y%m%d%H%M%S)"
cp -r "$PAI_DIR/skills/Trading" "$BACKUP_DIR"
echo "Backed up to: $BACKUP_DIR"
```

---

## Phase 4: Installation

### 4.1 Create Directories

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SKILL_DIR="$PAI_DIR/skills/Trading"

mkdir -p "$SKILL_DIR/Data/TradeLog"
mkdir -p "$SKILL_DIR/Data/TradeLog/charts"
mkdir -p "$SKILL_DIR/Tools"
mkdir -p "$SKILL_DIR/Templates"
mkdir -p "$SKILL_DIR/Workflows"
```

### 4.2 Copy Files

Copy all files from `src/skills/Trading/` to `$SKILL_DIR/`:

```
SKILL.md          → $SKILL_DIR/SKILL.md
Data/Playbooks.yaml   → $SKILL_DIR/Data/Playbooks.yaml
Data/RiskRules.yaml   → $SKILL_DIR/Data/RiskRules.yaml
Tools/TradeLogger.ts  → $SKILL_DIR/Tools/TradeLogger.ts
Tools/TradeDB.ts      → $SKILL_DIR/Tools/TradeDB.ts
Tools/ChartGen.ts     → $SKILL_DIR/Tools/ChartGen.ts
Templates/*.hbs       → $SKILL_DIR/Templates/
Workflows/*.md        → $SKILL_DIR/Workflows/
```

### 4.3 Install Dependencies

```bash
cd "$SKILL_DIR/Tools"
bun add yaml csv-parse handlebars
```

### 4.4 Initialize Database

The trading skill uses SQLite for persistent trade storage. The database is created automatically on first use, but you can verify it initializes correctly:

```bash
cd "$SKILL_DIR"
bun run Tools/TradeLogger.ts migrate
# If no YAML files exist yet, this will report "No YAML files found" — that's OK.
# The database file will be created at Data/trades.db on first ingest.
```

Database configuration is in `Data/RiskRules.yaml` under the `database:` section:
- `provider`: "sqlite" (default) or "postgres" (future)
- `sqlite_path`: path relative to skill dir (default: "Data/trades.db")
- `postgres_url`: connection string for future PostgreSQL migration

### 4.5 Personalize Risk Rules

Update `$SKILL_DIR/Data/RiskRules.yaml` with user answers from Phase 2:

- `account.size` — from Question 1
- `account.max_daily_loss` — calculated from account size × max loss %
- `account.max_daily_loss_pct` — from Question 2
- `account.max_risk_per_trade` — 0.5% of account
- `position.max_position_size` — 20% of account
- `config.trade_review_path` — from Question 3

---

## Phase 5: Verification

Run `VERIFY.md` checks to confirm installation:

1. All files exist in correct locations
2. `bun run TradeLogger.ts --help` shows usage
3. `bun run ChartGen.ts --help` shows usage
4. Dry-run ingest of existing Trade_Review data works
5. Skill index updated with Trading skill

### Update Skill Index

```bash
bun run "$PAI_DIR/Tools/GenerateSkillIndex.ts" 2>/dev/null || echo "Skill index not updated (GenerateSkillIndex.ts not found)"
```

### Completion Message

```
"Trading skill installed successfully!

Quick start:
  - 'morning prep' → Pre-market scan and game plan
  - 'ingest trades' → Import broker CSVs from Trade_Review
  - 'session review' → End-of-day review with SMB reflections
  - 'playbook' → View/add trading setups

Your risk rules are configured for a $XX,XXX account with $XXX max daily loss.
Trade_Review path: [path]

Happy trading!"
```
