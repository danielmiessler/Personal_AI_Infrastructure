# Verification Checklist - pai-multi-llm

## Mandatory Completion Checklist

### File Structure

- [ ] `$PAI_DIR/skills/MultiLLM/SKILL.md` exists
- [ ] `$PAI_DIR/skills/MultiLLM/Tools/DetectProviders.ts` exists
- [ ] `$PAI_DIR/skills/MultiLLM/Tools/SessionManager.ts` exists
- [ ] `$PAI_DIR/skills/MultiLLM/Tools/Query.ts` exists
- [ ] `$PAI_DIR/skills/MultiLLM/Tools/GenerateTeam.ts` exists
- [ ] `$PAI_DIR/config/team.yaml` OR `team.example.yaml` exists

### Dependency Verification

- [ ] `$PAI_DIR/skills/CORE/SKILL.md` exists (pai-core required)
- [ ] Bun >= 1.0.0 installed

### Functional Tests

#### Test 1: Detection

```bash
cd Packs/pai-multi-llm
bun run detect --json
```

**Expected:** JSON output with providers array

#### Test 2: Team Configuration

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cat "$PAI_DIR/config/team.yaml"
```

**Expected:** Valid YAML with providers list

#### Test 3: Query (if providers available)

```bash
bun run query -p "Say hello" --provider claude
```

**Expected:** Response from Claude

#### Test 4: Session Tracking

```bash
bun run SessionManager.ts --list
```

**Expected:** List of sessions (or "No active sessions")

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== pai-multi-llm Verification ==="
echo ""

PASS=0
FAIL=0

check() {
  if [ "$1" = "0" ]; then
    echo "[PASS] $2"
    ((PASS++))
  else
    echo "[FAIL] $2"
    ((FAIL++))
  fi
}

# Core dependency
[ -f "$PAI_DIR/skills/CORE/SKILL.md" ]
check $? "pai-core-install dependency"

# Skill files
[ -f "$PAI_DIR/skills/MultiLLM/SKILL.md" ]
check $? "SKILL.md exists"

[ -f "$PAI_DIR/skills/MultiLLM/Tools/DetectProviders.ts" ]
check $? "DetectProviders.ts exists"

[ -f "$PAI_DIR/skills/MultiLLM/Tools/SessionManager.ts" ]
check $? "SessionManager.ts exists"

[ -f "$PAI_DIR/skills/MultiLLM/Tools/Query.ts" ]
check $? "Query.ts exists"

# Config
[ -f "$PAI_DIR/config/team.yaml" ] || [ -f "$PAI_DIR/config/team.example.yaml" ]
check $? "Team config exists"

# Bun check
command -v bun &> /dev/null
check $? "Bun installed"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "pai-multi-llm installed successfully!"
  echo ""
  echo "Quick start:"
  echo "  bun run detect           # See available providers"
  echo "  bun run query --list     # List configured providers"
  echo "  bun run query -p 'test'  # Query default provider"
  exit 0
else
  echo ""
  echo "Some checks failed. Review the output above."
  exit 1
fi
```

---

## Provider-Specific Verification

### Claude CLI

```bash
claude --version
claude -p "Hello" --output-format json | head -5
```

### Codex CLI

```bash
codex --version
ls ~/.codex/sessions/ 2>/dev/null || echo "No sessions yet"
```

### Gemini CLI

```bash
gemini --version
gemini --help | grep resume
```

### Ollama

```bash
ollama --version
ollama list
```

### OpenCode

```bash
opencode --version
```
