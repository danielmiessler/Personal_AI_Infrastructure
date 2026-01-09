---
name: MAI Merlin Bundle
bundle-id: mai-merlin-bundle-v1.0.0
version: 1.0.0
author: Joey Barkley
description: Complete DevSecOps AI infrastructure for Merlin Cyber work - CI/CD, containers, security, and infrastructure management
type: bundle
platform: claude-code
pack-count: 35+
profiles: [full, headless, minimal]
---

# MAI Merlin Bundle

> DevSecOps AI infrastructure for federal/regulated environments at Merlin Cyber

This bundle transforms Claude Code into a comprehensive work AI system covering:
- **CI/CD** - Pipeline management across GitHub and GitLab
- **Containers** - Kubernetes and Docker orchestration
- **Security** - DevSecOps tooling and vulnerability management
- **Infrastructure** - Network, observability, and secrets management
- **Projects** - Spec-driven development and issue tracking

## AI Installation Wizard

Before installing, I need to understand your deployment:

### Question 1: Deployment Profile

**What type of environment is this?**

| Profile | Use Case | What Gets Installed |
|---------|----------|---------------------|
| **Full** | Work laptop with display | Everything including browser automation |
| **Headless** | CI/CD runner, automation server | All automation, skip browser/voice |
| **Minimal** | Quick test or specific domain | Core + selected domains |

### Question 2: Platform Selection

Which platforms do you use? (Select all that apply)
- **CI/CD:** GitHub Actions / GitLab CI / Both
- **Containers:** Kubernetes / Docker / Both
- **Issues:** Joplin / Linear / Both
- **Secrets:** Infisical / Keychain / Both
- **Network:** UniFi / Other
- **Observability:** Prometheus / Other

### Question 3: Adapter Selection

Based on your platforms, which adapters should be installed?
(AI will recommend based on Question 2 answers)

---

## Pack Architecture

MAI follows a consistent **Core → Adapter → Skill** pattern:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Core     │────▶│   Adapter   │────▶│    Skill    │
│ (interfaces)│     │(implementation)   │ (workflows) │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Core**: TypeScript interfaces and types (platform-agnostic)
- **Adapter**: Platform-specific implementation (GitHub, GitLab, K8s, etc.)
- **Skill**: AI-invoked workflows using the adapters

---

## Pack Matrix

### Foundation (Always Required)

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| pai-hook-system | ✓ | ✓ | ✓ | Event-driven automation |
| pai-history-system | ✓ | ✓ | ✓ | Context and memory |
| pai-core-install | ✓ | ✓ | ✓ | Identity and skills |

### CI/CD Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-cicd-core | ✓ | ✓ | opt | Pipeline interfaces |
| mai-github-cicd-adapter | ✓ | ✓ | opt | GitHub Actions |
| mai-gitlab-cicd-adapter | ✓ | ✓ | opt | GitLab CI/CD |
| mai-cicd-skill | ✓ | ✓ | opt | Pipeline workflows |

### Containers Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-containers-core | ✓ | ✓ | opt | Container interfaces |
| mai-k8s-adapter | ✓ | ✓ | opt | Kubernetes |
| mai-docker-adapter | ✓ | ✓ | opt | Docker |
| mai-containers-skill | ✓ | ✓ | opt | Container workflows |

### Security Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-security-tools | ✓ | ✓ | opt | Security scanning |
| mai-security-skill | ✓ | ✓ | opt | Security workflows |
| mai-devsecops-agents | ✓ | ✓ | opt | Specialized security agents |

### Secrets Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-secrets-core | ✓ | ✓ | opt | Secrets interfaces |
| mai-infisical-adapter | ✓ | ✓ | opt | Infisical integration |
| mai-keychain-adapter | ✓ | ✓ | opt | OS keychain |
| mai-secrets-skill | ✓ | ✓ | opt | Secrets workflows |

