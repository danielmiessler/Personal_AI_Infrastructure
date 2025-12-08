# Tag Taxonomy

**Source:** Analyzed from Obsidian vault
**Last Updated:** 2024-12-01
**Philosophy:** Zettelkasten-inspired with Bibliographical Box + Main Slipbox + Incoming Raw

---

## Tag Categories

### 1. Processing Status Tags
Controls the workflow state of notes.

| Tag | Purpose |
|-----|---------|
| `incoming` | Raw input needing processing |
| `fabric-extraction` | Processed by fabric pattern |
| `main` | Main slipbox (processed, organized) |
| `wisdom` | Extracted wisdom from content |
| `transcript` | Raw transcript |
| `raw` | Unprocessed content |

**Flow:** `incoming` → (processing) → `fabric-extraction` + (`wisdom` OR `raw` OR `transcript`) → `main`

### 2. People Tags
Snake_case format, used for meeting attendees and mentions.

| Tag Pattern | Example | Use |
|-------------|---------|-----|
| `firstname_lastname` | `john_doe` | Colleague |
| `firstname_lastname` | `jane_smith` | Manager (1on1s) |
| `firstname_lastname` | `bob_wilson` | Client |

**Format:** `firstname_lastname` (snake_case)

**Example Usage:**
```yaml
tags:
  - john_doe
  - jane_smith
  - meeting-notes
```

### 3. Project Tags
Hierarchical format for project organization.

| Tag Pattern | Example | Use |
|-------------|---------|-----|
| `project/name` | `project/alpha` | Active project |
| `project/name` | `project/data-platform` | Technical project |
| `project/name` | `project/conference-2024` | Event/conference |

**Format:** `project/project-name` (hierarchical with kebab-case)

### 4. Content Type Tags
Categorizes the type of content.

| Tag | Use For |
|-----|---------|
| `meeting-notes` | Meeting transcripts/notes |
| `bibliography` | Book/article references |
| `phone-call` | Phone call notes |
| `1on1` | One-on-one meetings |
| `interesting-reads` | Curated reading list |
| `link` | Saved web links |
| `howto` | How-to guides |
| `ideas` | Ideas and brainstorms |

### 5. Topic/Category Tags
Subject matter categorization.

| Tag | Domain |
|-----|--------|
| `ai` | Artificial intelligence |
| `genai` | Generative AI |
| `llm` | Large language models |
| `data-platform` | Data platforms |
| `enterprise-architecture` | EA topics |
| `strategy` | Strategic planning |
| `off-grid` | Off-grid systems |
| `computer-vision` | CV topics |
| `zettelkasten` | Note-taking methodology |

### 6. Source Tags
Where content originated.

| Tag | Source |
|-----|--------|
| `source/telegram` | Telegram ingestion |
| `source/voice` | Voice memo |
| `source/web` | Web article |
| `source/newsletter` | Newsletter |
| `source/document` | Document upload |

---

## Naming Conventions

### File Names
```
YYYY-MM-DD-Title.md
```

**Examples:**
- `2024-06-10-Data Platform Architecture Meeting.md`
- `2024-06-11-Zettelkasten Note Taking System.md`
- `2024-01-30-AI Industry Report Summary.md`

### Suffixes
| Suffix | Meaning |
|--------|---------|
| `-Raw` | Unprocessed transcription |
| `-Wisdom` | Fabric extract_wisdom output |
| `-Transcript` | Full transcript |
| `-MOM` | Minutes of Meeting |
| `-Minutes` | Meeting minutes |

### People in Titles
Attendees listed in parentheses:
```
2024-06-10-Project Kickoff Meeting (John, Jane, Bob).md
```

---

## Zettelkasten Structure

### Bibliographical Box
**Tag:** `#bibliography`
- Notes on books and articles read
- Bibliographical information
- Summaries and key points
- Links to main notes where ideas are developed

### Main Slipbox
**Tags:** `#idea`, `#observation`, `#insight`, `#main`
- Repository of ideas, observations, insights
- Each note is atomic (single concept)
- Heavily linked to related notes
- Meeting notes: `#meeting-notes`

### Incoming Raw
**Tags:** `#incoming`, `#raw`
- Unprocessed input
- Voice memo transcriptions
- Quick captures
- Needs processing via Fabric

---

## YAML Frontmatter Format

```yaml
---
generation_date: 2024-06-10 13:13
tags:
  - fabric-extraction
  - meeting-notes
  - project/data-platform
  - john_doe
  - jane_smith
source: telegram
---
```

**Fields:**
- `generation_date` - When note was created (YYYY-MM-DD HH:MM)
- `tags` - List of tags (YAML array format)
- `source` - Origin of content (telegram, voice, web, etc.)
- Optional: `source-file` - Original audio/document path

---

## Tag Generation Rules (for Pipeline)

When the ingestion pipeline processes content, apply these rules:

### 1. Detect Content Type
```
Voice memo → transcript, raw, incoming
URL → interesting-reads OR bibliography
Meeting → meeting-notes
Phone call → phone-call
```

### 2. Detect People
Scan for names, add person tags:
```
"Meeting with John Doe" → john_doe
"(Alice, Bob, Charlie)" → alice_smith, bob_jones, charlie_brown
```

### 3. Detect Projects
Keyword matching from profile configuration:
```
"data platform" → project/data-platform
"conference paper" → project/conference-2024
```

### 4. Processing Status
```
Initial: incoming, raw
After fabric: fabric-extraction, wisdom
Final: main (when reviewed)
```

---

## Usage in Context System

### Search Examples
```bash
# All meetings with a person
obs search --tag "john_doe" --tag "meeting-notes"

# Project content
obs search --tag "project/data-platform"

# Unprocessed incoming
obs search --tag "incoming" --not-tag "fabric-extraction"

# Bibliography items
obs search --tag "bibliography"
```

### Pipeline Tag Assignment
The `ingest` pipeline should:
1. Add `incoming` + content-type tag
2. Process with fabric → add `fabric-extraction`
3. Add `wisdom` or `raw` based on processing
4. Detect people → add person tags
5. Detect projects → add project tags
6. User review → add `main` when complete

---

## Customization

Create your own taxonomy by:
1. Copy this file to your PAI installation
2. Update people tags with your contacts
3. Update project tags with your projects
4. Add topic tags relevant to your domain
5. Configure keyword detection in profile settings
