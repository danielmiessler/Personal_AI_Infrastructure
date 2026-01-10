# Skill Authoring Best Practices

> Learn how to write effective Skills that Claude can discover and use successfully.

Good Skills are concise, well-structured, and tested with real usage. This guide provides practical authoring decisions to help you write Skills that Claude can discover and use effectively.

## Core Principles

### Concise is Key

The context window is a public good. Your Skill shares the context window with everything else Claude needs to know.

**Default assumption**: Claude is already very smart

Only add context Claude doesn't already have. Challenge each piece of information:
- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

**Good example: Concise** (approximately 50 tokens):

```markdown
## Extract PDF text

Use pdfplumber for text extraction:

\`\`\`python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
\`\`\`
```

**Bad example: Too verbose** (approximately 150 tokens):

```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing...
```

The concise version assumes Claude knows what PDFs are and how libraries work.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability.

**High freedom** (text-based instructions):
- Multiple approaches are valid
- Decisions depend on context
- Heuristics guide the approach

**Medium freedom** (pseudocode or scripts with parameters):
- A preferred pattern exists
- Some variation is acceptable
- Configuration affects behavior

**Low freedom** (specific scripts, few or no parameters):
- Operations are fragile and error-prone
- Consistency is critical
- A specific sequence must be followed

**Analogy**: Think of Claude as a robot exploring a path:
- **Narrow bridge with cliffs**: Only one safe way forward. Provide specific guardrails (low freedom).
- **Open field with no hazards**: Many paths lead to success. Give general direction (high freedom).

## Skill Structure

### YAML Frontmatter Requirements

The SKILL.md frontmatter supports two fields:
- `name` - TitleCase name of the Skill (64 characters maximum)
- `description` - One-line description of what the Skill does and when to use it (1024 characters maximum)

### Naming Conventions

Use consistent naming patterns. For PAI, use **TitleCase** for skill names:

**Good naming examples**:
- "ProcessingPDFs"
- "AnalyzingSpreadsheets"
- "ManagingDatabases"

**Avoid**:
- Vague names: "Helper", "Utils", "Tools"
- Overly generic: "Documents", "Data", "Files"
- Inconsistent patterns within your skill collection

### Writing Effective Descriptions

The `description` field enables Skill discovery and should include both what the Skill does and when to use it.

**Always write in third person.** The description is injected into context.
- **Good:** "Processes Excel files and generates reports"
- **Avoid:** "I can help you process Excel files"

**Be specific and include key terms:**

```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. USE WHEN working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

### Progressive Disclosure Patterns

SKILL.md serves as an overview that points Claude to detailed materials as needed.

**Practical guidance:**
- Keep SKILL.md body under 500 lines for optimal performance
- Split content into separate files when approaching this limit
- Use cross-references to load content only when needed

**Example structure:**
```
skill-name/
├── SKILL.md              # Main instructions (loaded when triggered)
├── REFERENCE.md          # API reference (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── Tools/
    └── helper.ts         # Utility script (executed, not loaded)
```

### Avoid Deeply Nested References

Claude may partially read files when they're referenced from other referenced files.

**Keep references one level deep from SKILL.md.**

**Bad: Too deep**:
```markdown
# SKILL.md
See [advanced.md](advanced.md)...

# advanced.md
See [details.md](details.md)...

# details.md
Here's the actual information...
```

**Good: One level deep**:
```markdown
# SKILL.md

**Basic usage**: [instructions in SKILL.md]
**Advanced features**: See [advanced.md](advanced.md)
**API reference**: See [reference.md](reference.md)
```

## Workflows and Feedback Loops

### Use Workflows for Complex Tasks

Break complex operations into clear, sequential steps. For complex workflows, provide a checklist:

```markdown
## Research synthesis workflow

Copy this checklist and track your progress:

- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```

### Implement Feedback Loops

**Common pattern**: Run validator → fix errors → repeat

This pattern greatly improves output quality.

## Content Guidelines

### Avoid Time-Sensitive Information

Don't include information that will become outdated.

**Good: Use "old patterns" section**:
```markdown
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns

<details>
<summary>Legacy v1 API (deprecated)</summary>
The v1 API used: `api.example.com/v1/messages`
</details>
```

### Use Consistent Terminology

Choose one term and use it throughout the Skill:
- Always "API endpoint" (not mixing with "URL", "API route", "path")
- Always "field" (not mixing with "box", "element", "control")

## Common Patterns

### Template Pattern

Provide templates for output format. Match the level of strictness to your needs.

### Examples Pattern

For Skills where output quality depends on seeing examples, provide input/output pairs.

### Conditional Workflow Pattern

Guide Claude through decision points:

```markdown
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below
```

## Evaluation and Iteration

### Build Evaluations First

**Create evaluations BEFORE writing extensive documentation.**

**Evaluation-driven development:**
1. **Identify gaps**: Run Claude on tasks without a Skill. Document failures
2. **Create evaluations**: Build scenarios that test these gaps
3. **Establish baseline**: Measure Claude's performance without the Skill
4. **Write minimal instructions**: Create just enough content to address gaps
5. **Iterate**: Execute evaluations, compare against baseline, refine

### Develop Skills Iteratively with Claude

Work with one instance ("Claude A") to create a Skill used by other instances ("Claude B"):
1. Complete a task without a Skill - notice what context you provide
2. Identify the reusable pattern
3. Ask Claude A to create a Skill capturing that pattern
4. Review for conciseness
5. Test on similar tasks with Claude B
6. Iterate based on observation

## Anti-Patterns to Avoid

### Avoid Offering Too Many Options

Don't present multiple approaches unless necessary:

**Bad: Too many choices**:
"You can use pypdf, or pdfplumber, or PyMuPDF, or..."

**Good: Provide a default**:
"Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."

## Checklist for Effective Skills

Before deploying a Skill, verify:

### Core Quality
- [ ] Description is specific and includes key terms
- [ ] Description includes both what the Skill does and when to use it
- [ ] SKILL.md body is under 500 lines
- [ ] Additional details are in separate files (if needed)
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep
- [ ] Workflows have clear steps

### Testing
- [ ] Tested with real usage scenarios
- [ ] Iterated based on observed behavior
