# SecurityReview Workflow

Security-focused standup with enhanced security analysis, compliance checking, and veto power enforcement.

## Metadata

```yaml
workflow: SecurityReview
skill: standup
version: 1.0.0
triggers:
  - security review *
  - security standup *
  - security council *
  - sec review *
```

## Overview

SecurityReview is a specialized standup for security-sensitive topics:
- Uses the security-review roster with Daniel as lead
- Daniel has veto power for critical security issues
- Includes an extra round for compliance checking
- Outputs security findings separately with severity ratings

## When to Use

### Required For

- Authentication and authorization changes
- Token/session management
- Encryption implementation
- CMMC compliance reviews
- Vulnerability assessments
- Network security changes
- Data handling modifications
- Third-party integration security

### Security Focus Areas

| Area | Key Concerns |
|------|--------------|
| Authentication | Credential handling, MFA, session management |
| Authorization | Access control, privilege escalation, RBAC |
| Data Protection | Encryption, data classification, retention |
| Network | Segmentation, firewall rules, TLS |
| Compliance | CMMC, GDPR, HIPAA requirements |
| Vulnerability | OWASP Top 10, CVE remediation |

## Workflow Steps

### Step 1: Parse Request

```typescript
function parseSecurityReview(userMessage: string): {
  topic: string;
  complianceFrameworks: string[];
} {
  // Extract topic
  const patterns = [
    /security\s+review\s+(.+?)(?:\s+for\s+|\s*$)/i,
    /security\s+standup\s+(?:on\s+)?(.+?)(?:\s+for\s+|\s*$)/i,
    /security\s+council\s+(?:on\s+)?(.+?)(?:\s+for\s+|\s*$)/i,
    /sec\s+review\s+(.+?)(?:\s+for\s+|\s*$)/i,
  ];

  let topic: string | null = null;
  for (const pattern of patterns) {
    const match = userMessage.match(pattern);
    if (match) {
      topic = match[1].trim();
      break;
    }
  }

  if (!topic) {
    throw new Error('Could not extract topic from security review request');
  }

  // Detect relevant compliance frameworks
  const complianceFrameworks = detectComplianceFrameworks(topic, userMessage);

  return { topic, complianceFrameworks };
}

function detectComplianceFrameworks(topic: string, message: string): string[] {
  const frameworks: string[] = [];
  const combined = `${topic} ${message}`.toLowerCase();

  if (combined.includes('cmmc')) frameworks.push('CMMC');
  if (combined.includes('gdpr')) frameworks.push('GDPR');
  if (combined.includes('hipaa')) frameworks.push('HIPAA');
  if (combined.includes('pci') || combined.includes('payment')) frameworks.push('PCI-DSS');
  if (combined.includes('sox') || combined.includes('financial')) frameworks.push('SOX');
  if (combined.includes('fedramp') || combined.includes('federal')) frameworks.push('FedRAMP');

  // Default to CMMC if no specific framework detected (common for our context)
  if (frameworks.length === 0 && combined.includes('compliance')) {
    frameworks.push('CMMC');
  }

  return frameworks;
}
```

### Step 2: Configure Security Roster

```typescript
const SECURITY_ROSTER = {
  agents: ['Daniel', 'Clay', 'Amy', 'Geoff'],
  lead: 'Daniel',
  vetoEnabled: true,
  vetoPower: {
    agent: 'Daniel',
    triggers: [
      'CRITICAL vulnerability',
      'CMMC blocker',
      'Unencrypted sensitive data',
      'Missing authentication',
      'Privilege escalation risk'
    ]
  }
};

function configureSecurityRoster(): RosterConfig {
  return {
    agents: SECURITY_ROSTER.agents,
    lead: SECURITY_ROSTER.lead,
    options: {
      vetoEnabled: true,
      vetoAgent: 'Daniel',
      devilsAdvocate: true,  // Always enabled for security
      conflictThreshold: 0.2  // More sensitive to conflicts
    }
  };
}
```

### Step 2.5: Run Automated Security Scans (Optional)

