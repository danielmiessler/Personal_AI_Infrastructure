# Fabric Workflow

Intelligent pattern selection for Fabric CLI. Automatically selects the right pattern from 242+ specialized prompts based on your intent - threat modeling, analysis, summarization, content creation, extraction, and more.

**USE WHEN** processing content, analyzing data, creating summaries, threat modeling, or transforming text.

## When to Activate This Skill

**Primary Use Cases:**
- "Create a threat model for..."
- "Summarize this article/video/paper..."
- "Extract wisdom/insights from..."
- "Analyze this [code/malware/claims/debate]..."
- "Improve my writing/code/prompt..."
- "Create a [visualization/summary/report]..."
- "Rate/review/judge this content..."

**The Goal:** Select the RIGHT pattern from 242+ available patterns based on what you're trying to accomplish.

## Pattern Selection Strategy

### 1. Identify Intent Category

**Threat Modeling & Security:**
- Threat model -> `create_threat_model` or `create_stride_threat_model`
- Threat scenarios -> `create_threat_scenarios`
- Security rules -> `create_sigma_rules`, `write_nuclei_template_rule`

**Summarization:**
- General summary -> `summarize`
- 5-sentence summary -> `create_5_sentence_summary`
- Meeting -> `summarize_meeting`
- Paper/research -> `summarize_paper`
- Video/YouTube -> `youtube_summary`

**Wisdom Extraction:**
- General wisdom -> `extract_wisdom`
- Article wisdom -> `extract_article_wisdom`
- Book ideas -> `extract_book_ideas`
- Insights -> `extract_insights`
- Main idea -> `extract_main_idea`

**Analysis:**
- Malware -> `analyze_malware`
- Code -> `analyze_code` or `review_code`
- Claims -> `analyze_claims`
- Debate -> `analyze_debate`
- Paper -> `analyze_paper`

**Content Creation:**
- PRD -> `create_prd`
- Design document -> `create_design_document`
- User story -> `create_user_story`
- Visualization -> `create_visualization`, `create_mermaid_visualization`

**Improvement:**
- Writing -> `improve_writing`
- Prompt -> `improve_prompt`
- Code -> `review_code`

**Rating/Evaluation:**
- AI response -> `rate_ai_response`
- Content quality -> `rate_content`
- General judgment -> `judge_output`

### 2. Execute Pattern

```bash
# Basic format
fabric [input] -p [selected_pattern]

# From URL
fabric -u "URL" -p [pattern]

# From YouTube
fabric -y "YOUTUBE_URL" -p [pattern]

# From file
cat file.txt | fabric -p [pattern]
```

## Pattern Categories (242 Total)

### Threat Modeling & Security (15 patterns)
- `create_threat_model` - General threat modeling
- `create_stride_threat_model` - STRIDE methodology
- `create_threat_scenarios` - Threat scenario generation
- `create_sigma_rules` - SIGMA detection rules
- `analyze_threat_report` - Threat report analysis

### Summarization (20 patterns)
- `summarize` - General summarization
- `create_5_sentence_summary` - Ultra-concise 5-line summary
- `summarize_meeting` - Meeting notes summary
- `summarize_paper` - Academic paper summary
- `youtube_summary` - YouTube video summary

### Extraction (30+ patterns)
- `extract_wisdom` - General wisdom extraction
- `extract_article_wisdom` - Article-specific wisdom
- `extract_book_ideas` - Book ideas
- `extract_insights` - General insights
- `extract_main_idea` - Core message

### Analysis (35+ patterns)
- `analyze_claims` - Claim analysis
- `analyze_malware` - Malware analysis
- `analyze_code` - Code analysis
- `analyze_paper` - Paper analysis
- `analyze_debate` - Debate analysis

### Creation (50+ patterns)
- `create_prd` - Product Requirements Document
- `create_design_document` - Design documentation
- `create_mermaid_visualization` - Mermaid diagrams
- `create_visualization` - General visualizations
- `create_threat_model` - Threat models

### Improvement (10 patterns)
- `improve_writing` - General writing improvement
- `improve_prompt` - Prompt engineering
- `review_code` - Code review
- `humanize` - Humanize AI text

### Rating/Judgment (8 patterns)
- `rate_ai_response` - Rate AI outputs
- `rate_content` - Rate content quality
- `judge_output` - General judgment

## Usage Examples

**Threat Modeling:**
```bash
fabric "API that handles user authentication" -p create_threat_model
```

**Summarization:**
```bash
fabric -u "https://example.com/blog-post" -p summarize
```

**Wisdom Extraction:**
```bash
fabric -y "https://youtube.com/watch?v=..." -p extract_wisdom
```

**Analysis:**
```bash
fabric "$(cat code.py)" -p analyze_code
```

## Key Insight

**The skill's value is in selecting the RIGHT pattern for the task.**

When user says "Create a threat model using Fabric", your job is to:
1. Recognize "threat model" intent
2. Know available options: `create_threat_model`, `create_stride_threat_model`
3. Select the best match
4. Execute: `fabric "[content]" -p create_threat_model`

**Not:** "Here are the patterns, pick one"
**Instead:** "I'll use `create_threat_model` for this" -> execute immediately
