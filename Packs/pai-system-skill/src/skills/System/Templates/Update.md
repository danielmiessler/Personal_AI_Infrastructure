---
id: "YYYY-MM-DDTHHMMSS_kebab-case-title"
timestamp: "YYYY-MM-DDTHH:MM:SSZ"
title: "Descriptive Title (4-8 words)"
significance: "critical|major|moderate|minor|trivial"
change_type: "skill_update|structure_change|doc_update|hook_update|workflow_update|config_update|tool_update|multi_area"
files_affected:
  - "path/to/file1"
  - "path/to/file2"
---

# Descriptive Title

**Timestamp:** YYYY-MM-DDTHH:MM:SSZ  |  **Significance:** [Badge] Level  |  **Type:** change_type

---

## The Story

[This section should be 1-3 paragraphs characterizing what happened and why. Be verbose - file system is cheap, signal is valuable.]

**Background:** [Paragraph 1] What was the situation before this change? What context is needed to understand this update? Describe the state of the system and what prompted attention to this area.

**The Problem:** [Paragraph 2] What issue was identified? What wasn't working correctly, or what limitation existed? Be specific about what triggered this change - user feedback, bug discovery, architectural review, etc.

**The Resolution:** [Paragraph 3] How was this addressed? Summarize the approach taken and the key decisions made. What was the thinking behind the solution?

---

## How It Used To Work

[Describe the previous state in detail. Be specific about behavior, not just structure.]

Previously, the system [did X in Y way]. When a user would [take action A], the system would [respond with B].

This approach had these characteristics:
- [Characteristic or limitation 1]
- [Characteristic or limitation 2]
- [Characteristic or limitation 3]

The specific issue was: [Clear statement of the problem with the old approach]

---

## How It Works Now

[Describe the new state in detail. Mirror the structure of the previous section for easy comparison.]

The system now [does X in Y way]. When a user [takes action A], the system [responds with B].

Key improvements:
- [Improvement 1]
- [Improvement 2]
- [Improvement 3]

The specific change was: [Clear statement of what's different]

---

## Changes Made

### Files Created
- `path/to/new/file.ts` - [Purpose and brief description]

### Files Modified
- `path/to/existing/file.ts` - [What changed and why]
- `another/file.md` - [What changed and why]

### Files Deleted
- `path/to/removed/file.ts` - [Why it was removed]

### Configuration Changes
- [Any settings.json, hook configuration, or other config changes]

---

## Going Forward

[This section describes the future implications. What does this change enable? How will behavior differ?]

In the future:
- [Future behavior or capability 1]
- [Future behavior or capability 2]
- [Future behavior or capability 3]

Users/developers should note:
- [Any important change in how things work]
- [Any new capabilities or patterns to be aware of]

---

## Verification

[How do we know this works? What was tested?]

**Tests Performed:**
- [Test 1] - [Result]
- [Test 2] - [Result]

**Verification Commands:**
```bash
# Commands used to verify the change
```

**Expected Behavior Confirmed:**
- [Specific behavior verified]
- [Edge case checked]

---

## Related Context

- **Session:** [Session ID or date if relevant]
- **Related Updates:** [Links to related PAISYSTEMUPDATES entries]
- **Related Documentation:** [Links to affected docs]

---

**Confidence:** high|medium|low
**Auto-generated:** Yes|No
