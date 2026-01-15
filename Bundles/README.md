<p align="center">
  <img src="bundles-icon.png" alt="PAI Bundles" width="256">
</p>

# PAI Bundles

> **FOR AI AGENTS:** Bundles are curated collections of packs. When a user asks you to install a bundle, read the bundle's README.md file and install each pack in the specified order.

## 🚨 CRITICAL: Full Implementation Required (For AI Agents)

> **STOP. READ THIS BEFORE INSTALLING ANY BUNDLE.**

### The Problem

AI agents often "helpfully" simplify implementations. Instead of creating the full documented specification, they create abbreviated "equivalent" versions. **This is WRONG and breaks the system.**

### The Rules

1. **IMPLEMENT EVERYTHING EXACTLY AS DOCUMENTED** - No simplification, no shortcuts
2. **CREATE ALL SPECIFIED FILES** - If a pack says 8 files, create 8 files
3. **INCLUDE ALL CONTENT** - Full code blocks, full YAML, full configurations
4. **NEVER CREATE "EQUIVALENTS"** - The exact documented version is required
5. **COMPLETE THE CHECKLIST** - Every bundle installation MUST end with verification

### Mandatory Bundle Completion Checklist

**After installing ALL packs in a bundle, complete this checklist:**

```markdown
## Bundle Installation Verification

### Pack Installation Status
- [ ] Pack 1: [name] - ALL files created, ALL code complete
- [ ] Pack 2: [name] - ALL files created, ALL code complete
- [ ] Pack 3: [name] - ALL files created, ALL code complete
- [ ] (continue for each pack...)

### Integration Verification
- [ ] Directory structure matches bundle specification
- [ ] All hooks registered in settings.json
- [ ] All dependencies between packs satisfied
- [ ] Verification commands from EACH pack passed

### Final Confirmation
- [ ] No "simplified" or "equivalent" implementations used
- [ ] Line counts approximately match documented code
- [ ] User informed of any customization needed
```

**If ANY checkbox fails, the bundle is NOT installed.**

---

Curated collections of packs that work together to achieve a larger goal.

---

## What is a Bundle?

A **bundle** is a curated collection of PAI packs designed to work together as a harmonious system.

**Packs** are directories containing complete subsystems organized around a single capability. Each pack contains:
- `README.md` - Overview, architecture, what it solves
- `INSTALL.md` - Step-by-step installation instructions
- `VERIFY.md` - Mandatory verification checklist
- `src/` - Actual source code files (TypeScript, YAML, etc.)

For example, `pai-hook-system` provides an entire event-driven automation framework with all code files ready to copy.

**Bundles** are combinations of packs that work exceptionally well together—a harmonious system from a single author or unified around a single theme. The packs in a bundle were designed to integrate seamlessly, creating emergent capabilities greater than the sum of their parts.

### Bundle Types

Bundles can be organized around different purposes:

| Bundle Type | Description | Example |
|-------------|-------------|---------|
| **Creator Bundle** | All packs from a specific creator | "The Official PAI (Kai) Bundle" - Daniel Miessler's complete system |
| **Functionality Bundle** | Packs that serve a specific purpose | "Research Bundle" - tools for investigation |
| **Domain Bundle** | Packs for a specific field | "Security Bundle" - security-focused tools |
| **Starter Bundle** | Minimal set to get started | "Kai Lite" - essential packs only |

While you can install packs individually, bundles provide:

| Value | Description |
|-------|-------------|
| **Curation** | Tested combinations that work well together |
| **Order** | Proper installation sequence for dependencies |
| **Synergy** | Documentation of how packs interact |
| **Completeness** | Everything needed for a particular goal |

---

## Available Bundles

| Bundle | Description | Tier | Status |
|--------|-------------|------|--------|
| [The Official PAI Bundle](Official/) | Complete personal AI infrastructure from Daniel Miessler's Kai system | Complete | Active |

*More bundles coming soon*

---

## Installing a Bundle

### Option 1: AI-Assisted (Recommended)

1. Open the bundle's directory (the README displays automatically)
2. Give it to your AI
3. Say: "Install this bundle into my system"

Your AI will:
- **Analyze first** - Review all packs that need to be installed and their dependencies
- **Run the wizard** - If the bundle includes a setup wizard, walk you through it to collect personalization data (AI name, personality, contacts, technical preferences, etc.)
- **Install in order** - Install packs in the correct sequence based on dependencies
- **Configure connections** - Set up integrations between packs
- **Verify installation** - Confirm each pack works and validate the bundle as a whole

### Option 2: Manual Installation

Follow the bundle's README file:

1. Install prerequisite packs first
2. Install core packs in listed order
3. Install optional packs as desired
4. Run bundle verification

### Option 3: Cherry-Pick

Bundles are collections - you can install just the packs you want from a bundle.

