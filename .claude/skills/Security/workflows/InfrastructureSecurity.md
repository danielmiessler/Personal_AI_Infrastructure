# InfrastructureSecurity Workflow

**Purpose**: Audit cloud and infrastructure configurations for security vulnerabilities and misconfigurations

**Input**: Cloud provider (AWS/Azure/GCP), infrastructure architecture, configuration files

**Output**: Infrastructure security audit report with CIS Benchmark findings and hardening recommendations

---

## What is Infrastructure Security?

**InfrastructureSecurity** evaluates cloud resources, network configuration, and infrastructure setup against security best practices.

**Scope**:
- Cloud infrastructure (AWS, Azure, GCP)
- Network architecture (VPCs, subnets, security groups)
- Kubernetes/container security
- On-premise infrastructure
- Infrastructure-as-Code (IaC) files (Terraform, CloudFormation)

**Not in Scope**:
- Application code → Use SecurityReview workflow
- System design → Use ThreatModel workflow
- Compliance documentation → Use CmmcBaseline workflow

**Complements**:
- ThreatModel (architecture design) + Infrastructure Security (implementation audit) = secure deployment

---

## When to Use InfrastructureSecurity

### ✅ Use InfrastructureSecurity For:

**Pre-Deployment**:
- Review IaC before deploying (Terraform plan, CloudFormation template)
- Validate network architecture (VPC, subnets, security groups)
- Check container/K8s manifests

**Post-Deployment Audit**:
- Quarterly infrastructure security review
- Incident post-mortem (identify infrastructure gaps)
- Compliance audit (CMMC, SOC 2, ISO 27001)

**Cloud Migration**:
- Assess current on-prem security posture
- Validate cloud architecture before cutover
- Post-migration security verification

**Examples**:
- "Audit our AWS infrastructure for security misconfigurations"
- "Review this Terraform plan for security issues"
- "Check our Kubernetes cluster security"

---

### ❌ Don't Use Infrastructure Security For:

**Application Security**:
- Code vulnerabilities → Use SecurityReview
- API security → Use ThreatModel

**Performance/Cost**:
- Infrastructure optimization → Use cloud cost tools
- Performance tuning → Use APM tools

---

## Workflow Steps

### Step 1: Identify Infrastructure Scope

**Action**: Define what infrastructure to audit

**Scope Options**:
1. **Full Cloud Account**: Audit all resources in AWS/Azure/GCP account
2. **Specific Service**: Audit only S3 buckets, EC2 instances, or RDS databases
3. **IaC Files**: Review Terraform/CloudFormation before deployment
4. **Network Architecture**: Audit VPC, subnets, security groups, firewalls
5. **Kubernetes Cluster**: Audit K8s RBAC, pod security, network policies

**Input Needed**:
- Cloud provider(s): AWS, Azure, GCP, on-prem
- Infrastructure architecture diagram (if available)
- Configuration files or access to cloud console
- Compliance requirements (CMMC, PCI-DSS, HIPAA)

**Example**:
```
Scope: AWS production account
Services: VPC, EC2, S3, RDS, IAM
Compliance: CMMC Level 2
Architecture: Web tier (EC2 + ALB), App tier (ECS), Data tier (RDS)
```

---

### Step 2: Apply CIS Benchmarks

**Action**: Audit infrastructure against CIS (Center for Internet Security) Benchmarks

#### AWS CIS Benchmark

**Identity and Access Management (IAM)**:

```
✓ 1.1: Root account MFA enabled
✓ 1.2: Root account access keys deleted
✓ 1.3: Credentials unused for 90 days disabled
✓ 1.4: Access keys rotated every 90 days
✓ 1.5: IAM password policy meets complexity requirements
✓ 1.6: MFA enabled for all IAM users
✓ 1.7: No "AdministratorAccess" policy attached to users
✓ 1.8: Support role created for incident response
✓ 1.9: IAM Access Analyzer enabled
✓ 1.10: Service control policies (SCPs) used (AWS Organizations)
```

