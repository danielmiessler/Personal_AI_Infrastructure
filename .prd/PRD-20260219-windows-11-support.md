---
prd: true
id: PRD-20260219-windows-11-support
status: CRITERIA_DEFINED
mode: interactive
effort_level: Comprehensive
created: 2026-02-19
updated: 2026-02-19
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: OBSERVE
failing_criteria: []
verification_summary: "0/0"
parent: null
children: []
---

# Windows 11 Native Support for PAI

> Enable PAI to run natively on Windows 11 without WSL, by abstracting all platform-specific dependencies behind cross-platform interfaces.

## STATUS

| What | State |
|------|-------|
| Progress | 3/24 criteria passing (Phase 0 + Phase 1 verified) |
| Phase | Phase 1 COMPLETE — paths normalized |
| Next action | Phase 2: Hook guards |
| Blocked by | Nothing |

## CONTEXT

### Problem Space
PAI v3.0 runs exclusively on macOS and Linux. The codebase contains **zero** `process.platform === 'win32'` checks. Windows 11 users (including Justin, who runs on WSL2) cannot use PAI natively. The PLATFORM.md file explicitly states Windows is "Not Supported — Community contributions welcome." This PRD captures the full platform dependency audit and implementation plan to change that.

### Audit Methodology
Six parallel scan agents analyzed the entire PAI v3.0 codebase on 2026-02-18, each focused on a specific dependency domain:
1. Shell/Bash dependencies
2. Unix paths and filesystem assumptions
3. Terminal-specific integrations (Kitty)
4. Process management, signals, and file permissions
5. Hook system
6. Installer, config, voice/notification system

### Key Metrics
| Metric | Count |
|--------|-------|
| Shell scripts (.sh) | 64 |
| TypeScript files with shell spawning | 57+ |
| Hardcoded Unix paths | 150+ locations |
| Kitty terminal calls | 100+ |
| `process.platform === 'win32'` checks | **0** |
| Hooks (total / already platform-safe) | 20 / 14 |
| Estimated files needing changes | 80-120 |

### What Already Works on Windows
- **Bun runtime** (Windows support is solid)
- **All HTTP/fetch-based communication** (localhost servers, API calls)
- **JSON config files** (settings.json, skill-index.json)
- **Core Algorithm logic** (pure TypeScript computation)
- **14 of 20 hooks** (platform-independent)
- **`hooks/lib/paths.ts`** — correct cross-platform pattern already exists (uses `homedir()`, `tmpdir()`, env fallbacks)
- **TypeScript/Bun file I/O** (`Bun.file`, `Bun.write`, `path.join`)

### Key Files
| File | Role |
|------|------|
| `hooks/lib/paths.ts` | **Reference pattern** — correct cross-platform path resolution |
| `hooks/lib/tab-setter.ts` | Kitty terminal integration hub — needs terminal abstraction |
| `statusline-command.sh` | 834-line bash script — needs TypeScript rewrite or Windows equivalent |
| `INSTALL.ts` / `PAI-Install/` | Installer — heavy Unix assumptions (chmod, chown, lsof, launchctl) |
| `VoiceServer/server.ts` | Audio playback + notifications — hardcoded macOS paths |
| `Observability/manage.sh` | Process management — lsof, fuser, nohup, kill |
| `PLATFORM.md` | Documents current platform support status |

### Constraints
- Must not break existing macOS/Linux support
- Must use PAI's existing TypeScript/Bun architecture (no new runtimes)
- v3.0 release directory (`Releases/v3.0/`) is the target — older releases are archived
- `hooks/lib/paths.ts` is the canonical pattern for cross-platform path resolution

### Decisions Made
- Audit completed 2026-02-18 with 6 parallel agents
- Focus on v3.0 codebase only (not backporting to v2.x releases)
- **2026-02-19: Architecture = Fully Native Windows** — No WSL dependency. PAI must run on Windows 11 natively with PowerShell as shell, Windows-native process management, no bash required at runtime.

