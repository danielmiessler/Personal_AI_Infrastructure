---
name: osint
description: AI-powered Open Source Intelligence collection and analysis. USE WHEN user mentions OSINT, reconnaissance, investigation, username lookup, domain analysis, social media intel, intelligence gathering, company research, corporate intelligence, due diligence, or business investigation.
triggers:
  - osint
  - reconnaissance
  - recon
  - investigate
  - username lookup
  - domain lookup
  - whois
  - social media intel
  - intelligence gathering
  - target profile
  - digital footprint
  - company research
  - corporate intelligence
  - due diligence
  - business investigation
  - company profile
  - competitor analysis
  - financial recon
  - risk assessment
  - corporate structure
  - email lookup
  - email recon
  - breach check
  - phone lookup
  - phone number
  - reverse phone
  - image search
  - reverse image
  - photo analysis
  - exif
---

# osint skill

AI-powered Open Source Intelligence collection and analysis system.

## Intent Routing

When the user requests OSINT activities, route to the appropriate workflow:

### Username Reconnaissance
**Triggers:** "find username", "check username", "username lookup", "where is this user"
**Workflow:** UsernameRecon.md
```
User: Find all accounts for username "johndoe"
→ Execute UsernameRecon workflow
```

### Domain Reconnaissance
**Triggers:** "domain info", "whois", "dns lookup", "subdomains", "domain recon"
**Workflow:** DomainRecon.md
```
User: Investigate domain example.com
→ Execute DomainRecon workflow
```

### Social Media Capture
**Triggers:** "social media profile", "capture profile", "social intel", "profile analysis"
**Workflow:** SocialCapture.md
```
User: Capture social profile for @target_user
→ Execute SocialCapture workflow
```

### Infrastructure Mapping
**Triggers:** "infrastructure", "shodan", "ports", "services", "ip scan"
**Workflow:** InfraMapping.md
```
User: Map infrastructure for 192.168.1.0/24
→ Execute InfraMapping workflow
```

### Entity Linking
**Triggers:** "link entities", "connect accounts", "find connections", "identity resolution"
**Workflow:** EntityLinking.md
```
User: Find connections between these accounts
→ Execute EntityLinking workflow
```

### Timeline Analysis
**Triggers:** "timeline", "activity pattern", "when active", "temporal analysis"
**Workflow:** TimelineAnalysis.md
```
User: Analyze activity timeline for target
→ Execute TimelineAnalysis workflow
```

### Intelligence Report
**Triggers:** "report", "summary", "intel report", "dossier", "findings"
**Workflow:** IntelReport.md
```
User: Generate intelligence report
→ Execute IntelReport workflow
```

### Target Profile
**Triggers:** "full profile", "complete investigation", "target dossier", "comprehensive"
**Workflow:** TargetProfile.md
```
User: Create complete profile for target
→ Execute TargetProfile workflow (combines multiple workflows)
```

---

## Digital Artifact Analysis

### Email Reconnaissance
**Triggers:** "email lookup", "email recon", "check email", "email OSINT", "breach check email", "who owns this email"
**Workflow:** EmailRecon.md
```
User: Investigate email address john@example.com
→ Execute EmailRecon workflow
```

### Phone Number Reconnaissance
**Triggers:** "phone lookup", "phone number", "reverse phone", "caller ID", "who called", "phone OSINT"
**Workflow:** PhoneRecon.md
```
User: Look up phone number +1-555-123-4567
→ Execute PhoneRecon workflow
```

### Image Reconnaissance
**Triggers:** "image search", "reverse image", "photo analysis", "exif data", "where was this photo taken", "image forensics", "is this image real"
**Workflow:** ImageRecon.md
```
User: Analyze this image for metadata and find similar images
→ Execute ImageRecon workflow
```

---

## Company & Business Research

