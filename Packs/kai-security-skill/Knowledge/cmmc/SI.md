# System and Information Integrity (SI)

**Practice Count:** 17 practices
**NIST Reference:** NIST SP 800-171 Section 3.14

---

## Overview

The System and Information Integrity domain focuses on identifying, reporting, and correcting information and information system flaws in a timely manner. This includes vulnerability management, malware protection, security monitoring, spam protection, email security, behavior-based detection, input validation, and ensuring systems fail in a secure state.

---

## Practices

### SI.L2-3.14.1: Identify and correct flaws timely

**Requirement:** Identify, report, and correct information and information system flaws in a timely manner.

**Implementation:**
- Vulnerability management program
- Critical vulnerabilities patched within 30 days
- Regular patch cycles (monthly for non-critical)

**Evidence:**
- Vulnerability management policy
- Patch deployment logs
- POA&M for unpatched vulnerabilities

---

### SI.L2-3.14.2: Malicious code protection

**Requirement:** Provide protection from malicious code at appropriate locations within organizational information systems.

**Implementation:**
- Antivirus on all endpoints
- Email gateway antimalware scanning
- Web proxy malware filtering

**Evidence:**
- Antivirus deployment status
- Email gateway configuration
- Malware detection logs

---

### SI.L2-3.14.3: Monitor system security alerts

**Requirement:** Monitor information system security alerts and advisories and take appropriate actions in response.

**Implementation:**
- Subscribe to vendor security advisories
- Daily review of CISA alerts
- Response procedures for critical alerts

**Evidence:**
- Security advisory subscriptions
- Alert review logs
- Response action records

---

### SI.L2-3.14.4: Update malicious code protection

**Requirement:** Update malicious code protection mechanisms when new releases are available.

**Implementation:**
- Antivirus definitions updated daily (automatic)
- Antivirus engine updated monthly
- Backup update method if primary fails

**Evidence:**
- Antivirus update configuration (auto-update)
- Update status reports
- Backup update procedures

---

### SI.L2-3.14.5: System and file scanning

**Requirement:** Perform periodic scans of organizational information systems and real-time scans of files from external sources as files are downloaded, opened, or executed.

**Implementation:**
- Scheduled weekly full system scans
- Real-time on-access scanning
- Email attachments scanned before delivery

**Evidence:**
- Scan schedule configuration
- Real-time scan logs
- Email scanning logs

---

### SI.L2-3.14.6: Monitor communications for attacks

**Requirement:** Monitor organizational information systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.

**Implementation:**
- Network IDS/IPS deployed
- SIEM monitors for IOCs (Indicators of Compromise)
- Threat intelligence integration

**Evidence:**
- IDS/IPS deployment architecture
- SIEM correlation rules
- Threat intelligence feed subscriptions

---

### SI.L2-3.14.7: Identify unauthorized use

**Requirement:** Identify unauthorized use of organizational information systems.

**Implementation:**
- User behavior analytics (UBA)
- Anomaly detection alerts (unusual login times, locations)
- Insider threat monitoring

**Evidence:**
- UBA configuration and rules
- Anomaly detection alerts
- Unauthorized use investigation records

---

### SI.L2-3.14.8: Receive alerts from external sources

**Requirement:** Receive security alerts, advisories, and directives from external sources on an ongoing basis.

**Implementation:**
- Subscribe to US-CERT alerts
- Vendor security mailing lists
- Industry-specific threat sharing (e.g., DIB CS)

**Evidence:**
- Security alert subscriptions
- Alert distribution list
- Alert review logs

---

### SI.L2-3.14.9: Employ spam protection

**Requirement:** Employ spam protection mechanisms at information system entry and exit points.

**Implementation:**
- Email gateway spam filtering
- SPF/DKIM/DMARC validation
- User spam reporting mechanism

**Evidence:**
- Spam filter configuration
- SPF/DKIM/DMARC records
- Spam catch rate metrics

---

### SI.L2-3.14.10: Implement email protections

**Requirement:** Implement email protections including but not limited to: SPF, DKIM, DMARC.

**Implementation:**
- SPF records published in DNS
- DKIM signatures on outbound email
- DMARC policy (quarantine or reject)

**Evidence:**
- SPF/DKIM/DMARC DNS records
- DMARC reports
- Email authentication logs

---

### SI.L2-3.14.11: Behavior-based detection

**Requirement:** Employ behavior-based detection mechanisms to detect and prevent indicators of compromise.

**Implementation:**
- EDR (Endpoint Detection and Response)
- SIEM behavioral analytics
- Machine learning anomaly detection

**Evidence:**
- EDR deployment status
- SIEM behavioral rules
- ML model training records

---

### SI.L2-3.14.12: Update detection tools

**Requirement:** Update detection tools and signatures.

**Implementation:**
- IDS/IPS signatures updated daily
- Threat intelligence feeds refreshed hourly
- Detection rule tuning quarterly

**Evidence:**
- Signature update logs
- Threat feed update status
- Rule tuning change records

---

### SI.L2-3.14.13: Check software for errors and vulnerabilities

**Requirement:** Perform security function verification testing.

**Implementation:**
- Static application security testing (SAST)
- Dynamic application security testing (DAST)
- Software composition analysis (SCA) for dependencies

**Evidence:**
- SAST/DAST scan results
- SCA dependency vulnerability reports
- Remediation tracking

---

### SI.L2-3.14.14: Information input validation

**Requirement:** Protect information system inputs from malicious code.

**Implementation:**
- Input validation on all user inputs
- Parameterized queries (prevent SQL injection)
- Content Security Policy (CSP) headers (prevent XSS)

**Evidence:**
- Input validation code examples
- Parameterized query usage
- CSP header configuration

---

### SI.L2-3.14.15: Predictable failure prevention

**Requirement:** Employ mechanisms to detect and prevent information system errors and anomalies in a time frame that supports mission objectives.

**Implementation:**
- Application performance monitoring (APM)
- Error tracking and alerting
- Predictive failure analysis (disk SMART, etc.)

**Evidence:**
- APM configuration
- Error alert rules
- Predictive monitoring dashboards

---

### SI.L2-3.14.16: Information handling and retention

**Requirement:** Protect the authenticity of communications sessions.

**Implementation:**
- TLS with certificate validation
- SSH with host key verification
- Mutual authentication (mTLS) for APIs

**Evidence:**
- TLS certificate validation configuration
- SSH known_hosts management
- mTLS implementation documentation

---

### SI.L2-3.14.17: Fail in a secure state

**Requirement:** Ensure organizational information systems fail in a secure state.

**Implementation:**
- Default deny on firewall failure
- Application fails closed (not open)
- Error messages do not leak sensitive info

**Evidence:**
- Firewall failsafe configuration
- Application error handling code
- Error message sanitization

---

## Navigation

| Previous: [SC - System and Communications Protection](SC.md) | [Back to Index](../CMMC-INDEX.md) |
