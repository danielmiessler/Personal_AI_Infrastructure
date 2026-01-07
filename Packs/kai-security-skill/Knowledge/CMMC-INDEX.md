# CMMC 2.0 Level 2 - Domain Index

Quick reference for 110 practices across 17 domains based on NIST SP 800-171 Rev 2.

Use `--domain <CODE>` or "Load CMMC domain <CODE>" to load specific domain details.

## Domains Overview

| Code | Domain | Practices | Key Focus |
|------|--------|-----------|-----------|
| AC | Access Control | 22 | User access, least privilege, remote access, wireless |
| AT | Awareness & Training | 4 | Security training, insider threat awareness |
| AU | Audit & Accountability | 9 | Logging, audit trails, timestamps, log protection |
| CA | Assessment & Monitoring | 3 | Security assessments, POA&M, continuous monitoring |
| CM | Configuration Management | 9 | Baselines, change control, least functionality |
| CP | Contingency Planning | 4 | Backup, recovery, continuity planning |
| IA | Identification & Authentication | 11 | MFA, password policy, certificates, authenticator management |
| IR | Incident Response | 3 | Detection, reporting, recovery |
| MA | Maintenance | 6 | System maintenance, remote maintenance, media sanitization |
| MP | Media Protection | 7 | Media handling, marking, sanitization, transport |
| PE | Physical Protection | 6 | Facility access, visitor logs, equipment protection |
| PS | Personnel Security | 2 | Screening, termination procedures |
| RA | Risk Assessment | 5 | Vulnerability scanning, risk analysis |
| RE | Recovery | 1 | System recovery |
| SA | System & Services Acquisition | 5 | Supply chain, secure development, third-party controls |
| SC | System & Communications Protection | 23 | Encryption, network security, boundary protection |
| SI | System & Information Integrity | 17 | Malware, patching, monitoring, alerts |

**Total: 110 practices** (17 from CMMC Level 1, 93 additional for Level 2)

## Loading Domain Details

To load a specific domain with full practice details:

```
Request: "Load CMMC domain AC"
Response: [Loads Knowledge/cmmc/AC.md]
```

Or: "Show me SC practices" / "What are the IA requirements?"

## Quick Reference by Topic

Find the right domain for common security questions:

| Security Topic | Primary Domain(s) | Key Practices |
|----------------|-------------------|---------------|
| User authentication | IA, AC | IA.L2-3.5.3 (MFA), AC.L2-3.1.1 (Authorized Access) |
| Password policy | IA | IA.L2-3.5.7 (Complexity), IA.L2-3.5.8 (Reuse) |
| Encryption at rest | SC | SC.L2-3.13.16 (Data at Rest) |
| Encryption in transit | SC | SC.L2-3.13.8 (Cryptographic Protection) |
| Logging | AU | AU.L2-3.3.1 (System Auditing) |
| Log retention | AU | AU.L2-3.3.8 (Audit Protection) |
| Patching | SI, CM | SI.L2-3.14.1 (Flaw Remediation) |
| Vulnerability scanning | RA, SI | RA.L2-3.11.2 (Vulnerability Scanning) |
| Backups | CP, RE | CP.L2-3.8.9 (System Backup) |
| Access reviews | AC | AC.L2-3.1.7 (Privileged Functions) |
| Network security | SC | SC.L2-3.13.1 (Boundary Protection) |
| Firewall | SC | SC.L2-3.13.5 (External Connections) |
| Security training | AT | AT.L2-3.2.1 (Security Awareness) |
| Incident response | IR | IR.L2-3.6.1 (Incident Handling) |
| Change management | CM | CM.L2-3.4.3 (Change Management) |
| Least privilege | AC | AC.L2-3.1.5 (Least Privilege) |
| Session management | AC, SC | AC.L2-3.1.10 (Session Lock) |
| Malware protection | SI | SI.L2-3.14.2 (Malicious Code Protection) |
| Media handling | MP | MP.L2-3.8.1 (Media Protection) |
| Physical access | PE | PE.L2-3.10.1 (Physical Access) |

## Domain Practice Counts

| Domain | L1 Practices | L2 Additional | Total |
|--------|--------------|---------------|-------|
| AC | 4 | 18 | 22 |
| AT | 0 | 4 | 4 |
| AU | 0 | 9 | 9 |
| CA | 0 | 3 | 3 |
| CM | 0 | 9 | 9 |
| CP | 0 | 4 | 4 |
| IA | 2 | 9 | 11 |
| IR | 0 | 3 | 3 |
| MA | 0 | 6 | 6 |
| MP | 1 | 6 | 7 |
| PE | 4 | 2 | 6 |
| PS | 0 | 2 | 2 |
| RA | 0 | 5 | 5 |
| RE | 0 | 1 | 1 |
| SA | 1 | 4 | 5 |
| SC | 3 | 20 | 23 |
| SI | 2 | 15 | 17 |

## High-Priority Practices

The following practices are commonly required first due to high risk or audit focus:

### Critical (Address First)
| Practice | Description | Why Critical |
|----------|-------------|--------------|
| AC.L2-3.1.1 | Authorized access control | Foundation for all access |
| IA.L2-3.5.3 | Multi-factor authentication | #1 audit finding |
| SC.L2-3.13.8 | Cryptographic protection | Data protection baseline |
| AU.L2-3.3.1 | System auditing | Forensics and compliance |
| SI.L2-3.14.1 | Flaw remediation | Vulnerability management |

### High (Address Early)
| Practice | Description | Why High |
|----------|-------------|----------|
| AC.L2-3.1.5 | Least privilege | Limits breach impact |
| CM.L2-3.4.1 | Baseline configuration | Change management foundation |
| RA.L2-3.11.2 | Vulnerability scanning | Proactive risk identification |
| SC.L2-3.13.16 | Data at rest protection | CUI encryption |
| IR.L2-3.6.1 | Incident handling | Required for breach response |

## CMMC vs NIST 800-171 Mapping

CMMC Level 2 directly maps to NIST 800-171 Rev 2:

- CMMC practice IDs follow format: `<DOMAIN>.L2-<NIST_ID>`
- Example: `AC.L2-3.1.1` = Access Control, Level 2, NIST 800-171 3.1.1
- NIST 800-171 control families map to CMMC domains

## Assessment Preparation

Before CMMC assessment:

1. **Complete SSP** - System Security Plan documenting all 110 practices
2. **Create POA&M** - Plan of Action & Milestones for any gaps
3. **Gather Evidence** - Documentation proving each practice
4. **Calculate Score** - NIST 800-171 DoD Assessment Methodology
5. **Submit to SPRS** - Supplier Performance Risk System

## Related Resources

- [METHODOLOGY.md](../METHODOLOGY.md) - Security principles and approach
- [CmmcBaseline Workflow](../Workflows/CmmcBaseline.md) - Gap analysis process
- [GenerateAudit Workflow](../Workflows/GenerateAudit.md) - Evidence compilation
- Knowledge/cmmc/*.md - Individual domain detail files

## External References

- [NIST SP 800-171 Rev 2](https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final)
- [CMMC Official Site](https://www.acq.osd.mil/cmmc/)
- [CyberAB (CMMC Accreditation Body)](https://www.cyberab.org/)
