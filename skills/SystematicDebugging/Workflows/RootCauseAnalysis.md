# RootCauseAnalysis Workflow

> **Trigger:** Any bug, failure, or unexpected behavior
> **Input:** Error message or bug report
> **Output:** Root cause identified and fixed

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

### 1.1 Read Error Messages
- Don't skip past errors or warnings
- Read stack traces completely
- Note line numbers, file paths, error codes

### 1.2 Reproduce Consistently
- Can you trigger it reliably?
- What are the exact steps?
- If not reproducible → gather more data, don't guess

### 1.3 Check Recent Changes
- What changed that could cause this?
- `git diff`, recent commits
- New dependencies, config changes

### 1.4 Multi-Component Systems
Add diagnostic instrumentation at each boundary:
- Log what data enters each component
- Log what data exits each component
- Run once to gather evidence

### 1.5 Trace Data Flow
- Where does bad value originate?
- Keep tracing up until you find the source
- Fix at source, not at symptom

## Phase 2: Pattern Analysis

### 2.1 Find Working Examples
- Locate similar working code in same codebase

### 2.2 Compare Against References
- Read reference implementation completely

### 2.3 Identify Differences
- What's different between working and broken?
- List every difference, however small

## Phase 3: Hypothesis and Testing

### 3.1 Form Single Hypothesis
- State clearly: "I think X is the root cause because Y"
- Write it down, be specific

### 3.2 Test Minimally
- Make the SMALLEST possible change
- One variable at a time

### 3.3 Verify
- Worked? → Phase 4
- Didn't work? → Form NEW hypothesis, don't add more fixes

## Phase 4: Implementation

### 4.1 Create Failing Test
- Use **TestDrivenDevelopment** skill
- MUST have test before fixing

### 4.2 Implement Single Fix
- Address root cause identified
- ONE change at a time
- No "while I'm here" improvements

### 4.3 Verify Fix
- Test passes now?
- No other tests broken?
- Issue actually resolved?

### 4.4 If Fix Doesn't Work
- Count: How many fixes tried?
- If < 3: Return to Phase 1
- **If >= 3: STOP and question architecture**

## Completion

Once root cause fixed and verified:

```
Bug fixed and verified. Returning to [caller skill] to continue.
```

## Skills Invoked

| Phase | Skill |
|-------|-------|
| Phase 4.1 | TestDrivenDevelopment |
| After fix | VerificationBeforeCompletion |
