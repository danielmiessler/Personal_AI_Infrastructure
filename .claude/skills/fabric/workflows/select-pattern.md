# Select Fabric Pattern Workflow

## Trigger
User says: "use fabric", "select fabric pattern", "what fabric pattern"

## Purpose
Intelligently select the right Fabric pattern from 242+ options based on user intent.

## Workflow

### 1. Understand Intent
Analyze what user wants to accomplish:
- Summarization?
- Threat modeling?
- Content extraction?
- Analysis?
- Creation?

### 2. Pattern Categories

**Security (15 patterns):**
- create_threat_model
- create_security_update
- analyze_threat_report
- find_hidden_message

**Summarization (20 patterns):**
- summarize
- extract_wisdom
- extract_article_wisdom
- create_summary

**Extraction (30+ patterns):**
- extract_ideas
- extract_recommendations
- extract_references
- extract_sponsors

**Analysis (35+ patterns):**
- analyze_claims
- analyze_paper
- analyze_tech_impact
- rate_content

**Creation (50+ patterns):**
- write_essay
- create_visualization
- write_micro_essay
- create_coding_project

### 3. Select Pattern
Match intent to appropriate pattern based on:
- Primary goal
- Input type
- Desired output
- Domain (security, content, technical, etc.)

### 4. Execute Pattern
```bash
# Via fabric CLI
cat input.txt | fabric --pattern pattern_name

# Or direct invocation
fabric --pattern create_threat_model < threat_description.txt
```

### 5. Review Output
- Verify pattern selection was appropriate
- Adjust if needed
- Save results

## Common Patterns
- **extract_wisdom**: Pull key insights from content
- **summarize**: Create concise summary
- **create_threat_model**: Security threat modeling
- **analyze_claims**: Evaluate arguments
- **extract_recommendations**: Get actionable advice

## Reference
See main fabric skill for complete pattern list and examples.
