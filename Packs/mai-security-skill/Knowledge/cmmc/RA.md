# Risk Assessment (RA)

**Practice Count:** 5 practices
**NIST Reference:** NIST SP 800-171 Section 3.11

---

## Overview

The Risk Assessment domain focuses on periodically assessing risks to organizational operations, assets, and individuals resulting from the operation of information systems. This includes conducting risk assessments, vulnerability scanning, remediation of identified vulnerabilities, updating threat assessments, and monitoring supply chain risks.

---

## Practices

### RA.L2-3.11.1: Risk assessments

**Requirement:** Periodically assess the risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals, resulting from the operation of organizational information systems and the associated processing, storage, or transmission of CUI.

**Implementation:**
- Annual risk assessment
- Risk assessment uses NIST SP 800-30 framework
- Risk register updated quarterly

**Evidence:**
- Risk assessment report (annual)
- Risk register
- Risk methodology documentation

---

### RA.L2-3.11.2: Vulnerability scanning

**Requirement:** Scan for vulnerabilities in organizational information systems and applications periodically and when new vulnerabilities affecting those systems and applications are identified.

**Implementation:**
- Monthly vulnerability scans (authenticated)
- Scans after major changes
- Critical vulns patched within 30 days

**Evidence:**
- Vulnerability scan schedule
- Scan results and reports
- Remediation tracking (POA&M)

---

### RA.L2-3.11.3: Remediate vulnerabilities

**Requirement:** Remediate vulnerabilities in accordance with risk assessments.

**Implementation:**
- Vulnerability remediation SLA:
  - Critical: 15 days
  - High: 30 days
  - Medium: 90 days
- Risk acceptance for vulns that cannot be fixed

**Evidence:**
- Remediation SLA policy
- Vulnerability remediation tracking
- Risk acceptance memos

---

### RA.L2-3.11.4: Update threat assessments

**Requirement:** Update threat assessments on an ongoing basis, including changes in the threat environment.

**Implementation:**
- Subscribe to threat intelligence feeds
- Weekly review of new threats
- Quarterly update to threat model

**Evidence:**
- Threat intelligence subscriptions
- Threat briefing summaries
- Threat model update history

---

### RA.L2-3.11.5: Monitor supply chain risks

**Requirement:** Employ security awareness training and security configuration settings to reduce the risk posed by supply chain threats.

**Implementation:**
- Vendor security questionnaires
- Annual vendor security reviews
- SBOM (Software Bill of Materials) for critical apps

**Evidence:**
- Vendor security assessment records
- Vendor security review reports
- SBOMs for critical applications

---

## Navigation

| Previous: [PS - Personnel Security](PS.md) | [Back to Index](../CMMC-INDEX.md) | Next: [RE - Recovery](RE.md) |
