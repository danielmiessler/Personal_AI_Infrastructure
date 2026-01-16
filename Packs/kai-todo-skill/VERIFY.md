# Kai Todo Skill - Verification Checklist

This checklist MUST be completed before marking installation as done. It validates that all components are properly installed and functional.

---

## ✅ File Verification

Verify all essential files are present:

```bash
SKILL_DIR=~/.claude/skills/KaiTodo
TASK_FILE=~/Documents/personal/Kai-Todo.md

# Core files
[ -f "$SKILL_DIR/SKILL.md" ] && echo "✅ SKILL.md" || echo "❌ SKILL.md missing"
[ -f "$SKILL_DIR/background-processor.ts" ] && echo "✅ background-processor.ts" || echo "❌ background-processor.ts missing"

# Task storage
[ -f "$TASK_FILE" ] && echo "✅ Kai-Todo.md exists" || echo "❌ Kai-Todo.md missing"
[ -w "$TASK_FILE" ] && echo "✅ Kai-Todo.md is writable" || echo "❌ Kai-Todo.md not writable"

# Directory structure
[ -d "$SKILL_DIR" ] && echo "✅ Skill directory exists" || echo "❌ Skill directory missing"
[ -d "$(dirname "$TASK_FILE")" ] && echo "✅ Vault directory exists" || echo "❌ Vault directory missing"
```

---

## 📋 Task File Format Verification

Verify the task file has proper structure:

```bash
TASK_FILE=~/Documents/personal/Kai-Todo.md

# Check for required sections
grep -q "^## Queued" "$TASK_FILE" && echo "✅ Queued section present" || echo "❌ Queued section missing"
grep -q "^## In Progress" "$TASK_FILE" && echo "✅ In Progress section present" || echo "❌ In Progress section missing"
grep -q "^## Completed" "$TASK_FILE" && echo "✅ Completed section present" || echo "❌ Completed section missing"

# Verify file is readable
cat "$TASK_FILE" > /dev/null 2>&1 && echo "✅ File is readable" || echo "❌ File read error"

# Check file size (should be > 0 bytes)
FILE_SIZE=$(wc -c < "$TASK_FILE")
[ "$FILE_SIZE" -gt 0 ] && echo "✅ File has content ($FILE_SIZE bytes)" || echo "❌ File is empty"
```

---

## 🔧 Skill Detection Testing

Verify Claude Code recognizes the skill:

```bash
# Check skill SKILL.md metadata
head -20 ~/.claude/skills/KaiTodo/SKILL.md

# Expected: Should show YAML frontmatter with:
# - name: kai-todo
# - description: Task queue manager
# - invocation: User patterns
```

**Manual Test**:
1. Start a new Claude Code session
2. Type: "What skills do you have available?"
3. Verify "kai-todo" or "KaiTodo" appears in the response

**Pass Criteria**: Claude recognizes the skill and can describe its purpose

---

## 🚀 Functional Validation

Test actual functionality:

### Test 1: Add Task

**Test Command**:
```
Tell Claude: "add test verification task to kai todo"
```

**Expected Behavior**:
- Claude adds task to Kai-Todo.md
- Task gets ID (KT-001 or next available)
- Task appears in Queued section
- Response confirms addition

**Verify**:
```bash
# Check task was added
grep -A 5 "verification task" ~/Documents/personal/Kai-Todo.md

# Verify task format
grep "### \[KT-" ~/Documents/personal/Kai-Todo.md | tail -1
# Expected output: ### [KT-XXX] Test verification task
```

**Pass Criteria**: Task added successfully with proper format

---

### Test 2: List Tasks

**Test Command**:
```
Tell Claude: "/kai-todo list"
```

**Expected Behavior**:
- Claude reads Kai-Todo.md
- Returns formatted list of queued tasks
- Shows priorities if present
- Shows count of tasks

**Verify**:
```bash
# Confirm file has tasks
grep -c "### \[KT-" ~/Documents/personal/Kai-Todo.md
# Expected: Should show count > 0
```

**Pass Criteria**: Claude lists all tasks with proper formatting

---

### Test 3: Priority Detection

**Test Command**:
```
Tell Claude: "add urgent fix security vulnerability to kai todo"
```

**Expected Behavior**:
- Task added with high priority
- Task includes "Priority: high" in metadata

**Verify**:
```bash
# Check for high priority flag
grep -A 5 "security vulnerability" ~/Documents/personal/Kai-Todo.md | grep -i "priority: high"
# Expected: Should find matching line
```

**Pass Criteria**: Priority correctly inferred from "urgent" keyword

---

### Test 4: Next Task Processing

**Test Command** (only if you have queued tasks):
```
Tell Claude: "/kai-todo next"
```

**Expected Behavior**:
- Highest priority task moved to "In Progress"
- Claude begins working on the task
- Task no longer in Queued section

**Verify**:
```bash
# Check In Progress section has task
grep -A 10 "^## In Progress" ~/Documents/personal/Kai-Todo.md | grep "### \[KT-"
# Expected: Should show one task
```

