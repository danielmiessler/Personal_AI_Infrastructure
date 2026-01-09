# Identification and Authentication (IA)

**Practice Count:** 11 practices
**NIST Reference:** NIST SP 800-171 Section 3.5

---

## Overview

The Identification and Authentication domain focuses on identifying and authenticating users and devices before granting access to organizational systems. This includes unique identification, multi-factor authentication, replay-resistant mechanisms, password policies, and secure handling of authentication credentials.

---

## Practices

### IA.L2-3.5.1: Identify system users

**Requirement:** Identify information system users, processes acting on behalf of users, or devices.

**Implementation:**
- Unique user accounts (no shared accounts)
- Service accounts for automated processes
- Device identifiers (MAC, certificates)

**Evidence:**
- User account inventory
- Service account inventory
- Device inventory

---

### IA.L2-3.5.2: Authenticate users, processes, devices

**Requirement:** Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational information systems.

**Implementation:**
- Password authentication minimum
- Certificate-based for service accounts
- Device certificates for network access

**Evidence:**
- Authentication configuration
- Certificate management records
- Authentication logs

---

### IA.L2-3.5.3: Multi-factor authentication

**Requirement:** Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.

**Implementation:**
- MFA for all admin accounts (required)
- MFA for all users accessing CUI remotely (required)
- TOTP, hardware token, or biometric

**Evidence:**
- MFA enrollment records
- MFA usage logs
- MFA policy documentation

---

### IA.L2-3.5.4: Replay-resistant authentication

**Requirement:** Employ replay-resistant authentication mechanisms for network access to privileged and non-privileged accounts.

**Implementation:**
- Kerberos (time-limited tickets)
- TLS with session tokens
- MFA with TOTP (time-based)

**Evidence:**
- Kerberos configuration
- TLS session management
- MFA TOTP implementation

---

### IA.L2-3.5.5: Prevent password reuse

**Requirement:** Prevent reuse of identifiers for a defined period.

**Implementation:**
- Password history: 24 previous passwords
- Account reuse prevented for 90 days after deletion
- Service account names not recycled

**Evidence:**
- Password policy configuration
- Account deletion policy
- Account management logs

---

### IA.L2-3.5.6: Disable identifiers after period of inactivity

**Requirement:** Disable identifiers after a defined period of inactivity.

**Implementation:**
- Accounts disabled after 90 days inactive
- Deleted after 180 days inactive
- Automated process checks daily

**Evidence:**
- Account lifecycle policy
- Inactive account reports
- Automated disablement logs

---

### IA.L2-3.5.7: Password complexity

**Requirement:** Enforce a minimum password complexity and change of characters when new passwords are created.

**Implementation:**
- Minimum 14 characters
- Complexity: uppercase, lowercase, number, symbol
- Prohibit common passwords (e.g., "Password123!")

**Evidence:**
- Password policy configuration (GPO/IDaaS)
- Common password blocklist
- Password policy documentation

---

### IA.L2-3.5.8: Prohibit password reuse

**Requirement:** Prohibit password reuse for a specified number of generations.

**Implementation:**
- Password history: 24 passwords
- Enforced at password change
- Cannot reuse password for 2+ years

**Evidence:**
- Password policy (history setting)
- Password change rejection logs
- Policy documentation

---

### IA.L2-3.5.9: Temporary passwords

**Requirement:** Allow temporary password use for system logons with an immediate change to a permanent password.

**Implementation:**
- Temp passwords force change at first login
- Temp passwords expire in 24 hours if unused
- Cannot reuse temp password as permanent

**Evidence:**
- Temporary password policy
- First-login password change logs
- Temp password expiration logs

---

### IA.L2-3.5.10: Encrypt passwords in storage and transmission

**Requirement:** Store and transmit only cryptographically-protected passwords.

**Implementation:**
- Passwords hashed with bcrypt/Argon2 (not plaintext)
- Password transmission over TLS only
- No passwords in logs or error messages

**Evidence:**
- Password hashing implementation (code review)
- TLS configuration
- Log sanitization

---

### IA.L2-3.5.11: Obscure feedback of authentication information

**Requirement:** Obscure feedback of authentication information.

**Implementation:**
- Passwords shown as dots/asterisks when typed
- "Invalid username or password" (not which is wrong)
- No password hints

**Evidence:**
- Login screen screenshots
- Error message standardization
- Security testing results

---

## Navigation

| Previous: [CP - Contingency Planning](CP.md) | [Back to Index](../CMMC-INDEX.md) | Next: [IR - Incident Response](IR.md) |