---

## PLATFORM DEPENDENCY AUDIT

### Domain 1: Shell Scripts & Bash Dependencies (CRITICAL)

**64 `.sh` files | 57+ TypeScript files with Bun shell template literals**

#### Shell Script Files
| File | Purpose | Lines |
|------|---------|-------|
| `.claude/statusline-command.sh` | PAI status bar renderer | 834 |
| `VoiceServer/install.sh` | Voice server installation | ~150 |
| `VoiceServer/start.sh` | Start voice server | ~30 |
| `VoiceServer/stop.sh` | Stop voice server | ~30 |
| `VoiceServer/restart.sh` | Restart voice server | ~30 |
| `VoiceServer/status.sh` | Check voice server status | ~30 |
| `VoiceServer/macos-service/install.sh` | macOS LaunchAgent setup | ~130 |
| `VoiceServer/macos-service/validate-setup.sh` | Validate macOS service | ~50 |
| `VoiceServer/macos-service/voice-server-ctl.sh` | Service control | ~80 |
| `VoiceServer/macos-service/uninstall.sh` | Remove macOS service | ~50 |
| `VoiceServer/macos-service/menubar/install-menubar.sh` | Menu bar integration | ~70 |
| `VoiceServer/macos-service/menubar/voice-server.5s.sh` | Menu bar status | ~40 |
| `Observability/manage.sh` | Process management | 125 |
| `Observability/scripts/test-system.sh` | System testing | ~50 |
| `Observability/scripts/start-agent-observability-dashboard.sh` | Dashboard launch | ~40 |
| `Observability/scripts/reset-system.sh` | System reset | ~30 |
| `Observability/MenuBarApp/build.sh` | Menu bar app build | ~40 |

#### Critical Bash Features in statusline-command.sh
| Line | Feature | Windows Issue |
|------|---------|---------------|
| 19 | `set -o pipefail` | Bash-only |
| 42 | `source .env` | Bash-only |
| 53-55 | `kitten @ ls \| jq \| awk` | Kitty + Unix tools |
| 60 | `stty size </dev/tty` | No /dev/tty on Windows |
| 63 | `tput cols` | No tput on Windows |
| 98-108 | `eval` with jq | Shell evaluation |
| 288 | `seq 1 $width` | Bash sequence |
| 313 | `date +"%H:%M"` | Different on Windows |
| 318 | `stat -f %m` | macOS stat variant |
| 322 | `curl -s --max-time` | Available on Win11 |
| 466-557 | Git command chains | Git works on Windows |

#### Installer Shell Spawning (INSTALL.ts / PAI-Install/)
| File | Line | Command | Issue |
|------|------|---------|-------|
| `INSTALL.ts` | 120 | `chown -R ${uid}:${gid}` | No chown on Windows |
| `INSTALL.ts` | 124 | `find ... -type d -exec chmod 750` | No chmod on Windows |
| `INSTALL.ts` | 128 | `find ... -type f -exec chmod 640` | No chmod on Windows |
| `INSTALL.ts` | 134 | `find ... -name "${pattern}" -exec chmod 750` | No chmod on Windows |
| `INSTALL.ts` | 151 | `lsof -ti:${VOICE_SERVER_PORT}` | No lsof on Windows |
| `INSTALL.ts` | 164 | `kill -9 ${pid}` | No kill on Windows |
| `INSTALL.ts` | 227 | `bun --version 2>/dev/null` | Redirect syntax differs |
| `INSTALL.ts` | 243 | `curl -fsSL https://bun.sh/install \| bash` | Piped bash |
| `INSTALL.ts` | 245 | `shell: '/bin/bash'` | Hardcoded bash path |
| `PAI-Install/engine/actions.ts` | 688, 718 | `spawn("bash", [installScript])` | Hardcoded bash |
| `PAI-Install/engine/actions.ts` | 647 | `lsof -ti:8888 \| xargs kill -9` | lsof + kill pipe |

