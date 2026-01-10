# Cyber Kill Chain Reference

Lockheed Martin's Intelligence Driven Defense framework.

## The 7 Phases

```
1. RECONNAISSANCE → 2. WEAPONIZATION → 3. DELIVERY
                                            ↓
4. EXPLOITATION ← ← ← ← ← ← ← ← ← ← ← ← ← ←
       ↓
5. INSTALLATION → 6. COMMAND & CONTROL → 7. ACTIONS ON OBJECTIVES
```

## Phase Details

### Phase 1: Reconnaissance
**Goal:** Gather information about target

**Activities:**
- Email harvesting
- Social engineering research
- Network scanning
- OSINT collection
- Technology identification

**Defense:**
- Web analytics monitoring
- OSINT monitoring of own exposure
- Honeypots and deception

**ATT&CK Mapping:** TA0043 (Reconnaissance)

---

### Phase 2: Weaponization
**Goal:** Create deliverable payload

**Activities:**
- Exploit development
- Malware creation
- Dropper development
- Payload packaging

**Defense:**
- Threat intelligence sharing
- (Limited visibility - attacker-side)

**ATT&CK Mapping:** TA0042 (Resource Development)

---

### Phase 3: Delivery
**Goal:** Transmit weapon to target

**Methods:**
- Phishing emails
- Watering hole attacks
- USB/removable media
- Supply chain compromise
- Drive-by downloads

**Defense:**
- Email security gateways
- Web proxies and filtering
- USB device controls
- User awareness training
- Network segmentation

**ATT&CK Mapping:** TA0001 (Initial Access)

---

### Phase 4: Exploitation
**Goal:** Trigger malicious code

**Methods:**
- Vulnerability exploitation
- Social engineering success
- Zero-day exploits
- Macro execution
- Script execution

**Defense:**
- Patch management
- Exploit mitigation (DEP, ASLR)
- Application whitelisting
- Endpoint protection
- Sandboxing

**ATT&CK Mapping:** TA0002 (Execution)

---

### Phase 5: Installation
**Goal:** Install backdoor/persistent access

**Methods:**
- Malware installation
- Backdoor placement
- Registry modification
- Scheduled tasks
- Service creation

**Defense:**
- Host-based IDS/IPS
- Endpoint detection (EDR)
- File integrity monitoring
- Application control
- Privilege management

**ATT&CK Mapping:** TA0003 (Persistence), TA0005 (Defense Evasion)

---

### Phase 6: Command & Control (C2)
**Goal:** Establish remote control channel

**Methods:**
- HTTP/HTTPS beacons
- DNS tunneling
- Social media C2
- Cloud services
- Custom protocols

**Defense:**
- Network monitoring
- DNS filtering
- Egress filtering
- Protocol analysis
- SSL/TLS inspection
- Threat intelligence feeds

**ATT&CK Mapping:** TA0011 (Command and Control)

---

### Phase 7: Actions on Objectives
**Goal:** Achieve original mission

**Actions:**
- Data exfiltration
- Data destruction
- Ransomware deployment
- Espionage
- Sabotage
- Lateral movement

**Defense:**
- Data loss prevention
- User behavior analytics
- Database activity monitoring
- Incident response
- Business continuity

**ATT&CK Mapping:** TA0009 (Collection), TA0010 (Exfiltration), TA0040 (Impact)

---

## Defensive Strategy

**Break the Chain:**
The goal is to disrupt the adversary at any phase - earlier is better.

```
         DETECTION OPPORTUNITIES

Phase 1: Low visibility (external)
Phase 2: Low visibility (attacker-side)
Phase 3: HIGH - Email, web, endpoints
Phase 4: HIGH - Endpoints, network
Phase 5: HIGH - Endpoints, logs
Phase 6: HIGH - Network, DNS
Phase 7: MEDIUM - Data, behavior
```

**Recommended Focus:**
1. **Phase 3 (Delivery)** - Email security, user training
2. **Phase 6 (C2)** - Network monitoring, DNS filtering
3. **Phase 5 (Installation)** - EDR, application control

## Mapping Template

```yaml
kill_chain_analysis:
  threat: "[Threat name]"
  phases_observed:
    - phase: 1
      name: "Reconnaissance"
      observed: false
      activities: []
    - phase: 3
      name: "Delivery"
      observed: true
      activities: ["Spearphishing email"]
      evidence: "Email logs showing delivery"
    - phase: 4
      name: "Exploitation"
      observed: true
      activities: ["Macro execution"]
      evidence: "Process creation events"

  primary_phase: 3
  disruption_recommendation: "Email security enhancement"
```

## Resources

- Original Paper: Lockheed Martin (2011)
- https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html
