# Target Profile Workflow

Create comprehensive target profile by combining all OSINT workflows.

## Trigger Phrases
- "full profile"
- "complete investigation"
- "target dossier"
- "comprehensive OSINT"
- "full reconnaissance"

## Input
- `target`: Primary identifier (username, email, domain, or name)
- `scope` (optional): light, standard, comprehensive

## Process

### Step 1: Initial Target Analysis
```
Determine target type:
- Person
- Organization
- Domain/Website
- Infrastructure

Identify starting points:
- Primary identifier
- Known aliases
- Associated entities
```

### Step 2: Execute Sub-Workflows

Run workflows in order:

1. **Username Reconnaissance** (if person)
   - Enumerate across platforms
   - Build account list

2. **Domain Reconnaissance** (if domain/org)
   - DNS, WHOIS, SSL
   - Subdomain enumeration

3. **Social Media Capture**
   - Profile metadata
   - Network analysis
   - Content themes

4. **Infrastructure Mapping** (if technical target)
   - Port scanning
   - Technology detection

5. **Entity Linking**
   - Cross-reference all discovered identities
   - Confirm connections

6. **Timeline Analysis**
   - Activity patterns
   - Account history

### Step 3: Consolidate Findings
```
Merge all workflow outputs:
- Deduplicate entities
- Resolve conflicts
- Calculate confidence scores
- Generate unified entity graph
```

### Step 4: Risk Assessment
```
Evaluate:
- Information exposure level
- Security posture
- Potential vulnerabilities
- Attack surface
```

### Step 5: Generate Comprehensive Report
```
Compile IntelReport with all findings
```

### Step 6: Store to Knowledge Graph

Use the **knowledge** skill to persist the complete profile:

```
Store the following as structured episodes:

1. Target Profile:
   - Name: "Profile: {target}"
   - Data: Target type, primary identifiers, key findings summary
   - Group: "osint-profiles"

2. Identity Summary:
   - Name: "Identity: {target}"
   - Data: Confirmed name, aliases, email, location, occupation
   - Confidence levels for each attribute

3. Digital Footprint:
   - Name: "Footprint: {target}"
   - Data: All platforms, domains, infrastructure summary
   - Relationships: owns, uses, controls

4. Network Graph:
   - Name: "Network: {target}"
   - Data: Key relationships, organizations, geographic associations
   - Relationships: works_at, collaborates_with, follows

5. Risk Assessment:
   - Name: "Risk: {target}"
   - Data: Exposure level, security posture, attack surface
   - Recommendations

6. Investigation Metadata:
   - Name: "Investigation: {target}_{date}"
   - Data: Duration, entities discovered, relationships mapped, scope level
   - Source attribution and methodology
```

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    COMPREHENSIVE TARGET PROFILE
                         INVESTIGATION DOSSIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFICATION: UNCLASSIFIED
REPORT DATE: 2026-01-09
REPORT ID: OSINT-PROFILE-2026-001
ANALYST: PAI OSINT Skill

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target Type: Individual
Primary Identifier: johndoe
Investigation Scope: Comprehensive

Key Findings:
• Active presence on 15 platforms
• Confirmed identity across 8 accounts
• Professional: Software Engineering
• Location: San Francisco, CA (High Confidence)
• Associated with 2 organizations

Overall Exposure Level: MODERATE-HIGH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2: IDENTITY OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 Primary Identifiers
┌────────────────┬────────────────────────────┬────────────┐
│ Attribute      │ Value                      │ Confidence │
├────────────────┼────────────────────────────┼────────────┤
│ Primary Name   │ John Doe                   │ High       │
│ Username       │ johndoe                    │ Confirmed  │
│ Email          │ john@example.com           │ Medium     │
│ Location       │ San Francisco, CA          │ High       │
│ Occupation     │ Software Engineer          │ High       │
│ Age Range      │ 28-35                      │ Medium     │
└────────────────┴────────────────────────────┴────────────┘

