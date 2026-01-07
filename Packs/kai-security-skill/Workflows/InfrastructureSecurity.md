# Infrastructure Security Workflow

Audit cloud and infrastructure security configurations.

## Overview

| Attribute | Value |
|-----------|-------|
| **Purpose** | Identify security misconfigurations in cloud and infrastructure |
| **Input** | Cloud provider, IaC files (Terraform, CloudFormation, Helm, Ansible) |
| **Output** | Infrastructure security findings report |
| **Duration** | 1-4 hours depending on infrastructure size |

## Scope

| Platform | Coverage |
|----------|----------|
| **AWS** | IAM, VPC, S3, EC2, RDS, Lambda, EKS, CloudTrail |
| **Azure** | Azure AD, Virtual Networks, Storage, VMs, AKS |
| **GCP** | IAM, VPC, Cloud Storage, GCE, GKE |
| **Kubernetes** | RBAC, Network Policies, Pod Security, Secrets |
| **Docker** | Image security, runtime configuration, compose files |

## Workflow Steps

### Step 1: Gather Infrastructure Artifacts

Collect relevant files:

| Type | Examples |
|------|----------|
| Terraform | `*.tf`, `terraform.tfstate` (read-only) |
| CloudFormation | `*.yaml`, `*.json` templates |
| Helm | `Chart.yaml`, `values.yaml`, templates |
| Kubernetes | Manifests, `kubectl get` outputs |
| Ansible | Playbooks, inventory, variables |
| Docker | `Dockerfile`, `docker-compose.yaml` |

### Step 2: Run Automated Scans

Use kai-security-tools:

```bash
# Secrets scan on IaC files
kai-security-tools SecretsScan --path <iac_path>

# Container image scan (if applicable)
kai-security-tools ContainerScan --image <image_name>
```

Additional tools by platform:

| Platform | Tools |
|----------|-------|
| Terraform | tfsec, checkov, terrascan |
| CloudFormation | cfn-lint, cfn-nag |
| Kubernetes | kubesec, kube-bench, trivy |
| Docker | trivy, grype, dockle |

### Step 3: Review IAM / Access Control

**AWS IAM Checklist:**
- [ ] No wildcard (*) actions on sensitive resources
- [ ] No inline policies (use managed policies)
- [ ] MFA required for console access
- [ ] Access keys rotated regularly
- [ ] Unused users/roles removed
- [ ] Cross-account access is justified
- [ ] Service roles follow least privilege

**Azure AD Checklist:**
- [ ] Conditional access policies enabled
- [ ] PIM for privileged roles
- [ ] No permanent global admin assignments
- [ ] Guest access is controlled
- [ ] Service principals have minimal permissions

**Kubernetes RBAC Checklist:**
- [ ] No cluster-admin bindings to users
- [ ] Service accounts have minimal permissions
- [ ] Default service account is not used
- [ ] Namespace isolation via RBAC
- [ ] No wildcard verbs or resources

### Step 4: Review Network Security

**VPC/Network Checklist:**
- [ ] Default VPC not in use
- [ ] Public subnets are intentional
- [ ] Security groups follow least privilege
- [ ] No 0.0.0.0/0 inbound on sensitive ports
- [ ] VPC Flow Logs enabled
- [ ] Network segmentation between tiers
- [ ] Private endpoints for cloud services

**Kubernetes Network Checklist:**
- [ ] Network policies defined
- [ ] Default deny ingress policy
- [ ] Pod-to-pod traffic restricted
- [ ] Egress policies for internet access
- [ ] Ingress uses TLS termination

### Step 5: Review Data Protection

**Storage Security Checklist:**
- [ ] Encryption at rest enabled (S3, EBS, RDS, etc.)
- [ ] Encryption uses customer-managed keys (CMK)
- [ ] S3 buckets are not public
- [ ] Versioning enabled for critical data
- [ ] Backup encryption enabled
- [ ] Data lifecycle policies defined

**Secrets Management Checklist:**
- [ ] Secrets not in plaintext in IaC
- [ ] Secrets Manager/Vault integration
- [ ] Secrets rotated automatically
- [ ] No secrets in environment variables (for containers)
- [ ] Kubernetes Secrets encrypted at rest

### Step 6: Review Logging and Monitoring

