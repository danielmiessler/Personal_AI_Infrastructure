# WORK

**Sensitive work-related content - customer data, consulting engagements, client deliverables.**

This directory is for business-sensitive materials that require strict isolation and protection.

---

## Security Classification: RESTRICTED

| Rule | Description |
|------|-------------|
| **No Public Sharing** | Content here must NEVER appear in the public PAI repository |
| **No Cross-Pollination** | Do not reference or copy WORK content into regular skills |
| **No Examples** | Never use WORK content as examples in documentation |
| **Customer Isolation** | Each customer/project has its own subdirectory with strict isolation |

---

## What Belongs Here

NOTE: It's up to you how safe you feel putting content here based on the security layers you have in place. EXERCISE CAUTION AND JUDGEMENT.

- Business basics
- SOWs, Templates, etc.
- Consulting deliverables
- Client-specific configurations
- Business-sensitive research
- NDA-protected content
- Proprietary methodologies for clients

---

## What Does NOT Belong Here

- General PAI system files (use SYSTEM/)
- Personal non-work content (use other USER/ files)
- Open source contributions
- Content intended for public sharing

---

## Directory Structure

```
WORK/
├── Customers/           # Client-specific subdirectories
├── Documents/           # Business-related documentation
│   ├── [customer-a]/    # Isolated customer workspace
│   └── [customer-b]/    # Another isolated workspace
├── Consulting/          # General consulting materials
└── Engagements/         # Active project tracking
```

---

## Privacy Enforcement

The System skill's `PrivacyCheck` workflow validates that:

1. No WORK content exists outside WORK/ or USER/ directories
2. No customer data appears in regular skills
3. No sensitive paths are referenced in public-facing documentation
4. Cross-repo validation ensures nothing leaks to public repositories

---

*Keep work-sensitive content isolated here. Your AI will reference this for client context while maintaining strict boundaries.*