2.2 Known Aliases
• @johndoe (Twitter)
• jdoe (GitHub)
• john-doe (LinkedIn)
• johndoe123 (Reddit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3: DIGITAL FOOTPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1 Platform Presence

┌──────────────┬─────────────┬────────────┬───────────────┐
│ Platform     │ Username    │ Status     │ Followers     │
├──────────────┼─────────────┼────────────┼───────────────┤
│ Twitter/X    │ @johndoe    │ Active     │ 2,500         │
│ GitHub       │ jdoe        │ Active     │ 150           │
│ LinkedIn     │ john-doe    │ Active     │ 500+          │
│ Reddit       │ johndoe123  │ Active     │ 1,234 karma   │
│ Medium       │ johndoe     │ Inactive   │ 45            │
└──────────────┴─────────────┴────────────┴───────────────┘

3.2 Owned Domains
• johndoe.dev (Active, personal website)
• johndoe.io (Redirects to .dev)

3.3 Associated Organizations
• TechCorp Inc (Current employer)
• Open Source Project X (Contributor)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4: NETWORK ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 Relationship Graph

                    ┌─────────────┐
                    │  TechCorp   │
                    │   (Employer)│
                    └──────┬──────┘
                           │ works_at
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Colleague A  │  │   JOHNDOE     │  │  Colleague B  │
│               │◄─│   (Target)    │─►│               │
└───────────────┘  └───────┬───────┘  └───────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Project A│ │ Project B│ │Influencer│
        └──────────┘ └──────────┘ └──────────┘

4.2 Key Connections
• 45 mutual connections with tech industry professionals
• Active in 3 professional communities
• Regularly interacts with 12 specific accounts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5: TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2015 ●──── Twitter account created
2016 ●──── First public commits (GitHub)
2018 ●──── Joined TechCorp (LinkedIn)
2020 ●──── Registered johndoe.dev
2024 ●──── Promoted to Senior Engineer
2026 ●──── Last activity: 2 hours ago

Activity Pattern: Weekdays 9am-6pm PST
Inferred Time Zone: PST (High Confidence)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 6: INFRASTRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6.1 Personal Website (johndoe.dev)
• Hosting: Vercel
• CDN: Cloudflare
• Tech Stack: Next.js, React
• SSL: Valid (Let's Encrypt)

6.2 Associated IPs
• 76.xxx.xxx.xxx (Cloudflare)
• No direct infrastructure exposed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 7: RISK ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7.1 Information Exposure
• Personal Info: MODERATE (name, location, employer)
• Professional: HIGH (work history, skills, projects)
• Contact Info: LOW (no direct email/phone exposed)

7.2 Security Posture
• Uses Cloudflare protection: GOOD
• No credentials in breaches: GOOD
• 2FA status: UNKNOWN

7.3 Attack Surface
• Primary vectors: Social engineering, spear phishing
• Technical vectors: Minimal (no exposed infrastructure)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 8: APPENDICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. Sources Used
• Public social media profiles
• WHOIS databases
• Certificate transparency logs
• Public code repositories

B. Methodology
• Passive OSINT techniques only
• No active engagement with target
• All sources publicly accessible

C. Confidence Matrix
┌────────────────────┬────────────┬─────────┐
│ Finding            │ Confidence │ Sources │
├────────────────────┼────────────┼─────────┤
│ Identity confirmed │ 95%        │ 5       │
│ Location           │ 85%        │ 3       │
│ Employment         │ 90%        │ 2       │
│ Timeline accuracy  │ 80%        │ 4       │
└────────────────────┴────────────┴─────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                         END OF REPORT

Generated by PAI OSINT Skill v1.0.0
Investigation Duration: 15 minutes
Entities Discovered: 23
Relationships Mapped: 45

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
📁 Report saved: $PAI_DIR/history/research/osint/profile_johndoe_2026-01-09.md
```

## Scope Levels

### Light
- Username enumeration
- Basic social media capture
- ~5 minute investigation

### Standard (Default)
- All above plus
- Domain reconnaissance
- Entity linking
- Timeline analysis
- ~15 minute investigation

### Comprehensive
- All workflows
- Deep network analysis
- Historical research
- Full report generation
- ~30+ minute investigation

## Ethical Notes
- Always verify authorization before investigation
- Document all methods for audit trail
- Note confidence levels accurately
- Protect collected intelligence appropriately
- Do not use for harassment or stalking
