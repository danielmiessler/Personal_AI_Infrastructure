# System and Communications Protection (SC)

**Practice Count:** 23 practices
**NIST Reference:** NIST SP 800-171 Section 3.13

---

## Overview

The System and Communications Protection domain focuses on monitoring, controlling, and protecting communications at external and internal boundaries of organizational information systems. This includes boundary protection, network segmentation, cryptographic protection, session management, and various controls for securing communications and protecting data both in transit and at rest.

---

## Practices

### SC.L2-3.13.1: Monitor communications at system boundaries

**Requirement:** Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational information systems) at the external boundaries and key internal boundaries of the information systems.

**Implementation:**
- Firewalls at network perimeter
- Intrusion detection system (IDS)
- Internal network segmentation

**Evidence:**
- Firewall configuration
- IDS/IPS deployment
- Network architecture diagram

---

### SC.L2-3.13.2: Security architecture

**Requirement:** Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.

**Implementation:**
- DMZ for public-facing systems
- VLANs for network segmentation
- No direct connection from DMZ to internal

**Evidence:**
- DMZ architecture diagram
- VLAN configuration
- Firewall rules (DMZ to Internal blocked)

---

### SC.L2-3.13.3: Deny network traffic by default

**Requirement:** Deny network communications traffic by default and allow network communications traffic by exception (i.e., deny all, permit by exception).

**Implementation:**
- Default deny firewall rules
- Allowlist for required traffic
- Quarterly firewall rule review

**Evidence:**
- Firewall ruleset (default deny)
- Rule justification documentation
- Firewall rule review records

---

### SC.L2-3.13.4: Prevent split tunneling for VPN

**Requirement:** Prevent remote devices from simultaneously establishing non-remote connections with organizational information systems and communicating via some other connection to resources in external networks (i.e., split tunneling).

**Implementation:**
- Split tunneling disabled on VPN
- All traffic routes through VPN when connected
- VPN configuration enforced by policy

**Evidence:**
- VPN configuration (no split tunneling)
- VPN policy documentation
- VPN connection logs

---

### SC.L2-3.13.5: Cryptographic protection in transit

**Requirement:** Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission unless otherwise protected by alternative physical safeguards.

**Implementation:**
- TLS 1.2+ for web traffic
- IPSec or TLS for VPN
- SSH for remote command line

**Evidence:**
- TLS configuration (web servers)
- VPN encryption settings
- Network scan results (no cleartext protocols)

---

### SC.L2-3.13.6: Terminate network connections

**Requirement:** Terminate network connections associated with communications sessions at the end of the sessions or after a defined period of inactivity.

**Implementation:**
- TCP idle timeout: 15 minutes
- Application session timeout: 30 minutes
- VPN idle timeout: 60 minutes

**Evidence:**
- Network timeout configuration
- Application timeout settings
- Session termination logs

---

### SC.L2-3.13.7: Establish secure connections

**Requirement:** Establish and manage cryptographic keys for cryptography employed in organizational information systems.

**Implementation:**
- Certificate lifecycle management
- Key rotation schedule (annual minimum)
- HSM for key storage (if highly sensitive)

**Evidence:**
- Certificate management procedures
- Key rotation logs
- HSM configuration (if applicable)

---

### SC.L2-3.13.8: Employ FIPS-validated cryptography

**Requirement:** Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.

**Implementation:**
- FIPS 140-2 validated crypto modules
- AES-256 for encryption
- SHA-256+ for hashing

**Evidence:**
- FIPS validation certificates
- Crypto module configuration
- Crypto library versions

---

### SC.L2-3.13.9: Protect confidentiality at rest

**Requirement:** Protect the confidentiality of backup CUI at storage locations.

**Implementation:**
- Backup media encrypted (AES-256)
- Backup storage physically secured
- Encryption keys separate from backups

**Evidence:**
- Backup encryption configuration
- Backup storage security controls
- Key management procedures

---

### SC.L2-3.13.10: Control mobile code

**Requirement:** Control and monitor the use of mobile code.

**Implementation:**
- JavaScript execution restricted (CSP headers)
- Applets/ActiveX disabled
- Mobile code scanned for malware

**Evidence:**
- Content Security Policy configuration
- Browser security settings
- Mobile code scanning logs

---

### SC.L2-3.13.11: Control VoIP

**Requirement:** Control and monitor the use of Voice over Internet Protocol (VoIP) technologies.

**Implementation:**
- VoIP traffic encrypted (SRTP)
- VoIP on separate VLAN
- VoIP call logging

**Evidence:**
- VoIP encryption configuration
- Network segmentation (VoIP VLAN)
- Call detail records (CDRs)

---

