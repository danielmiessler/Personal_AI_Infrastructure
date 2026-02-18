# Scene Construction Guidelines

**Your preferences for how scenes and environments are composed.**

This file customizes the Art skill's approach to scene composition.

---

## Composition Rules

### Layout Preferences

```
default_composition: [rule-of-thirds|centered|dynamic]
focal_point: [left|center|right]
negative_space: [minimal|balanced|generous]
```

### Depth

```
depth_style: [flat|layered|atmospheric]
foreground_elements: [yes/no]
background_blur: [none|subtle|strong]
```

---

## Lighting Preferences

### Default Lighting

```
lighting_style: [natural|studio|dramatic|moody]
key_light_position: [front|side|top]
fill_ratio: [high|medium|low]
```

### Mood by Context

| Context | Lighting Style |
|---------|----------------|
| Professional | [Soft, diffused studio lighting] |
| Editorial | [Dramatic side lighting] |
| Technical | [Even, flat lighting] |
| Atmospheric | [Moody, rim lighting] |

---

## Environment Styles

### Background Preferences

| Type | Style |
|------|-------|
| Portraits | [Clean, gradient backgrounds] |
| Editorial | [Abstract, related to topic] |
| Technical | [Minimal, dark] |
| Presentation | [Branded, subtle patterns] |

### Default Backgrounds

```
portrait_bg: #[HEX] to #[HEX] gradient
editorial_bg: [Abstract tech patterns, dark]
technical_bg: #[HEX] solid
```

---

## Object/Element Rules

### Common Elements

How to render common scene elements:

| Element | Treatment |
|---------|-----------|
| Text | [Never in generated images / Overlay separately] |
| Logos | [Embossed / Overlaid / Integrated] |
| People | [Only when explicitly requested] |
| Technology | [Abstract representations] |

### Restrictions

Elements to never include:

- [Restriction 1]
- [Restriction 2]

---

## Workflow-Specific Rules

### Blog Headers

```
style: [illustrative/photographic/abstract]
aspect_ratio: 16:9
include_topic_elements: true
text_safe_zone: [left|right|top]
```

### YouTube Thumbnails

```
face_position: [left|center|right]
text_zone: [opposite of face]
background_style: [dramatic tech]
border: [yes/no]
```

### Technical Diagrams

```
style: [clean lines/hand-drawn/organic]
color_scheme: [brand colors from PREFERENCES.md]
annotations: [minimal/detailed]
```

---

## Notes

[Add any specific composition rules, restrictions, or preferences]

---

*Update this file to customize how the Art skill constructs scenes and environments.*