**Logging and Monitoring**:

```
✓ 2.1: CloudTrail enabled in all regions
✓ 2.2: CloudTrail log file validation enabled
✓ 2.3: S3 bucket logging enabled for CloudTrail
✓ 2.4: CloudTrail logs sent to CloudWatch Logs
✓ 2.5: AWS Config enabled in all regions
✓ 2.6: S3 bucket access logging enabled
✓ 2.7: VPC Flow Logs enabled
✓ 2.8: Encryption enabled for CloudTrail logs
✓ 2.9: Alarm for unauthorized API calls
✓ 2.10: Alarm for root account usage
```

**Network Configuration**:

```
✓ 3.1: Default security groups restrict all traffic
✓ 3.2: Security groups don't allow 0.0.0.0/0 ingress
✓ 3.3: VPC peering least privilege routing
✓ 3.4: Network ACLs restrict traffic
✓ 3.5: No internet gateways in private subnets
✓ 3.6: VPC endpoints used for AWS services
```

**Storage (S3)**:

```
✓ 4.1: S3 buckets not publicly accessible
✓ 4.2: S3 bucket versioning enabled
✓ 4.3: S3 bucket encryption enabled (SSE-S3 or SSE-KMS)
✓ 4.4: S3 bucket logging enabled
✓ 4.5: S3 Block Public Access enabled
✓ 4.6: S3 Object Lock enabled for compliance
```

**Compute (EC2)**:

```
✓ 5.1: EBS volumes encrypted
✓ 5.2: EBS snapshots encrypted
✓ 5.3: EC2 instance metadata service v2 (IMDSv2) enforced
✓ 5.4: No public AMIs
✓ 5.5: EC2 instances in private subnets (not public)
✓ 5.6: Systems Manager Session Manager used (no SSH keys)
```

**Database (RDS)**:

```
✓ 6.1: RDS encryption at rest enabled
✓ 6.2: RDS encryption in transit (SSL/TLS) enforced
✓ 6.3: RDS automated backups enabled
✓ 6.4: RDS multi-AZ enabled (production)
✓ 6.5: RDS not publicly accessible
✓ 6.6: RDS enhanced monitoring enabled
✓ 6.7: RDS deletion protection enabled
```

---

#### Azure CIS Benchmark

**Identity and Access Management**:

```
✓ 1.1: MFA enabled for all users
✓ 1.2: Guest user permissions minimized
✓ 1.3: Service principals used (not user accounts for apps)
✓ 1.4: Conditional Access policies enforced
✓ 1.5: Azure AD Identity Protection enabled
✓ 1.6: Self-service password reset enabled
```

**Security Center**:

```
✓ 2.1: Azure Security Center Standard tier enabled
✓ 2.2: Automatic provisioning of monitoring agent enabled
✓ 2.3: Security contact email configured
✓ 2.4: Security alerts sent to admins
✓ 2.5: Microsoft Defender for Cloud enabled
```

**Storage Accounts**:

```
✓ 3.1: Storage accounts require secure transfer (HTTPS)
✓ 3.2: Storage account access keys regenerated periodically
✓ 3.3: Storage accounts not publicly accessible
✓ 3.4: Soft delete enabled for blobs
✓ 3.5: Storage account encryption enabled
```

**Virtual Machines**:

```
✓ 4.1: VM disks encrypted with Azure Disk Encryption
✓ 4.2: OS and data disks encrypted at rest
✓ 4.3: Network Security Groups restrict traffic
✓ 4.4: VMs in availability sets (high availability)
✓ 4.5: Azure Backup enabled for VMs
```

---

#### Google Cloud CIS Benchmark

**Identity and Access Management**:

```
✓ 1.1: Service accounts not used for user activity
✓ 1.2: Service account keys rotated every 90 days
✓ 1.3: API keys restricted to specific services/IPs
✓ 1.4: IAM bindings use least privilege
✓ 1.5: Workforce Identity Federation used (not service account keys)
```