**AWS Logging Checklist:**
- [ ] CloudTrail enabled for all regions
- [ ] CloudTrail logs sent to S3 with protection
- [ ] VPC Flow Logs enabled
- [ ] CloudWatch Logs for applications
- [ ] GuardDuty enabled
- [ ] Config enabled for compliance

**Kubernetes Logging Checklist:**
- [ ] Audit logging enabled
- [ ] Pod logs collected centrally
- [ ] API server audit policy configured
- [ ] Log retention policy defined

### Step 7: Review Compute Security

**EC2/VM Checklist:**
- [ ] IMDSv2 required
- [ ] No public IPs unless needed
- [ ] Security groups are minimal
- [ ] Systems patched regularly
- [ ] Approved AMIs/images only

**Container/Pod Security:**
- [ ] Containers run as non-root
- [ ] Read-only root filesystem
- [ ] No privileged containers
- [ ] Resource limits defined
- [ ] Security context configured
- [ ] Pod Security Standards enforced

**Kubernetes Pod Checklist:**
```yaml
# Secure pod spec
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
containers:
- securityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
  resources:
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### Step 8: CIS Benchmark Review

Apply CIS Benchmarks for the platform:

| Platform | Benchmark |
|----------|-----------|
| AWS | CIS AWS Foundations Benchmark |
| Azure | CIS Microsoft Azure Foundations |
| GCP | CIS Google Cloud Platform Benchmark |
| Kubernetes | CIS Kubernetes Benchmark |
| Docker | CIS Docker Benchmark |

Key areas:

**CIS AWS Foundations (v1.5):**
1. Identity and Access Management
2. Logging
3. Monitoring
4. Networking
5. Storage

**CIS Kubernetes (v1.8):**
1. Control Plane Components
2. etcd
3. Control Plane Configuration
4. Worker Nodes
5. Policies

### Step 9: Generate Findings Report

Document findings with:

1. **Finding ID** - Unique identifier
2. **Title** - Brief description
3. **Severity** - Critical/High/Medium/Low
4. **Category** - IAM, Network, Data, Compute, Logging
5. **Resource** - Specific resource affected
6. **Description** - Detailed explanation
7. **Risk** - What could happen if exploited
8. **Remediation** - How to fix
9. **Reference** - CIS benchmark, AWS doc, etc.

## Common Findings

### AWS

| Finding | Severity | Remediation |
|---------|----------|-------------|
| S3 bucket public | High | Enable Block Public Access |
| Security group 0.0.0.0/0 SSH | High | Restrict to known IPs |
| Root account used | High | Use IAM users with MFA |
| CloudTrail not enabled | High | Enable CloudTrail in all regions |
| EBS volumes unencrypted | Medium | Enable encryption, create encrypted copies |
| IMDSv1 enabled | Medium | Require IMDSv2 |

### Kubernetes

| Finding | Severity | Remediation |
|---------|----------|-------------|
| Container running as root | High | Set runAsNonRoot: true |
| No network policies | Medium | Implement default-deny ingress |
| Privileged container | Critical | Remove privileged: true |
| No resource limits | Medium | Set memory/CPU limits |
| Default service account | Medium | Create dedicated service account |
| Secrets not encrypted | High | Enable etcd encryption |

### Terraform

| Finding | Severity | Remediation |
|---------|----------|-------------|
| Hardcoded secrets | Critical | Use variables or secrets manager |
| State file in local | Medium | Use remote backend with encryption |
| No provider version pinning | Low | Pin provider versions |
| Public ingress rules | High | Restrict CIDR blocks |

## Output

Generate infrastructure security report including:

1. **Executive Summary** - Key findings and risk level
2. **Scope** - What was reviewed
3. **Findings by Severity** - Grouped and prioritized
4. **Findings by Category** - IAM, Network, Data, etc.
5. **CIS Benchmark Results** - Pass/fail summary
6. **Remediation Roadmap** - Prioritized fix list
7. **Appendix** - Full scan outputs

## Integration Points

| With Workflow | Integration |
|---------------|-------------|
| ThreatModel | Infrastructure supports threat mitigations |
| CmmcBaseline | Maps to SC, CM, AC practices |
| GenerateAudit | Provides infrastructure evidence |
| SecurityReview | Complements application security |
