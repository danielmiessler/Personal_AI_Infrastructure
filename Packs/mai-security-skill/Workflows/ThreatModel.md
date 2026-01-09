# Threat Model Workflow

Generate a STRIDE threat model with DREAD risk ratings for a system or feature.

## Overview

| Attribute | Value |
|-----------|-------|
| **Purpose** | Identify and rate security threats early in design |
| **Input** | Architecture diagram, PRD, feature description, or system overview |
| **Output** | Completed threat model document (Templates/threat-model.md) |
| **Duration** | 30-60 minutes for typical feature, 2-4 hours for complex system |

## Workflow Steps

### Step 1: Decompose the System

Break down the system into components:

1. **Identify components**
   - Web/mobile clients
   - APIs and services
   - Databases and storage
   - Third-party integrations
   - Infrastructure (load balancers, CDN, etc.)

2. **Map data flows**
   - What data moves between components?
   - What is the sensitivity of each data type?
   - Where is data at rest vs in transit?

3. **Document technologies**
   - Languages and frameworks
   - Databases and message queues
   - Cloud services and providers

### Step 2: Identify Trust Boundaries

Trust boundaries are where data crosses security perimeters:

| Boundary Type | Examples |
|---------------|----------|
| Network | Internet to DMZ, DMZ to internal, VPC to VPC |
| Process | Container to container, service to service |
| User | Anonymous to authenticated, user to admin |
| Data | Public to confidential, internal to CUI |

Draw or describe trust boundaries between components. Threats often occur at these boundaries.

### Step 3: Apply STRIDE

For each component and trust boundary, analyze threats:

#### Spoofing (S)
- Can an attacker impersonate a user or system?
- Check: Authentication mechanisms, token validation, certificate pinning

#### Tampering (T)
- Can an attacker modify data in transit or at rest?
- Check: Input validation, integrity checks, encryption, HMAC

#### Repudiation (R)
- Can a user deny performing an action?
- Check: Audit logging, non-repudiation, signed transactions

#### Information Disclosure (I)
- Can an attacker access unauthorized data?
- Check: Authorization, encryption, error messages, logging

#### Denial of Service (D)
- Can an attacker make the system unavailable?
- Check: Rate limiting, resource quotas, failover, input limits

#### Elevation of Privilege (E)
- Can an attacker gain higher access than intended?
- Check: RBAC, least privilege, privilege escalation paths

### Step 4: Rate with DREAD

Score each identified threat (1-10 for each factor):

| Factor | Question | 1 (Low) | 10 (High) |
|--------|----------|---------|-----------|
| **Damage** | How bad if exploited? | Minor annoyance | Complete compromise |
| **Reproducibility** | How easy to reproduce? | Rare conditions | Every time |
| **Exploitability** | How easy to exploit? | Requires expert | Script available |
| **Affected Users** | How many impacted? | Single user | All users |
| **Discoverability** | How easy to find? | Requires source | Obvious |

**Overall Risk = Average of all factors**

| Risk Score | Level | Action Required |
|------------|-------|-----------------|
| 1-3 | Low | Document and accept or backlog |
| 4-6 | Medium | Mitigate before next release |
| 7-8 | High | Mitigate before merge/deploy |
| 9-10 | Critical | Stop all work and address immediately |

### Step 5: Define Mitigations

For each threat rated Medium or higher:

1. **Identify countermeasures**
   - Preventive controls (stop the attack)
   - Detective controls (identify when attacked)
   - Corrective controls (recover from attack)

2. **Evaluate effectiveness**
   - Does mitigation fully address the threat?
   - Does it introduce new risks?
   - What is the implementation cost?

3. **Document residual risk**
   - Risk remaining after mitigation
   - Accepted risk with justification

### Step 6: Map to CMMC

Link threats and mitigations to CMMC practices:

