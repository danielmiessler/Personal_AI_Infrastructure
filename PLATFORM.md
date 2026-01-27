# PAI Platform Compatibility Status

This document tracks all platform-specific code and dependencies across PAI, providing a roadmap for cross-platform support.

**Last Updated:** 2026-01-27
**Maintainer:** Community contributions welcome

---

## Platform Support Matrix

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS** | Fully Supported | Primary development platform |
| **Linux** | Fully Supported | Ubuntu/Debian tested, systemd required for service management |
| **Windows** | Not Supported | Community contributions welcome |

---

## Linux Requirements

Install these packages for full functionality on Linux:

| Package | Purpose | Install (Debian/Ubuntu) |
|---------|---------|-------------------------|
| `mpg123` or `mpv` | Audio playback (ElevenLabs TTS output) | `sudo apt install mpg123` |
| `espeak-ng` | Text-to-speech fallback (when no API key) | `sudo apt install espeak-ng` |
| `libnotify-bin` | Desktop notifications (`notify-send`) | `sudo apt install libnotify-bin` |
| `bun` | JavaScript runtime | `curl -fsSL https://bun.sh/install \| bash` |
| `jq` | JSON processing (statusline) | `sudo apt install jq` |
| `curl` | HTTP requests | `sudo apt install curl` |

On headless servers, audio and desktop notification packages are optional. The server will skip those features gracefully.

---

## Cross-Platform Implementation Details

### Voice Server (`Packs/pai-voice-system/src/VoiceServer/`)

| Feature | macOS | Linux |
|---------|-------|-------|
| Audio playback | `/usr/bin/afplay` | `mpg123` > `mpv` > `aplay` (auto-detected) |
| TTS fallback | `/usr/bin/say` | `espeak-ng` > `espeak` (auto-detected) |
| Desktop notifications | `osascript` (AppleScript) | `notify-send` (libnotify) |
| Service management | LaunchAgent plist + `launchctl` | systemd user service + `systemctl --user` |
| Service file location | `~/Library/LaunchAgents/com.pai.voice-server.plist` | `~/.config/systemd/user/pai-voice-server.service` |
| Log file location | `~/Library/Logs/pai-voice-server.log` | `~/.local/share/logs/pai-voice-server.log` |
| Menu bar indicator | SwiftBar/BitBar plugin | Not available (use `./status.sh` or `journalctl`) |

### Shell Scripts

All management scripts (`install.sh`, `start.sh`, `stop.sh`, `status.sh`, `uninstall.sh`) detect the platform via `uname -s` and use platform-appropriate commands.

### Statusline (`Packs/pai-statusline/`)

| Feature | macOS | Linux |
|---------|-------|-------|
| File mtime | `stat -f %m` (BSD) | `stat -c %Y` (GNU) |

The `get_mtime()` helper function handles cross-platform `stat` syntax automatically.

### Hook Notifications (`Packs/pai-hook-system/`)

| Feature | macOS | Linux |
|---------|-------|-------|
| Desktop notifications | `osascript` (AppleScript) | `notify-send` (libnotify) |
| Push notifications | ntfy.sh (cross-platform) | ntfy.sh (cross-platform) |
| SMS | Twilio (cross-platform) | Twilio (cross-platform) |
| Discord | Webhook (cross-platform) | Webhook (cross-platform) |

### Observability (`Packs/pai-observability-server/`)

| Feature | macOS | Linux |
|---------|-------|-------|
| PATH setup | Includes `/opt/homebrew/bin` | Skips Homebrew path |
| Log file location | `~/Library/Logs/pai-observability.log` | `~/.local/share/logs/pai-observability.log` |
| Menu bar app | Swift .app (build.sh) | Not available (use web UI at `http://localhost:5172`) |
| Web UI | `http://localhost:5172` | `http://localhost:5172` |
| Open browser | `open` | `xdg-open` |

### Browser Skill (`Packs/pai-browser-skill/`)

| Feature | macOS | Linux |
|---------|-------|-------|
| Open URL in browser | `open -a <browser> <url>` | `xdg-open <url>` |
| Headless Playwright | Works | Works |

---

## Platform Detection Patterns

**Recommended pattern (used throughout PAI):**

```bash
# Shell scripts
OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" = "Darwin" ]; then
  # macOS-specific code
elif [ "$OS_TYPE" = "Linux" ]; then
  # Linux-specific code
else
  echo "Unsupported platform: $OS_TYPE"
fi
```

```typescript
// TypeScript/Bun code
if (process.platform === 'darwin') {
  // macOS-specific code
} else if (process.platform === 'linux') {
  // Linux-specific code
} else if (process.platform === 'win32') {
  // Windows-specific code (future)
}
```

**Anti-patterns to avoid:**
- Hardcoding paths that only exist on one platform
- Assuming package manager locations (Homebrew, apt, etc.)
- Using platform-specific syntax without detection (sed -i '', stat -f, etc.)
- Skipping platform checks in documentation examples

---

## Known Limitations

### Linux-specific
- Menu bar indicators (SwiftBar/BitBar) are macOS only. Use CLI tools or web UI on Linux.
- `aplay` does not support MP3 natively. Install `mpg123` or `mpv` for ElevenLabs audio.
- On headless servers, audio playback and desktop notifications are skipped gracefully.

### macOS-specific
- No changes needed. All existing macOS behavior is preserved.

---

## Testing Requirements

Contributors fixing platform issues should:

1. **Test on target platform** - Don't submit untested code
2. **Document limitations** - Be honest about what you couldn't test
3. **Follow PAI principles** - Simple, transparent, UNIX philosophy
4. **Maintain backward compatibility** - Don't break existing platforms
5. **Add to this document** - Update the inventory with your fixes

**Current test coverage:**
- macOS: Tested by Daniel Miessler
- Linux (Ubuntu 24.04): Tested by contributors
- Linux (other distros): Community testing
- Windows: Untested

---

## Future Work

**High Priority:**
- Windows audio playback support
- Windows notification support
- Windows auto-start mechanism

**Medium Priority:**
- Test on non-Ubuntu Linux distros (Fedora, Arch, etc.)
- Add platform compatibility checks to installation
- Docker/container deployment guide

**Low Priority:**
- Support for alternative package managers
- Automated multi-platform testing (CI/CD)

---

## How to Report Platform Issues

1. Check this document to see if the issue is already known
2. Test on a clean installation (not your dev environment)
3. Open a GitHub issue with:
   - Platform details (OS, version, package manager)
   - Error message or unexpected behavior
   - Steps to reproduce
   - Proposed solution (if you have one)

**Before submitting:** Try to fix it yourself! PAI is community-driven.
