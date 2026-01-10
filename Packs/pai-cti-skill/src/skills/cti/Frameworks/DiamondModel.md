# Diamond Model Reference

Framework for intrusion analysis structuring.

## Core Features

```
                ADVERSARY
                   /\
                  /  \
                 /    \
                /      \
   CAPABILITY ◄────────► INFRASTRUCTURE
                \      /
                 \    /
                  \  /
                   \/
                 VICTIM
```

## Feature Definitions

### Adversary
**Who is conducting the intrusion?**

| Attribute | Description |
|-----------|-------------|
| Name | Known name or identifier |
| Type | Individual, group, organization, nation-state |
| Motivation | Financial, espionage, hacktivism, disruption |
| Capability level | Script kiddie → Nation-state |
| Attribution confidence | High, Medium, Low, Unknown |

**Questions:**
- Who is behind this activity?
- What is their motivation?
- What is their capability level?
- Have they been seen before?

---

### Capability
**What tools and techniques are used?**

| Attribute | Description |
|-----------|-------------|
| Malware | Malware families used |
| Tools | Legitimate tools abused |
| Exploits | Vulnerabilities exploited |
| Techniques | TTPs (MITRE ATT&CK) |
| Sophistication | Custom, modified, commodity |

**Questions:**
- What malware was used?
- What exploits were leveraged?
- What techniques were employed?
- Is this custom or commodity?

---

### Infrastructure
**What resources support the operation?**

| Attribute | Description |
|-----------|-------------|
| Domains | C2 domains, phishing domains |
| IP addresses | C2 IPs, staging servers |
| Email addresses | Sender addresses |
| Certificates | SSL certificates used |
| Hosting | Bulletproof hosting, compromised hosts |

**Questions:**
- What domains/IPs were used?
- Who owns the infrastructure?
- Is it adversary-owned or compromised?
- What patterns exist?

---

### Victim
**Who is being targeted?**

| Attribute | Description |
|-----------|-------------|
| Organization | Target company/entity |
| Sector | Industry/vertical |
| Geography | Country/region |
| Assets | Systems, data targeted |
| Persona | Specific individuals |

**Questions:**
- Who was targeted?
- What sector are they in?
- What assets were at risk?
- Is there a pattern of targeting?

---

## Meta-Features

| Meta-Feature | Description |
|--------------|-------------|
| **Timestamp** | When did events occur? |
| **Phase** | Kill chain phase |
| **Result** | Success, failure, unknown |
| **Direction** | Adv→Infra, Infra→Victim |
| **Methodology** | Spearphishing, watering hole |
| **Resources** | Investment required |
| **Social-Political** | Geopolitical context |

---

## Analytical Pivoting

**From one feature, discover others:**

```
ADVERSARY → Find their typical:
  └→ Capabilities (malware they use)
  └→ Infrastructure (domains they register)
  └→ Victims (sectors they target)

CAPABILITY → Find:
  └→ Other adversaries using same tool
  └→ Infrastructure associated with tool
  └→ Historical victims

INFRASTRUCTURE → Find:
  └→ Other domains on same IP
  └→ Registration patterns
  └→ Previous campaigns using same infra

VICTIM → Find:
  └→ Other orgs in same sector targeted
  └→ Common adversaries for sector
  └→ Shared vulnerabilities
```

---

## Activity Threads

Link multiple Diamond events to show intrusion progression:

```
Event 1 (Recon)    Event 2 (Delivery)    Event 3 (C2)
     |                   |                   |
     v                   v                   v
[Diamond 1]  ──→  [Diamond 2]  ──→  [Diamond 3]
```

---

## Template

```yaml
diamond_analysis:
  adversary:
    name: "APT29"
    aliases: ["Cozy Bear", "The Dukes"]
    type: "nation-state"
    motivation: "espionage"
    country: "Russia"
    confidence: 75

  capability:
    malware:
      - name: "WellMess"
        type: "RAT"
      - name: "WellMail"
        type: "tool"
    techniques:
      - id: "T1566.001"
        name: "Spearphishing Attachment"
      - id: "T1059.001"
        name: "PowerShell"
    sophistication: "expert"

  infrastructure:
    domains:
      - value: "evil-c2.com"
        type: "c2"
        confidence: "high"
    ips:
      - value: "198.51.100.1"
        type: "c2"
        hosting: "bulletproof"
    email:
      - value: "spoof@legitimate.org"
        type: "sender"

  victim:
    organizations: ["Target Corp"]
    sectors: ["government", "healthcare"]
    countries: ["US", "UK"]
    assets: ["research data", "PII"]

  meta_features:
    timestamp: "2025-06-01 to 2026-01-01"
    phase: "Actions on Objectives"
    result: "partial success"
    methodology: "spearphishing"
    social_political: "Geopolitical tensions"
```

---

## Resources

- Original Paper: "The Diamond Model of Intrusion Analysis" (2013)
- https://apps.dtic.mil/sti/pdfs/ADA586960.pdf
