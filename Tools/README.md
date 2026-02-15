<p align="center">
  <img src="utilities-icon.png" alt="PAI Utilities" width="128">
</p>

# Utilities

> **FOR AI AGENTS:** This directory contains tools for building and maintaining PAI installations.

---

## Contents

### Diagnostic Tools

#### CheckPAIState.md

**PAI Installation Diagnostic**

A comprehensive diagnostic workflow for assessing PAI installation health. Give this file to an AI and ask it to check the system.

**What it does:**
- Verifies core systems are working (hooks, skills, memory)
- Detects broken, misconfigured, or missing dependencies
- Provides actionable recommendations for improvements

**AI invocation:**
```
Read CheckPAIState.md and check my PAI state. Give me recommendations.
```

### Maintenance Tools

#### validate-protected.ts

**Security Validation**

Validates that PAI repository files don't contain sensitive data before committing.

#### BackupRestore.ts

**Backup and Restore**

Create and restore backups of PAI installations.

---

## Quick Reference

| File | Type | Purpose |
|------|------|---------|
| CheckPAIState.md | Diagnostic | Check PAI installation health |
| validate-protected.ts | Security | Validate no sensitive data in commits |
| BackupRestore.ts | Maintenance | Backup and restore PAI installations |

---

*Part of the [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) project.*
