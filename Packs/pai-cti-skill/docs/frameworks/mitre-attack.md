# MITRE ATT&CK Mapping Guide

> How to map threat intelligence to MITRE ATT&CK

---

## Overview

MITRE ATT&CK (Adversarial Tactics, Techniques, and Common Knowledge) is a knowledge base of adversary behaviors based on real-world observations. It provides a common language for describing threat actor tactics and techniques.

---

## Key Concepts

### Hierarchy

```
MATRIX (Enterprise, Mobile, ICS)
    |
    +-> TACTIC (The adversary's goal)
           |
           +-> TECHNIQUE (How they achieve it)
                  |
                  +-> SUB-TECHNIQUE (Specific variation)
```

### ID Formats

| Type | Format | Example | Description |
|------|--------|---------|-------------|
| Tactic | TA#### | TA0001 | Adversary goal |
| Technique | T#### | T1566 | Method to achieve goal |
| Sub-technique | T####.### | T1566.001 | Specific variation |
| Group | G#### | G0016 | Threat actor |
| Software | S#### | S0154 | Malware or tool |
| Campaign | C#### | C0001 | Operation |
| Mitigation | M#### | M1049 | Defense measure |

---

## Enterprise Tactics (14)

| ID | Tactic | Goal | Example |
|----|--------|------|---------|
| TA0043 | Reconnaissance | Gather information | OSINT, scanning |
| TA0042 | Resource Development | Establish resources | Buy domains, develop malware |
| TA0001 | Initial Access | Get into network | Phishing, exploits |
| TA0002 | Execution | Run malicious code | PowerShell, scripts |
| TA0003 | Persistence | Maintain access | Registry, scheduled tasks |
| TA0004 | Privilege Escalation | Get higher permissions | Exploits, token manipulation |
| TA0005 | Defense Evasion | Avoid detection | Obfuscation, disabling tools |
| TA0006 | Credential Access | Steal credentials | Dumping, keylogging |
| TA0007 | Discovery | Learn environment | Network scanning, file enumeration |
| TA0008 | Lateral Movement | Move through network | RDP, SMB, WMI |
| TA0009 | Collection | Gather target data | Screen capture, clipboard |
| TA0011 | Command and Control | Remote communication | HTTP, DNS, custom protocols |
| TA0010 | Exfiltration | Steal data out | Over C2, alternative channels |
| TA0040 | Impact | Disrupt or destroy | Encryption, wiper |

---

## Common Techniques by Tactic

### Initial Access (TA0001)

| ID | Technique | Description |
|----|-----------|-------------|
| T1566 | Phishing | Malicious emails |
| T1566.001 | Spearphishing Attachment | Emails with malicious attachments |
| T1566.002 | Spearphishing Link | Emails with malicious links |
| T1566.003 | Spearphishing via Service | Phishing through social media |
| T1190 | Exploit Public-Facing Application | Exploiting web apps |
| T1133 | External Remote Services | VPN, RDP, SSH |
| T1078 | Valid Accounts | Using legitimate credentials |
| T1195 | Supply Chain Compromise | Compromising software supply |

### Execution (TA0002)

| ID | Technique | Description |
|----|-----------|-------------|
| T1059 | Command and Scripting Interpreter | Scripting engines |
| T1059.001 | PowerShell | PowerShell scripts |
| T1059.003 | Windows Command Shell | cmd.exe |
| T1059.005 | Visual Basic | VBScript, macros |
| T1059.006 | Python | Python scripts |
| T1059.007 | JavaScript | JS execution |
| T1204 | User Execution | User runs malware |
| T1047 | Windows Management Instrumentation | WMI execution |
| T1053 | Scheduled Task/Job | Task scheduling |

### Persistence (TA0003)

| ID | Technique | Description |
|----|-----------|-------------|
| T1547 | Boot or Logon Autostart Execution | Autostart mechanisms |
| T1547.001 | Registry Run Keys | Registry persistence |
| T1547.004 | Winlogon Helper DLL | Winlogon persistence |
| T1053 | Scheduled Task/Job | Scheduled persistence |
| T1543 | Create or Modify System Process | Service persistence |
| T1136 | Create Account | New user accounts |
| T1505 | Server Software Component | Web shells |

### Defense Evasion (TA0005)

| ID | Technique | Description |
|----|-----------|-------------|
| T1027 | Obfuscated Files or Information | Code obfuscation |
| T1070 | Indicator Removal | Log deletion |
| T1036 | Masquerading | Disguising files |
| T1055 | Process Injection | Injecting into processes |
| T1562 | Impair Defenses | Disabling security tools |
| T1112 | Modify Registry | Registry manipulation |

### Credential Access (TA0006)

| ID | Technique | Description |
|----|-----------|-------------|
| T1003 | OS Credential Dumping | Extracting credentials |
| T1003.001 | LSASS Memory | Dumping LSASS |
| T1003.002 | Security Account Manager | SAM database |
| T1110 | Brute Force | Password guessing |
| T1555 | Credentials from Password Stores | Browser/app passwords |
| T1056 | Input Capture | Keylogging |

### Command and Control (TA0011)