### Issues/Projects Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-issues-core | ✓ | ✓ | opt | Issue interfaces |
| mai-joplin-issues-adapter | ✓ | ✓ | opt | Joplin as issue tracker |
| mai-linear-adapter | ✓ | ✓ | opt | Linear integration |
| mai-issues-skill | ✓ | ✓ | opt | Issue workflows |
| mai-project-core | ✓ | ✓ | opt | Project interfaces |
| mai-project-skill | ✓ | ✓ | opt | Project workflows |
| mai-project-system | ✓ | ✓ | opt | Project templates |

### Network Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-network-core | ✓ | ✓ | opt | Network interfaces |
| mai-unifi-adapter | ✓ | ✓ | opt | UniFi controller |
| mai-network-skill | ✓ | ✓ | opt | Network workflows |

### Observability Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-observability-core | ✓ | ✓ | opt | Observability interfaces |
| mai-prometheus-adapter | ✓ | ✓ | opt | Prometheus metrics |
| mai-observability-skill | ✓ | ✓ | opt | Observability workflows |

### Productivity Domain

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-joplin-skill | ✓ | ✓ | - | Joplin note management |
| mai-gitlab-skill | ✓ | ✓ | - | GitLab operations |
| mai-specdev-core | ✓ | ✓ | - | Spec-driven dev interfaces |
| mai-specdev-skill | ✓ | ✓ | - | Spec-driven workflows |
| mai-standup-skill | ✓ | ✓ | - | Daily standup automation |

### Orchestration (Advanced)

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| mai-orchestration-core | ✓ | ✓ | - | Multi-agent orchestration |
| mai-orchestration-framework | ✓ | ✓ | - | Orchestration patterns |
| mai-council-framework | ✓ | ✓ | - | Council decision-making |

### Interactive Only

| Pack | Full | Headless | Minimal | Purpose |
|------|------|----------|---------|---------|
| pai-browser-skill | ✓ | - | - | Browser automation |
| pai-voice-system | ✓ | - | - | Voice notifications |

### Testing/Mock Adapters (Development)

| Pack | Purpose |
|------|---------|
| mai-mock-adapter | Generic mock for testing |
| mai-mock-cicd-adapter | CI/CD testing |
| mai-mock-containers-adapter | Container testing |
| mai-mock-issues-adapter | Issues testing |
| mai-mock-network-adapter | Network testing |
| mai-mock-observability-adapter | Observability testing |

---

## Installation Order

### Phase 1: Foundation

```
1. pai-hook-system
2. pai-history-system
3. pai-core-install
```

### Phase 2: Core Interfaces

```
4. mai-cicd-core
5. mai-containers-core
6. mai-secrets-core
7. mai-issues-core
8. mai-project-core
9. mai-network-core
10. mai-observability-core
```

### Phase 3: Adapters (based on platforms)

```
11. mai-github-cicd-adapter    # if using GitHub
12. mai-gitlab-cicd-adapter    # if using GitLab
13. mai-k8s-adapter            # if using Kubernetes
14. mai-docker-adapter         # if using Docker
15. mai-infisical-adapter      # if using Infisical
16. mai-keychain-adapter       # if using OS keychain
17. mai-joplin-issues-adapter  # if using Joplin for issues
18. mai-linear-adapter         # if using Linear
19. mai-unifi-adapter          # if using UniFi
20. mai-prometheus-adapter     # if using Prometheus
```

### Phase 4: Skills

```
21. mai-cicd-skill
22. mai-containers-skill
23. mai-secrets-skill
24. mai-issues-skill
25. mai-project-skill
26. mai-network-skill
27. mai-observability-skill
28. mai-security-skill
29. mai-security-tools
30. mai-devsecops-agents
```

### Phase 5: Productivity

```
31. mai-joplin-skill
32. mai-gitlab-skill
33. mai-specdev-core
34. mai-specdev-skill
35. mai-standup-skill
```

### Phase 6: Advanced (Optional)

```
36. mai-orchestration-core
37. mai-orchestration-framework
38. mai-council-framework
```

