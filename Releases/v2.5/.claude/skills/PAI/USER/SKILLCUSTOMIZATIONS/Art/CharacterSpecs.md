# Character Specifications

**Your appearance details for AI-generated headshots and character images.**

This file is referenced when generating personalized headshots or character illustrations.

---

## Physical Appearance

### Basic Features

```
gender: [male/female/non-binary]
age_range: [20s/30s/40s/50s/etc]
ethnicity: [description]
```

### Facial Features

Describe distinguishing facial characteristics:

```
facial_features:
  - [Feature 1, e.g., "Full beard along jawline"]
  - [Feature 2, e.g., "Clean-shaven upper lip"]
  - [Feature 3, e.g., "Glasses with thin metal frames"]
  - [Feature 4, e.g., "Short hair, salt and pepper"]
```

### Complexion

```
skin_tone: [fair/medium/olive/dark]
complexion_notes: [any additional details]
```

---

## Style Preferences

### Expression Types

Default expressions for different contexts:

| Context | Expression |
|---------|------------|
| Professional | [Confident, direct gaze] |
| Casual | [Relaxed, slight smile] |
| Thoughtful | [Contemplative, slight head tilt] |
| Energetic | [Engaging, animated] |

### Clothing Style

Default clothing for headshots:

```
professional: [Dark blazer, collared shirt]
casual: [Solid color t-shirt]
tech: [Casual button-down]
```

---

## Reference Images

Place your reference photos in the `References/` subdirectory:

```
References/
  reference.png      # Primary likeness reference
  professional.png   # Professional context
  casual.png         # Casual context
```

### Usage Notes

- Reference images are used for **likeness**, not as the actual headshot
- AI will generate new images based on these references
- Include 2-3 reference images from different angles for best results

---

## Prompt Template

When generating headshots, append these features to the base prompt:

```
[FACIAL_FEATURES] = "[Your facial features description from above]"
```

Example:
```
Full beard along jawline with clean-shaven upper lip. Thin metal frame glasses.
Short hair, salt and pepper coloring. Direct, confident gaze.
```

---

## Restrictions

Things to avoid in character images:

- [Restriction 1]
- [Restriction 2]

---

*Update this file with your appearance details for personalized AI-generated images.*
