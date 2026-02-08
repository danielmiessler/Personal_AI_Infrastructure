# PAI Configuration Snapshot

**Date:** February 8, 2026
**Instance:** Temporary deployment (infrastructure migration pending)
**Purpose:** Preserve current PAI configuration for future permanent deployment

---

## System Overview

**PAI Version:** 2.5
**Algorithm:** v0.2.24
**Claude Model:** Sonnet 4.5 (claude-sonnet-4-5-20250929)
**Platform:** Linux 6.17.0-1006-gcp

---

## Installed Components

### Skills (30+)
- Agents - Dynamic agent composition
- AnnualReports - Security report aggregation
- Aphorisms - Quote management
- Apify - Social media scraping
- Art - Visual content creation
- BeCreative - Extended thinking mode
- BrightData - Progressive URL scraping
- Browser - Browser automation with Playwright
- CORE - Personal AI Infrastructure core
- Council - Multi-agent debate system
- CreateCLI - TypeScript CLI generation
- CreateSkill - Skill creation and validation
- Documents - Document processing
- DualAgent - Dual-agent workflow system
- Evals - Agent evaluation framework
- **Fabric** - 238 prompt patterns for content analysis
- FirstPrinciples - First principles reasoning
- OSINT - Open source intelligence
- PAI - System management
- PAIUpgrade - System improvement extraction
- PrivateInvestigator - Ethical people-finding
- PromptInjection - Prompt injection testing
- Prompting - Meta-prompting system
- Recon - Security reconnaissance
- RedTeam - Adversarial analysis (32 agents)
- SECUpdates - Security news aggregation
- Telos - Life OS and project analysis
- VoiceServer - Voice server management
- WebAssessment - Web security assessment

### MCP Servers (4)
- **Todoist** - Task and project management
- **Slack** - Slack messaging integration
- **Notion** - Notion page creation and management
- Additional servers for GitHub, filesystem, etc.

### Workflows (123)
Distributed across skills and system components.

### Hooks (17)
Event-driven automation including:
- SessionStart (startup)
- UserPromptSubmit (FormatReminder - Algorithm enforcement)
- Pre/post execution hooks

---

## Key Configurations

### Algorithm
- **Version:** v0.2.24
- **Modes:** FULL, ITERATION, MINIMAL (AI inference-based detection)
- **ISC System:** TaskCreate/TaskUpdate/TaskList for verification
- **Voice Announcements:** curl to localhost:8888/notify

### Memory System
- **Location:** `~/.claude/projects/-home-txmyer/memory/`
- **Files:** MEMORY.md (78 lines), workflows.md (127 lines)
- **Auto-load:** First 200 lines of MEMORY.md at session start
- **Topics:** Fabric patterns, YouTube workflows, Notion integration, workarounds

### Notion Integration
Successful patterns:
- Page creation with `properties: {"title": "..."}`
- Markdown content in `content` field
- Returns `id` and `url` for created pages

### Fabric Patterns
- **Location:** `~/.claude/skills/Fabric/Patterns/`
- **Count:** 238 patterns
- **Key Pattern:** extract_wisdom (16-word bullets for IDEAS/INSIGHTS/HABITS/FACTS/RECOMMENDATIONS)

---

## Recent Work

### Session: February 7-8, 2026

**Completed Tasks:**
1. ✅ YouTube wisdom extraction (2 videos: Jim Rohn content)
   - Developed workaround workflow: curl → WebSearch → WebFetch → Fabric pattern
   - Created Notion pages: "Jim Rohn BYE", "Jim Rohn 7S"

2. ✅ Memory system initialization
   - Created MEMORY.md with core learnings
   - Created workflows.md with detailed procedures

3. ✅ OpenClaw evaluation
   - Comprehensive analysis: security risks outweigh benefits
   - Recommendation: DO NOT integrate (335+ malicious skills, active CVEs)
   - Alternative: Selective feature addition (voice, messaging)

4. ✅ Voice feature planning
   - Created comprehensive plan in Notion: "Voice Installation"
   - Technology stack: Picovoice (wake word), ElevenLabs (TTS), Whisper (STT)
   - Timeline: 1-2 weeks, 3 phases
   - Status: Ready for Phase 1 implementation (deferred to next session)

---

## Planned Enhancements

### Voice Feature (Planned)
- Wake word detection ("Hey Eko")
- Text-to-speech output (ElevenLabs)
- Speech-to-text input (OpenAI Whisper)
- Integration with PAI notification system
- Target: 1-2 weeks development

### Messaging Integration (Deferred)
- Reason: Insufficient ROI, rate limits on Pro plan
- Revisit: When upgraded to Max plan
- Approach: MCP servers (Telegram, WhatsApp) following existing Slack pattern

---

## Known Issues & Limitations

### Current Instance
- **Temporary infrastructure** - Migration planned for permanent deployment
- **No direct YouTube transcript tools** - Workaround using curl + WebSearch + WebFetch
- **Rate limits** - Claude Pro plan limits; may need Max for heavy usage

### Tool Availability
- `fabric` CLI not in PATH - using alternative extraction methods
- `youtube-transcript-api` not installed - using web search for content
- `yt-dlp` not available - using curl-based HTML parsing

---

## Security Posture

### Current Practices
- Permission mode system for risky operations
- Hook-based validation before tool execution
- Steering rules preventing unauthorized actions
- Local-first architecture (no cloud skill marketplace)
- API keys in environment variables (not committed)
- .gitignore excludes: .credentials.json, .env, history files

### Evaluation Framework
For new technology adoption:
1. Does it solve a real problem?
2. Does it align with our architecture?
3. What's the security posture?
4. Is it portable long-term (10-20 years)?

**Example:** OpenClaw failed #2 (architecture) and #3 (security) → Rejected

---

## File Locations

### PAI Core
- Base: `~/.claude/`
- Skills: `~/.claude/skills/`
- Memory: `~/.claude/projects/-home-txmyer/memory/`
- Config: `~/.claude/config/` (if exists)

### Sensitive (NOT backed up)
- Credentials: `~/.claude/.credentials.json`
- Environment: `~/.claude/.env`
- History: `~/.claude/history.jsonl`
- Debug: `~/.claude/debug/`
- Cache: `~/.claude/cache/`

---

## Migration Checklist

When deploying to permanent infrastructure:

- [ ] Copy PAI configuration from this repo
- [ ] Set up environment variables (API keys)
- [ ] Install required dependencies (Node ≥22, pnpm/bun)
- [ ] Configure MCP servers (Todoist, Slack, Notion)
- [ ] Test core workflows (Fabric, memory system)
- [ ] Verify hooks functioning correctly
- [ ] Run initial backup to this repo
- [ ] Set up automated backup schedule

---

## Resources

- **GitHub Repo:** https://github.com/txmyer-dev/Personal_AI_Infrastructure
- **PAI System:** https://github.com/danielmiessler/PAI
- **The Algorithm:** https://github.com/danielmiessler/TheAlgorithm
- **Fabric Patterns:** https://github.com/danielmiessler/fabric

---

**Maintainer:** Tony (@txmyer)
**Last Updated:** February 8, 2026
**Next Review:** Upon infrastructure migration
