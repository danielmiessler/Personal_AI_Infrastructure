# Access Control (AC)

**Practice Count:** 22 practices
**NIST Reference:** NIST SP 800-171 Section 3.1

---

## Overview

The Access Control domain focuses on limiting system access to authorized users, processes, and devices. It encompasses authentication, authorization, session management, remote access controls, wireless security, and mobile device management. These controls ensure that only authorized entities can access CUI and that they can only perform authorized functions.

---

## Practices

### AC.L2-3.1.1: Limit system access to authorized users

**Requirement:** Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).

**Implementation:**
- User authentication required for all system access
- Service accounts for automated processes
- Device authentication (MAC address, certificates)

**Evidence:**
- Access control lists (ACLs)
- Authentication logs
- System access policy documentation

---

### AC.L2-3.1.2: Limit system access to authorized transactions and functions

**Requirement:** Limit information system access to the types of transactions and functions that authorized users are permitted to execute.

**Implementation:**
- Role-based access control (RBAC)
- Least privilege enforcement
- Separation of duties

**Evidence:**
- RBAC matrix (role to permissions)
- User access reviews (quarterly)
- Privilege escalation logs

---

### AC.L2-3.1.3: Control remote access

**Requirement:** Control the flow of CUI in accordance with approved authorizations.

**Implementation:**
- VPN for remote access
- MFA required for remote connections
- Remote access audit logs

**Evidence:**
- VPN connection logs
- MFA enrollment records
- Remote access policy

---

### AC.L2-3.1.4: Separation of duties

**Requirement:** Separate the duties of individuals to reduce the risk of malevolent activity without collusion.

**Implementation:**
- Code review requires different person than author
- Database admin is not application admin
- Financial approval requires 2 people

**Evidence:**
- Separation of duties matrix
- Code review records
- Approval workflows

---

### AC.L2-3.1.5: Employ least privilege

**Requirement:** Employ the principle of least privilege, including for specific security functions and privileged accounts.

**Implementation:**
- Users have minimum permissions needed
- Admin privileges granted temporarily (just-in-time)
- Regular access reviews to remove unused permissions

**Evidence:**
- Permission audit reports
- Just-in-time admin logs
- Access review records (quarterly)

---

### AC.L2-3.1.6: Use non-privileged accounts

**Requirement:** Use non-privileged accounts or roles when accessing nonsecurity functions.

**Implementation:**
- Separate admin and user accounts
- Admin account used only for privileged tasks
- Developers use non-admin accounts for coding

**Evidence:**
- Dual-account setup for admins
- Account usage logs
- Policy documentation

---

### AC.L2-3.1.7: Prevent non-privileged users from executing privileged functions

**Requirement:** Prevent non-privileged users from executing privileged functions and capture the execution of such functions in audit logs.

**Implementation:**
- sudo/UAC prompts for privilege escalation
- Audit log captures all privilege escalation
- Alerts on unexpected privilege use

**Evidence:**
- Privilege escalation logs
- SIEM alerts for privilege abuse
- Policy enforcement mechanisms

---

### AC.L2-3.1.8: Limit unsuccessful logon attempts

**Requirement:** Limit unsuccessful logon attempts.

**Implementation:**
- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Manual unlock by admin (logged)

**Evidence:**
- Account lockout policy
- Failed login attempt logs
- Unlock request records

---

### AC.L2-3.1.9: Provide privacy and security notices

**Requirement:** Provide privacy and security notices consistent with applicable CUI rules.

**Implementation:**
- Login banner displays CUI warning
- Privacy policy available to all users
- Annual security awareness acknowledgment

**Evidence:**
- Login banner screenshot
- Privacy policy documentation
- User acknowledgment records

---

### AC.L2-3.1.10: Use session lock with pattern-hiding displays

**Requirement:** Use session lock with pattern-hiding displays to prevent access and viewing of data after a period of inactivity.

**Implementation:**
- Screen lock after 15 minutes idle
- Requires password to unlock
- CUI data hidden while locked

**Evidence:**
- Session timeout policy
- GPO/MDM configuration
- User training records

---

### AC.L2-3.1.11: Terminate session after defined period

**Requirement:** Terminate (automatically) a user session after a defined condition.

**Implementation:**
- Web sessions expire after 30 minutes idle
- SSH/RDP sessions terminate after 60 minutes idle
- User notified before termination

