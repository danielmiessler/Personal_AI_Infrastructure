# Banner Configuration

**Customize Your Session Banner**

This directory contains configuration for the banner/status line displayed at session start.

---

## Purpose

Customize what information appears in your PAI session banner:

- Your AI's name and greeting
- System status indicators
- Custom information displays
- Color and formatting preferences

---

## Files to Create

### config.yaml

```yaml
# Banner configuration
name: "Your AI Name"
greeting: "Good morning"
show_weather: true
show_location: false
color_scheme: "dark"
```

---

## How It Works

1. SessionStart hook reads this configuration
2. Generates personalized banner output
3. Displays at the beginning of each session
