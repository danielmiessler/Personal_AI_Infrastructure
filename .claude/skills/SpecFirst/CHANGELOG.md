# Changelog

All notable changes to the SpecFirst skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.0] - 2025-12-12

Initial release of SpecFirst - spec-driven development methodology for any software project.

### Added

**Core Skill:**
- `SKILL.md` - Workflow routing and quick reference
- Flexible spec tooling guidance with strict release discipline

**Workflows:**
- `Develop.md` - Branch setup for standard and PAI contribution flows
- `ProposeChange.md` - Change proposal process
- `Release.md` - Versioning, tagging, release discipline with human approval gates
- `ValidateSpec.md` - Test pyramid and validation

**Templates:**
- `RELEASE-FRAMEWORK.md` - Release methodology template (copy to your skill)
- `RELEASE-vX.Y.Z.md` - Per-release plan template with file inventory
- `Requirement.md` - SHALL/MUST requirement format

**Documentation:**
- `TestPyramid.md` - 4-layer test approach
- `ToolingArchitecture.md` - Framework vs specs separation
- `Approaches.md` - OpenSpec vs lightweight comparison

**Slash Commands:**
- `/specfirst-propose` - Create change proposal
- `/specfirst-release` - Prepare release with file inventory
- `/specfirst-validate` - Run validation checks

### Architecture

- Works for any project: PAI skills, CLI tools, web apps, libraries
- Flexible on spec tooling (OpenSpec, markdown, custom)
- Strict on release process (file inventory, validation gates, manual review)
- Complementary with OpenSpec methodology
