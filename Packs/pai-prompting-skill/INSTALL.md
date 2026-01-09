# Installation Guide - Kai Prompting Skill

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **kai-core-install Pack** installed (required for Skills directory)

## Step 1: Create Directory Structure

```bash
mkdir -p $PAI_DIR/skills/Prompting/Templates/Primitives
mkdir -p $PAI_DIR/skills/Prompting/Templates/Data/Examples
mkdir -p $PAI_DIR/skills/Prompting/Templates/Compiled
mkdir -p $PAI_DIR/skills/Prompting/Tools
```

## Step 2: Copy Files

Copy files from this pack to your PAI installation:

| Source | Destination |
|--------|-------------|
| `src/skills/Prompting/SKILL.md` | `$PAI_DIR/skills/Prompting/SKILL.md` |
| `src/skills/Prompting/Standards.md` | `$PAI_DIR/skills/Prompting/Standards.md` |
| `src/skills/Prompting/Templates/README.md` | `$PAI_DIR/skills/Prompting/Templates/README.md` |
| `src/skills/Prompting/Templates/Primitives/Roster.hbs` | `$PAI_DIR/skills/Prompting/Templates/Primitives/Roster.hbs` |
| `src/skills/Prompting/Templates/Primitives/Voice.hbs` | `$PAI_DIR/skills/Prompting/Templates/Primitives/Voice.hbs` |
| `src/skills/Prompting/Templates/Primitives/Structure.hbs` | `$PAI_DIR/skills/Prompting/Templates/Primitives/Structure.hbs` |
| `src/skills/Prompting/Templates/Primitives/Briefing.hbs` | `$PAI_DIR/skills/Prompting/Templates/Primitives/Briefing.hbs` |
| `src/skills/Prompting/Templates/Primitives/Gate.hbs` | `$PAI_DIR/skills/Prompting/Templates/Primitives/Gate.hbs` |
| `src/skills/Prompting/Tools/RenderTemplate.ts` | `$PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts` |
| `src/skills/Prompting/Tools/ValidateTemplate.ts` | `$PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts` |

## Step 3: Install Dependencies

```bash
cd $PAI_DIR/skills/Prompting/Tools
bun init -y
bun add handlebars yaml
```

## Step 4: Generate Skill Index (If Using kai-core-install)

```bash
bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
```

## Step 5: Update Architecture

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Installed kai-prompting-skill v1.0.0" pack
bun run $PAI_DIR/Tools/PaiArchitecture.ts generate
```

## Customization

### Create Your Own Templates

1. Create a new `.hbs` file in `Templates/Primitives/` or a new subdirectory
2. Follow Handlebars syntax
3. Document the expected data structure in the template header
4. Test with sample data before production use

### Extend the Helpers

Add custom Handlebars helpers in `Tools/RenderTemplate.ts`:

```typescript
Handlebars.registerHelper('myHelper', (value: string) => {
  // Your custom logic
  return transformedValue;
});
```

### Optional Extensions

| Customization | Location | Impact |
|---------------|----------|--------|
| **Add Eval Templates** | `Templates/Evals/` | LLM-as-Judge patterns |
| **Create Partials** | `Templates/Partials/` | Reusable template fragments |
| **Add Data Files** | `Templates/Data/` | Pre-configured YAML sources |
| **Extend Standards** | `Standards.md` | Project-specific guidelines |

## Integration with Other Skills

### Agents Skill

```typescript
import { renderTemplate } from '$PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts';

const prompt = renderTemplate({
  templatePath: 'Primitives/Briefing.hbs',
  dataPath: 'path/to/briefing-data.yaml'
});
```

### Evals Skill

The Prompting skill can host eval-specific templates (`Judge.hbs`, `Rubric.hbs`) that the Evals skill references.

### Development Skill

Reference `Standards.md` for prompt best practices during spec-driven development.
