# Media Protection (MP)

**Practice Count:** 7 practices
**NIST Reference:** NIST SP 800-171 Section 3.8

---

## Overview

The Media Protection domain focuses on protecting CUI in both digital and non-digital (paper) media. This includes physical control and secure storage of media, limiting access to authorized users, proper sanitization before disposal or reuse, marking requirements, transport controls, and management of removable media devices.

---

## Practices

### MP.L2-3.8.1: Protect media

**Requirement:** Protect (i.e., physically control and securely store) information system media containing CUI, both paper and digital.

**Implementation:**
- CUI media in locked cabinets
- Digital media encrypted
- Access log for media room

**Evidence:**
- Physical security controls (locks, badges)
- Encryption configuration
- Access logs

---

### MP.L2-3.8.2: Limit CUI access to authorized users

**Requirement:** Limit access to CUI on information system media to authorized users.

**Implementation:**
- Media labeled with classification level
- Access requires authorization
- Media checkout/checkin logged

**Evidence:**
- Media labeling standards
- Authorization matrix
- Media access logs

---

### MP.L2-3.8.3: Sanitize media before disposal or reuse

**Requirement:** Sanitize or destroy information system media containing CUI before disposal or release for reuse.

**Implementation:**
- Wipe drives with NIST 800-88 methods
- Shred paper CUI (cross-cut)
- Destroy drives physically if highly sensitive

**Evidence:**
- Sanitization procedures (NIST 800-88)
- Sanitization logs
- Destruction certificates

---

### MP.L2-3.8.4: Mark media with CUI indicator

**Requirement:** Mark media with necessary CUI markings and distribution limitations.

**Implementation:**
- CUI banner on all media
- Distribution limitation markings
- Automated marking for digital media

**Evidence:**
- CUI marking standards
- Media examples with markings
- Automated marking configuration

---

### MP.L2-3.8.5: Control access to media

**Requirement:** Control access to media containing CUI and maintain accountability for media during transport outside of controlled areas.

**Implementation:**
- Courier for CUI media transport
- GPS tracking for shipments
- Chain of custody log

**Evidence:**
- Courier service contracts
- Tracking records
- Chain of custody forms

---

### MP.L2-3.8.6: Cryptographically protect CUI in transit

**Requirement:** Implement cryptographic mechanisms to protect the confidentiality of CUI stored on digital media during transport unless otherwise protected by alternative physical safeguards.

**Implementation:**
- Encrypted USB drives
- Encrypted email attachments
- VPN for file transfers

**Evidence:**
- Encryption configuration (BitLocker, etc.)
- Email encryption policy
- VPN usage logs

---

### MP.L2-3.8.7: Control use of removable media

**Requirement:** Control the use of removable media on information system components.

**Implementation:**
- USB ports disabled except approved devices
- Approved USB devices encrypted
- Removable media usage logged

**Evidence:**
- USB control policy (GPO/MDM)
- Approved device list
- USB usage logs

---

## Navigation

| Previous: [MA - Maintenance](MA.md) | [Back to Index](../CMMC-INDEX.md) | Next: [PE - Physical Protection](PE.md) |
