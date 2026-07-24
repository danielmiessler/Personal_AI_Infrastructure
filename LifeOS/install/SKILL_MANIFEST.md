# LifeOS Skill Portability Manifest for Hermes

This manifest categorizes all LifeOS skills present in `LifeOS/install/skills/` based on their portability to the Hermes AI agent harness.

## Portable to Hermes

These skills are fully compatible with Hermes and install into `$HERMES_HOME/skills/` as a unified skill body:

- **Algorithm** — 7-phase execution loop (OBSERVE→LEARN), effort tiers E1-E5, and ISC quality gates
- **Amber** — Idea capture and preservation loop (capture→preserve→grade→route→resurface) backed by Hindsight
- **Conduit** — Current-state sensing via deterministic Windows polling and daily rollup into Hindsight
- **ISA** — Information Structure Architecture & workspace state manager
- **Telos** — Life direction, core values, and mission alignment system
- **WorldThreatModel** — 11 time-horizon macro forecast and vulnerability matrix
- **BitterPillEngineering** — Instruction-set safety audit and adversarial robustness
- **Council** — Multi-perspective debate and synthesis governance framework
- **FirstPrinciples** — Fundamental reasoning and problem decomposition
- **RedTeam** — Adversarial review, attack vector analysis, and stress testing
- **Research** — Deep research, source evaluation, and synthesis
- **Harvest** — Knowledge extraction and information collection
- **Ideate** — Structured brainstorming and novelty generation
- **Interview** — Principal state discovery and TELOS extraction
- **ExtractWisdom** — Insight distillation from long-form content
- **Loop** — Iterative execution and feedback governance
- **Optimize** — Workflow and process efficiency refinement
- **IterativeDepth** — Recursive deep-dive analysis protocol
- **ContextSearch** — Semantic context retrieval and codebase navigation
- **Hardening** — System robustification and edge-case defense
- **BiasCheck** — Cognitive bias detection and calibration
- **SystemsThinking** — Dynamic systems modeling and leverage point identification
- **CreateSkill** — Automated skill creation and packaging engine
- **CreateCLI** — Command-line tool scaffold generator
- **Config** — Hermes-native config layering (constitution → config.yaml → SOUL.md → TELOS → skills); replaces the LifeOS system/user settings merge
- **Delegation** — Subagent task distribution and result synthesis via `delegate_task`, model-tier matching, and verified fan-out
- **Evals** — System and output evaluation framework
- **Prompting** — Advanced prompt engineering techniques
- **Science** — Hypothesis testing and empirical methodology
- **Knowledge** — Knowledge base structuring and retrieval
- **RootCauseAnalysis** — 5-Whys and causal tree analysis
- **Sales** — Value proposition articulation and positioning
- **Aphorisms** — Principle compression and mental model heuristics
- **ApertureOscillation** — Micro/macro perspective shifting
- **BeCreative** — Divergent thinking and creative ideation
- **Migrate** — System migration and schema transition tooling
- **Upgrade** — Version upgrade and component migration
- **Trim** — Context compression and boilerplate pruning
- **Webdesign** — UI/UX design systems and layout patterns
- **HTML** — Semantic markup structure and layout execution
- **WriteStory** — Narrative synthesis and storytelling
- **USMetrics** — Quantitative metric tracking and analytics
- **LocalIntelligence** — Local model routing and edge inference
- **LifeOS** — Core LifeOS lifecycle orchestrator
- **PrivateInvestigator** — Forensic investigation and anomaly tracing
- **BrightData** — Web data collection and proxy management
- **Apify** — Web scraping and automation actor integration
- **ArXiv** — Academic paper search and paper summary ingestion
- **AudioEditor** — Audio processing and transcript handling
- **Fabric** — Pattern-based text transformation engine
- **CMUX** — Multiplexer terminal context management

## Claude/macOS-specific — not ported

These skills rely on macOS-specific binaries, launchd daemons, or browser extensions and are excluded from the Hermes port:

- **Interceptor** — Requires macOS Chrome extension for DOM manipulation
- **Daemon** — Requires macOS `launchd` service architecture
- **Art** — Shells out to macOS-specific image generation binaries and Apple Silicon graphics pipelines
- **Remotion** — Video rendering engine dependent on macOS graphics/art pipeline dependencies