**Logging and Monitoring**:

```
✓ 2.1: Cloud Logging enabled for all projects
✓ 2.2: Log sinks configured for centralized logging
✓ 2.3: Log retention period ≥365 days
✓ 2.4: Cloud Monitoring enabled
✓ 2.5: Alerts configured for IAM policy changes
```

**Networking**:

```
✓ 3.1: Default network deleted
✓ 3.2: VPC Flow Logs enabled
✓ 3.3: Firewall rules don't allow 0.0.0.0/0 ingress
✓ 3.4: Private Google Access enabled for subnets
✓ 3.5: VPC Service Controls enabled
```

**Storage**:

```
✓ 4.1: Cloud Storage buckets not publicly accessible
✓ 4.2: Uniform bucket-level access enabled
✓ 4.3: Encryption at rest enabled
✓ 4.4: Bucket versioning enabled
✓ 4.5: Bucket lifecycle policies configured
```

---

### Step 3: Check Cloud-Specific Security

**Action**: Audit cloud-provider-specific security features

#### AWS-Specific Checks

**GuardDuty**:
- ✓ GuardDuty enabled in all regions
- ✓ GuardDuty findings routed to Security Hub
- ✓ High-severity findings trigger alerts

**Security Hub**:
- ✓ Security Hub enabled
- ✓ CIS AWS Foundations Benchmark enabled
- ✓ PCI-DSS standard enabled (if applicable)
- ✓ Findings auto-remediate where possible

**Secrets Manager**:
- ✓ Database passwords stored in Secrets Manager (not hardcoded)
- ✓ Automatic rotation enabled for secrets
- ✓ Secrets encrypted with KMS

**KMS (Encryption)**:
- ✓ Customer Managed Keys (CMKs) used for sensitive data
- ✓ Key rotation enabled
- ✓ Key policies follow least privilege

---

#### Azure-Specific Checks

**Azure Policy**:
- ✓ Azure Policy enabled for compliance enforcement
- ✓ Policies for resource tagging
- ✓ Policies for allowed regions/SKUs

**Key Vault**:
- ✓ Secrets stored in Key Vault (not config files)
- ✓ Soft delete enabled
- ✓ Purge protection enabled
- ✓ Network restrictions on Key Vault access

**Entra ID (formerly Azure AD)**:
- ✓ Conditional Access policies enforce MFA
- ✓ Risky sign-in detection enabled
- ✓ Legacy authentication blocked

---

#### GCP-Specific Checks

**Organization Policies**:
- ✓ Policies restrict external IPs
- ✓ Policies restrict which services can be used
- ✓ Policies enforce resource locations

**Secret Manager**:
- ✓ Secrets stored in Secret Manager
- ✓ Automatic secret rotation
- ✓ IAM policies restrict secret access

**Cloud Armor**:
- ✓ Cloud Armor WAF enabled for external services
- ✓ DDoS protection configured
- ✓ Rate limiting rules defined

---

### Step 4: Audit Infrastructure-as-Code

**Action**: Review IaC files for security issues before deployment

#### Terraform Security

**Checks**:
```hcl
# ❌ BAD: S3 bucket publicly accessible
resource "aws_s3_bucket" "bad" {
  bucket = "my-bucket"
  acl    = "public-read"  # SECURITY RISK
}

# ✅ GOOD: S3 bucket private
resource "aws_s3_bucket" "good" {
  bucket = "my-bucket"
  acl    = "private"
}

resource "aws_s3_bucket_public_access_block" "good" {
  bucket = aws_s3_bucket.good.id
  block_public_acls   = true
  block_public_policy = true
}
```

**Tools**:
- `tfsec`: Terraform static analysis
- `checkov`: Multi-cloud IaC scanner
- `terrascan`: Policy-as-code for Terraform

---

#### Kubernetes Security