### Phase 7: Interactive (Full profile only)

```
39. pai-browser-skill
40. pai-voice-system
```

---

## Deployment Profiles

### Full (Work Laptop)

Complete installation for daily DevSecOps work.

**Prerequisites:**
- macOS or Linux with display
- Bun runtime
- Claude Code authenticated
- Access to work infrastructure (VPN if needed)

**Post-install:**
- Configure platform credentials (GitHub token, GitLab token, etc.)
- Set up Joplin sync
- Configure UniFi controller access

### Headless (CI/CD Runner, Automation Server)

Automation-focused for servers and runners.

**Prerequisites:**
- Linux server
- Bun runtime
- Claude Code authenticated via OAuth

**Use Cases:**
- GitLab Runner executing PAI-powered jobs
- Automated security scanning
- Scheduled infrastructure audits
- Pipeline automation

**Post-install:**
```bash
# Register GitLab Runner
sudo gitlab-runner register \
  --url https://gitlab.com \
  --token $RUNNER_TOKEN \
  --executor shell \
  --tag-list "merlin,pai,devsecops"
```

### Minimal

Core + selected domains for specific use cases.

**Example configurations:**
- **Security-only:** Foundation + Security domain
- **CI/CD-only:** Foundation + CI/CD domain
- **Project management:** Foundation + Issues + Projects

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PAI Foundation                                 │
│     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│     │ Hook System │────│   History   │────│ Core Install│               │
│     └─────────────┘    └─────────────┘    └─────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────┬───────────────┼───────────────┬───────────────┐
    ▼               ▼               ▼               ▼               ▼
┌───────┐      ┌───────┐      ┌───────┐      ┌───────┐      ┌───────┐
│ CI/CD │      │Contain│      │Securty│      │Network│      │Project│
│       │      │  ers  │      │       │      │       │      │       │
│┌─────┐│      │┌─────┐│      │┌─────┐│      │┌─────┐│      │┌─────┐│
││Core ││      ││Core ││      ││Tools││      ││Core ││      ││Core ││
│└──┬──┘│      │└──┬──┘│      │└──┬──┘│      │└──┬──┘│      │└──┬──┘│
│   │   │      │   │   │      │   │   │      │   │   │      │   │   │
│┌──▼──┐│      │┌──▼──┐│      │┌──▼──┐│      │┌──▼──┐│      │┌──▼──┐│
││Adapt││      ││Adapt││      ││Skill││      ││Adapt││      ││Skill││
││GitHub│      ││ K8s ││      │└─────┘│      ││UniFi││      │└─────┘│
││GitLab│      ││Docker│      │       │      │└─────┘│      │       │
│└──┬──┘│      │└──┬──┘│      │       │      │   │   │      │       │
│   │   │      │   │   │      │       │      │┌──▼──┐│      │       │
│┌──▼──┐│      │┌──▼──┐│      │       │      ││Skill││      │       │
││Skill││      ││Skill││      │       │      │└─────┘│      │       │
│└─────┘│      │└─────┘│      │       │      │       │      │       │
└───────┘      └───────┘      └───────┘      └───────┘      └───────┘
```

---

## Verification

### Foundation Check

```bash
ls ~/.claude/hooks/
ls ~/.claude/history/
cat ~/PAI/skills/CORE/SKILL.md
```

### Domain Checks

```bash
# CI/CD
# Ask: "Show me recent GitLab pipelines"

# Containers
# Ask: "List pods in the default namespace"

# Security
# Ask: "Run security scan on this repository"

# Network
# Ask: "Show UniFi network status"
```

---

## Related Bundles

- **jai-joey-bundle** - Personal infrastructure (publishing, finance)
- **pai-official-bundle** - Upstream PAI foundation

---

## Changelog

### 1.0.0 - 2026-01-09
- Initial bundle release
- 35+ packs organized by domain
- Core/Adapter/Skill architecture
- Full/Headless/Minimal deployment profiles
- Federal/regulated environment focus
