# Contingency Planning (CP)

**Practice Count:** 4 practices
**NIST Reference:** NIST SP 800-171 Section 3.6

---

## Overview

The Contingency Planning domain focuses on establishing plans to maintain operations during disruptions and restore systems after incidents. This includes disaster recovery planning, business continuity, alternate storage and processing sites, and regular testing of contingency plans.

---

## Practices

### CP.L2-3.6.1: Contingency planning

**Requirement:** Establish, maintain, and effectively implement plans for emergency response, backup operations, and post-disaster recovery for organizational information systems to ensure the availability of critical information resources and continuity of operations in emergency situations.

**Implementation:**
- Disaster Recovery Plan (DRP)
- Business Continuity Plan (BCP)
- Annual plan review and update

**Evidence:**
- DRP and BCP documents
- Plan approval records
- Annual review meeting minutes

---

### CP.L2-3.6.2: Alternate storage sites

**Requirement:** Provide for the preservation of essential information in alternate storage sites located sufficient distance from the primary site to protect against damage in the event of an accidental or deliberate compromise of information at the primary storage site.

**Implementation:**
- Backups stored in geographically separated location
- Cloud backup to different region/availability zone
- Distance >100 miles from primary site

**Evidence:**
- Backup architecture diagram
- Cloud region configuration
- Geographic separation documentation

---

### CP.L2-3.6.3: Test contingency plans

**Requirement:** Test contingency plans to determine effectiveness and identify potential weaknesses.

**Implementation:**
- Annual DR tabletop exercise
- Annual backup restore test
- Findings addressed in POA&M

**Evidence:**
- DR test plan and schedule
- Test results and after-action report
- POA&M for test findings

---

### CP.L2-3.6.4: Alternate processing sites

**Requirement:** Provide for the recovery and reconstitution of organizational information systems to a known state after a disruption, compromise, or failure.

**Implementation:**
- Hot/warm/cold site based on RTO
- Documented recovery procedures
- Recovery tested annually

**Evidence:**
- Recovery site configuration
- Recovery procedure documentation
- Recovery test results

---

## Navigation

| Previous: [CM - Configuration Management](CM.md) | [Back to Index](../CMMC-INDEX.md) | Next: [IA - Identification and Authentication](IA.md) |
