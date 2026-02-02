# ThreatAnalysis Workflow

Execute the comprehensive security threat assessment pipeline: Research → Threat Model → RedTeam → Council

**Pipeline:** `threat_analysis` from `Data/Pipelines.yaml`

---

## Voice Notification

**MANDATORY - Execute immediately:**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the ThreatAnalysis workflow in the WisdomSynthesis skill for comprehensive security assessment"}' \
  > /dev/null 2>&1 &
```

**Text notification:**
```
Running the **ThreatAnalysis** workflow in the **WisdomSynthesis** skill for comprehensive security assessment...
```

---

## Workflow Steps

### Step 0: Identify Target System

Extract the system/architecture to analyze:

| User Says | Target |
|-----------|--------|
| "threat synthesis on [API]" | API architecture |
| "security analysis of [system]" | System |
| "threat model this: [description]" | Description |

### Step 1: Security Research Phase

Launch security-focused research:

```typescript
Task({
  subagent_type: "ClaudeResearcher",
  description: "Security research phase",
  prompt: `Research security threats for: [TARGET]

  Focus on:
  - Known attack patterns for this architecture
  - Recent CVEs and vulnerabilities
  - Industry-specific threat intelligence
  - Security best practices and mitigations
  - Real-world breach examples

  Return comprehensive security research with sources.`,
  model: "sonnet"
})
```

**Wait for research completion.** Store output as `threat_research`.

### Step 2: Generate Threat Model

Apply Fabric's create_threat_model pattern using STRIDE methodology:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "Generate STRIDE threat model",
  prompt: `Using the Fabric create_threat_model pattern, analyze: [TARGET]

  Context from research:
  [THREAT_RESEARCH]

  Generate STRIDE threat model:
  - **S**poofing: Identity verification threats
  - **T**ampering: Data integrity threats
  - **R**epudiation: Logging and audit threats
  - **I**nformation Disclosure: Confidentiality threats
  - **D**enial of Service: Availability threats
  - **E**levation of Privilege: Authorization threats

  For each category:
  1. List specific threats
  2. Rate likelihood (Low/Medium/High)
  3. Rate impact (Low/Medium/High)
  4. Suggest mitigations

  Return structured STRIDE analysis.`,
  model: "sonnet"
})
```

**Wait for threat model completion.** Store output as `threat_model`.

### Step 3: RedTeam Adversarial Critique

Launch adversarial analysis using RedTeam skill:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "RedTeam adversarial critique",
  prompt: `Invoke the RedTeam skill to critique this threat model:

  [THREAT_MODEL]

  RedTeam agents should:
  - Challenge threat severity ratings
  - Identify missed attack vectors
  - Propose novel attack chains
  - Question mitigation effectiveness
  - Find assumptions in the model

  Use 8 adversarial agents with diverse attack mindsets.

  Return critical analysis with specific attack scenarios.`,
  model: "sonnet"
})
```

**Wait for RedTeam completion.** Store output as `adversarial_analysis`.

### Step 4: Council Security Debate

Launch multi-perspective security discussion:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "Security council debate",
  prompt: `Invoke the Council skill to debate security strategy:

  Threat Model:
  [THREAT_MODEL]

  RedTeam Findings:
  [ADVERSARIAL_ANALYSIS]

  Debate topic: "What are the highest priority threats and mitigations?"

  Perspectives:
  - **Offensive Security**: Attacker viewpoint, exploitability
  - **Defensive Security**: Defense-in-depth, detection
  - **Compliance**: Regulatory requirements, audit trails
  - **Architecture**: Design patterns, secure defaults

  Each perspective should argue for their priorities.

  Return synthesized security strategy.`,
  model: "sonnet"
})
```

**Wait for Council completion.** Store output as `security_synthesis`.

### Step 5: Synthesize Threat Report

Combine all four layers into comprehensive threat assessment:

**Report Structure:**

