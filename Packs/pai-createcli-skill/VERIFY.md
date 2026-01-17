# PAI CreateCLI Skill - Verification Checklist

Run each verification step to confirm the skill is properly installed.

---

## 1. File Structure Verification

### Check: Skill directory exists
```bash
ls -la ~/.claude/skills/CreateCLI/
```
**Expected:** Directory exists with SKILL.md and other files

| Status | Result |
|--------|--------|
| [ ] PASS | Directory exists with expected files |
| [ ] FAIL | Directory missing or empty |

---

### Check: All skill files present
```bash
# Main skill file
test -f ~/.claude/skills/CreateCLI/SKILL.md && echo "PASS: SKILL.md" || echo "FAIL: SKILL.md missing"

# Reference documentation
test -f ~/.claude/skills/CreateCLI/FrameworkComparison.md && echo "PASS: FrameworkComparison.md" || echo "FAIL: FrameworkComparison.md missing"
test -f ~/.claude/skills/CreateCLI/Patterns.md && echo "PASS: Patterns.md" || echo "FAIL: Patterns.md missing"
test -f ~/.claude/skills/CreateCLI/TypescriptPatterns.md && echo "PASS: TypescriptPatterns.md" || echo "FAIL: TypescriptPatterns.md missing"

# Workflows
test -f ~/.claude/skills/CreateCLI/Workflows/CreateCli.md && echo "PASS: CreateCli.md" || echo "FAIL: CreateCli.md missing"
test -f ~/.claude/skills/CreateCLI/Workflows/AddCommand.md && echo "PASS: AddCommand.md" || echo "FAIL: AddCommand.md missing"
test -f ~/.claude/skills/CreateCLI/Workflows/UpgradeTier.md && echo "PASS: UpgradeTier.md" || echo "FAIL: UpgradeTier.md missing"
```

**Expected:** All 7 files present

| Status | Result |
|--------|--------|
| [ ] PASS | All files exist |
| [ ] FAIL | One or more files missing |

---

## 2. Dependency Verification

### Check: Bun runtime installed
```bash
bun --version
```
**Expected:** Version number (e.g., 1.x.x)

| Status | Result |
|--------|--------|
| [ ] PASS | Bun version displayed |
| [ ] FAIL | Command not found |

---

### Check: CLI output directory exists
```bash
test -d ~/.claude/Bin && echo "PASS: Bin directory exists" || echo "FAIL: Bin directory missing"
```
**Expected:** Directory exists (or will be created on first CLI generation)

| Status | Result |
|--------|--------|
| [ ] PASS | Directory exists |
| [ ] FAIL | Directory missing (create with `mkdir -p ~/.claude/Bin`) |

---

## 3. Skill Content Verification

### Check: SKILL.md has required frontmatter
```bash
head -20 ~/.claude/skills/CreateCLI/SKILL.md
```
**Expected:** Should see YAML frontmatter with `name: CreateCLI` and `description`

| Status | Result |
|--------|--------|
| [ ] PASS | Frontmatter with name and description present |
| [ ] FAIL | Missing or malformed frontmatter |

---

### Check: Workflows have required frontmatter
```bash
head -5 ~/.claude/skills/CreateCLI/Workflows/CreateCli.md
```
**Expected:** Should see `workflow: create-cli` and `purpose:` fields

| Status | Result |
|--------|--------|
| [ ] PASS | Workflow frontmatter present |
| [ ] FAIL | Missing frontmatter |

---

## 4. Functional Verification

### Check: Skill can be read by AI agent
Ask your AI agent:
```
Read the CreateCLI skill at ~/.claude/skills/CreateCLI/SKILL.md
```
**Expected:** Agent reads and summarizes the skill

| Status | Result |
|--------|--------|
| [ ] PASS | Agent successfully reads skill |
| [ ] FAIL | Agent cannot access file |

---

### Check: Workflow can be read
Ask your AI agent:
```
Read the CreateCli workflow at ~/.claude/skills/CreateCLI/Workflows/CreateCli.md
```
**Expected:** Agent reads the 10-step CLI generation workflow

| Status | Result |
|--------|--------|
| [ ] PASS | Workflow content readable |
| [ ] FAIL | File inaccessible or corrupted |

---

## 5. Integration Test (Optional)

### Check: Generate a simple CLI
Ask your AI agent:
```
Create a simple CLI called "testcli" that takes a name argument and prints "Hello, {name}!"
```

**Expected:**
1. Agent uses CreateCLI skill
2. Creates `~/.claude/Bin/testcli/` directory
3. Generates testcli.ts, README.md, QUICKSTART.md, package.json, tsconfig.json
4. CLI is executable with `bun run ~/.claude/Bin/testcli/testcli.ts`

| Status | Result |
|--------|--------|
| [ ] PASS | CLI generated and functional |
| [ ] FAIL | Generation failed or CLI doesn't work |

---

### Check: Verify generated CLI works
```bash
cd ~/.claude/Bin/testcli
chmod +x testcli.ts
./testcli.ts --help
./testcli.ts World
```
**Expected:** Help text displays, "Hello, World!" output

| Status | Result |
|--------|--------|
| [ ] PASS | CLI executes correctly |
| [ ] FAIL | Errors during execution |

---

## Verification Summary

| Category | Checks | Status |
|----------|--------|--------|
| File Structure | 2 | [ ] All Pass |
| Dependencies | 2 | [ ] All Pass |
| Skill Content | 2 | [ ] All Pass |
| Functional | 2 | [ ] All Pass |
| Integration (Optional) | 2 | [ ] All Pass |

**Overall Status:**
- [ ] **PASS** - All required checks passed
- [ ] **PARTIAL** - Some checks failed (see above)
- [ ] **FAIL** - Critical checks failed

---

## Troubleshooting Failed Checks

### File Structure Failures
Re-copy files from the pack:
```bash
# From pack directory
cp -r src/skills/CreateCLI/* ~/.claude/skills/CreateCLI/
```

### Dependency Failures
Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc
```

### Content Failures
Verify files weren't corrupted during copy:
```bash
wc -l ~/.claude/skills/CreateCLI/*.md
# Compare line counts to source files
```

### Functional Failures
Check skill registry and agent configuration.