If `kai-security-tools` is installed, run automated scans before the council discussion:

```typescript
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface AutomatedScanResult {
  dependencyAudit: DependencyAuditResult | null;
  secretsScan: SecretsResult | null;
  sbom: SbomResult | null;
}

async function runAutomatedSecurityScans(
  projectPath: string
): Promise<AutomatedScanResult> {
  const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/PAI`;
  const toolsPath = `${PAI_DIR}/packs/kai-security-tools/Tools`;

  // Check if kai-security-tools is installed
  if (!existsSync(toolsPath)) {
    console.log('[kai-security-tools not installed - skipping automated scans]');
    console.log('[Install with: Install kai-security-tools pack]');
    return { dependencyAudit: null, secretsScan: null, sbom: null };
  }

  console.log('\n--- Running Automated Security Scans ---\n');

  const results: AutomatedScanResult = {
    dependencyAudit: null,
    secretsScan: null,
    sbom: null
  };

  // 1. Dependency Audit
  console.log('[1/3] Scanning dependencies for CVEs...');
  try {
    const { stdout } = await execAsync(
      `bun run ${toolsPath}/DependencyAudit.ts "${projectPath}" --json --severity=high`
    );
    results.dependencyAudit = JSON.parse(stdout);
    const { summary } = results.dependencyAudit;
    console.log(`      Found: ${summary.critical} critical, ${summary.high} high vulnerabilities`);
  } catch (error) {
    console.log('      [Dependency audit failed - continuing]');
  }

  // 2. Secrets Scan
  console.log('[2/3] Scanning for hardcoded secrets...');
  try {
    const { stdout } = await execAsync(
      `bun run ${toolsPath}/SecretsScan.ts "${projectPath}" --json`
    );
    results.secretsScan = JSON.parse(stdout);
    const { summary } = results.secretsScan;
    console.log(`      Found: ${summary.critical} critical, ${summary.high} high severity secrets`);
  } catch (error) {
    console.log('      [Secrets scan failed - continuing]');
  }

  // 3. SBOM Generation (for compliance)
  console.log('[3/3] Generating SBOM for compliance...');
  try {
    const { stdout } = await execAsync(
      `bun run ${toolsPath}/SbomGenerator.ts "${projectPath}" --json`
    );
    results.sbom = JSON.parse(stdout);
    console.log(`      Generated: ${results.sbom.components?.length || 0} components cataloged`);
  } catch (error) {
    console.log('      [SBOM generation failed - continuing]');
  }

  console.log('\n--- Automated Scans Complete ---\n');

  return results;
}

