# System and Services Acquisition (SA)

**Practice Count:** 5 practices
**NIST Reference:** NIST SP 800-171 Section 3.13

---

## Overview

The System and Services Acquisition domain focuses on allocating resources for adequate protection of CUI in acquired systems and services. This includes incorporating security requirements in the acquisition process, applying security throughout the system development life cycle, employing security engineering principles, and ensuring proper separation of user and administrative functionality.

---

## Practices

### SA.L2-3.13.1: Security in acquisition process

**Requirement:** Allocate sufficient resources to adequately protect organizational information systems.

**Implementation:**
- Security requirements in RFPs
- Security budget separate from IT budget
- Annual security budget review

**Evidence:**
- RFP templates with security requirements
- Security budget documentation
- Budget approval records

---

### SA.L2-3.13.2: Security requirements in contracts

**Requirement:** Employ system development life cycle processes that incorporate information security considerations.

**Implementation:**
- Security requirements in all phases (design, dev, test)
- Threat modeling in design phase
- Security testing before deployment

**Evidence:**
- SDLC process documentation
- Threat models for projects
- Security test results

---

### SA.L2-3.13.3: Monitor developer security practices

**Requirement:** Employ security engineering principles in the specification, design, development, implementation, and modification of information systems.

**Implementation:**
- Secure design principles (least privilege, fail secure)
- Security architecture review
- Secure coding standards

**Evidence:**
- Secure design principles documentation
- Architecture review records
- Secure coding standards

---

### SA.L2-3.13.4: Separate user/privileged functions

**Requirement:** Separate user functionality (including user interface services) from information system management functionality.

**Implementation:**
- Admin interfaces on separate network
- Role-based access (users cannot access admin functions)
- Admin actions logged separately

**Evidence:**
- Network segmentation documentation
- RBAC configuration
- Admin audit logs

---

### SA.L2-3.13.5: Security functions verified

**Requirement:** Prevent unauthorized and unintended information transfer via shared system resources.

**Implementation:**
- Multi-tenant isolation verified
- Memory wiped between processes
- No data leakage between users

**Evidence:**
- Multi-tenancy architecture documentation
- Penetration test results (data isolation)
- Memory management testing

---

## Navigation

| Previous: [RE - Recovery](RE.md) | [Back to Index](../CMMC-INDEX.md) | Next: [SC - System and Communications Protection](SC.md) |
