# Release Checklist for v0.7.0

## Pre-Release

### Code Quality
- [ ] All tests pass (see TESTING.md)
- [ ] No critical bugs in issue tracker
- [ ] Fresh install tested successfully
- [ ] Migration tested successfully
- [ ] Personal setup verified working

### Documentation
- [ ] INSTALL.md complete and accurate
- [ ] QUICKSTART.md examples all work
- [ ] CONTRIBUTING.md is clear
- [ ] CHANGELOG.md updated
- [ ] README.md updated with v0.7.0 info
- [ ] All internal links work
- [ ] All external links valid

### Files
- [ ] plugin.json has correct version (0.7.0)
- [ ] hooks.json properly configured
- [ ] settings.example.json has all required fields
- [ ] .mcp.example.json has all servers
- [ ] LICENSE file present
- [ ] .gitignore excludes personal data
- [ ] No personal data in repository

### Scripts
- [ ] install.sh tested and works
- [ ] uninstall.sh tested and works
- [ ] All scripts have executable permissions
- [ ] Scripts handle errors gracefully

### Components
- [ ] All 8 agents load correctly
- [ ] All 5 commands execute
- [ ] All 7 skills activate
- [ ] All hooks fire correctly
- [ ] MCP servers can be configured

## Release Process

### Step 1: Final Testing
- Run validation on fresh environment
- Run migration test
- Test all examples in documentation

### Step 2: Update Version Numbers
- Update plugin.json version
- Update README.md version references
- Update CHANGELOG.md release date

### Step 3: Create Git Tag
```bash
git add .
git commit -m "Release v0.7.0 - Plugin Wrapper"
git tag -a v0.7.0 -m "Version 0.7.0 - Plugin Wrapper Release"
git push origin main
git push origin v0.7.0
```

### Step 4: Create GitHub Release
- Go to GitHub Releases
- Click "Draft a new release"
- Select tag v0.7.0
- Title: "v0.7.0 - Plugin Wrapper Release"
- Description: Copy from CHANGELOG.md
- Publish release

### Step 5: Announce
- GitHub Discussions announcement
- Update project website (if any)

## Post-Release

### Monitoring
- [ ] Watch for installation issues
- [ ] Monitor GitHub issues
- [ ] Track feedback

### Support
- [ ] Respond to questions quickly
- [ ] Update docs based on feedback
- [ ] Document common issues

---

## Rollback Plan

If critical issues found after release:

1. **Immediate:**
   - Add warning to README
   - Update CHANGELOG with known issues
   - Document workarounds

2. **Short-term:**
   - Create hotfix branch
   - Fix critical issues
   - Release v0.7.1
