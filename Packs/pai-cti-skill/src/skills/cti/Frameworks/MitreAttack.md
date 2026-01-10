# MITRE ATT&CK Framework Reference

Quick reference for mapping threat intelligence to ATT&CK.

## Enterprise Tactics (14)

| ID | Name | Goal |
|----|------|------|
| TA0043 | Reconnaissance | Gather information |
| TA0042 | Resource Development | Establish resources |
| TA0001 | Initial Access | Get into network |
| TA0002 | Execution | Run malicious code |
| TA0003 | Persistence | Maintain access |
| TA0004 | Privilege Escalation | Get higher permissions |
| TA0005 | Defense Evasion | Avoid detection |
| TA0006 | Credential Access | Steal credentials |
| TA0007 | Discovery | Learn environment |
| TA0008 | Lateral Movement | Move through network |
| TA0009 | Collection | Gather target data |
| TA0011 | Command and Control | Remote communication |
| TA0010 | Exfiltration | Steal data out |
| TA0040 | Impact | Disrupt or destroy |

## Common Techniques by Tactic

### Initial Access (TA0001)
- T1566 Phishing
  - T1566.001 Spearphishing Attachment
  - T1566.002 Spearphishing Link
  - T1566.003 Spearphishing via Service
- T1190 Exploit Public-Facing Application
- T1133 External Remote Services
- T1078 Valid Accounts
- T1195 Supply Chain Compromise

### Execution (TA0002)
- T1059 Command and Scripting Interpreter
  - T1059.001 PowerShell
  - T1059.003 Windows Command Shell
  - T1059.005 Visual Basic
  - T1059.006 Python
  - T1059.007 JavaScript
- T1204 User Execution
- T1047 Windows Management Instrumentation
- T1053 Scheduled Task/Job

### Persistence (TA0003)
- T1547 Boot or Logon Autostart Execution
  - T1547.001 Registry Run Keys
  - T1547.004 Winlogon Helper DLL
- T1053 Scheduled Task/Job
- T1543 Create or Modify System Process
- T1136 Create Account
- T1505 Server Software Component

### Defense Evasion (TA0005)
- T1027 Obfuscated Files or Information
- T1070 Indicator Removal
- T1036 Masquerading
- T1055 Process Injection
- T1562 Impair Defenses
- T1112 Modify Registry

### Credential Access (TA0006)
- T1003 OS Credential Dumping
  - T1003.001 LSASS Memory
  - T1003.002 Security Account Manager
- T1110 Brute Force
- T1555 Credentials from Password Stores
- T1056 Input Capture

### Command and Control (TA0011)
- T1071 Application Layer Protocol
  - T1071.001 Web Protocols
  - T1071.004 DNS
- T1105 Ingress Tool Transfer
- T1573 Encrypted Channel
- T1090 Proxy
- T1095 Non-Application Layer Protocol

### Exfiltration (TA0010)
- T1041 Exfiltration Over C2 Channel
- T1048 Exfiltration Over Alternative Protocol
- T1567 Exfiltration Over Web Service
- T1020 Automated Exfiltration

## Mapping Process

1. **Identify behavior** - What is the adversary doing?
2. **Determine goal** - Why? (maps to tactic)
3. **Find method** - How? (maps to technique)
4. **Get specific** - What variation? (sub-technique)
5. **Document evidence** - What supports this?

## ID Formats

| Type | Format | Example |
|------|--------|---------|
| Tactic | TA#### | TA0001 |
| Technique | T#### | T1566 |
| Sub-technique | T####.### | T1566.001 |
| Group | G#### | G0016 |
| Software | S#### | S0154 |
| Campaign | C#### | C0001 |
| Mitigation | M#### | M1049 |

## API Access

**STIX Repository:**
```
https://github.com/mitre-attack/attack-stix-data/
```

**TAXII Server:**
```python
from taxii2client.v21 import Server
server = Server("https://cti-taxii.mitre.org/taxii2/")
```

**Python Library:**
```python
from mitreattack.stix20 import MitreAttackData
mitre = MitreAttackData("enterprise-attack.json")
techniques = mitre.get_techniques()
```

## Resources

- Website: https://attack.mitre.org
- Navigator: https://mitre-attack.github.io/attack-navigator/
- STIX Data: https://github.com/mitre-attack/attack-stix-data
