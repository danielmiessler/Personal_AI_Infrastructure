
## PAI Tools Quick Reference

Core TypeScript utilities in `skills/PAI/Tools/`. Run with `bun ~/.claude/skills/PAI/Tools/<name>.ts`.

### System Maintenance
| Tool | Purpose |
|------|---------|
| `RebuildPAI.ts` | Assemble SKILL.md from Components/ (auto-run on session start) |
| `GenerateSkillIndex.ts` | Build skill-index.json from all skill SKILL.md files |
| `IntegrityMaintenance.ts` | Audit PAI file structure and flag inconsistencies |
| `SecretScan.ts` | Scan for secrets/credentials accidentally committed |
| `GetCounts.ts` | Report skill/hook/signal/file counts for banner display |

### Skill & Session
| Tool | Purpose |
|------|---------|
| `SkillSearch.ts` | Search skill index for relevant skills by keyword |
| `LoadSkillConfig.ts` | Load and validate skill configuration files |
| `SessionHarvester.ts` | Extract insights from completed session transcripts |
| `SessionProgress.ts` | Display current session progress and phase tracking |
| `FailureCapture.ts` | Log and categorize Algorithm failure patterns |
| `algorithm.ts` | Loop-mode PRD executor (`-m loop -p PRD-file.md -n 128`) |

### Content & Media
| Tool | Purpose |
|------|---------|
| `GetTranscript.ts` | Fetch YouTube video transcripts |
| `ExtractTranscript.ts` | Extract and clean audio transcripts |
| `Transcribe-bun.lock` | Lock file for audio transcription dependencies |
| `PreviewMarkdown.ts` | Render markdown to terminal preview |
| `Banner.ts` / `BannerNeofetch.ts` | Generate PAI startup banner variants |

### AI & Analysis
| Tool | Purpose |
|------|---------|
| `Inference.ts` | Run local/remote model inference tasks |
| `LearningPatternSynthesis.ts` | Synthesize patterns from Algorithm reflections JSONL |
| `OpinionTracker.ts` | Track and update relationship opinion entries |
| `FeatureRegistry.ts` | Register and query PAI feature flags |
| `GenerateCapabilityIndex.ts` | Build capability index for CAPABILITY AUDIT scanning |
| `pai.ts` | PAI CLI entry point |

> Full inventory: `ls ~/.claude/skills/PAI/Tools/`

---