**Checks**:
```yaml
# ❌ BAD: Container running as root
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod
spec:
  containers:
  - name: app
    image: nginx
    # No securityContext = runs as root

# ✅ GOOD: Non-root container
apiVersion: v1
kind: Pod
metadata:
  name: good-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: nginx
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
```

**K8s Security Checklist**:
- ✓ Pod Security Standards enforced (baseline/restricted)
- ✓ Network Policies restrict pod-to-pod traffic
- ✓ RBAC configured (least privilege)
- ✓ Secrets encrypted at rest (etcd encryption)
- ✓ Image scanning enabled (Trivy, Clair)
- ✓ Admission controllers enabled (PodSecurity)

---

### Step 5: Network Architecture Review

**Action**: Audit network design for security

#### Network Segmentation

**Check for**:
- ✓ Public/private subnet separation
- ✓ DMZ for internet-facing services
- ✓ Database in private subnet (not publicly accessible)
- ✓ Jump box/bastion host for admin access (not direct SSH)

**Architecture Pattern**:
```
Internet
  ↓
Internet Gateway
  ↓
Public Subnet (DMZ)
  - Load Balancer
  - Bastion Host
  ↓ (Private Route)
Private Subnet (App Tier)
  - Application Servers (no public IP)
  ↓ (Private Route)
Private Subnet (Data Tier)
  - Databases (no internet access)
```

---

#### Security Group / Firewall Rules

**Check for**:
- ✓ Least privilege (only required ports open)
- ✓ No 0.0.0.0/0 on sensitive ports (SSH 22, RDP 3389, DB ports)
- ✓ Application-specific rules (not wide open)

**Example Findings**:
```
❌ Security Group: sg-12345678 (WebServers)
  - Port 22 (SSH) open to 0.0.0.0/0  → CRITICAL
  - Port 3306 (MySQL) open to 0.0.0.0/0  → CRITICAL

✅ Remediation:
  - Restrict SSH to bastion host IP only
  - Restrict MySQL to app tier security group only
```

---

### Step 6: Rate Findings by Severity

**Action**: Classify findings by risk level

**Severity Levels**:

| Severity | Criteria | Example | Remediation SLA |
|----------|----------|---------|-----------------|
| **Critical** | Public exposure of sensitive data, credential theft | S3 bucket with PII publicly readable | Fix immediately (24 hours) |
| **High** | Weak encryption, excessive IAM permissions, missing MFA | Root account without MFA | Fix within 7 days |
| **Medium** | Missing logging/monitoring, weak network controls | VPC Flow Logs disabled | Fix within 30 days |
| **Low** | Best practice violations, minor misconfigurations | EBS volumes not encrypted | Fix within 90 days |

---

### Step 7: Generate Infrastructure Security Report

**Action**: Compile findings into audit report

**Report Structure**:

