# Editorial Comics Workflow

**Sequential panel storytelling with sophisticated hand-drawn aesthetic.**

---

## Purpose

Editorial comics use sequential panels to explain concepts, tell stories, or illustrate scenarios.

**Use for:**
- Explaining complex concepts through narrative
- Before/during/after sequences
- Illustrated thought experiments
- Multi-step processes shown visually
- Scenario storytelling

---

## Visual Aesthetic

**Style:** Sophisticated sequential art - New Yorker style, NOT cartoonish.

### Core Characteristics

1. **Multi-panel** - 3-4 panels telling sequential story
2. **Editorial style** - Sophisticated, not cutesy
3. **Planeform figures** - Angular, architectural character design
4. **Hand-drawn** - Imperfect linework, gestural quality
5. **Narrative flow** - Panels build to make a point
6. **Minimal dialogue** - Visual storytelling prioritized

---

## Color System

```
Background   #0a0a0f    - Overall dark canvas
Panel BG     #1a1a2e    - Individual panel backgrounds
Line Work    #e5e7eb    - All linework, character outlines
PAI Blue     #4a90d9    - Main character accent
Cyan         #22d3ee    - Secondary character accent
Text         #e5e7eb    - Dialogue, captions
```

### Color Strategy

- Dark overall canvas with slightly lighter panel backgrounds
- Characters primarily white linework
- PAI Blue accent on protagonist
- Cyan on secondary character if needed
- Minimal color - mostly linework

---

## Workflow Steps

### Step 1: Define Comic Narrative

**Plan the story:**

```
COMIC CONCEPT: [What you're illustrating]
PANELS: [3 or 4]

NARRATIVE ARC:
Panel 1: [Setup - initial state]
Panel 2: [Action/Complication - what changes]
Panel 3: [Escalation or Result]
Panel 4: [Punchline/Insight] (if 4 panels)

DIALOGUE (Minimal):
Panel 1: "[Optional text]"
Panel 2: "[Optional text]"
Panel 3: "[Optional text]"
Panel 4: "[Punchline]"

CHARACTERS:
- [Character 1]: [Description, PAI Blue accent]
- [Character 2]: [Description, Cyan accent if needed]
```

---

### Step 2: Design Panel Layout

**Panel arrangement options:**
- Horizontal strip (3-4 panels left to right)
- Vertical strip (3-4 panels top to bottom)
- Grid (2x2 for 4 panels)

**Panel sizing:**
- Equal sized panels (classic)
- Final panel larger (punchline emphasis)

---

### Step 3: Construct Prompt

### Prompt Template

```
Hand-drawn editorial comic strip on dark background.

STYLE: New Yorker cartoon, editorial sophistication, NOT cartoonish.

BACKGROUND: Dark #0a0a0f canvas with #1a1a2e panel backgrounds.

COMIC STRUCTURE: [3-panel / 4-panel] [horizontal / vertical / grid]

PANEL LAYOUT:
- [Number] panels arranged [direction]
- Hand-drawn panel borders (slightly wobbly)
- Panel sizes: [Equal / Varied]

CHARACTER DESIGN - PLANEFORM AESTHETIC:
- Angular planes (like architectural paper models)
- Adult proportions (1:7 head-to-body), elongated
- Faces are minimal geometric blocks
- Emotion through GESTURE and SILHOUETTE
- NOT cute, NOT cartoonish
- Hand-drawn gestural quality with angular construction

COMIC NARRATIVE: "[Overall concept]"

PANEL 1 - [SETUP]:
Scene: [What's happening]
Characters: [Who, doing what]
Dialogue: "[Text]" or no text

PANEL 2 - [COMPLICATION]:
Scene: [What changes]
Characters: [Actions]
Dialogue: "[Text]" or no text

PANEL 3 - [RESULT]:
Scene: [Outcome]
Characters: [Final states]
Dialogue: "[Text]" or no text

PANEL 4 - [PUNCHLINE] (if 4 panels):
Scene: [Revelation]
Characters: [Conclusion]
Dialogue: "[Insight text]"

COLOR USAGE:
- White #e5e7eb for linework and character outlines
- PAI Blue #4a90d9 accent on main character
- Cyan #22d3ee accent on secondary character
- Dark backgrounds throughout

CRITICAL:
- Sophisticated editorial style (NOT cutesy)
- Clear narrative flow across panels
- Character consistency throughout
- Visual storytelling prioritized
- Professional quality
```

---

### Step 4: Determine Aspect Ratio

| Layout | Aspect Ratio |
|--------|--------------|
| 3-panel horizontal | 16:9 or 21:9 |
| 4-panel horizontal | 21:9 |
| 3-panel vertical | 9:16 |
| 4-panel grid (2x2) | 1:1 |

---

### Step 5: Execute Generation

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[YOUR PROMPT]" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/comic.png
```

---

### Step 6: Validation

### Must Have
- [ ] Clear panel structure
- [ ] Sophisticated editorial aesthetic (NOT cartoonish)
- [ ] Narrative flow across panels
- [ ] Character consistency
- [ ] Hand-drawn quality
- [ ] Dark backgrounds
- [ ] Planeform character design (angular, adult proportions)

### Must NOT Have
- [ ] Cartoonish or cutesy style
- [ ] Round forms on figures (should be angular)
- [ ] Big heads, stubby proportions
- [ ] Detailed cute faces
- [ ] Light backgrounds
- [ ] Busy complex backgrounds
- [ ] Generic AI illustration style

### Character Validation
- [ ] Angular construction (NOT round)
- [ ] Adult proportions 1:7 (NOT stubby 1:3)
- [ ] Minimal geometric faces
- [ ] Emotion through gesture
- [ ] Consistent across panels

---

## Example Narratives

### Example 1: "Before/After AI" (3 panels)
- Panel 1: Person struggling with manual task
- Panel 2: AI assistant appears
- Panel 3: Task completed, person relieved

### Example 2: "Security Theater" (4 panels)
- Panel 1: Fancy lock on flimsy door
- Panel 2: Simple lock on solid door
- Panel 3: Intruder easily bypasses fancy setup
- Panel 4: Stopped by simple solid approach

---

**The workflow: Define -> Design -> Prompt -> Generate -> Validate**