---

### Domain 2: Hardcoded Unix Paths (CRITICAL)

**150+ affected locations across all versions**

#### Hardcoded /tmp/ Paths
| File | Line | Code |
|------|------|------|
| `VoiceServer/server.ts` (v3.0) | 374 | `` const tempFile = `/tmp/voice-${Date.now()}.mp3` `` |
| `VoiceServer/server.ts` (v2.5) | 279 | Same pattern |
| `VoiceServer/server.ts` (v2.4) | 279 | Same pattern |
| `VoiceServer/server.ts` (v2.3) | 204 | Same pattern |
| `Observability/task-watcher.ts` | 43 | `` `/tmp/claude/-Users-${process.env.USER}` `` |

#### Hardcoded Binary Paths
| File | Line | Path | Issue |
|------|------|------|-------|
| `VoiceServer/server.ts` (v3.0) | 379 | `/usr/bin/afplay` | macOS audio only |
| `VoiceServer/server.ts` (v3.0) | 387 | `/bin/rm` | Hardcoded rm |
| `VoiceServer/server.ts` (v3.0) | 521 | `/usr/bin/osascript` | macOS AppleScript only |
| `install.ts` (v2.3) | 41 | `/bin/zsh` | Default shell |
| `INSTALL.ts` (v2.5) | 245 | `/bin/bash` | Shell config |

#### process.env.HOME Without Windows Fallback
| File | Line | Pattern |
|------|------|---------|
| `hooks/WorkCompletionLearning.hook.ts` | 58 | `join(process.env.HOME!, '.claude', 'MEMORY')` |
| `hooks/ExplicitRatingCapture.hook.ts` | 135 | `process.env.PAI_DIR \|\| join(process.env.HOME!, '.claude')` |
| `hooks/ImplicitSentimentCapture.hook.ts` | 283, 306, 451 | Same `HOME!` pattern |
| 20+ additional files | Various | `process.env.HOME` without `USERPROFILE` fallback |

**Correct pattern (already in codebase):**
`hooks/lib/paths.ts` lines 79-82: `process.env.HOME || process.env.USERPROFILE || homedir()`

#### macOS-Specific Paths
| Path Pattern | Count | Files |
|--------------|-------|-------|
| `~/Library/LaunchAgents/` | 15+ | VoiceServer install scripts |
| `~/Library/Logs/` | 5+ | VoiceServer, ManageServer |
| `~/.config/kitty/` | 3+ | install.ts, kitty.conf |
| `~/.zshrc` / `~/.bashrc` | 8+ | install.ts, README files |

#### Relative Paths With Forward Slashes (No path.join)
| File | Example |
|------|---------|
| `hooks/LoadContext.hook.ts` | Lines 124-126: `'skills/PAI/SKILL.md'` |
| `hooks/handlers/RebuildSkill.ts` | Multiple relative paths |
| `INSTALL.ts` | Line 267: `alias pai='bun ~/.claude/skills/PAI/Tools/pai.ts'` |

---

### Domain 3: Kitty Terminal Integration (CRITICAL)

**100+ direct kitty/kitten calls | No terminal abstraction layer**

#### Direct Kitty Remote Control Calls
| File | Lines | Commands |
|------|-------|----------|
| `hooks/lib/tab-setter.ts` | 124 | `kitten @ --to="${socketPath}" ls 2>/dev/null \| jq -r "..."` |
| `hooks/lib/tab-setter.ts` | 166 | `kitten @ ${toFlag} set-tab-title "${escaped}"` |
| `hooks/lib/tab-setter.ts` | 167 | `kitten @ ${toFlag} set-window-title "${escaped}"` |
| `hooks/lib/tab-setter.ts` | 172, 177 | `kitten @ ${toFlag} set-tab-color` |
| `hooks/UpdateTabTitle.hook.ts` | 281, 287, 294 | `kitty @` and `kitten @` tab manipulation |
| `hooks/SetQuestionTab.hook.ts` | 55, 58 | `kitten @ set-tab-color`, `kitty @ set-tab-title` |
| `hooks/QuestionAnswered.hook.ts` | 47, 50 | `kitten @ set-tab-color`, `kitty @ set-tab-title` |
| `hooks/StartupGreeting.hook.ts` | 121 | `kitty @ set-tab-title` |
| `hooks/LoadContext.hook.ts` | 60, 63 | Kitty tab operations |
| `statusline-command.sh` | 53-55, 408-409 | `kitten @ ls`, `KITTY_WINDOW_ID` checks |