**Pass Criteria**: Task successfully moved and work begins

---

### Test 5: Complete Task

**Test Command** (requires task in progress or queued):
```
Tell Claude: "/kai-todo done KT-001"
# (Replace KT-001 with actual task ID from Test 1)
```

**Expected Behavior**:
- Task moved to Completed section
- Completion date added
- Confirmation message shown

**Verify**:
```bash
# Check Completed section
grep -A 10 "^## Completed" ~/Documents/personal/Kai-Todo.md | grep "KT-001"
# Expected: Should find the completed task

# Verify completion date added
grep -A 5 "KT-001" ~/Documents/personal/Kai-Todo.md | grep -i "completed"
```

**Pass Criteria**: Task moved to Completed with date

---

### Test 6: Remove Task

**Test Command**:
```
Tell Claude: "add temporary test task to kai todo"
# Then: "/kai-todo remove KT-XXX" (use the ID given)
```

**Expected Behavior**:
- Task completely removed from file
- Not in any section (Queued, In Progress, or Completed)
- Confirmation of removal

**Verify**:
```bash
# Search for removed task ID
grep "KT-XXX" ~/Documents/personal/Kai-Todo.md
# Expected: No results (task fully removed)
```

**Pass Criteria**: Task removed entirely, no trace in file

---

### Test 7: Background Processor (Optional)

**Only test if Bun is installed and processor is enabled.**

**Test Command**:
```bash
# Start processor in foreground
cd ~/.claude/skills/KaiTodo
bun run background-processor.ts &
BG_PID=$!

# Wait a few seconds
sleep 5

# Check it's running
ps aux | grep background-processor | grep -v grep

# Stop it
kill $BG_PID
```

**Expected Behavior**:
- Processor starts without errors
- Creates processor.log file
- Runs in background
- Can be stopped cleanly

**Verify**:
```bash
# Check log file was created
[ -f ~/.claude/skills/KaiTodo/processor.log ] && echo "✅ Processor log created" || echo "❌ No log file"

# Check log has content
tail -5 ~/.claude/skills/KaiTodo/processor.log
# Expected: Should show startup messages and check cycles
```

**Pass Criteria**: Processor runs and logs activity

---

## 🤖 Automated Verification Script

Run all checks automatically:

```bash
#!/bin/bash

SKILL_DIR=~/.claude/skills/KaiTodo
TASK_FILE=~/Documents/personal/Kai-Todo.md
PASS=0
FAIL=0

echo "======================================"
echo "Kai Todo Skill - Automated Verification"
echo "======================================"
echo ""

# File checks
echo "📁 File Verification:"
FILES=(
  "$SKILL_DIR/SKILL.md"
  "$SKILL_DIR/background-processor.ts"
  "$TASK_FILE"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
    ((PASS++))
  else
    echo "  ❌ $file"
    ((FAIL++))
  fi
done

echo ""
echo "📋 Task File Structure:"

# Section checks
SECTIONS=("## Queued" "## In Progress" "## Completed")
for section in "${SECTIONS[@]}"; do
  if grep -q "^$section" "$TASK_FILE" 2>/dev/null; then
    echo "  ✅ $section section present"
    ((PASS++))
  else
    echo "  ❌ $section section missing"
    ((FAIL++))
  fi
done

echo ""
echo "🔧 Permissions:"

# Writability check
if [ -w "$TASK_FILE" ]; then
  echo "  ✅ Task file is writable"
  ((PASS++))
else
  echo "  ❌ Task file is not writable"
  ((FAIL++))
fi

# Directory check
if [ -d "$SKILL_DIR" ]; then
  echo "  ✅ Skill directory exists"
  ((PASS++))
else
  echo "  ❌ Skill directory missing"
  ((FAIL++))
fi

echo ""
echo "🤖 Optional Components:"

# Bun check (for background processor)
if command -v bun &> /dev/null; then
  echo "  ✅ Bun runtime available (background processor enabled)"
  ((PASS++))
else
  echo "  ⚪ Bun not found (background processor disabled - not critical)"
fi

echo ""
echo "======================================"
echo "Results: $PASS passed, $FAIL failed"
echo "======================================"

if [ $FAIL -eq 0 ]; then
  echo "✅ All critical verification checks passed!"
  echo ""
  echo "📝 Next Steps:"
  echo "   1. Start a new Claude Code session"
  echo "   2. Test: 'add sample task to kai todo'"
  echo "   3. Test: '/kai-todo list'"
  echo "   4. Test: '/kai-todo next' (if you have tasks)"
  exit 0
else
  echo "❌ Some verification checks failed. See details above."
  echo ""
  echo "🔧 Troubleshooting:"
  echo "   - Check INSTALL.md for proper installation steps"
  echo "   - Verify file permissions: ls -la $SKILL_DIR"
  echo "   - Ensure vault directory exists: ls -la ~/Documents/personal/"
  exit 1
fi
```

**To run:** Save as `verify.sh`, make executable with `chmod +x verify.sh`, then run `./verify.sh`

---

## 📊 Expected Results Summary

