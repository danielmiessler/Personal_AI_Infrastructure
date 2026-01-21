# Terminal Configuration

**Terminal Appearance Settings**

This directory contains your terminal appearance and behavior customizations.

---

## Purpose

Customize terminal-related behavior:

- Tab naming conventions
- Color themes
- Output formatting
- Shell integration settings

---

## Files to Create

### preferences.yaml

```yaml
# Terminal preferences
tab_naming:
  enabled: true
  format: "{project} - {task}"

colors:
  success: "green"
  error: "red"
  warning: "yellow"

output:
  max_lines: 50
  truncate_long_lines: true
```

---

## How It Works

1. Terminal-related hooks read this configuration
2. Apply your preferences to terminal operations
3. Consistent appearance across all PAI sessions
