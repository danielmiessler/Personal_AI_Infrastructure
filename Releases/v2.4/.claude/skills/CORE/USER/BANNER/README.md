# PAI Banner System

The banner displays at the start of every PAI session, providing a visual identity and system status overview in a neofetch-style format.

## Banner Location

```
~/.claude/skills/CORE/Tools/Banner.ts
```

## Usage

```bash
# Display default banner (Navy theme)
bun ~/.claude/skills/CORE/Tools/Banner.ts

# Display specific design
bun ~/.claude/skills/CORE/Tools/Banner.ts --design=electric

# Preview all designs
bun ~/.claude/skills/CORE/Tools/Banner.ts --test
```

## Available Designs

### Large Terminal (85+ columns)

| Design | Description |
|--------|-------------|
| `navy` | Default. Navy/steel blue with 2x PAI logo, neofetch-style layout |
| `electric` | Neon blue/cyan, high contrast with sparklines |
| `teal` | Aqua/turquoise theme with wave patterns |
| `ice` | Frost/glacier theme, pale blues and whites |

### Small Terminal (<85 columns)

| Design | Description |
|--------|-------------|
| `minimal` | Clean hex-addressed layout |
| `singleline` | Pipe-separated minimal info |
| `vertical` | Centered boxed layout |
| `wrapping` | Info wraps around centered logo |

## Configuration

The banner reads configuration from `~/.claude/settings.json`:

```json
{
  "daidentity": {
    "name": "{your_ai_name}",
    "displayName": "{Your AI Name}"
  }
}
```

## What the Banner Shows

- **DA Name** - Your AI's name from settings.json
- **CC Version** - Claude Code version
- **PAI Version** - Currently v2.0
- **Model** - The active Claude model (e.g., Opus 4.5)
- **Skills** - Count of installed skills
- **Workflows** - Count of workflow definitions
- **Hooks** - Count of lifecycle hooks
- **Learnings** - Files in MEMORY/LEARNING/
- **Files** - User files in skills/CORE/USER/

## Customization

To change the default design, edit `Banner.ts` line 873:

```typescript
// Change "navy" to your preferred design
return createNavyBanner(stats, width);
```

Or modify the `pai.ts` launcher to pass a specific design flag.

## Adding New Designs

Each design is a function following this pattern:

```typescript
function createMyBanner(stats: SystemStats, width: number): string {
  // Define color palette
  // Build logo lines
  // Build info lines
  // Combine and return formatted string
}
```

Add your design to:
1. The appropriate design array (`LARGE_DESIGNS` or `SMALL_DESIGNS`)
2. The switch statement in `createBanner()`