| Check | Expected Result |
|-------|----------------|
| SKILL.md exists | File present in ~/.claude/skills/KaiTodo/ |
| background-processor.ts exists | File present in skill directory |
| Kai-Todo.md exists | File present at ~/Documents/personal/ |
| Task file writable | User has write permissions |
| Section headers present | "## Queued", "## In Progress", "## Completed" |
| Add task works | Task appears in file with proper format |
| List task works | Claude returns formatted task list |
| Priority detection works | "urgent" → high, "later" → low |
| Next task works | Task moves to In Progress |
| Complete task works | Task moves to Completed with date |
| Remove task works | Task deleted entirely |
| Background processor runs | Starts without errors, creates log |

---

## 🔍 Troubleshooting Failed Checks

### ❌ SKILL.md or files missing

**Cause**: Installation didn't copy files correctly

**Solution**:
```bash
# Re-copy files from pack
cp -r /path/to/pack/src/* ~/.claude/skills/KaiTodo/

# Verify
ls -la ~/.claude/skills/KaiTodo/
```

---

### ❌ Task file missing or not writable

**Cause**: Vault directory doesn't exist or permission issues

**Solution**:
```bash
# Create vault directory
mkdir -p ~/Documents/personal

# Create task file
cat > ~/Documents/personal/Kai-Todo.md <<'EOF'
# Kai's Todo List

## Queued

## In Progress

## Completed
EOF

# Fix permissions
chmod 644 ~/Documents/personal/Kai-Todo.md
chown $USER ~/Documents/personal/Kai-Todo.md
```

---

### ❌ Section headers missing

**Cause**: Task file not properly initialized

**Solution**:
```bash
# Backup existing file if it has content
cp ~/Documents/personal/Kai-Todo.md ~/Documents/personal/Kai-Todo-backup.md

# Recreate with proper structure
cat > ~/Documents/personal/Kai-Todo.md <<'EOF'
# Kai's Todo List

## Queued

## In Progress

## Completed
EOF

# If backup had tasks, manually copy them to appropriate sections
```

---

### ❌ Skill not recognized by Claude

**Cause**: SKILL.md metadata incorrect or session not restarted

**Solution**:
```bash
# Verify SKILL.md format
head -20 ~/.claude/skills/KaiTodo/SKILL.md
# Should show YAML frontmatter with ---

# Check for syntax errors in frontmatter
# Ensure name, description, invocation are present

# Restart Claude Code session
# Skills are loaded at session start
```

---

### ❌ Add task fails

**Cause**: File permissions or format issues

**Solution**:
```bash
# Check file is writable
ls -la ~/Documents/personal/Kai-Todo.md

# Try manual add to test write access
echo "### [KT-999] Test Task" >> ~/Documents/personal/Kai-Todo.md

# Check file format
cat ~/Documents/personal/Kai-Todo.md

# Ensure ## Queued section exists
```

---

### ❌ Tasks not moving between sections

**Cause**: Section headers malformed or task format incorrect

**Solution**:
```bash
# Verify section headers are level 2 (##)
grep "^##" ~/Documents/personal/Kai-Todo.md
# Should show: ## Queued, ## In Progress, ## Completed (not ### or #)

# Verify task format uses level 3 headings (###)
grep "^###" ~/Documents/personal/Kai-Todo.md
# Should show: ### [KT-XXX] Task Title

# Fix if needed (edit in text editor)
```

---

### ❌ Background processor won't start

**Cause**: Bun not installed or TypeScript errors

**Solution**:
```bash
# Install Bun if missing
curl -fsSL https://bun.sh/install | bash

# Check for TypeScript errors
bun run ~/.claude/skills/KaiTodo/background-processor.ts --help

# Verify file permissions
chmod +x ~/.claude/skills/KaiTodo/background-processor.ts

# Check logs for errors
cat ~/.claude/skills/KaiTodo/processor.log
```

---

## ✅ Final Verification Checklist

Before considering installation complete, confirm:

- [ ] All files present (SKILL.md, background-processor.ts, Kai-Todo.md)
- [ ] Task file has proper section structure
- [ ] File permissions allow read/write
- [ ] Claude Code recognizes the skill (start new session)
- [ ] Can add a test task successfully
- [ ] Can list tasks
- [ ] Can mark tasks as done
- [ ] Can remove tasks
- [ ] Priority detection works (test with "urgent" keyword)
- [ ] (Optional) Background processor runs without errors

**If all checks pass**: ✅ Installation verified and ready to use!

**If any check fails**: 🔧 Review troubleshooting section for that specific check.

---

## 🆘 Still Having Issues?

1. **Review task file format**: Ensure sections use `##` and tasks use `###`
2. **Check permissions**: `ls -la ~/Documents/personal/Kai-Todo.md`
3. **Verify SKILL.md**: Should have YAML frontmatter with `---` delimiters
4. **Restart Claude Code**: Skills load at session start
5. **Check Claude's working directory**: Should have access to home directory
6. **Manual file test**: Try editing Kai-Todo.md directly to verify it works

If problems persist, document the specific failing check and error messages for support.
