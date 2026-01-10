# osint skill - Quick Reference

## Commands

```bash
# Individual/Username
/osint username <username>
/osint social <@handle>
/osint profile <target>
/osint timeline <target>

# Domain/Infrastructure
/osint domain <domain>
/osint infra <IP/range>

# Company Research
/osint company <name>
/osint structure <name>
/osint financials <name>
/osint competitors <name>
/osint risk <name>

# Analysis
/osint link <entity1> <entity2>
/osint report <investigation>
```

## Natural Language Examples

### Username/Person
```
Find all accounts for username johndoe
Capture social profile for @target_user
Create complete profile for John Smith
Analyze activity timeline for target
```

### Domain/Infrastructure
```
Investigate domain example.com
Map infrastructure for 192.168.1.0/24
```

### Company Research
```
Company profile on Acme Corporation
Who owns XYZ Inc?
What's the financial status of TechCorp?
Analyze competitors for Acme
Run risk check on vendor ABC
```

### Analysis
```
Link these accounts together
Generate intelligence report
```

## Scope Levels

Add scope to any request:

```
Run a light company profile on Acme
Run a comprehensive risk assessment on ABC Corp
```

| Level | Depth | Time |
|-------|-------|------|
| light | Basics only | ~10 min |
| standard | Core analysis | ~25 min |
| comprehensive | Full deep-dive | ~45+ min |

## Output Locations

| Type | Location |
|------|----------|
| Knowledge Graph | Queryable via knowledge skill |
| Report Files | `~/.claude/history/research/osint/` |

## Querying Past Research

```
Search knowledge for "company name"
What do I know about target?
Show relationships for entity
```

## Confidence Levels

| Level | Meaning |
|-------|---------|
| Confirmed | Official/authoritative source |
| High | Multiple corroborating sources |
| Medium | Single reliable source |
| Low | Unverified |

## Risk Scores

| Score | Level |
|-------|-------|
| 0-2 | Low |
| 3-5 | Moderate |
| 6-8 | High |
| 9-10 | Critical |

## Dependencies

- **browser** skill - Web scraping
- **knowledge** skill - Data persistence

## File Naming

Reports saved as:
```
{workflow}_{target}_{date}.md

Examples:
company_acme_2026-01-10.md
risk_vendor_2026-01-10.md
```