### SC.L2-3.13.12: Protect authenticity of communications sessions

**Requirement:** Protect the authenticity of communications sessions.

**Implementation:**
- Mutual TLS (mTLS) for API-to-API
- SSH host key verification
- Certificate pinning for critical connections

**Evidence:**
- mTLS configuration
- SSH known_hosts management
- Certificate pinning implementation

---

### SC.L2-3.13.13: Protect information in shared resources

**Requirement:** Protect the confidentiality of information at rest.

**Implementation:**
- Full-disk encryption on all endpoints
- Database encryption (TDE)
- File-level encryption for CUI

**Evidence:**
- Disk encryption status reports (MDM)
- Database encryption configuration
- File encryption policies

---

### SC.L2-3.13.14: Collaborative device protection

**Requirement:** Deny network traffic by default and allow network communications traffic by exception.

**Implementation:**
- Microphones/cameras disabled by default
- Indicator lights when camera active
- User control over device activation

**Evidence:**
- Device security settings
- User training on device controls
- Device activation logs

---

### SC.L2-3.13.15: Protect information in shared resources

**Requirement:** Protect the confidentiality of CUI in shared system resources.

**Implementation:**
- Memory isolation between processes
- Temp files wiped after use
- No data remnants in shared memory

**Evidence:**
- OS memory protection configuration
- Temp file cleanup procedures
- Data remanence testing

---

### SC.L2-3.13.16: Information flow enforcement

**Requirement:** Route remote access through managed access control points.

**Implementation:**
- All remote access through VPN gateway
- No direct internet access to internal systems
- Network access control (NAC)

**Evidence:**
- Network architecture diagram
- VPN gateway configuration
- NAC deployment documentation

---

### SC.L2-3.13.17: Public-access system separation

**Requirement:** Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.

**Implementation:**
- DMZ for web servers
- No direct routing from DMZ to internal network
- Proxy/bastion hosts for DMZ-to-internal communication

**Evidence:**
- Network architecture diagram showing DMZ
- Firewall rules (DMZ isolated)
- Proxy/bastion configuration

---

### SC.L2-3.13.18: Mobile device encryption

**Requirement:** Prohibit remote activation of collaborative computing devices with the following exceptions: remote activation of devices is to be allowed only for authorized users.

**Implementation:**
- Cameras/mics cannot be remotely activated without user consent
- User notification required for remote activation
- Logs of all remote activation attempts

**Evidence:**
- Remote activation policy
- User notification mechanisms
- Activation logs

---

### SC.L2-3.13.19: Encrypt CUI at rest

**Requirement:** Protect the confidentiality of CUI at rest.

**Implementation:**
- Full-disk encryption (FDE) on all devices
- Database encryption (TDE - Transparent Data Encryption)
- File-level encryption for CUI files

**Evidence:**
- FDE status reports (BitLocker, FileVault, LUKS)
- Database TDE configuration
- File encryption policies

---

### SC.L2-3.13.20: Use FIPS-validated cryptography

**Requirement:** Employ FIPS-validated cryptography to protect unclassified information when such information must be separated from individuals who have the necessary clearances yet lack the necessary access approvals.

**Implementation:**
- FIPS 140-2 (or 140-3) validated crypto modules
- AES-256 for symmetric encryption
- RSA 2048+ or ECC P-256+ for asymmetric

**Evidence:**
- FIPS validation certificates
- Crypto algorithm configuration
- Crypto library documentation

---

### SC.L2-3.13.21: Secure name/address resolution

**Requirement:** Use secure name/address resolution services (authoritative source).

**Implementation:**
- DNSSEC for DNS integrity
- Internal DNS servers for private resources
- DNS filtering to block malicious domains

**Evidence:**
- DNSSEC configuration
- Internal DNS architecture
- DNS filtering logs

---

### SC.L2-3.13.22: Architectural design

**Requirement:** Employ architectural designs, software development techniques, and systems engineering principles that promote effective information security within organizational information systems.

**Implementation:**
- Defense-in-depth architecture
- Least privilege by default
- Fail-secure design patterns

**Evidence:**
- System architecture documentation
- Secure design principles guide
- Architecture review records

---

### SC.L2-3.13.23: Separate development and production

**Requirement:** Separate user functionality from system management functionality.

**Implementation:**
- Separate dev/test/prod environments
- Production access restricted to admins
- No development tools in production

**Evidence:**
- Environment separation documentation
- Production access controls
- Software inventory (no dev tools in prod)

---

## Navigation

| Previous: [SA - System and Services Acquisition](SA.md) | [Back to Index](../CMMC-INDEX.md) | Next: [SI - System and Information Integrity](SI.md) |
