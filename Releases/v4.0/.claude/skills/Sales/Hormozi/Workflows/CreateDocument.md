# Create Consulting Document

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the CreateDocument workflow in the Hormozi skill to create documents"}' \
  > /dev/null 2>&1 &
```

Running the **CreateDocument** workflow in the **Hormozi** skill to create documents...

**Purpose**: Interactive collaborative document creation for consulting proposals and reports using McKinsey-level templates with {YOUR_BUSINESS_NAME} branding.

**When to use**: When User wants to create professional consulting documents (AI Transition Advisory or Holistic Security Assessment) through conversational collaboration.

## How it works

1. **Choose Document Type**: AI Transition Proposal or Security Assessment Report
2. **Collaborative Content Creation**: Work together to fill in sections through conversation
3. **Variable Substitution**: Replace template variables with client-specific information  
4. **Professional PDF Generation**: Convert HTML to high-quality PDF using WeasyPrint
5. **Review and Refinement**: Iterate on content and styling until perfect

## Document Types Available

### AI Transition Advisory Proposal
- **Template**: `~/.claude/skills/consulting/templates/proposals/ai-transition-proposal.html`
- **Use Case**: Comprehensive AI transformation consulting proposals
- **Key Sections**: Executive Summary, AI Imperative, Transition Framework, Expected Outcomes, Investment Terms

### Holistic Security Assessment Report
- **Template**: `~/.claude/skills/consulting/templates/reports/security-assessment-report.html`
- **Use Case**: Comprehensive security posture assessment reports
- **Key Sections**: Executive Summary, Security Posture, Critical Findings, Risk Assessment, Strategic Recommendations

## Template Variables

### Common Variables (All Documents)
- `{{client_name}}` - Client company name
- `{{project_name}}` - Specific project/engagement name
- `{{document_title}}` - Main document title
- `{{document_subtitle}}` - Supporting subtitle
- `{{document_date}}` - Document creation date
- `{{document_version}}` - Version number (e.g., "1.0")
- `{{service_line}}` - Either "AI Transition Advisory" or "Holistic Security Assessment"

### AI Transition Proposal Variables
- `{{engagement_duration}}` - Total engagement length (e.g., "6")
- `{{successful_transitions}}` - Number of successful transitions guided
- `{{assessment_duration}}` - Phase 1 duration in weeks
- `{{planning_duration}}` - Phase 2 duration in weeks
- `{{implementation_planning_duration}}` - Phase 3 duration in weeks
- `{{transition_duration}}` - Phase 4 duration in weeks
- `{{total_investment}}` - Total project cost
- `{{projected_value}}` - Expected value creation
- `{{roi_percentage}}` - Return on investment percentage
- `{{roi_timeframe}}` - Months to achieve ROI

### Security Assessment Variables
- `{{assessment_domains}}` - Number of security domains evaluated
- `{{overall_risk_level}}` - Current risk level (High/Medium/Low)
- `{{critical_findings}}` - Number of critical issues found
- `{{maturity_score}}` - Security maturity rating (1-5)
- `{{strength_areas}}` - Areas of security strength
- `{{weakness_areas}}` - Areas needing improvement
- `{{high_priority_count}}` - Number of high-priority recommendations
- `{{risk_reduction}}` - Percentage risk reduction from recommendations

## Usage Instructions

### Start the Process
```
Hey, let's create a [AI transition proposal / security assessment report] for [Client Name]
```

### Interactive Collaboration
User and Claude work through each section:
- User provides client context and requirements
- Claude asks clarifying questions for each variable
- Together we craft compelling content for each section
- Claude suggests professional language and McKinsey-style phrasing

### Template Processing
1. Load the appropriate template from `templates/` directory
2. Replace all `{{variable}}` placeholders with client-specific content
3. Ensure all sections have appropriate content
4. Review for consistency and professional tone

### PDF Generation
```bash
cd ~/.claude/skills/consulting/templates
weasyprint [output-file.html] [client-name]-[document-type].pdf
```

## Example Workflow

**User**: "Let's create an AI transition proposal for ACME Corporation"

**Claude**: "Great! I'll use our AI Transition Advisory template. Let me gather the key information:
- What's the main project focus for ACME?
- How long do you envision the engagement? (typical is 6 months)
- What's their current AI maturity level?
- What's the proposed investment range?"

**User**: [Provides context through conversation]

**Claude**: [Creates customized document with:]
- Client-specific executive summary
- Tailored use cases and examples
- Appropriate timelines and investment levels
- Professional formatting with your branding

**Result**: Professional McKinsey-level consulting document ready for client presentation

## File Output Structure
```
~/.claude/skills/consulting/output/
├── [client-name]/
│   ├── [document-type]-v[version].html
│   ├── [document-type]-v[version].pdf
│   └── variables.json (for reference)
```

## Benefits

1. **Professional Quality**: McKinsey-level sophistication with your branding
2. **Collaborative Process**: Natural conversation creates better content
3. **Consistent Branding**: All documents use standardized brand design
4. **Variable Reuse**: Save client variables for future documents
5. **Rapid Iteration**: Easy to update and regenerate documents
6. **Custom Fonts**: Professional typography with Advocate font family

## Technical Details

- **HTML Templates**: Professional styling with CSS3 and print media queries
- **PDF Generation**: WeasyPrint for high-quality PDF output
- **Variable System**: Mustache-style templating for content substitution
- **Typography**: Custom Advocate fonts for premium appearance
- **Color Scheme**: {YOUR_BUSINESS_NAME} brand colors (#02349a primary)

This command transforms document creation from tedious template filling into engaging collaborative content development, producing professional consulting deliverables that reflect your expertise and brand standards.