```markdown
# Infrastructure Security Audit Report

**Audit Date**: YYYY-MM-DD
**Auditor**: [Name or "FORGE InfrastructureSecurity"]
**Scope**: [Cloud provider, accounts, services]
**Compliance Framework**: [CIS, CMMC, PCI-DSS, etc.]

---

## Executive Summary

**Total Findings**: X
- Critical: X
- High: X
- Medium: X
- Low: X

**Security Posture**: [Excellent / Good / Fair / Poor]

**Deployment Readiness**: [Approve / Approve with Fixes / Block]

**Top Risks**:
1. [Critical Risk 1]
2. [Critical Risk 2]

---

## CIS Benchmark Compliance

| Category | Total Checks | Passed | Failed | Compliance % |
|----------|--------------|--------|--------|--------------|
| IAM | 10 | 7 | 3 | 70% |
| Logging | 10 | 9 | 1 | 90% |
| Network | 6 | 4 | 2 | 67% |
| Storage | 6 | 6 | 0 | 100% |
| Compute | 6 | 5 | 1 | 83% |
| **TOTAL** | **38** | **31** | **7** | **82%** |

**Target**: ≥95% for production deployment

---

## Critical Findings

### Finding 1: S3 Bucket Publicly Accessible

**Severity**: Critical
**Resource**: s3://my-sensitive-bucket
**CIS Control**: 4.1
**CMMC Practice**: MP.L2-3.8.1 (Protect media)

**Issue**:
S3 bucket contains customer PII and is publicly readable.

**Evidence**:
```bash
aws s3api get-bucket-acl --bucket my-sensitive-bucket
# Result: "Grantee": "http://acs.amazonaws.com/groups/global/AllUsers"
```

**Impact**:
- Customer data breach
- GDPR/CCPA violation
- Reputational damage

**Remediation**:
```hcl
resource "aws_s3_bucket_public_access_block" "block" {
  bucket = "my-sensitive-bucket"
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**SLA**: Fix immediately (within 24 hours)

---

### Finding 2: Root Account Without MFA

**Severity**: High
**Resource**: AWS root account
**CIS Control**: 1.1
**CMMC Practice**: IA.L2-3.5.3 (Use multifactor authentication)

**Issue**:
AWS root account does not have MFA enabled.

**Impact**:
- Account takeover risk
- Full AWS account compromise if credentials leaked

**Remediation**:
1. Enable MFA on root account (hardware token or virtual MFA)
2. Store root account credentials in secure vault
3. Use IAM users for daily operations (never use root)

**SLA**: Fix within 7 days

---

## Recommendations

### Immediate Actions (Critical/High):
1. Enable S3 Block Public Access on all buckets
2. Enable MFA on root account
3. Rotate exposed access keys

### Short-term (Medium):
1. Enable VPC Flow Logs in all VPCs
2. Configure CloudTrail in all regions
3. Enable GuardDuty for threat detection

### Long-term (Low):
1. Encrypt all EBS volumes
2. Implement AWS Config rules for continuous compliance
3. Adopt infrastructure-as-code for all deployments

---

## CMMC Compliance Mapping

| CMMC Practice | Status | Evidence |
|---------------|--------|----------|
| AC.L2-3.1.1 (Limit system access) | ⚠️ | IAM policies overly permissive |
| IA.L2-3.5.3 (MFA) | ❌ | Root account without MFA |
| AU.L2-3.3.1 (Create audit records) | ✅ | CloudTrail enabled |
| SC.L2-3.13.8 (FIPS crypto) | ✅ | KMS uses FIPS 140-2 |

---

**Next Audit**: Quarterly (every 90 days)
**Sign-off**: [Security engineer / CISO]
```

---

## Integration with Other Skills

### With ThreatModel
- ThreatModel designs secure architecture
- InfrastructureSecurity validates implementation matches design

### With CmmcBaseline
- CmmcBaseline defines compliance requirements
- InfrastructureSecurity audits infrastructure for compliance

### With Standup
- Daniel uses InfrastructureSecurity findings in standup discussions
- Prioritize fixes based on risk and effort

---

## Automation Integration

**AWS Config Rules**:
```yaml
# Auto-detect non-compliant resources
- s3-bucket-public-read-prohibited
- s3-bucket-versioning-enabled
- encrypted-volumes
- root-account-mfa-enabled
```

**Terraform Compliance**:
```bash
# Pre-deployment checks
terraform plan -out=plan.tfplan
tfsec .
checkov -d .
```

**CI/CD Pipeline**:
```yaml
# GitHub Actions example
infrastructure-security:
  runs-on: ubuntu-latest
  steps:
    - name: Terraform Security Scan
      run: tfsec . --format json > tfsec-results.json
    - name: Block if Critical Findings
      run: |
        if grep -q '"severity":"CRITICAL"' tfsec-results.json; then
          echo "Critical security findings detected"
          exit 1
        fi
```

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Complements**: ThreatModel (design) + InfrastructureSecurity (audit) + SecurityReview (code) = defense-in-depth