#### Unix Socket Paths
| File | Line | Path |
|------|------|------|
| `hooks/lib/tab-setter.ts` | 55 | `/tmp/kitty-${process.env.USER}` |
| `hooks/lib/tab-setter.ts` | 58 | `unix:${defaultSocket}` |
| `kitty.conf` (all versions) | 173 | `listen_on unix:/tmp/kitty` |

#### Terminal Detection
| File | Line | Check |
|------|------|-------|
| `hooks/UpdateTabTitle.hook.ts` | 277 | `process.env.TERM === 'xterm-kitty'` |
| `hooks/lib/tab-setter.ts` | 34-35 | `KITTY_LISTEN_ON`, `KITTY_WINDOW_ID` |
| `hooks/StartupGreeting.hook.ts` | 79 | `KITTY_WINDOW_ID` |

#### Terminal Size Detection (4-tier cascade)
| File | Tier | Method | Windows Status |
|------|------|--------|---------------|
| `statusline-command.sh` | 1 | `kitten @ ls` + jq | Kitty-only |
| `statusline-command.sh` | 2 | `stty size </dev/tty` | No /dev/tty |
| `statusline-command.sh` | 3 | `tput cols` | No tput |
| `statusline-command.sh` | 4 | `$COLUMNS` env var | Works on Windows |

---

### Domain 4: Process Management & Signals (HIGH)

#### Unix Signal Handling
| File | Line | Signal | Windows Issue |
|------|------|--------|---------------|
| `skills/Browser/Tools/BrowserSession.ts` | 440-442 | `SIGTERM`, `SIGINT` | SIGTERM unreliable on Windows |
| `hooks/handlers/RebuildSkill.ts` | 66 | `child.kill('SIGTERM')` | Won't terminate properly |
| `skills/PAI/Tools/Inference.ts` | 107 | `proc.kill('SIGTERM')` | Unreliable |
| `Observability/file-ingest.ts` | 500 | `process.on('SIGINT')` | Behavior differs |
| `PAI-Install/web/server.ts` | 8-11 | `uncaughtException`, `unhandledRejection` | OK but behavior differs |

#### Process Detection (Unix-only tools)
| File | Line | Command | Windows Equivalent |
|------|------|---------|-------------------|
| `INSTALL.ts` | 151 | `lsof -ti:${PORT}` | `netstat -ano \| findstr :PORT` |
| `Observability/ManageServer.ts` | 43, 125 | `lsof -Pi :${port}` | `netstat` |
| `Observability/ManageServer.ts` | 135 | `pkill -f "Observability/apps/"` | `taskkill /F /IM` |
| `VoiceServer/ManageServer.ts` | 43, 69, 87 | `lsof -ti :${port}`, PID tracking | `netstat` + `taskkill` |
| `PAI-Install/engine/actions.ts` | 647 | `lsof -ti:8888 \| xargs kill -9` | `netstat` + `taskkill` |

#### File Permissions (No Windows Equivalent)
| File | Line | Operation | Windows Issue |
|------|------|-----------|---------------|
| `PAI-Install/engine/actions.ts` | 544 | `writeFileSync(..., { mode: 0o600 })` | Octal permissions ignored |
| `PAI-Install/engine/actions.ts` | 614 | `execSync('chmod -R 755 ...')` | No chmod |
| `PAI-Install/engine/state.ts` | 75 | `writeFileSync(..., { mode: 0o600 })` | Ignored |
| `INSTALL.ts` | 108-141 | `chown -R`, `chmod -R`, `find -exec chmod` | No chown/chmod |