---

## Bundle vs Pack

| Aspect | Pack | Bundle |
|--------|------|--------|
| **Scope** | Complete subsystem around one theme | Harmonious combination of subsystems |
| **Structure** | Directory with README.md, INSTALL.md, VERIFY.md, src/ | Directory with README.md referencing packs |
| **Code** | Contains actual source files in src/ | References pack directories |
| **Installation** | Can be standalone | Ordered sequence with dependencies |
| **Value** | Complete functionality for one domain | Integrated experience across domains |

---

## Creating a Bundle

### When to Create a Bundle

Create a bundle when:
- Multiple packs serve a unified purpose
- Packs have installation order dependencies
- The combination creates emergent capabilities
- You want to share a curated experience

### Bundle Structure

```
Bundles/
└── YourBundle/
    ├── README.md           # Bundle specification (required, auto-displays on GitHub)
    └── your-bundle-icon.png  # Bundle icon (optional)
```

### Bundle Template

Use the following structure for your bundle's README.md:

---

## Bundle Template Specification

### Frontmatter Schema

```yaml
---
name: {Bundle Name}
bundle-id: {author}-{bundle-name}-v{version}
version: 1.0.0
author: {github username}
description: {Brief description - 128 words max}
type: bundle
purpose: {One sentence - what this bundle achieves}
tier: {starter|intermediate|advanced|complete}
platform: {agnostic|claude-code|opencode|cursor}
pack-count: {number of packs included}
dependencies: []
keywords: [searchable, tags]
---
```

### Required Sections

1. **Why This Is Different** - (128 words max) Opens with "This sounds similar to [ALTERNATIVE] which also does [CAPABILITY]. What makes this approach different?" followed by a 64-word paragraph and four 8-word bullets
2. **Purpose** - What the bundle achieves as a whole
3. **Philosophy** - Principles behind the curation
4. **Contents** - Complete pack listing with installation order
5. **Pack Relationships** - How packs interact and depend on each other
6. **Installation** - Combined installation steps
7. **Verification** - How to verify the bundle is working
8. **What You Get** - Capabilities after full installation
9. **Credits** - Attribution
10. **Related Bundles** - Similar or complementary bundles
11. **Changelog** - Version history

### Contents Section Format

List packs in installation order:

```markdown
### Required Packs (Install in Order)

| # | Pack | Type | Purpose | Status |
|---|------|------|---------|--------|
| 1 | pack-name | feature | What it does | Available |
| 2 | another-pack | hook | What it does | Coming Soon |

### Recommended Packs

| Pack | Type | Purpose | Status |
|------|------|---------|--------|
| optional-pack | tool | Enhancement | Available |

### Optional Packs

| Pack | Type | Purpose | Status |
|------|------|---------|--------|
| extra-pack | integration | Nice to have | Available |
```

---

## Bundle Tiers

| Tier | Description | Typical Size |
|------|-------------|--------------|
| **Starter** | Minimal viable collection | 2-3 packs |
| **Intermediate** | Core functionality | 4-6 packs |
| **Advanced** | Extended capabilities | 7-10 packs |
| **Complete** | Full experience | 10+ packs |

---

## Quality Standards

A bundle must:

- [ ] Include only packs that serve the stated purpose
- [ ] Document installation order clearly
- [ ] Explain pack relationships and dependencies
- [ ] Provide bundle-level verification steps
- [ ] Have a clear, unified purpose
- [ ] Mark pack availability status (Available/Coming Soon)
- [ ] Follow the bundle template structure

---

## Bundle Philosophy

### Why Bundles Exist

Individual packs are powerful, but:
- Users may not know which packs work well together
- Installation order matters for dependencies
- Some capabilities emerge only from combinations
- Curation provides tested, production-ready setups

### The Value of Curation

A well-designed bundle is more than the sum of its packs. It provides:
1. **Coherent Vision** - Packs selected for a unified goal
2. **Tested Integration** - Known to work together
3. **Documented Synergies** - How capabilities combine
4. **Reduced Friction** - No guessing about compatibility

---

## FAQ

### Can I install just some packs from a bundle?

Yes. Bundles are documentation of curated collections. You can install any subset of packs you want.

### What if a pack in a bundle isn't released yet?

Bundle listings show pack status (Available/Coming Soon). Install available packs first; others will be added as they're released.

### Can I create my own bundle?

Absolutely. Fork the repo, create a new directory in Bundles/, and follow the template.

### How do bundles handle pack updates?

Bundles reference packs by name. When a pack is updated, reinstall it to get the latest version.

---

## Resources

- [PAI Repository](https://github.com/danielmiessler/PAI)
- [Pack System](../Packs/README.md)
- [The Official PAI Bundle](Official/) - Reference implementation

---

*PAI Bundle System v2.0 - Curated experiences with directory-based packs.*
