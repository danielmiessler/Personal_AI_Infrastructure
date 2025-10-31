# Example Template File

## Purpose
This is an example template file demonstrating how to organize reusable templates in the `assets/` directory.

## Template Structure

```markdown
# {{TITLE}}

## Overview
{{OVERVIEW_TEXT}}

## Details
{{DETAILED_CONTENT}}

## Configuration
- Setting 1: {{VALUE_1}}
- Setting 2: {{VALUE_2}}
- Setting 3: {{VALUE_3}}

## Results
{{EXPECTED_RESULTS}}
```

## Usage

### In Workflows
Reference this template from your workflows:
```markdown
Use template from assets/template.md:
1. Load template
2. Replace {{PLACEHOLDERS}}
3. Apply to task
4. Return result
```

### In Skills
Templates can be:
- Configuration templates
- Document templates
- Code templates
- Prompt templates
- Output format templates

## Example: Configuration Template

```yaml
# Application Configuration Template
name: {{APP_NAME}}
version: {{VERSION}}
environment: {{ENVIRONMENT}}

database:
  host: {{DB_HOST}}
  port: {{DB_PORT}}
  name: {{DB_NAME}}

features:
  feature1: {{FEATURE_1_ENABLED}}
  feature2: {{FEATURE_2_ENABLED}}
```

## Example: Document Template

```markdown
# {{DOCUMENT_TITLE}}

**Author:** {{AUTHOR}}
**Date:** {{DATE}}
**Status:** {{STATUS}}

## Executive Summary
{{SUMMARY}}

## Details
{{DETAILS}}

## Next Steps
1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}
```

## Best Practices

### Template Design
- ✅ Use clear {{PLACEHOLDER}} names
- ✅ Provide example values
- ✅ Document each placeholder
- ✅ Keep templates focused
- ❌ Don't make templates too complex
- ❌ Don't use ambiguous names

### Template Organization
- Store in `assets/` directory
- Name descriptively
- Group related templates
- Version if needed

### Template Usage
- Load when needed
- Replace placeholders systematically
- Validate after substitution
- Test with real data

## Notes
This is a demonstration template. Real templates should be specific to your use case and domain.