#### Daemon Management
| File | Line | Pattern | Issue |
|------|------|---------|-------|
| `Observability/ManageServer.ts` | 86, 101 | `nohup bun run dev >> ... 2>&1 &` | Shell backgrounding |
| `VoiceServer/ManageServer.ts` | 78 | `nohup bun server.ts >> ... 2>&1 &` | Shell backgrounding |
| `INSTALL.ts` | spawn | `spawn(..., { detached: true, stdio: 'ignore' })` | Works but behavior differs |

#### macOS-Specific
| File | Line | Operation | Issue |
|------|------|-----------|-------|
| `hooks/handlers/UpdateCounts.ts` | 97 | `security find-generic-password` | macOS Keychain only |
| `PAI-Install/engine/actions.ts` | 650-653 | `launchctl unload`, LaunchAgent plist | macOS service manager |
| `PAI-Install/main.ts` | 53 | `xattr -cr "${electronDir}"` | macOS quarantine attrs |
| `hooks/lib/notifications.ts` | 313 | `Bun.spawn(['osascript', '-e', ...])` | macOS AppleScript |

---

### Domain 5: Hook System (MEDIUM — best-positioned for Windows)

**20 hooks + 7 handlers + 10 libraries — all TypeScript/Bun**

#### Hook Executor Architecture
- **Discovery:** Claude Code reads `settings.json` `"hooks"` key — **cross-platform**
- **Execution:** `bun run <hook-file.ts>` — **cross-platform**
- **Communication:** JSON via stdin/stdout — **cross-platform**
- **HTTP calls:** `fetch('http://localhost:8888/...')` — **cross-platform**

#### Platform-Safe Hooks (14/20)
StartupGreeting, LoadContext, CheckVersion, RatingCapture, AutoWorkCreation, SessionAutoName, SecurityValidator, AgentExecutionGuard, SkillGuard, AlgorithmTracker, StopOrchestrator, WorkCompletionLearning, RelationshipMemory, IntegrityCheck

#### Kitty-Dependent Hooks (4/20) — Need Platform Guards
| Hook | Dependency |
|------|-----------|
| UpdateTabTitle.hook.ts | `setTabState()` from tab-setter.ts |
| SetQuestionTab.hook.ts | `kitten @ set-tab-color` |
| QuestionAnswered.hook.ts | `kitten @ set-tab-color`, `kitty @ set-tab-title` |
| SessionSummary.hook.ts | Tab cleanup via tab-setter |

#### Hooks Needing Minor Fixes (2/20)
| Hook | Issue |
|------|-------|
| UpdateCounts.hook.ts | Handler uses macOS `security` command (line 97) |
| VoiceGate.hook.ts | Depends on VoiceServer which uses macOS audio |

#### Correct Cross-Platform Pattern (Reference Implementation)
`hooks/lib/paths.ts` lines 79-82:
```typescript
process.env.HOME || process.env.USERPROFILE || homedir()
```
Line 90: `return join(tmpdir(), ...segments);`

---

### Domain 6: Voice & Notification System (HIGH)

#### Audio Playback
| File | Line | Command | Windows Alternative |
|------|------|---------|-------------------|
| `VoiceServer/server.ts` (v3.0) | 379 | `spawn('/usr/bin/afplay', ['-v', vol, tempFile])` | `powershell -c (New-Object Media.SoundPlayer 'file').PlaySync()` or `ffplay` |

#### System Notifications
| File | Line | Command | Windows Alternative |
|------|------|---------|-------------------|
| `VoiceServer/server.ts` (v3.0) | 521 | `spawnSafe('/usr/bin/osascript', ['-e', 'display notification...'])` | PowerShell Toast notification via `New-BurntToastNotification` or Windows.UI.Notifications |