| ID | Technique | Description |
|----|-----------|-------------|
| T1071 | Application Layer Protocol | HTTP, DNS, SMTP |
| T1071.001 | Web Protocols | HTTP/HTTPS C2 |
| T1071.004 | DNS | DNS tunneling |
| T1105 | Ingress Tool Transfer | Downloading tools |
| T1573 | Encrypted Channel | Encrypted C2 |
| T1090 | Proxy | C2 through proxy |
| T1095 | Non-Application Layer Protocol | Raw sockets |

### Exfiltration (TA0010)

| ID | Technique | Description |
|----|-----------|-------------|
| T1041 | Exfiltration Over C2 Channel | Using C2 for exfil |
| T1048 | Exfiltration Over Alternative Protocol | DNS, ICMP |
| T1567 | Exfiltration Over Web Service | Cloud storage |
| T1020 | Automated Exfiltration | Scheduled exfil |

---

## Mapping Process

### 5-Step Method

1. **Identify behavior** - What is the adversary doing?
2. **Determine goal** - Why? (maps to tactic)
3. **Find method** - How? (maps to technique)
4. **Get specific** - What variation? (sub-technique)
5. **Document evidence** - What supports this mapping?

### Example Walkthrough

**Scenario:** Attacker sends phishing email with malicious Word document

```
Step 1: Identify behavior
- Email with attachment sent to target
- Document contains macro that downloads payload

Step 2: Determine goal
- Goal: Get into the network
- Tactic: Initial Access (TA0001)

Step 3: Find method
- Method: Phishing with attachment
- Technique: Phishing (T1566)

Step 4: Get specific
- Variation: Attachment (not link)
- Sub-technique: Spearphishing Attachment (T1566.001)

Step 5: Document evidence
- Evidence: Email header analysis, document sample
- Confidence: High (direct observation)
```

### Confidence Levels

| Level | Criteria |
|-------|----------|
| High | Direct observation, clear evidence |
| Medium | Strong indicators, some uncertainty |
| Low | Indirect evidence, inference |
| Unknown | Insufficient information |

---

## Output Format

### Table Format

| Tactic | Technique | ID | Confidence | Evidence |
|--------|-----------|-------|------------|----------|
| Initial Access | Spearphishing Attachment | T1566.001 | High | Email sample |
| Execution | PowerShell | T1059.001 | High | Process logs |
| Persistence | Registry Run Keys | T1547.001 | Medium | Registry artifacts |

### JSON Format

```json
{
  "attack_mappings": [
    {
      "technique_id": "T1566.001",
      "technique_name": "Spearphishing Attachment",
      "tactic": "Initial Access",
      "tactic_id": "TA0001",
      "confidence": "high",
      "evidence": "Malicious document delivered via email",
      "related_software": ["S0001"],
      "related_groups": ["G0001"]
    }
  ]
}
```

### ATT&CK Navigator Layer

The workflow can generate ATT&CK Navigator layers for visualization:

```json
{
  "name": "Threat Campaign Coverage",
  "version": "4.5",
  "domain": "enterprise-attack",
  "techniques": [
    {"techniqueID": "T1566.001", "color": "#ff0000", "score": 100},
    {"techniqueID": "T1059.001", "color": "#ff0000", "score": 100}
  ]
}
```

---

## Common Mapping Scenarios

### Phishing Campaign

| Behavior | Technique |
|----------|-----------|
| Email with malicious attachment | T1566.001 |
| Email with malicious link | T1566.002 |
| Phishing via LinkedIn | T1566.003 |
| User opens document | T1204.002 |
| Macro executes PowerShell | T1059.001 |

### Ransomware Attack

| Behavior | Technique |
|----------|-----------|
| Initial phishing | T1566 |
| PowerShell execution | T1059.001 |
| Registry persistence | T1547.001 |
| Credential dumping | T1003.001 |
| Lateral movement via RDP | T1021.001 |
| Data encrypted | T1486 |

### APT Campaign

| Behavior | Technique |
|----------|-----------|
| Supply chain compromise | T1195.002 |
| Valid credentials | T1078 |
| WMI execution | T1047 |
| Scheduled task persistence | T1053.005 |
| Process injection | T1055 |
| DNS C2 | T1071.004 |
| Exfil over C2 | T1041 |

---

## API Access

### STIX Repository

```
https://github.com/mitre-attack/attack-stix-data/
```

### TAXII Server

```python
from taxii2client.v21 import Server
server = Server("https://cti-taxii.mitre.org/taxii2/")
```

### Python Library

```python
from mitreattack.stix20 import MitreAttackData

mitre = MitreAttackData("enterprise-attack.json")

# Get all techniques
techniques = mitre.get_techniques()

# Get techniques by tactic
initial_access = mitre.get_techniques_by_tactic("initial-access")

# Get groups using technique
groups = mitre.get_groups_using_technique("T1566.001")
```

---

## Resources

| Resource | URL |
|----------|-----|
| ATT&CK Website | https://attack.mitre.org |
| ATT&CK Navigator | https://mitre-attack.github.io/attack-navigator/ |
| STIX Data | https://github.com/mitre-attack/attack-stix-data |
| Python Library | https://github.com/mitre-attack/mitreattack-python |
| CTI Training | https://attack.mitre.org/resources/training/ |

---

## See Also

- [MapToFrameworks Workflow](../workflows/analysis.md#maptoframeworks)
- [Frameworks Overview](README.md)
