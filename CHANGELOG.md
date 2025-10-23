# Changelog

All notable changes to PAI-Boilerplate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.7.0] - 2025-01-23 - Plugin Wrapper Release 🎉

### Major Changes
This release transforms PAI-Boilerplate into a proper Claude Code plugin with clean separation between plugin code and user configuration.

### Added
- **Plugin Structure**: Proper Claude Code plugin manifest with hooks registration
- **Installation Automation**: `install.sh` and uninstall.sh scripts for guided setup
- **Template System**: `settings.example.json` and `.mcp.example.json` templates
- **Voice Configuration**: Optional voice notifications with `ENABLE_VOICE` flag
- **Context Templates**: Template context files in `templates/context/`
- **Comprehensive Documentation**:
  - `INSTALL.md` - Detailed installation guide
  - `QUICKSTART.md` - 5-minute getting started
  - `CONTRIBUTING.md` - Developer guide
  - `TESTING.md` - Test procedures
- **Validation Scripts**: Installation verification tools
- **Migration Script**: Automated variable migration

### Changed
- **BREAKING**: Migrated from `${PAI_DIR}` to `${CLAUDE_PLUGIN_ROOT}` (Claude Code standard)
- **Configuration**: Moved user config out of plugin directory
- **Hooks**: Registered via `hooks/hooks.json` instead of `settings.json`
- **Voice System**: Made fully optional with graceful degradation
- **Agent References**: Updated context paths to use plugin templates
- **Documentation**: Updated all docs for plugin structure

### Removed
- `settings.json` from plugin (replaced with `settings.example.json`)
- `.mcp.json` from plugin (replaced with `.mcp.example.json`)
- Hardcoded personal configuration from plugin files

### Fixed
- Plugin now follows Claude Code standards
- Proper path resolution for all components
- Voice server failure no longer blocks execution
- Installation no longer requires manual configuration

### Migration Guide
Users upgrading from 0.6.0:
1. Backup `~/.claude/` directory
2. Run `git pull` to get latest plugin code
3. Update `~/.claude/settings.json` hooks to reference plugin location
4. Replace `${PAI_DIR}` with `${CLAUDE_PLUGIN_ROOT}` in personal configs
5. Add `ENABLE_VOICE` flag to control voice notifications

---

## [0.6.0] - 2025-10-XX - Repository Restructure

### Changed
- **BREAKING**: Moved all PAI infrastructure to `.claude/` directory
- Repository now mirrors actual `~/.claude/` working system
- Better separation between GitHub files and PAI infrastructure

---

## [0.5.0] - 2025-10-XX - Skills-Based Architecture

### Changed
- **BREAKING**: Migrated to pure Skills architecture
- **Performance**: 92.5% token reduction (4000 → 300 tokens)
- Zero hook overhead for context loading
- On-demand context via skill invocation

---

## Version Comparison

| Version | Architecture | Token Cost | Config Location | Voice | Distribution |
|---------|-------------|------------|-----------------|-------|--------------|
| 0.7.0 | Plugin wrapper | ~300 | User directory | Optional | ✅ Ready |
| 0.6.0 | `.claude/` structure | ~300 | Mixed | Required | ❌ Personal |
| 0.5.0 | Skills-based | ~300 | Repository | Required | ❌ Personal |

---

[0.7.0]: https://github.com/evenromo/PAI-Boilerplate/releases/tag/v0.7.0
[0.6.0]: https://github.com/evenromo/PAI-Boilerplate/releases/tag/v0.6.0
[0.5.0]: https://github.com/evenromo/PAI-Boilerplate/releases/tag/v0.5.0