#### Auto-Start Service
| Component | macOS | Windows Equivalent |
|-----------|-------|-------------------|
| Service definition | `.plist` LaunchAgent | Task Scheduler XML |
| Service manager | `launchctl load/unload` | `schtasks /create /delete` |
| Service directory | `~/Library/LaunchAgents/` | Task Scheduler library |
| Log directory | `~/Library/Logs/` | `%APPDATA%\PAI\logs\` |

#### Cross-Platform Components
- Voice Server HTTP API (`localhost:8888`) — works everywhere
- ElevenLabs API integration (fetch-based) — works everywhere
- Voice notification handler (`fetch('http://localhost:8888/notify')`) — works everywhere

---

## PLAN

### Implementation Strategy: Phased Approach

The implementation is structured as 8 phases, ordered by dependency and quick-win priority. Each phase is independently shippable and testable.

#### Phase 0: Platform Utilities Foundation (LOW difficulty)
**Create `platform.ts` — the cross-platform abstraction layer**
- Detect OS: `process.platform === 'win32'`
- Path resolution: home dir, temp dir, config dir, with platform-appropriate fallbacks
- Command mapping: `kill` → `taskkill`, `lsof` → `netstat`, etc.
- Terminal detection: Kitty vs Windows Terminal vs generic
- Follow the pattern already established in `hooks/lib/paths.ts`

#### Phase 1: Path Normalization (MEDIUM difficulty)
**Replace all hardcoded Unix paths with cross-platform equivalents**
- Replace `process.env.HOME!` with `homedir()` or `HOME || USERPROFILE`
- Replace `/tmp/` literals with `os.tmpdir()`
- Replace hardcoded binary paths (`/usr/bin/afplay`, `/bin/rm`) with platform-resolved commands
- Convert forward-slash string concatenation to `path.join()`
- Scope: ~150 locations, but most are mechanical find-and-replace

#### Phase 2: Hook System Guards (LOW difficulty)
**Add platform checks to 6 hooks that need them**
- Wrap Kitty calls in `if (process.platform !== 'win32')` guards
- 4 Kitty-dependent hooks: graceful no-op on Windows
- 2 hooks with minor macOS dependencies: platform-aware alternatives
- 14 hooks already work — no changes needed

#### Phase 3: Terminal Abstraction Layer (HIGH difficulty)
**Build `terminal-interface.ts` — abstract Kitty, Windows Terminal, generic**
- Interface: `setTabTitle()`, `setTabColor()`, `getTerminalSize()`, `isTerminalSupported()`
- Kitty implementation (existing code, refactored)
- Windows Terminal implementation (ANSI escape sequences, ConPTY)
- Generic fallback (no-op for unsupported terminals)
- Migrate all tab-setter.ts calls to use the abstraction

#### Phase 4: Process Management Abstraction (MEDIUM difficulty)
**Platform-aware process detection and control**
- Port checking: `lsof` → `netstat -ano | findstr` on Windows
- Process killing: `kill -9` → `taskkill /F /PID` on Windows
- Process listing: `ps aux | grep` → `tasklist /FI` on Windows
- Signal handling: `SIGTERM` → `process.exit()` fallback on Windows
- Background processes: `nohup` → `detached: true` (already partially done)

#### Phase 5: Installer Windows Path (HIGH difficulty)
**Windows-native installation flow**
- Skip chmod/chown (not applicable on Windows)
- Skip LaunchAgent/launchctl (use Task Scheduler instead)
- PowerShell profile setup instead of .zshrc/.bashrc
- Bun installation via Windows installer (not curl | bash)
- Windows-appropriate config directory (`%APPDATA%\PAI\` or `~/.claude/`)

#### Phase 6: Voice & Notification System (MEDIUM-HIGH difficulty)
**Cross-platform audio and notifications**
- Audio: Windows Media Foundation, `ffplay`, or PowerShell `SoundPlayer`
- Notifications: Windows Toast (BurntToast PowerShell module or native API)
- Auto-start: Windows Task Scheduler XML
- Keep HTTP API architecture (already cross-platform)

#### Phase 7: Statusline Rewrite (HIGH difficulty)
**Rewrite statusline-command.sh in TypeScript or create Windows equivalent**
- 834-line bash script → TypeScript with Bun
- Terminal width detection via `process.stdout.columns`
- Git integration via `simple-git` or direct `git` commands
- JSON parsing via native TypeScript (no jq dependency)
- Status bar rendering via ANSI escapes (Windows Terminal supports these)

### Dependency Graph
```
Phase 0 (platform.ts)
├── Phase 1 (paths) — depends on platform utilities
├── Phase 2 (hooks) — depends on platform detection
├── Phase 3 (terminal) — depends on platform detection
│   └── Phase 7 (statusline) — depends on terminal abstraction
├── Phase 4 (process) — depends on platform utilities
│   └── Phase 5 (installer) — depends on process + path abstractions
└── Phase 6 (voice) — depends on platform detection + path normalization
```

---

## IDEAL STATE CRITERIA (Verification Criteria)

*To be expanded per-phase when implementation begins. Top-level criteria below.*

### Platform Foundation
- [x] ISC-PF-1: `platform.ts` module exports OS detection and path resolution | Verify: Test: 30/30 pass, 25+ exports across 6 sections
- [x] ISC-PF-2: All path resolution uses `homedir()` or env fallback chain | Verify: Grep: 30→0 bare `process.env.HOME!`
- [x] ISC-PF-3: All temp file creation uses `os.tmpdir()` not `/tmp/` literal | Verify: Grep: 23→0 `/tmp/` in TypeScript files
- [ ] ISC-PF-4: No hardcoded Unix binary paths in TypeScript files | Verify: Grep: 136 remaining (shebangs — see DECISIONS)

### Hook System
- [ ] ISC-HS-1: All 20 hooks load without error on Windows 11 | Verify: Test: run each hook on Windows
- [ ] ISC-HS-2: Kitty-dependent hooks gracefully no-op on Windows | Verify: Test: run tab hooks on Windows, no crash
- [ ] ISC-HS-3: No hook crashes due to missing Unix commands | Verify: CLI: run all hooks, check exit codes

### Terminal
- [ ] ISC-TM-1: Terminal abstraction interface defined with three implementations | Verify: Read: check interface + implementations exist
- [ ] ISC-TM-2: Tab title setting works on Windows Terminal | Verify: Browser: screenshot Windows Terminal with PAI title
- [ ] ISC-TM-3: Terminal size detection works on Windows | Verify: CLI: `process.stdout.columns` returns value

### Process Management
- [ ] ISC-PM-1: Port detection works on Windows using netstat | Verify: CLI: detect port 8888 on Windows
- [ ] ISC-PM-2: Process termination works on Windows using taskkill | Verify: CLI: start and kill a test process
- [ ] ISC-PM-3: Background process spawning works with detached flag | Verify: CLI: spawn detached process, verify it runs

### Installer
- [ ] ISC-IN-1: Installation completes successfully on Windows 11 | Verify: CLI: run installer on fresh Windows
- [ ] ISC-IN-2: No chmod/chown calls execute on Windows | Verify: Grep: platform-guarded permission code
- [ ] ISC-IN-3: PowerShell profile or PATH setup works | Verify: CLI: `pai` command available after install

### Voice System
- [ ] ISC-VS-1: Voice server starts on Windows 11 | Verify: CLI: `curl localhost:8888/health`
- [ ] ISC-VS-2: Audio playback works on Windows | Verify: CLI: send notification, hear audio
- [ ] ISC-VS-3: System notifications display on Windows | Verify: Custom: visual check of Windows Toast

### Statusline
- [ ] ISC-SL-1: Statusline renders in Windows Terminal | Verify: Browser: screenshot of statusline
- [ ] ISC-SL-2: Git information displays correctly | Verify: Read: verify git branch/status in output
- [ ] ISC-SL-3: No bash/Unix dependencies in statusline code | Verify: Grep: no shell commands in TypeScript statusline

### Anti-Criteria
- [ ] ISC-A-1: No existing macOS/Linux functionality broken by changes | Verify: Test: full test suite passes on macOS
- [ ] ISC-A-2: No new runtime dependencies added (pure Bun/TypeScript) | Verify: Read: check package.json for new deps
- [ ] ISC-A-3: No hardcoded Windows paths introduced (use abstractions) | Verify: Grep: no `C:\\` or `%APPDATA%` literals
- [ ] ISC-A-4: No performance regression from platform detection overhead | Verify: CLI: measure hook execution time before/after

---

## DECISIONS

- **2026-02-19: Audit test timeout = 30s per test.** WSL2 filesystem access is slow for grep operations across the v3.0 directory. Bun's default 5s test timeout is insufficient. Set to 30s per test in `platform-audit.test.ts`.
- **2026-02-19: Binary path baseline = 136** (mostly `#!/usr/bin/env bun` shebangs). These are NOT forbidden — they're shebang lines. The grep pattern `-e "/usr/bin/"` catches them. Phase 1 should refine the grep to exclude shebangs or accept them as expected.