function incorporateScanResults(
  context: string,
  scanResults: AutomatedScanResult
): string {
  let enhancedContext = context;

  if (scanResults.dependencyAudit) {
    const { summary, vulnerabilities } = scanResults.dependencyAudit;
    if (summary.critical > 0 || summary.high > 0) {
      enhancedContext += '\n\n## Automated Dependency Audit Results\n';
      enhancedContext += `**CRITICAL: ${summary.critical} | HIGH: ${summary.high}**\n`;
      enhancedContext += 'Key vulnerabilities:\n';
      vulnerabilities
        .filter(v => v.severity === 'critical' || v.severity === 'high')
        .slice(0, 5)
        .forEach(v => {
          enhancedContext += `- ${v.package}: ${v.cve || 'CVE pending'} (${v.severity})\n`;
        });
    }
  }

  if (scanResults.secretsScan) {
    const { summary, findings } = scanResults.secretsScan;
    if (summary.critical > 0 || summary.high > 0) {
      enhancedContext += '\n\n## Automated Secrets Scan Results\n';
      enhancedContext += `**CRITICAL: ${summary.critical} | HIGH: ${summary.high}**\n`;
      enhancedContext += 'Detected secrets (redacted):\n';
      findings
        .filter(f => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .forEach(f => {
          enhancedContext += `- ${f.type} in ${f.file}:${f.line}\n`;
        });
    }
  }

  if (scanResults.sbom) {
    enhancedContext += '\n\n## SBOM Summary\n';
    enhancedContext += `Components: ${scanResults.sbom.components?.length || 0}\n`;
    enhancedContext += 'SBOM generated for CMMC SA.L2-3.17.2 compliance.\n';
  }

  return enhancedContext;
}
```

**Why Automated Scans First?**

Running automated scans before the council discussion:
1. Provides concrete data for Daniel's analysis
2. Catches obvious issues before human review
3. Generates compliance artifacts (SBOM) automatically
4. Saves time by pre-identifying Critical/High findings

---

### Step 3: Execute Security Analysis Rounds

```typescript
import { runCouncil } from 'kai-council-framework/Engine/Orchestrator';

async function executeSecurityReview(
  topic: string,
  complianceFrameworks: string[]
): Promise<SecurityReviewResult> {
  const roster = configureSecurityRoster();

  console.log(`\nStarting security review on "${topic}"...\n`);
  console.log(`[Using security-review roster: ${roster.agents.join(', ')}]`);
  console.log(`[Daniel leads with veto power for critical issues]`);
  if (complianceFrameworks.length > 0) {
    console.log(`[Compliance frameworks: ${complianceFrameworks.join(', ')}]`);
  }
  console.log('');

  // Run main security analysis (3 rounds)
  const mainResult = await runCouncil({
    topic,
    context: buildSecurityContext(topic, complianceFrameworks),
    roster: roster.agents,
    maxRounds: 3,
    visibility: 'full',
    synthesisStrategy: 'weighted',  // Weight Daniel's perspective higher
    agentPack: 'kai-devsecops-agents',
    options: {
      lead: roster.lead,
      vetoEnabled: roster.options.vetoEnabled,
      vetoAgent: roster.options.vetoAgent,
      devilsAdvocate: true,
      conflictThreshold: 0.2
    }
  });

  // Check for veto before compliance round
  if (mainResult.veto) {
    return handleVeto(mainResult);
  }

  // Run compliance check round (if frameworks specified)
  let complianceResult: ComplianceCheckResult | null = null;
  if (complianceFrameworks.length > 0) {
    complianceResult = await executeComplianceCheck(
      topic,
      mainResult,
      complianceFrameworks
    );
  }

  // Extract and categorize security findings
  const findings = extractSecurityFindings(mainResult, complianceResult);

  return {
    mainResult,
    complianceResult,
    findings,
    signOff: determineSignOff(findings)
  };
}

function buildSecurityContext(topic: string, frameworks: string[]): string {
  let context = `Security review of: ${topic}\n\n`;
  context += 'Focus areas:\n';
  context += '- STRIDE threat modeling\n';
  context += '- OWASP Top 10 vulnerabilities\n';
  context += '- Authentication and authorization\n';
  context += '- Data protection and encryption\n';

  if (frameworks.length > 0) {
    context += `\nCompliance frameworks: ${frameworks.join(', ')}\n`;
    for (const framework of frameworks) {
      context += getFrameworkContext(framework);
    }
  }

  return context;
}

function getFrameworkContext(framework: string): string {
  const contexts: Record<string, string> = {
    'CMMC': '- CMMC Level 2: Access Control, Audit, Security Assessment\n',
    'GDPR': '- GDPR: Data minimization, consent, right to erasure\n',
    'HIPAA': '- HIPAA: PHI protection, access controls, audit trails\n',
    'PCI-DSS': '- PCI-DSS: Cardholder data protection, encryption, access control\n',
    'SOX': '- SOX: Financial data integrity, audit trails, access controls\n',
    'FedRAMP': '- FedRAMP: NIST 800-53 controls, continuous monitoring\n'
  };
  return contexts[framework] || '';
}
```

### Step 4: Execute Compliance Check Round

```typescript
async function executeComplianceCheck(
  topic: string,
  mainResult: CouncilResult,
  frameworks: string[]
): Promise<ComplianceCheckResult> {
  console.log('\n--- Compliance Check Round ---\n');

  // Focused compliance round with Daniel and Amy
  const complianceResult = await runCouncil({
    topic: `Compliance review of "${topic}" against ${frameworks.join(', ')}`,
    context: formatMainResultForCompliance(mainResult),
    roster: ['Daniel', 'Amy'],
    maxRounds: 1,
    visibility: 'progress',
    synthesisStrategy: 'facilitator',  // Daniel makes compliance call
    agentPack: 'kai-devsecops-agents',
    options: {
      lead: 'Daniel',
      vetoEnabled: true
    }
  });

  return {
    frameworks,
    findings: extractComplianceFindings(complianceResult, frameworks),
    status: determineComplianceStatus(complianceResult)
  };
}

function formatMainResultForCompliance(result: CouncilResult): string {
  return `
Previous security analysis summary:
${result.synthesis.decision}

Key security considerations raised:
${result.contributions.map(c => `- ${c.agent}: ${c.summary}`).join('\n')}

Now reviewing for compliance requirements.
  `.trim();
}
```

### Step 5: Handle Veto

```typescript
interface VetoResult {
  vetoed: true;
  vetoAgent: string;
  vetoReason: string;
  resolution: VetoResolution;
}

type VetoResolution =
  | { type: 'blocked'; message: string }
  | { type: 'remediation'; steps: string[] }
  | { type: 'exception'; approval: string };

async function handleVeto(result: CouncilResult): Promise<SecurityReviewResult> {
  console.log('\n' + '!'.repeat(60));
  console.log('SECURITY VETO');
  console.log('!'.repeat(60));

  console.log(`\n**Vetoed by**: ${result.veto.agent}`);
  console.log(`**Reason**: ${result.veto.reason}`);
  console.log(`\n**Category**: ${categorizeVeto(result.veto.reason)}`);

  console.log('\n## Resolution Required\n');
  const remediation = generateRemediation(result.veto);
  for (const step of remediation) {
    console.log(`- [ ] ${step}`);
  }

  console.log('\n' + '!'.repeat(60));
  console.log('Cannot proceed until veto is addressed.');
  console.log('!'.repeat(60));

  return {
    mainResult: result,
    complianceResult: null,
    findings: [{
      severity: 'CRITICAL',
      title: result.veto.reason,
      description: `Security veto by ${result.veto.agent}`,
      remediation
    }],
    signOff: {
      status: 'BLOCKED',
      blocker: result.veto.reason
    }
  };
}

function categorizeVeto(reason: string): string {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('vulnerability') || reasonLower.includes('cvss')) {
    return 'Critical Vulnerability';
  }
  if (reasonLower.includes('cmmc') || reasonLower.includes('compliance')) {
    return 'Compliance Blocker';
  }
  if (reasonLower.includes('authentication') || reasonLower.includes('authorization')) {
    return 'Access Control Violation';
  }
  if (reasonLower.includes('encryption') || reasonLower.includes('unencrypted')) {
    return 'Data Protection Violation';
  }
  return 'Security Risk';
}

