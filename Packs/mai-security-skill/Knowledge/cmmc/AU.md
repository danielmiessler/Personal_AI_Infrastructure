# Audit and Accountability (AU)

**Practice Count:** 9 practices
**NIST Reference:** NIST SP 800-171 Section 3.3

---

## Overview

The Audit and Accountability domain focuses on creating, protecting, and retaining audit logs to enable detection and investigation of security incidents. This includes audit record creation, log review processes, alert mechanisms, correlation capabilities, and protection of audit information from unauthorized access or modification.

---

## Practices

### AU.L2-3.3.1: Create audit records

**Requirement:** Create and retain information system audit records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful or unauthorized information system activity.

**Implementation:**
- Audit logging enabled for all CUI systems
- Logs include: timestamp, user, action, result
- Centralized log collection (SIEM)

**Evidence:**
- Audit log configuration
- SIEM log ingestion records
- Sample audit logs

---

### AU.L2-3.3.2: Audit events based on risk

**Requirement:** Ensure that the actions of individual information system users can be uniquely traced to those users so they can be held accountable for their actions.

**Implementation:**
- User activity logged (not just admin)
- Logs correlate actions to specific user accounts
- No shared accounts for CUI access

**Evidence:**
- User activity logs
- Account management policy (no shared accounts)
- Log correlation examples

---

### AU.L2-3.3.3: Review audit logs

**Requirement:** Review and update logged events.

**Implementation:**
- Weekly audit log review for anomalies
- SIEM generates alerts for high-risk events
- Log review findings documented

**Evidence:**
- Audit log review schedule
- Review findings reports
- SIEM alert rules

---

### AU.L2-3.3.4: Alert on audit processing failures

**Requirement:** Alert in the event of an audit logging process failure.

**Implementation:**
- SIEM alerts when logs stop arriving
- Daily log ingestion health check
- Escalation if logging failure >1 hour

**Evidence:**
- Logging failure alert configuration
- Alert escalation procedures
- Incident records for log failures

---

### AU.L2-3.3.5: Correlate audit records

**Requirement:** Correlate audit record review, analysis, and reporting processes for investigation and response to indications of unlawful, unauthorized, suspicious, or unusual activity.

**Implementation:**
- SIEM correlates logs across systems
- Use cases: failed login + privilege escalation = alert
- Incident investigation uses correlated logs

**Evidence:**
- SIEM correlation rules
- Incident investigation reports citing logs
- Alert tuning records

---

### AU.L2-3.3.6: Audit record reduction and report generation

**Requirement:** Provide audit record reduction and report generation to support on-demand analysis and reporting.

**Implementation:**
- SIEM dashboards for common queries
- Saved searches for compliance reporting
- Ad-hoc log analysis capability

**Evidence:**
- SIEM dashboard screenshots
- Compliance report templates
- Ad-hoc query examples

---

### AU.L2-3.3.7: Audit record retention

**Requirement:** Provide an information system capability that compares and synchronizes internal system clocks with an authoritative source to generate time stamps for audit records.

**Implementation:**
- NTP configured on all systems
- Time synchronization monitored
- Timestamps in UTC for consistency

**Evidence:**
- NTP configuration
- Time sync monitoring logs
- Timestamp format standards

---

### AU.L2-3.3.8: Protect audit information

**Requirement:** Protect audit information and audit logging tools from unauthorized access, modification, and deletion.

**Implementation:**
- Logs stored in write-once storage (WORM)
- SIEM admin access restricted to security team
- Audit trail for log access

**Evidence:**
- Log storage configuration (immutability)
- SIEM RBAC configuration
- Audit log access logs

---

### AU.L2-3.3.9: Limit audit log management to privileged users

**Requirement:** Limit management of audit logging functionality to a subset of privileged users.

**Implementation:**
- Only security admins can modify SIEM rules
- Developers cannot delete logs
- Audit log config changes require approval

**Evidence:**
- SIEM admin access list
- Configuration change approval records
- Separation of duties matrix

---

## Navigation

| Previous: [AT - Awareness and Training](AT.md) | [Back to Index](../CMMC-INDEX.md) | Next: [CA - Assessment, Authorization, and Monitoring](CA.md) |
