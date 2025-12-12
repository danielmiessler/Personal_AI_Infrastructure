# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **JIRA Skill** - TypeScript CLI for Jira operations following PAI deterministic-first architecture
  - Multi-instance profile support (personal/work Jira instances)
  - Two-phase retrieval pattern (search → load) for token efficiency
  - Full CLI: search, get, create, update, transition, comment, link
  - Label taxonomy support matching Obsidian vault tags
  - GitHub dev panel integration for branch/PR tracking
  - Federated search across all instances with `-p all`
  - Issue linking and epic management
  - Spec: `openspec/specs/jira-cli.md`