function generateRemediation(veto: VetoInfo): string[] {
  // Generate remediation steps based on veto type
  const steps: string[] = [];

  steps.push('Review the security concern in detail');
  steps.push('Document the risk and potential impact');

  if (veto.reason.toLowerCase().includes('vulnerability')) {
    steps.push('Assess CVSS score and exploitability');
    steps.push('Implement patch or mitigation');
    steps.push('Verify fix with security testing');
  } else if (veto.reason.toLowerCase().includes('compliance')) {
    steps.push('Map to specific compliance control');
    steps.push('Implement required control');
    steps.push('Document evidence for audit');
  } else if (veto.reason.toLowerCase().includes('authentication')) {
    steps.push('Review authentication flow');
    steps.push('Implement proper credential handling');
    steps.push('Add MFA if required');
  }

  steps.push('Schedule follow-up security review');

  return steps;
}
```

### Step 6: Extract Security Findings

```typescript
interface SecurityFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  affectedArea: string;
  remediation: string[];
  complianceImpact?: string[];
}

function extractSecurityFindings(
  mainResult: CouncilResult,
  complianceResult: ComplianceCheckResult | null
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // Extract findings from agent contributions
  for (const contribution of mainResult.contributions) {
    if (contribution.agent === 'Daniel') {
      // Parse Daniel's security analysis for findings
      const parsed = parseSecurityAnalysis(contribution.content);
      findings.push(...parsed);
    }
  }

  // Extract findings from conflicts
  for (const conflict of mainResult.conflicts || []) {
    if (conflict.category === 'security') {
      findings.push({
        severity: 'MEDIUM',
        title: `Security Trade-off: ${conflict.dimension}`,
        description: conflict.description,
        affectedArea: 'Design Decision',
        remediation: [conflict.resolution || 'Requires further discussion']
      });
    }
  }

  // Add compliance findings
  if (complianceResult) {
    for (const finding of complianceResult.findings) {
      findings.push({
        severity: finding.blocking ? 'HIGH' : 'MEDIUM',
        title: `${finding.framework}: ${finding.control}`,
        description: finding.gap,
        affectedArea: 'Compliance',
        remediation: finding.remediation,
        complianceImpact: [finding.framework]
      });
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}

function parseSecurityAnalysis(content: string): SecurityFinding[] {
  // Parse structured security analysis from Daniel's response
  // This would use regex or structured output parsing
  // Simplified implementation:
  const findings: SecurityFinding[] = [];

  const criticalMatches = content.match(/CRITICAL[:\s]+([^\n]+)/gi) || [];
  for (const match of criticalMatches) {
    findings.push({
      severity: 'CRITICAL',
      title: match.replace(/CRITICAL[:\s]+/i, ''),
      description: 'Critical security issue identified',
      affectedArea: 'Security',
      remediation: ['Immediate remediation required']
    });
  }

  // Similar for HIGH, MEDIUM, LOW...

  return findings;
}
```

### Step 7: Present Security Results

```typescript
function presentSecurityResults(result: SecurityReviewResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('SECURITY REVIEW RESULTS');
  console.log('='.repeat(60));

  // Sign-off status
  console.log(`\n## Security Sign-Off: ${formatSignOff(result.signOff)}\n`);

  // Findings by severity
  console.log('## Security Findings\n');

  const bySeverity = groupBy(result.findings, 'severity');

  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']) {
    const items = bySeverity[severity] || [];
    if (items.length > 0) {
      console.log(`### ${severity} (${items.length})\n`);
      for (const finding of items) {
        console.log(`- **${finding.title}**`);
        console.log(`  ${finding.description}`);
        if (finding.remediation.length > 0) {
          console.log(`  Remediation:`);
          for (const step of finding.remediation) {
            console.log(`    - ${step}`);
          }
        }
        console.log('');
      }
    }
  }

  // Decision
  console.log('## Recommendation\n');
  console.log(result.mainResult.synthesis.decision);

  // Compliance status (if applicable)
  if (result.complianceResult) {
    console.log('\n## Compliance Status\n');
    console.log(`Status: ${result.complianceResult.status}`);
    console.log(`Frameworks: ${result.complianceResult.frameworks.join(', ')}`);
  }

  // Action items
  if (result.mainResult.synthesis.actionItems.length > 0) {
    console.log('\n## Security Action Items\n');
    for (const item of result.mainResult.synthesis.actionItems) {
      console.log(`- [ ] ${item.description}`);
      if (item.owner) console.log(`      Owner: ${item.owner}`);
      if (item.priority) console.log(`      Priority: ${item.priority}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

function formatSignOff(signOff: SignOffStatus): string {
  switch (signOff.status) {
    case 'APPROVED':
      return 'APPROVED - No blocking security issues';
    case 'CONDITIONAL':
      return `CONDITIONAL - Approved with conditions: ${signOff.conditions.join(', ')}`;
    case 'BLOCKED':
      return `BLOCKED - ${signOff.blocker}`;
    default:
      return 'PENDING - Further review required';
  }
}
```

## Complete Workflow

```typescript
export async function securityReview(userMessage: string): Promise<void> {
  // Step 1: Parse request
  const { topic, complianceFrameworks } = parseSecurityReview(userMessage);

  // Steps 2-6: Execute security review
  const result = await executeSecurityReview(topic, complianceFrameworks);

  // Step 7: Present results
  presentSecurityResults(result);

  // Save findings separately if configured
  await saveSecurityFindings(result);
}

async function saveSecurityFindings(result: SecurityReviewResult): Promise<void> {
  const config = loadConfig();

  if (config.outputDestinations.file.enabled) {
    const findingsPath = path.join(
      config.outputDestinations.file.path,
      `security-findings-${Date.now()}.md`
    );
    await writeSecurityFindingsReport(findingsPath, result);
    console.log(`\n[Security findings saved to: ${findingsPath}]`);
  }

  if (config.outputDestinations.joplin.enabled) {
    await saveToJoplin('Security Reviews', formatSecurityReport(result));
    console.log(`\n[Security findings saved to Joplin]`);
  }
}
```

## Output Example

```
Starting security review on "API authentication flow"...

[Using security-review roster: Daniel, Clay, Amy, Geoff]
[Daniel leads with veto power for critical issues]
[Compliance frameworks: CMMC]

--- Round 1: Independent Perspectives ---

DANIEL (Security Engineer):
The API authentication flow needs careful review:

CRITICAL: No rate limiting on login endpoint - brute force risk
HIGH: JWT tokens stored in localStorage - XSS vulnerability
MEDIUM: Refresh token rotation not implemented

Recommended controls:
1. Implement rate limiting (10 attempts/minute)
2. Move tokens to httpOnly cookies
3. Add refresh token rotation

CLAY (Tech Lead):
Implementation considerations...

AMY (QA Lead):
Security testing requirements...

GEOFF (Network Specialist):
Network-level protections...

--- Round 2: Cross-Talk & Refinement ---

[Discussion continues...]

--- Round 3: Final Positions ---

[Final positions...]

--- Compliance Check Round ---

DANIEL: Mapping to CMMC Level 2...
AMY: Test coverage for compliance controls...

============================================================
SECURITY REVIEW RESULTS
============================================================

## Security Sign-Off: CONDITIONAL - Approved with conditions: Implement rate limiting before production

## Security Findings

### CRITICAL (1)

- **No rate limiting on login endpoint**
  Brute force attack vector identified
  Remediation:
    - Implement rate limiting (10 attempts/minute)
    - Add account lockout after 5 failures
    - Enable IP-based blocking

### HIGH (1)

- **JWT tokens in localStorage**
  XSS vulnerability - tokens accessible to scripts
  Remediation:
    - Move to httpOnly cookies
    - Implement proper CSRF protection

### MEDIUM (2)

- **Refresh token rotation not implemented**
  Token theft risk if refresh token compromised
  Remediation:
    - Implement one-time use refresh tokens
    - Add token family tracking

- **CMMC: AC.L2-3.1.1 - Access Control**
  Need documentation of access control policy
  Remediation:
    - Document access control procedures
    - Implement role-based access control

## Recommendation

Proceed with implementation after addressing CRITICAL finding. Rate limiting
must be in place before production deployment. HIGH and MEDIUM findings
should be addressed in the same sprint.

## Compliance Status

Status: CONDITIONAL
Frameworks: CMMC

## Security Action Items

- [ ] Implement rate limiting on login endpoint
      Owner: Roger
      Priority: CRITICAL
- [ ] Migrate JWT storage to httpOnly cookies
      Owner: Clay
      Priority: HIGH
- [ ] Add CMMC access control documentation
      Owner: Daniel
      Priority: MEDIUM

============================================================

[Security findings saved to: ~/workshop/standups/security-findings-1704556800.md]
```

## Related Workflows

- [RunStandup.md](./RunStandup.md) - Full multi-round standup
- [QuickReview.md](./QuickReview.md) - Lightweight review (not for security topics)