```markdown
# Threat Analysis Report: [TARGET]

## Executive Summary

### Risk Rating: [CRITICAL / HIGH / MEDIUM / LOW]

[2-3 sentence summary of highest priority threats and recommended actions]

---

## Layer 1: Threat Landscape

### Research Findings
[Security research context and industry trends]

### Known Attack Patterns
[Documented attacks against similar systems]

### Recent Vulnerabilities
[Relevant CVEs and security advisories]

---

## Layer 2: STRIDE Threat Model

### Spoofing Threats
| Threat | Likelihood | Impact | Risk |
|--------|------------|--------|------|
| [threat] | [L/M/H] | [L/M/H] | [L/M/H/C] |

**Mitigations:**
- [mitigation 1]
- [mitigation 2]

### Tampering Threats
[Same structure for each STRIDE category...]

### Repudiation Threats
[...]

### Information Disclosure Threats
[...]

### Denial of Service Threats
[...]

### Elevation of Privilege Threats
[...]

---

## Layer 3: Adversarial Analysis (RedTeam)

### Novel Attack Vectors
[New threats identified by adversarial thinking]

### Attack Chains
[Multi-step attack scenarios]

### Mitigation Weaknesses
[Gaps in proposed defenses]

### Assumptions Challenged
[Questioned security assumptions]

---

## Layer 4: Security Strategy (Council)

### Offensive Security Perspective
[Attack surface prioritization]

### Defensive Security Perspective
[Defense-in-depth strategy]

### Compliance Perspective
[Regulatory requirements]

### Architecture Perspective
[Design recommendations]

### Synthesized Strategy
[Integrated security approach across perspectives]

---

## Priority Matrix

| Threat | Likelihood | Impact | Difficulty to Mitigate | Priority |
|--------|------------|--------|------------------------|----------|
| [threat 1] | High | Critical | Low | **P0 - Immediate** |
| [threat 2] | Medium | High | Medium | **P1 - Next Sprint** |
| [threat 3] | Low | Medium | High | **P2 - Backlog** |

---

## Recommended Actions

### Immediate (P0)
1. [action with specific steps]
2. [action with specific steps]

### Short-term (P1)
1. [action with timeframe]
2. [action with timeframe]

### Long-term (P2)
1. [strategic improvement]
2. [strategic improvement]

---

## Residual Risks

### Accepted Risks
[Risks explicitly accepted with rationale]

### Unmitigated Risks
[Risks not addressed due to constraints]

### Unknown Unknowns
[Areas of uncertainty requiring further investigation]

---

## Monitoring and Detection

### Key Security Metrics
- [metric 1]: [threshold]
- [metric 2]: [threshold]

### Detection Strategies
- [detection approach 1]
- [detection approach 2]

### Incident Response
[High-level response plan for each threat category]

---

## Meta-Analysis

### Confidence Assessment
- Research Coverage: [High/Medium/Low]
- Threat Model Completeness: [High/Medium/Low]
- Mitigation Feasibility: [High/Medium/Low]

### Methodology Limitations
[Known gaps in analysis approach]

### Recommended Follow-up
[Additional security assessments needed]

---

*Generated by WisdomSynthesis ThreatAnalysis Pipeline v1.0.0*
*Research: ClaudeResearcher | Threat Model: Fabric STRIDE | Critique: RedTeam | Strategy: Council*
```

---

## Error Handling

### Research Phase Issues

**Limited threat intelligence:**
```
Security research returned minimal findings for "[TARGET]".

Possible reasons:
- Novel/proprietary system (no public research)
- Niche technology stack
- Private/internal system

Recommendation: Proceed with generic threat model based on architecture patterns.
```

### Threat Model Gaps

**Incomplete STRIDE coverage:**
```
Threat model missing categories: [list]

Continue anyway? Options:
1. Proceed with partial model (document gaps)
2. Manually add missing categories
3. Use generic threat templates
```

### RedTeam Limitations

**Conservative attack scenarios:**
```
RedTeam analysis appears conservative (low novelty score).

Options:
1. Accept current analysis
2. Retry with higher aggression parameters
3. Invoke PromptInjection skill for creative attacks
```

---

## Output

Comprehensive security threat assessment with:
1. **Threat landscape** - Research-backed context
2. **STRIDE model** - Systematic threat categorization
3. **Adversarial critique** - Creative attack thinking
4. **Security strategy** - Multi-perspective defense plan

**Format:** Markdown report
**Location:** Output directly (can save to Security/ directory)

---

## Performance Notes

**Typical execution time:** 45-60 seconds

**Breakdown:**
- Research: ~15s (security-focused research)
- Threat Model: ~15s (STRIDE analysis)
- RedTeam: ~15s (8 adversarial agents)
- Council: ~15s (4 security perspectives)

**Model recommendations:**
- All phases: `sonnet` (security analysis requires quality)
- For critical systems: Consider `opus` for RedTeam/Council phases
- Never use `haiku` for security assessments

---

## Integration with Other Skills

**Feeds into:**
- **WebAssessment** - Active penetration testing
- **PromptInjection** - LLM security testing
- **Evals** - Security control validation

**Combines with:**
- **Recon** - Attack surface mapping
- **OSINT** - Threat actor intelligence
