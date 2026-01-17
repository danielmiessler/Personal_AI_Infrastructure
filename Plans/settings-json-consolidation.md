# Settings.json Variable Consolidation Plan

## Problem

Currently, configuration variables (DA identity, principal name, voice ID, color, etc.) are stored in **markdown files** and parsed with regex:

```typescript
// Current approach - from stop-hook-voice.ts
const content = readFileSync('DAIDENTITY.md', 'utf-8');
const nameMatch = content.match(/\*\*Name:\*\*\s*(\w+)/);
const displayMatch = content.match(/\*\*Display\s*Name:\*\*\s*(.+?)(?:\n|$)/i);
```

This is:
- Fragile (regex breaks if formatting changes)
- Hard to programmatically update
- Inconsistent (some vars in .env, some in settings.json, some in markdown)
- "Searching through Markdown like a caveman"

## Solution

**All configuration variables in `settings.json`**, read programmatically with `JSON.parse()`.

## Target settings.json Structure

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "env": {
    "PAI_DIR": "~/.config/pai",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "80000",
    "BASH_DEFAULT_TIMEOUT_MS": "600000"
  },

  "identity": {
    "name": "Kai",
    "displayName": "Kai",
    "fullName": "Kai Magnus",
    "color": "#3B82F6",
    "voiceId": "YOUR_ELEVENLABS_VOICE_ID",
    "personality": {
      "enthusiasm": 60,
      "precision": 95,
      "curiosity": 90
    }
  },

  "principal": {
    "name": "Daniel",
    "pronunciation": "Dan-yel",
    "timezone": "America/Los_Angeles",
    "socialHandles": {
      "twitter": "@danielmiessler",
      "github": "danielmiessler"
    }
  },

  "voice": {
    "enabled": true,
    "serverUrl": "http://localhost:8888",
    "defaultVoiceId": "YOUR_ELEVENLABS_VOICE_ID"
  },

  "permissions": { ... },
  "hooks": { ... }
}
```

## Variables to Migrate

### From DAIDENTITY.md → settings.json.identity
| Markdown Field | JSON Path |
|----------------|-----------|
| `**Name:**` | `identity.name` |
| `**Full Name:**` | `identity.fullName` |
| `**Display Name:**` | `identity.displayName` |
| `**Color:**` | `identity.color` |
| `**Voice ID:**` | `identity.voiceId` |
| `**Role:**` | `identity.role` |

### From BASICINFO.md → settings.json.principal
| Markdown Field | JSON Path |
|----------------|-----------|
| `**Name:**` | `principal.name` |
| `**Name Pronunciation:**` | `principal.pronunciation` |
| `**Social handles:**` | `principal.socialHandles` |

### From .env → settings.json.env or dedicated sections
| .env Variable | JSON Path |
|---------------|-----------|
| `ELEVENLABS_VOICE_ID` | `voice.defaultVoiceId` |
| `VOICE_SERVER_URL` | `voice.serverUrl` |
| `PAI_DIR` | `env.PAI_DIR` |
| `DA` | `identity.name` |

## Files to Modify

### 1. settings.json.template (pai-core-install)
Add new sections: `identity`, `principal`, `voice`

### 2. Install Wizard (Bundles/Official/install.ts)
- Add prompts for identity name, display name, color
- Add prompts for principal name, pronunciation
- Add prompts for voice configuration
- Write all values to settings.json

### 3. Hooks (pai-hook-system, pai-voice-system)
Replace markdown parsing with settings.json reading:

```typescript
// OLD - Caveman approach
const content = readFileSync('DAIDENTITY.md', 'utf-8');
const name = content.match(/\*\*Name:\*\*\s*(\w+)/)?.[1];

// NEW - Programmatic approach
const settings = JSON.parse(readFileSync('settings.json', 'utf-8'));
const name = settings.identity.name;
```

### 4. Create shared utility: `lib/settings-loader.ts`
```typescript
export function loadSettings(): PAISettings {
  const settingsPath = join(process.env.PAI_DIR || '~/.config/pai', 'settings.json');
  return JSON.parse(readFileSync(settingsPath, 'utf-8'));
}

export function getIdentity(): Identity {
  return loadSettings().identity;
}

export function getPrincipal(): Principal {
  return loadSettings().principal;
}
```

### 5. DAIDENTITY.md → Documentation Only
Keep the file but change its purpose:
- Remove "hooks read from this file" language
- Add "Configuration is in settings.json"
- Keep as reference/documentation for identity concepts

## Migration Path

### Phase 1: Add to settings.json (backward compatible)
1. Add `identity`, `principal`, `voice` sections to settings.json.template
2. Update install wizard to populate these values
3. Create `lib/settings-loader.ts` utility

### Phase 2: Update hooks to prefer settings.json
1. Update each hook to try settings.json first
2. Fall back to markdown parsing for backward compatibility
3. Log deprecation warning when falling back

### Phase 3: Remove markdown parsing
1. Remove regex parsing code
2. Update DAIDENTITY.md to documentation-only
3. Update all documentation

## Affected Packs

| Pack | Changes Needed |
|------|----------------|
| `pai-core-install` | settings.json.template, DAIDENTITY.md |
| `pai-hook-system` | All hooks that read identity |
| `pai-voice-system` | stop-hook-voice.ts |
| `pai-history-system` | Any hooks reading DA name |
| `Official Bundle` | install.ts wizard |

## Benefits

1. **Programmatic access** - `settings.identity.name` vs regex
2. **Single source of truth** - One file, one format
3. **Tool-friendly** - Easy to read/write from any language
4. **Schema validation** - JSON Schema for validation
5. **IDE support** - Autocomplete for JSON
6. **No parsing errors** - JSON.parse() is deterministic

## Discussion References

- Issue #124: ENV variables should be set in a single place
- Issue #110: settings.json needs local edits
- Issue #112: PAI_DIR inconsistency
- Discussion #179: Dynamic Assistant Names

## Status

- [ ] Phase 1: Add settings.json structure
- [ ] Phase 2: Update hooks with fallback
- [ ] Phase 3: Remove markdown parsing