---

## LOG

### Iteration 0 — 2026-02-19
- Phase reached: AUDIT (pre-implementation)
- Criteria progress: 0/24 (implementation not started)
- Work done: Complete platform dependency audit using 6 parallel scan agents
- Domains audited: Shell/Bash, Paths/Filesystem, Terminal/Kitty, Process/Signals, Hooks, Installer/Config/Voice
- Key findings: 64 shell scripts, 150+ hardcoded paths, 100+ Kitty calls, zero Windows checks
- Context for next iteration: Begin Phase 0 (platform.ts creation) — reference `hooks/lib/paths.ts` as canonical pattern

### Iteration 1 — 2026-02-19
- Phase reached: VERIFY (Phase 0 complete)
- Criteria progress: 1/24 (ISC-PF-1 passing)
- Architecture decision: **Fully Native Windows** (no WSL dependency)
- Work done:
  - Verified `platform.ts` (379 lines, 6 sections, 25+ exports)
  - Verified `platform.test.ts` (30/30 tests pass)
  - Fixed audit test timeouts (WSL filesystem latency, increased to 30s)
  - Verified `platform-audit.test.ts` (8/8 pass, baselines: /tmp/=23, binary=136, HOME!=30, Windows=0)
  - Verified `smoke-test-windows.ts` imports clean
