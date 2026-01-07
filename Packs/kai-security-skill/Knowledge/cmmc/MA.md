# Maintenance (MA)

**Practice Count:** 6 practices
**NIST Reference:** NIST SP 800-171 Section 3.7

---

## Overview

The Maintenance domain focuses on performing periodic and timely maintenance on organizational systems. This includes establishing maintenance schedules, controlling maintenance tools and personnel, sanitizing equipment before off-site maintenance, and managing remote maintenance activities with appropriate security controls.

---

## Practices

### MA.L2-3.7.1: Maintenance schedules

**Requirement:** Perform maintenance on organizational information systems.

**Implementation:**
- Monthly OS patching schedule
- Quarterly hardware maintenance
- Annual hardware refresh cycle

**Evidence:**
- Maintenance schedule
- Maintenance completion records
- Patching compliance reports

---

### MA.L2-3.7.2: Effective controls for maintenance

**Requirement:** Provide controls on the tools, techniques, mechanisms, and personnel used to conduct information system maintenance.

**Implementation:**
- Approved tools list for maintenance
- Background checks for maintenance personnel
- Maintenance activity logged

**Evidence:**
- Approved maintenance tools inventory
- Personnel background check records
- Maintenance activity logs

---

### MA.L2-3.7.3: Sanitize equipment before maintenance

**Requirement:** Ensure equipment removed for off-site maintenance is sanitized of any CUI.

**Implementation:**
- Wipe drives before sending for repair
- Use encrypted drives (data not accessible)
- Certificate of destruction for drives

**Evidence:**
- Data sanitization procedures
- Sanitization logs (date, method, personnel)
- Destruction certificates

---

### MA.L2-3.7.4: Media sanitization

**Requirement:** Check media containing diagnostic and test programs for malicious code before the media are used in organizational information systems.

**Implementation:**
- Antivirus scan of all media before use
- Media from vendors inspected
- Only trusted sources for diagnostic tools

**Evidence:**
- Media scanning procedures
- Antivirus scan logs
- Trusted vendor list

---

### MA.L2-3.7.5: Non-local maintenance approval

**Requirement:** Require multifactor authentication to establish nonlocal maintenance sessions via external network connections and terminate such connections when nonlocal maintenance is complete.

**Implementation:**
- MFA required for remote maintenance
- Remote sessions logged
- Session terminated immediately after maintenance

**Evidence:**
- Remote maintenance policy
- MFA logs for remote sessions
- Session termination logs

---

### MA.L2-3.7.6: Supervise maintenance personnel

**Requirement:** Supervise the maintenance activities of maintenance personnel without required access authorization.

**Implementation:**
- Escort for third-party maintenance personnel
- Screen sharing monitored for remote maintenance
- Log all maintenance actions

**Evidence:**
- Visitor/escort logs
- Remote session recordings
- Maintenance supervision procedures

---

## Navigation

| Previous: [IR - Incident Response](IR.md) | [Back to Index](../CMMC-INDEX.md) | Next: [MP - Media Protection](MP.md) |