**Evidence:**
- Session timeout configuration
- Session termination logs
- Policy documentation

---

### AC.L2-3.1.12: Monitor and control remote access sessions

**Requirement:** Monitor and control remote access sessions.

**Implementation:**
- VPN logs monitored daily
- Alerts on remote access from unusual locations
- Remote sessions can be terminated by admin

**Evidence:**
- Remote access monitoring logs
- SIEM rules for anomaly detection
- Remote session termination records

---

### AC.L2-3.1.13: Employ cryptographic mechanisms to protect confidentiality of remote access sessions

**Requirement:** Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.

**Implementation:**
- TLS 1.2+ for web applications
- SSH for remote command line
- IPSec or TLS for VPN

**Evidence:**
- TLS certificate configuration
- VPN encryption settings
- Network scan results (no unencrypted protocols)

---

### AC.L2-3.1.14: Route remote access via managed access control points

**Requirement:** Route remote access via managed access control points.

**Implementation:**
- All remote access through VPN gateway
- Split tunneling disabled
- Access control enforced at gateway

**Evidence:**
- VPN architecture diagram
- Gateway configuration
- Network traffic logs

---

### AC.L2-3.1.15: Authorize remote execution of privileged commands

**Requirement:** Authorize remote execution of privileged commands and remote access to security-relevant information.

**Implementation:**
- Remote admin requires MFA
- Privileged remote access logged
- Approval required for emergency remote access

**Evidence:**
- Remote admin logs
- MFA enrollment for admins
- Emergency access approval records

---

### AC.L2-3.1.16: Authorize wireless access

**Requirement:** Authorize wireless access prior to allowing such connections.

**Implementation:**
- WPA3-Enterprise (802.1X) for corporate WiFi
- Certificate-based authentication
- Guest network isolated from corporate

**Evidence:**
- WiFi authentication configuration
- Certificate enrollment records
- Network segmentation documentation

---

### AC.L2-3.1.17: Protect wireless access using authentication and encryption

**Requirement:** Protect wireless access using authentication and encryption.

**Implementation:**
- WPA3 encryption
- AES-256 for wireless encryption
- Regular WiFi password rotation (if PSK used)

**Evidence:**
- WiFi configuration
- Encryption settings
- Password rotation logs

---

### AC.L2-3.1.18: Control connection of mobile devices

**Requirement:** Control connection of mobile devices.

**Implementation:**
- MDM enrollment required for mobile access
- Device compliance checks (OS version, encryption)
- Remote wipe capability

**Evidence:**
- MDM enrollment records
- Device compliance reports
- Mobile device policy

---

### AC.L2-3.1.19: Encrypt CUI on mobile devices

**Requirement:** Encrypt CUI on mobile devices and mobile computing platforms.

**Implementation:**
- Full-disk encryption on laptops (BitLocker, FileVault)
- Container encryption on mobile devices (iOS, Android)
- CUI stored in encrypted apps only

**Evidence:**
- Encryption status reports (MDM)
- Device encryption policy
- Compliance audit results

---

### AC.L2-3.1.20: Verify and control/limit connections to external systems

**Requirement:** Verify and control/limit connections to and use of external information systems.

**Implementation:**
- Allowlist for external systems
- Data loss prevention (DLP) monitors data transfers
- Approval required for new external connections

**Evidence:**
- External system inventory
- DLP policy and logs
- Connection approval records

---

### AC.L2-3.1.21: Limit use of portable storage devices

**Requirement:** Limit use of portable storage devices on external information systems.

**Implementation:**
- USB ports disabled on workstations (except approved)
- Encrypted USB drives approved for CUI
- USB device usage logged

**Evidence:**
- USB device control policy (GPO/MDM)
- Approved USB device list
- USB usage logs

---

### AC.L2-3.1.22: Control CUI posted or processed on publicly accessible systems

**Requirement:** Control CUI posted or processed on publicly accessible information systems.

**Implementation:**
- CUI not posted on public websites
- Public-facing systems isolated from CUI systems
- Data classification review before public posting

**Evidence:**
- Data classification policy
- Network architecture (DMZ for public systems)
- Publication approval workflow

---

## Navigation

| [Back to Index](../CMMC-INDEX.md) | Next: [AT - Awareness and Training](AT.md) |