### Company Profile
**Triggers:** "company profile", "business investigation", "company research", "corporate intelligence", "company due diligence"
**Workflow:** CompanyProfile.md
```
User: Investigate Acme Corporation
→ Execute CompanyProfile workflow (comprehensive company dossier)
```

### Corporate Structure
**Triggers:** "corporate structure", "who owns", "ownership", "subsidiaries", "parent company", "directors", "org chart"
**Workflow:** CorporateStructure.md
```
User: Show me the ownership structure of XYZ Inc
→ Execute CorporateStructure workflow
```

### Financial Reconnaissance
**Triggers:** "financial recon", "company financials", "SEC filings", "funding history", "investor info", "valuation"
**Workflow:** FinancialRecon.md
```
User: What's the financial status of TechCorp?
→ Execute FinancialRecon workflow
```

### Competitor Analysis
**Triggers:** "competitor analysis", "competitive landscape", "market position", "who competes with"
**Workflow:** CompetitorAnalysis.md
```
User: Analyze competitors for Acme Corp
→ Execute CompetitorAnalysis workflow
```

### Risk Assessment
**Triggers:** "risk assessment", "due diligence", "litigation history", "adverse media", "sanctions check"
**Workflow:** RiskAssessment.md
```
User: Run a risk check on potential vendor
→ Execute RiskAssessment workflow
```

## Example Invocations

Use natural language to invoke OSINT workflows:

**Username enumeration:**
- "Find all accounts for username johndoe"
- "Check username johndoe across platforms"
- "Where is username johndoe registered"

**Domain reconnaissance:**
- "Investigate domain example.com"
- "Get WHOIS and DNS for example.com"
- "Show me subdomains for example.com"

**Social media capture:**
- "Capture social profile for @target_user"
- "Get profile data from twitter.com/user"
- "Extract social media intelligence"

**Infrastructure mapping:**
- "Map infrastructure for 192.168.1.0/24"
- "Scan ports on example.com"
- "What services are running on target"

**Entity linking:**
- "Find connections between these accounts"
- "Link entities across platforms"
- "Resolve identity for username X"

**Timeline analysis:**
- "Analyze activity timeline for target"
- "When was this account most active"
- "Show temporal patterns"

**Intelligence reporting:**
- "Generate intel report for Investigation Alpha"
- "Create dossier from findings"
- "Summarize collected intelligence"

**Target profiling:**
- "Full profile for target johndoe"
- "Comprehensive investigation of username X"
- "Complete dossier for company"

**Digital Artifact Analysis:**
- "Email lookup john@example.com"
- "Check if email was breached"
- "Phone lookup +1-555-123-4567"
- "Analyze this image for metadata"
- "Reverse image search"

**Company & Business Research:**
- "Company profile Acme Corporation"
- "Corporate structure of XYZ Inc"
- "Financials for TechCorp"
- "Competitor analysis for Acme Corp"
- "Risk assessment on potential vendor"

## Dependencies

This skill works standalone but recommends:
- **pai-browser-skill** - For web scraping and JavaScript-heavy sites
- **pai-knowledge-system** - For storing entities and relationships to knowledge graph (required for full functionality)

## Ethical Guidelines

Before any OSINT operation:

1. **Verify Authorization** - Ensure you have legitimate purpose
2. **Check Legal Boundaries** - Respect privacy laws and platform ToS
3. **Maintain OPSEC** - Use appropriate anonymization if needed
4. **Document Everything** - Maintain audit trail of collection methods
5. **Store Securely** - Protect collected intelligence appropriately

## Output Format

All OSINT operations output in structured format:

```
📋 OSINT REPORT: [Operation Type]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TARGET: [Target identifier]
📅 DATE: [Collection timestamp]
🔍 METHOD: [Collection method]

📊 FINDINGS:
[Structured findings]

🔗 RELATIONSHIPS:
[Entity relationships discovered]

⚠️ CONFIDENCE: [High/Medium/Low]
📝 NOTES: [Analyst notes]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: [Yes/No]
```
