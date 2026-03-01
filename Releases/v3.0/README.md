<div align="center">

<img src="images/pai-installer-v3.png" alt="PAI v3.0 Installer" width="600">

# PAI v3.0.0 — The Algorithm Matures

**Constraint extraction, build drift prevention, persistent PRDs, and parallel loop execution**

[![GitHub Release](https://img.shields.io/badge/Release-v3.0.0-8B5CF6?style=flat&logo=github)](https://github.com/danielmiessler/PAI/releases/tag/v3.0.0)
[![Skills](https://img.shields.io/badge/Skills-37-22C55E?style=flat)](skills/)
[![Hooks](https://img.shields.io/badge/Hooks-20-3B82F6?style=flat)](hooks/)
[![Workflows](https://img.shields.io/badge/Workflows-162-F97316?style=flat)](skills/)

![Discussions](https://img.shields.io/github/discussions/danielmiessler/PAI?style=flat&logo=github&label=Discussions&color=EAB308)
![Commits/mo](https://img.shields.io/github/commit-activity/m/danielmiessler/PAI?style=flat&logo=git&label=Commits%2Fmo&color=F59E0B)
![Repo Size](https://img.shields.io/github/repo-size/danielmiessler/PAI?style=flat&logo=database&label=Repo%20Size&color=D97706)

</div>

---

## What Changed

v2.5 taught the Algorithm to think about how it thinks—two-pass capability selection, thinking tools with justify-exclusion, and parallel-by-default execution. But the Algorithm itself was still fragile. It operated on intuition rather than extracted constraints, it couldn't detect when builds drifted from intent, and its criteria evaporated between sessions.

v3.0 makes the Algorithm mechanically rigorous. It extracts constraints from source material, prevents drift during builds, persists requirements across sessions, and runs loop iterations with parallel workers. The Algorithm version jumped from v0.2.25 to v1.4.0—this is not an incremental update. This is the version where the Algorithm stopped being a prototype.

### The Problem v3.0 Solves

v2.5's Algorithm:
```
Observe → Think → Build → Verify → Learn
(but criteria came from intuition, drift was invisible, and state died with the session)
```

v3.0's Algorithm:
```
Extract every constraint from source → Self-interrogate for blind spots →
Re-read criteria before each artifact → Check anti-criteria after each artifact →
Simulate violations to test verification → Persist PRDs across sessions →
Run 8 parallel workers in loop mode → Converge on criteria with effort decay
```

The difference is mechanical rigor. The Algorithm no longer trusts itself—it extracts, cross-checks, simulates failures, and proves its own verification works before declaring success.

---

## Eight Major Features

### 1. Algorithm v1.4.0 — From Prototype to Production

The Algorithm jumped 56 minor versions. This is not a version bump—it is a rewrite of how the system reasons about problems. Every phase gained new mechanical safeguards.

**Constraint Extraction (v1.3.0)**

<img src="images/feature-constraint-extraction.png" alt="Constraint Extraction" width="700">

The Algorithm no longer infers what rules apply. It mechanically extracts every rule, threshold, and prohibition from the source material before reasoning begins:

```
CONSTRAINT EXTRACTION:
│ Source:       SKILL.md, USER/AISTEERINGRULES.md, project CLAUDE.md
│ Rules:        14 extracted (3 thresholds, 4 prohibitions, 7 requirements)
│ Conflicts:    0 detected
│ Coverage:     All ISC criteria traceable to source constraints
```

**Self-Interrogation**

<img src="images/feature-self-interrogation.png" alt="Self-Interrogation" width="700">

Five structured questions asked before every build to catch blind spots the Algorithm's own reasoning would miss:

```
SELF-INTERROGATION:
│ 1. What am I assuming that I haven't verified?
│ 2. What would a domain expert challenge about my approach?
│ 3. What failure mode am I not testing for?
│ 4. What constraint might I be violating without realizing it?
│ 5. What would make the user say "that's not what I meant"?
```

**Build Drift Prevention**

<img src="images/feature-build-drift-prevention.png" alt="Build Drift Prevention" width="700">

ISC criteria are re-read before each artifact is produced. After each artifact, anti-criteria are checked. The build cannot silently drift from intent:

```
BUILD ARTIFACT #3:
│ PRE-CHECK:    Re-read ISC criteria #1-5 ✓
│ ARTIFACT:     Component implementation
│ POST-CHECK:   Anti-criteria scan (0 violations) ✓
│ DRIFT:        None detected
```

**Verification Rehearsal**

<img src="images/feature-verification-rehearsal.png" alt="Verification Rehearsal" width="700">

Before the real VERIFY phase, the Algorithm simulates violations of CRITICAL criteria to confirm its verification methods would actually catch them:

```
VERIFICATION REHEARSAL:
│ Simulated:    ISC #1 violation (missing required field)
│ Detection:    CLI verification caught it ✓
│ Simulated:    ISC #3 violation (exceeding threshold)
│ Detection:    Test verification caught it ✓
│ Confidence:   All CRITICAL criteria have working detection
```

**Loop Mode with Parallel Workers**

<img src="images/feature-parallel-loop.png" alt="Parallel Loop Execution" width="700">

Run the Algorithm in a loop with configurable parallel agents:

```bash
algorithm.ts -m loop -a 8    # 8 agents working ISC criteria in parallel
```

Workers distribute across criteria. Effort levels decay from Extended to Fast as criteria converge, so early iterations get deep analysis and later iterations get efficient convergence.

**Plan Mode Integration**

<img src="images/feature-plan-mode.png" alt="Plan Mode" width="700">

At Extended+ effort levels, the Algorithm enters a structured ISC construction workshop—a guided process for building ideal state criteria rather than improvising them.

---

### 2. Full Installer System

<img src="images/feature-installer.png" alt="Full Installer System" width="700">

The configuration wizard was rebuilt from scratch as a professional installation system with two interfaces.

**Electron GUI Wizard**

A native desktop application with a step-by-step setup flow. Professional UI, progress indicators, validation feedback, and a guided experience for first-time users.

**CLI Fallback**

For terminal-only environments (SSH, containers, headless servers), the same installation flow runs interactively in the terminal with full feature parity.

**Key Features:**
- Auto-discovers existing API keys from environment variables and config files
- Template-based settings generation—no more hand-editing JSON
- Voice server setup with ElevenLabs API key validation
- Neofetch-style system banner on startup
- Direct GUI launch from CLI when display is available

---

### 3. 9 New Skills (28 to 37)

<img src="images/feature-new-skills.png" alt="New Skills" width="700">

| Skill | Purpose |
|-------|---------|
| **IterativeDepth** | Multi-angle exploration for deeper ISC construction |
| **Science** | Universal thinking engine based on the scientific method |
| **Remotion** | Programmatic video creation with React components |
| **WorldThreatModelHarness** | 11 time-horizon adversarial analysis framework |
| **Evals** | Agent evaluation framework for measuring capability |
| **USMetrics** | US economic indicators and trend analysis |
| **ExtractWisdom** | Dynamic content-adaptive wisdom extraction |
| **Cloudflare** | Worker and Pages deployment automation |
| **Sales** | Sales pipeline workflows and outreach |

---

### 4. Agent Teams / Swarm

<img src="images/feature-agent-teams.png" alt="Agent Teams / Swarm" width="700">

Coordinated multi-agent execution for complex tasks that exceed what a single agent can manage:

- **Shared task lists** — All agents in a team see the same work items
- **Parallel workers** — Multiple agents execute simultaneously on independent tasks
- **Team creation** — Spin up purpose-built teams with role assignments
- **Message passing** — Agents communicate findings, blockers, and completions to teammates

```
TEAM: security-audit
│ Agent 1 (Pentester):    External attack surface    [IN_PROGRESS]
│ Agent 2 (Recon):        Infrastructure mapping      [IN_PROGRESS]
│ Agent 3 (QATester):     Authentication flows        [COMPLETE]
│ Agent 4 (Engineer):     Fix queue from findings     [WAITING]
```

---

### 5. Persistent Requirements Documents (PRDs)

<img src="images/feature-persistent-prds.png" alt="Persistent PRDs" width="700">

ISC criteria no longer die with the session. Every Algorithm run creates persistent PRD files that track ideal state criteria across sessions with a full lifecycle:

```
PRD STATUS PROGRESSION:
DRAFT → CRITERIA_DEFINED → PLANNED → IN_PROGRESS → VERIFYING → COMPLETE
```

PRDs survive session restarts, agent switches, and system reboots. When you resume work, the Algorithm loads the PRD and picks up where it left off—no re-derivation, no lost context.

---

### 6. Voice Personality System

<img src="images/feature-voice-personality.png" alt="Voice Personality System" width="700">

The voice server gained a configurable personality layer. Traits shape how the DA expresses emotions vocally:

| Trait | Effect |
|-------|--------|
| **Enthusiasm** | Energy level in positive announcements |
| **Resilience** | Composure when reporting failures |
| **Composure** | Steadiness under pressure |
| **Warmth** | Approachability in casual interactions |
| **Precision** | Crispness in technical reporting |

Personality traits combine to create a consistent vocal identity that adapts tone to context without losing character.

---

### 7. Inline Verification Methods

<img src="images/feature-verification-methods.png" alt="Inline Verification Methods" width="700">

Every ISC criterion now carries an explicit verification method suffix. No more ambiguity about how success will be measured:

| Method | Usage |
|--------|-------|
| **CLI** | Run a command and check output |
| **Test** | Execute test suite and check pass/fail |
| **Static** | Analyze code structure without execution |
| **Browser** | Playwright automation to verify UI behavior |
| **Grep** | Search files for required/prohibited patterns |
| **Read** | Read file contents and validate structure |
| **Custom** | Task-specific verification with explicit steps |

```
ISC CRITERIA:
│ #1 [CRITICAL] API returns 200 on valid input          — verify: CLI
│ #2 [CRITICAL] Auth rejects expired tokens              — verify: Test
│ #3 [HIGH]     No console.log in production code        — verify: Grep
│ #4 [MEDIUM]   Component renders loading state          — verify: Browser
│ #5 [LOW]      README documents all endpoints           — verify: Read
```

---

### 8. Algorithm Self-Upgrade Loop

<img src="images/feature-algorithm-upgrade.png" alt="Algorithm Self-Upgrade" width="700">

The PAI Upgrade skill now closes the learning loop. Every Algorithm run writes a structured reflection (Q1: execution mistakes, Q2: algorithm fixes, Q3: fundamental gaps) to persistent JSONL. The new MineReflections and AlgorithmUpgrade workflows mine those reflections for recurring patterns, weight them by signal strength (low sentiment + over-budget = highest signal), cluster them into themes, map each theme to the exact Algorithm section it affects, and produce section-targeted upgrade proposals with specific spec diffs.

```
ALGORITHM SELF-UPGRADE LOOP:
│ Run Algorithm  →  Write reflection (Q1/Q2/Q3 + sentiment + budget)
│ Mine reflections →  Cluster themes →  Route to Algorithm sections
│ Generate proposals →  Apply spec changes →  Version bump
│ Repeat
```

The Algorithm doesn't just learn from mistakes—it proposes its own fixes and knows exactly which spec section to change.

---

## What's New in v3.0

### Major Features

| Feature | Description |
|---------|-------------|
| **Algorithm v1.4.0** | Constraint extraction, self-interrogation, drift prevention, verification rehearsal |
| **Full Installer System** | Electron GUI wizard + CLI fallback with auto-discovery |
| **9 New Skills** | IterativeDepth, Science, Remotion, WorldThreatModelHarness, Evals, and 4 more |
| **Agent Teams / Swarm** | Multi-agent coordination with shared tasks and message passing |
| **PRD System** | Persistent requirements documents that survive across sessions |
| **Voice Personality** | Configurable personality traits for vocal expression |
| **Inline Verification Methods** | CLI, Test, Static, Browser, Grep, Read, Custom per criterion |
| **Algorithm Self-Upgrade** | Mines reflections for recurring patterns, proposes section-targeted spec changes |
| **37 Skills** | 9 new skills added to the system |
| **20 Hooks** | 3 new hooks for deeper system awareness |
| **162 Workflows** | Refined automation coverage |
| **1,229 Total Files** | Complete system across all components |

### Algorithm Upgrades (v0.2.25 to v1.4.0)

| Version | Change |
|---------|--------|
| **v1.0.0** | PRD integration, persistent criteria tracking, 25-capability full scan audit |
| **v1.1.0** | Self-interrogation protocol, 5 structured blind-spot questions |
| **v1.2.0** | Loop mode with parallel workers, effort level decay across iterations |
| **v1.3.0** | Constraint extraction from source material, anti-criteria post-checks |
| **v1.4.0** | Build drift prevention, verification rehearsal, Plan Mode integration |

### Structural Changes

- **Installer rebuilt** — Electron GUI + CLI fallback replaces single-file wizard
- **Voice server upgraded** — Qwen3 local TTS added alongside ElevenLabs
- **Agent Teams** — New swarm coordination layer with shared task lists
- **PRD persistence** — Algorithm state survives across sessions
- **Verification methods** — Every ISC criterion tagged with explicit verification approach
- **Hook system expanded** — 17 to 20 hooks for broader event coverage
- **PerplexityResearcher** — New research agent added to the roster

---

## Full Release Contents

```
.claude/
├── PAI-Install/               # Full installer system
│   ├── engine/                # Installation engine (actions.ts, etc.)
│   ├── electron/              # GUI wizard application
│   └── cli/                   # Terminal fallback installer
│
├── settings.json              # Template configuration
├── statusline-command.sh      # 4-mode responsive status line
├── statusline-debug.sh        # Status line debugging
│
├── hooks/                     # 20 event hooks
│   ├── FormatReminder.hook.ts         # AI-powered depth classification
│   ├── ExplicitRatingCapture.hook.ts
│   ├── ImplicitSentimentCapture.hook.ts
│   ├── RelationshipMemory.hook.ts
│   ├── SoulEvolution.hook.ts
│   └── ... (15 more)
│
├── skills/                    # 37 production skills
│   ├── PAI/                   # The Algorithm v1.4.0 and system core
│   ├── Agents/                # Agent personalities, teams, swarm
│   ├── Art/                   # Visual content creation
│   ├── Browser/               # Playwright automation
│   ├── Research/              # Multi-model parallel research
│   ├── Fabric/                # Prompt patterns
│   ├── Science/               # Scientific method thinking engine
│   ├── Remotion/              # Programmatic video creation
│   ├── Cloudflare/            # Worker/Pages deployment
│   └── ... (27 more)
│
├── agents/                    # 12+ named agent definitions
├── lib/                       # Shared utilities
├── MEMORY/                    # Learning capture system
├── Observability/             # Real-time monitoring dashboard
└── VoiceServer/               # Voice server with personality system
```

---

## Quick Start

```bash
# 1. Clone the repo (if you haven't already)
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure/Releases/v3.0

# 2. Backup existing installation (if any)
[ -d ~/.claude ] && mv ~/.claude ~/.claude-backup-$(date +%Y%m%d)

# 3. Copy the complete release
cp -r .claude ~/

# 4. Run the installer
cd ~/.claude && ./PAI-Install/install.sh

# 5. Restart Claude Code to activate hooks
```

### The Installer Will Handle

| Step | Purpose |
|------|---------|
| **System detection** | OS, shell, existing configuration |
| **API key discovery** | Auto-finds keys from environment and config files |
| **Your name** | Personalization throughout the system |
| **Projects directory** | Where your work lives (default: ~/Projects) |
| **AI name** | What to call your assistant (default: Kai) |
| **Startup catchphrase** | What your DA says on startup |
| **ElevenLabs API key** | Voice notifications with validation |
| **Voice server setup** | Qwen3 local TTS or ElevenLabs cloud |
| **Settings generation** | Template-based, no hand-editing JSON |

### Shell Support

The installer auto-detects your shell and configures the appropriate file:
- **zsh** -- `~/.zshrc`
- **bash** -- `~/.bashrc`

---

## The 37 Skills

### Core System
| Skill | Purpose |
|-------|---------|
| **PAI** | The Algorithm v1.4.0, steering rules, identity, system architecture |
| **Agents** | Agent personalities, teams, swarm coordination, parallel orchestration |
| **PAIUpgrade** | System improvement extraction from content |
| **CORE** | Core operational workflows |

### Research & Intelligence
| Skill | Purpose |
|-------|---------|
| **Research** | Multi-model parallel research with synthesis |
| **OSINT** | Open source intelligence gathering |
| **PrivateInvestigator** | Ethical people-finding |
| **AnnualReports** | Security report aggregation |
| **SECUpdates** | Security news monitoring |
| **USMetrics** | US economic indicators and trend analysis |
| **ExtractWisdom** | Dynamic content-adaptive wisdom extraction |

### Thinking & Analysis
| Skill | Purpose |
|-------|---------|
| **Science** | Universal thinking engine based on scientific method |
| **BeCreative** | Extended thinking mode with 5 diverse options |
| **FirstPrinciples** | Fundamental analysis—deconstruct, challenge, reconstruct |
| **IterativeDepth** | Multi-angle exploration for deeper ISC construction |
| **RedTeam** | Adversarial validation with 32 agents |
| **Council** | Multi-agent debate with 3-7 agents |
| **Prompting** | Meta-prompt generation with templates |
| **WorldThreatModelHarness** | 11 time-horizon adversarial analysis framework |
| **Telos** | Life goals and project analysis |

### Development & Creation
| Skill | Purpose |
|-------|---------|
| **Browser** | Debug-first Playwright automation |
| **CreateCLI** | TypeScript CLI generation |
| **CreateSkill** | Skill structure creation and validation |
| **Evals** | Agent evaluation framework |
| **Documents** | Document processing |
| **Remotion** | Programmatic video creation with React |
| **Cloudflare** | Worker and Pages deployment automation |
| **Art** | Visual content, diagrams, icons |

### Security
| Skill | Purpose |
|-------|---------|
| **Recon** | Security reconnaissance |
| **WebAssessment** | Web security testing |
| **PromptInjection** | LLM security testing |

### Data & Integration
| Skill | Purpose |
|-------|---------|
| **BrightData** | Progressive URL scraping |
| **Apify** | Social media and business data scraping |
| **Fabric** | Prompt patterns for content analysis |
| **Sales** | Sales pipeline workflows and outreach |
| **Parser** | Content parsing and transformation |
| **Aphorisms** | Quote management |

---

## Named Agents

12+ specialized personalities for focused work:

| Agent | Specialty |
|-------|-----------|
| **Algorithm** | ISC tracking, verification, constraint extraction, PRD management |
| **Architect** | System design, distributed systems, infrastructure |
| **Engineer** | TDD, implementation patterns, Fortune 10 experience |
| **Artist** | Visual content, prompt engineering, model selection |
| **Designer** | UX/UI, accessibility, shadcn/ui |
| **QATester** | Browser automation, verification, test coverage |
| **Pentester** | Security testing, vulnerability assessment |
| **Intern** | High-agency generalist, multi-tool problem solver |
| **GeminiResearcher** | Multi-perspective parallel investigations |
| **GrokResearcher** | Contrarian, fact-based analysis |
| **CodexResearcher** | Technical archaeology, curiosity-driven |
| **ClaudeResearcher** | Academic synthesis, scholarly sources |
| **PerplexityResearcher** | Real-time web search, citation-heavy research |

---

## The Goal: Euphoric Surprise

The target remains **Euphoric Surprise**—results so thorough you're genuinely delighted, not just satisfied.

v3.0 makes this more achievable by addressing fundamental weaknesses in how the Algorithm reasons:

1. **Mechanical rigor over intuition** — Constraint extraction means criteria come from source material, not guesswork
2. **Drift is impossible** — Build drift prevention re-reads criteria before and checks anti-criteria after every artifact
3. **Verification proves itself** — Verification rehearsal simulates failures to confirm detection actually works
4. **State survives** — PRDs persist across sessions so complex multi-session work never loses context
5. **Scale through parallelism** — Loop mode with 8 parallel workers converges on criteria faster than any single agent
6. **Deeper thinking** — Self-interrogation catches the blind spots that confidence creates

The Algorithm no longer relies on being smart. It relies on being systematic.

---

## Upgrading from v2.5

v3.0 is a major upgrade from v2.5. The installer has been completely rebuilt and the Algorithm has changed substantially. Recommended approach:

```bash
# Run from the Releases/v3.0 directory after cloning the repo
# (e.g., cd Personal_AI_Infrastructure/Releases/v3.0)

# 1. Backup your current installation
mv ~/.claude ~/.claude-v2.5-backup

# 2. Install v3.0
cp -r .claude ~/

# 3. Restore your settings BEFORE running the installer
# The installer reads settings.json for identity, timezone, and API keys.
# Without this step, the installer generates defaults and your config is lost.
cp ~/.claude-v2.5-backup/settings.json ~/.claude/settings.json

# 4. Run the installer
cd ~/.claude && ./PAI-Install/install.sh

# 5. Migrate personal content
# Copy USER/ and MEMORY/ from backup if desired
cp -r ~/.claude-v2.5-backup/skills/PAI/USER ~/.claude/skills/PAI/USER
cp -r ~/.claude-v2.5-backup/MEMORY ~/.claude/MEMORY
```

> **Note:** The VoiceServer registers a LaunchAgent on port 8888. If you already have a service on that port, the voice server will fail silently. Check with `lsof -i :8888` before installing, and update the port in `settings.json` if needed.

**Breaking changes:**
- `INSTALL.ts` replaced by `PAI-Install/` directory (full installer system)
- Algorithm v0.2.x to v1.4.0 (complete rewrite of reasoning phases)
- Voice server now includes Qwen3 local TTS alongside ElevenLabs
- PRD system is new—no migration needed, PRDs will be created on first Algorithm run
- `settings.json` structure updated (installer handles generation from templates)
- Hook count increased from 17 to 20 (new hooks activate automatically)

---

## Resources

- **GitHub**: [github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)
- **The Algorithm**: [github.com/danielmiessler/TheAlgorithm](https://github.com/danielmiessler/TheAlgorithm)
- **Video**: [PAI Overview](https://youtu.be/Le0DLrn7ta0)
- **Philosophy**: [The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things)

---

<div align="center">

**PAI v3.0.0** — The Algorithm Matures

*The version where it stopped being a prototype and started being systematic.*

</div>