| Threat Type | Relevant CMMC Domains |
|-------------|----------------------|
| Spoofing | IA (Identification & Auth), AC (Access Control) |
| Tampering | SI (System Integrity), SC (System & Comms) |
| Repudiation | AU (Audit & Accountability) |
| Information Disclosure | SC (Encryption), AC (Access Control), MP (Media Protection) |
| Denial of Service | SC (System Protection), CP (Contingency Planning) |
| Elevation of Privilege | AC (Access Control), CM (Configuration Management) |

Reference [CMMC-INDEX](../Knowledge/CMMC-INDEX.md) for specific practices.

## STRIDE Quick Reference

### Spoofing
**Definition:** Pretending to be something or someone else
**Questions:**
- How do we verify identity of users?
- How do we verify identity of systems/services?
- Can tokens/credentials be stolen or forged?
- Is authentication required for all sensitive operations?

**Common mitigations:**
- Multi-factor authentication
- Certificate-based service identity
- Token expiration and rotation
- Secure credential storage

### Tampering
**Definition:** Modifying data or code without authorization
**Questions:**
- Can data be modified in transit?
- Can data be modified at rest?
- Can code/configuration be modified?
- Are inputs validated before processing?

**Common mitigations:**
- TLS for data in transit
- Encryption and integrity checks at rest
- Input validation and sanitization
- Code signing and integrity verification

### Repudiation
**Definition:** Claiming to not have performed an action
**Questions:**
- Are all security-relevant actions logged?
- Can logs be tampered with?
- Is there sufficient detail for forensics?
- Are timestamps reliable?

**Common mitigations:**
- Comprehensive audit logging
- Tamper-evident log storage
- Synchronized timestamps (NTP)
- Digital signatures for transactions

### Information Disclosure
**Definition:** Exposing information to unauthorized parties
**Questions:**
- What sensitive data exists?
- Who should have access to each data type?
- Is data encrypted in transit and at rest?
- Do error messages leak information?

**Common mitigations:**
- Encryption everywhere
- Role-based access control
- Data classification and handling
- Sanitized error messages

### Denial of Service
**Definition:** Making resources unavailable
**Questions:**
- What resources can be exhausted?
- Are there rate limits?
- What happens when components fail?
- Can attackers trigger expensive operations?

**Common mitigations:**
- Rate limiting and throttling
- Resource quotas and limits
- Graceful degradation
- DDoS protection services

### Elevation of Privilege
**Definition:** Gaining capabilities beyond authorization
**Questions:**
- How are roles and permissions managed?
- Can users modify their own permissions?
- Are there paths from low to high privilege?
- Is authorization checked on every request?

**Common mitigations:**
- Principle of least privilege
- Role-based access control (RBAC)
- Authorization on every request
- Privilege separation in design

## Output

Generate completed threat model using [Templates/threat-model.md](../Templates/threat-model.md).

The document should include:
1. System overview and scope
2. Component diagram or description
3. Trust boundary identification
4. STRIDE analysis table for each boundary
5. DREAD ratings for identified threats
6. Mitigations with owner and timeline
7. CMMC practice mapping
8. Residual risk summary

## Example

**Input:** "New payment processing API that accepts credit card data, validates with payment processor, and stores transaction records"

**STRIDE Analysis (excerpt):**

| Boundary | Threat | STRIDE | DREAD | Risk | Mitigation |
|----------|--------|--------|-------|------|------------|
| Client to API | Stolen credit card used | S | 8 | High | 3DS authentication |
| Client to API | Card data intercepted | I | 9 | Critical | TLS 1.3 only |
| API to Processor | Request modified | T | 7 | High | HMAC signing |
| API to Database | Card stored plaintext | I | 10 | Critical | Tokenization |
| Database | Unauthorized access | I,E | 8 | High | IAM, encryption |
| All | Audit trail gaps | R | 6 | Medium | Comprehensive logging |

**CMMC Mapping (excerpt):**
- TLS 1.3: SC.L2-3.13.8 (Cryptographic Protection)
- Tokenization: SC.L2-3.13.16 (CUI at Rest)
- Audit logging: AU.L2-3.3.1 (System Audit)