- Audit baselines captured: Phase 1 will target /tmp/ (23→0) and HOME! (30→0)
- Context for next iteration: Phase 1 (path normalization) and Phase 2 (hook guards) can run in parallel. Pause after Phase 2 for Windows smoke test on Justin's machine.

### Iteration 2 — 2026-02-19
- Phase reached: VERIFY (Phase 1 complete)
- Criteria progress: 3/24 (ISC-PF-1, PF-2, PF-3 passing)
- Work done:
  - Added `getPaiDir()` and `paiPath()` to `lib/platform.ts`
  - Fixed 30 `process.env.HOME!` instances across 28 files (30→0)
  - Fixed 23 hardcoded `/tmp/` instances across 10 files (23→0)
  - Hooks: import from `./lib/paths` (getPaiDir, paiPath)
  - Skills: import from `../../../lib/platform` (getPaiDir, paiPath, getHomeDir)
  - VoiceServer: import from `../lib/platform` (getTempFilePath)
  - Browser: import from `../../../lib/platform` (getTempDir)
  - All 38 platform tests pass (30 unit + 8 audit)
- Files changed: ~30 TypeScript files across hooks/, skills/, VoiceServer/, lib/
- Context for next iteration: Phase 2 (hook system guards) — add platform checks to 6 hooks. Then PAUSE for Windows smoke test.
