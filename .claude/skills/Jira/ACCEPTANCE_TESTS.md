# Jira Skill Acceptance Tests

Manual acceptance tests to verify the Jira skill works correctly.

## Prerequisites

1. **Profile configured:**
   - Copy `bin/jira/profiles.example/example.env.template` to `bin/jira/profiles/personal.env`
   - Fill in your Jira credentials
   - Create symlink: `ln -sf personal.env profiles/default`

2. **CLI accessible:**
   - Wrapper script exists: `~/bin/jira`
   - Run `jira --help` to verify

---

## Test 1: CLI Help

**Command:**
```bash
jira --help
```

**Expected:** Shows all available commands (search, get, create, update, etc.)

**Success Criteria:**
- ✅ Help text displays
- ✅ All commands listed
- ✅ Exit code 0

---

## Test 2: Profile Listing

**Command:**
```bash
jira profiles
```

**Expected:** Lists available profiles with default indicator.

**Success Criteria:**
- ✅ Profiles displayed
- ✅ Default profile marked
- ✅ Shows Jira URL for each

---

## Test 3: Search Issues

**Command:**
```bash
jira search "test" --limit 5
```

**Expected:** Returns table of matching issues.

**Success Criteria:**
- ✅ Table displays with columns: #, Key, Type, Summary, Status, Assignee
- ✅ Results limited to 5
- ✅ Prompt shows: "Which to load?"

---

## Test 4: Search with JQL

**Command:**
```bash
jira search "project = PROJ AND status = 'In Progress'"
```

**Expected:** Returns issues matching JQL query.

**Success Criteria:**
- ✅ JQL detected and used directly
- ✅ Results filtered correctly

---

## Test 5: Get Issue Details

**Command:**
```bash
jira get PROJ-123
```

**Expected:** Returns full issue details.

**Success Criteria:**
- ✅ Key, Type, Status, Summary displayed
- ✅ Description shown
- ✅ Assignee/Reporter shown
- ✅ Labels displayed
- ✅ Links shown (if any)

---

## Test 6: List Projects

**Command:**
```bash
jira projects
```

**Expected:** Lists accessible projects.

**Success Criteria:**
- ✅ Project keys displayed
- ✅ Project names displayed
- ✅ Default project marked (if set)

---

## Test 7: List Issue Types

**Command:**
```bash
jira types --project PROJ
```

**Expected:** Lists available issue types for project.

**Success Criteria:**
- ✅ Types listed (Bug, Story, Task, Epic, Sub-task, etc.)

---

## Test 8: List Transitions

**Command:**
```bash
jira transitions PROJ-123
```

**Expected:** Lists available status transitions.

**Success Criteria:**
- ✅ Available transitions shown
- ✅ Target status for each

---

## Test 9: Cross-Instance Search

**Command:**
```bash
jira search "test" -p all
```

**Expected:** Searches all configured profiles in parallel.

**Success Criteria:**
- ✅ Results from all instances
- ✅ Instance indicator column shows source
- ✅ Handles missing/offline instances gracefully

---

## Test 10: GitHub Dev Integration

**Command:**
```bash
jira dev PROJ-123
```

**Expected:** Shows linked branches, commits, PRs.

**Success Criteria:**
- ✅ Branches listed (if any)
- ✅ Pull requests listed (if any)
- ✅ Commit count shown
- ✅ Graceful handling when no dev info

---

## Test 11: Label Operations

**Commands:**
```bash
jira labels                      # List all labels
jira search --label urgent       # Search by label
```

**Expected:** Labels listed and searchable.

**Success Criteria:**
- ✅ Labels displayed
- ✅ Search filters by label correctly

---

## Test 12: Link Types

**Command:**
```bash
jira link-types
```

**Expected:** Lists available link types.

**Success Criteria:**
- ✅ Link types displayed (blocks, is blocked by, relates to, etc.)
- ✅ Inward/outward names shown

---

## Skill Routing Tests

### SKILL-001: Search Recognition

**User Query:**
```
"search jira for authentication bugs"
```

**Expected Claude Behavior:**
- Recognizes Jira skill activation
- Executes: `jira search "authentication bugs"`
- Shows table and waits for selection

---

### SKILL-002: Two-Phase Enforcement

**User Query:**
```
"what issues are in project PROJ"
```

**Expected Claude Behavior:**
- Executes search: `jira search --project PROJ`
- Shows results table
- **WAITS** for user to select items
- Does NOT auto-load details

---

### SKILL-003: Instance Routing

**User Query:**
```
"search work jira for deployment issues"
```

**Expected Claude Behavior:**
- Recognizes "work jira" → `-p work`
- Executes: `jira search "deployment issues" -p work`

---

## Error Handling Tests

### ERR-001: Invalid Profile

**Command:**
```bash
jira search "test" -p nonexistent
```

**Expected:** Clear error message about missing profile.

---

### ERR-002: Network Error

**Test:** Disconnect network, run command.

**Expected:** Graceful timeout with clear error message.

---

### ERR-003: Invalid Credentials

**Test:** Use wrong API token.

**Expected:** Authentication error with guidance.

---

### ERR-004: Issue Not Found

**Command:**
```bash
jira get INVALID-999
```

**Expected:** Clear "issue not found" message.

---

## Quick Checklist

Run these before release:

- [ ] `jira --help` works
- [ ] `jira profiles` lists profiles
- [ ] `jira search "test"` returns results
- [ ] `jira get <KEY>` shows details
- [ ] `jira projects` lists projects
- [ ] Error messages are clear
