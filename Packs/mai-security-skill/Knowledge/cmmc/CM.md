# Configuration Management (CM)

**Practice Count:** 9 practices
**NIST Reference:** NIST SP 800-171 Section 3.4

---

## Overview

The Configuration Management domain focuses on establishing and maintaining baseline configurations and inventories of organizational systems. This includes configuration settings, change control processes, impact analysis, access restrictions for changes, and controlling the use of software and system functionality.

---

## Practices

### CM.L2-3.4.1: Baseline configurations

**Requirement:** Establish and maintain baseline configurations and inventories of organizational information systems (including hardware, software, firmware, and documentation) throughout the respective system development life cycles.

**Implementation:**
- Configuration management database (CMDB)
- Standard OS images (hardened baselines)
- Version control for infrastructure as code

**Evidence:**
- CMDB inventory
- Baseline image documentation
- IaC git repository

---

### CM.L2-3.4.2: Security configuration settings

**Requirement:** Establish and enforce security configuration settings for information technology products employed in organizational information systems.

**Implementation:**
- CIS Benchmarks applied to OS, databases, apps
- Configuration drift detection
- Non-compliant systems quarantined

**Evidence:**
- CIS Benchmark compliance reports
- Configuration scanning tool
- Quarantine policy and logs

---

### CM.L2-3.4.3: Track and control changes

**Requirement:** Track, review, approve or disapprove, and log changes to organizational information systems.

**Implementation:**
- Change management process (RFC)
- CAB (Change Advisory Board) reviews high-risk changes
- All changes logged in ticketing system

**Evidence:**
- Change management policy
- CAB meeting minutes
- Change tickets with approval records

---

### CM.L2-3.4.4: Analyze change impact

**Requirement:** Analyze the security impact of changes prior to implementation.

**Implementation:**
- Security risk assessment for all changes
- Threat modeling for architecture changes
- Rollback plan required for high-risk changes

**Evidence:**
- Change risk assessment template
- Threat model for major changes
- Rollback plan documentation

---

### CM.L2-3.4.5: Access restrictions for change

**Requirement:** Define, document, approve, and enforce physical and logical access restrictions associated with changes to organizational information systems.

**Implementation:**
- Production changes require approval
- Developers cannot deploy to production
- All production access logged

**Evidence:**
- Production access policy
- Deployment approval records
- Production access logs

---

### CM.L2-3.4.6: Employ least functionality

**Requirement:** Employ the principle of least functionality by configuring organizational information systems to provide only essential capabilities.

**Implementation:**
- Unnecessary services disabled
- Unused ports closed
- Minimal software installed

**Evidence:**
- Port scan results (only required ports open)
- Installed software inventory
- Service hardening documentation

---

### CM.L2-3.4.7: Restrict, disable, prevent software

**Requirement:** Restrict, disable, or prevent the use of nonessential programs, functions, ports, protocols, and services.

**Implementation:**
- Application allowlisting (only approved apps run)
- Firewall rules block unused protocols
- PowerShell execution restricted

**Evidence:**
- Application allowlist configuration
- Firewall rule documentation
- PowerShell execution policy

---

### CM.L2-3.4.8: User-installed software

**Requirement:** Apply deny-by-default, allow-by-exception policy to prevent the use of unauthorized software or deny-list unauthorized software.

**Implementation:**
- Users cannot install software (non-admin accounts)
- Software request process
- Approved software catalog

**Evidence:**
- Software installation policy
- Software request records
- Approved software list

---

### CM.L2-3.4.9: Control and monitor user-installed software

**Requirement:** Control and monitor user-installed software.

**Implementation:**
- Endpoint detection monitors for unapproved software
- Alerts on unauthorized installs
- Periodic endpoint compliance scans

**Evidence:**
- EDR monitoring configuration
- Unauthorized software alerts
- Endpoint compliance reports

---

## Navigation

| Previous: [CA - Assessment, Authorization, and Monitoring](CA.md) | [Back to Index](../CMMC-INDEX.md) | Next: [CP - Contingency Planning](CP.md) |
