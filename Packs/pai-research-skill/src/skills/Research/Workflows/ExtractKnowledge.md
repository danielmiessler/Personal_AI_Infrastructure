# Extract Knowledge Workflow

Intelligently extracts knowledge and signal points from any input source (URLs, YouTube videos, PDFs, presentations, research papers, etc.). Automatically detects content type, fetches content using appropriate methods, analyzes the domain focus, and generates structured insights with actionable recommendations.

## Usage

```
/extract-knowledge <source> [--focus=<domain>]
```

**Examples:**
- `/extract-knowledge https://example.com/article` - Extract from web article
- `/extract-knowledge https://youtube.com/watch?v=abc123` - Extract from YouTube video
- `/extract-knowledge /path/to/document.pdf` - Extract from PDF
- `/extract-knowledge https://presentation.com/slides --focus=security` - Extract security insights
- `/extract-knowledge "direct text content"` - Analyze text directly

**Focus domains:** security, business, research, wisdom, general (auto-detected if not specified)

## Workflow

### Step 1: Detect Source Type and Fetch Content

**YouTube Videos** (youtube.com, youtu.be):
```bash
fabric --youtube "<url>"
```

**Web URLs** (http/https):
```bash
fabric -u "<url>"
# If that fails, use Bright Data MCP
mcp__brightdata__scrape_as_markdown url="<url>"
```

**PDFs and Files**:
Read the file directly using the Read tool

### Step 2: Analyze Content Domain

If `--focus` is not specified, auto-detect from content:
- **Security**: vulnerability, hack, exploit, cybersecurity, attack, defense
- **Business**: money, revenue, profit, market, strategy, business
- **Research**: study, experiment, methodology, findings, academic
- **Wisdom**: philosophy, principle, life, wisdom, insight, experience
- **General**: everything else

### Step 3: Extract Knowledge

**For Security Content:**
- Extract attack vectors, vulnerabilities, defensive measures
- Generate technical security recommendations

**For Business Content:**
- Extract revenue opportunities, market insights, growth strategies
- Generate business action items

**For Research Content:**
- Extract key findings, methodology insights, technical details
- Rate research quality and reproducibility

**For Wisdom Content:**
- Extract life principles, philosophical insights, practical wisdom
- Generate memorable quotes and aphorisms

**For General Content:**
- Extract key concepts, important facts, learning opportunities

### Step 4: Output Format

```
KNOWLEDGE EXTRACTION RESULTS
==============================
Source: <source>
Type: <detected_type>
Domain: <detected_domain>
Quality Rating: <1-10>/10
Confidence: <1-10>/10

CONTENT SUMMARY:
<2-3 sentence summary>

KEY INSIGHTS:
- <insight 1>
- <insight 2>
- <insight 3>

SIGNAL POINTS:
- <signal point 1>
- <signal point 2>
- <signal point 3>

ACTIONABLE RECOMMENDATIONS:
- <recommendation 1>
- <recommendation 2>
- <recommendation 3>

RELATED CONCEPTS:
<comma-separated list of key terms>

[Optional sections based on domain:]
EXTRACTED WISDOM: (for wisdom content)
"<key quotes and insights>"

TECHNICAL DETAILS: (for security/research content)
- <technical detail 1>
- <technical detail 2>
==============================
```

## Domain-Specific Signal Points

**Security Domain:**
- New attack vectors identified
- Defensive strategies recommended
- Vulnerability assessment techniques
- Security tools and frameworks mentioned

**Business Domain:**
- Revenue opportunities identified
- Market insights discovered
- Business strategies outlined
- Growth tactics documented

**Research Domain:**
- Research findings summarized
- Methodology insights extracted
- Key contributions identified
- Future work directions noted

**Wisdom Domain:**
- Life principles identified
- Philosophical insights extracted
- Practical wisdom discovered
- Universal truths highlighted

## Quality Rating Criteria

- **9-10**: Comprehensive, actionable, high-value insights
- **7-8**: Good insights with clear recommendations
- **5-6**: Moderate value, some useful information
- **3-4**: Limited insights, basic information
- **1-2**: Poor quality or insufficient content
