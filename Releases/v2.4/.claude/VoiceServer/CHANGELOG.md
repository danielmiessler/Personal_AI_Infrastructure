# Changelog

All notable changes to the Voice Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-01-18

### Added
- **Pronunciation Customization**: User-configurable pronunciation substitutions
  - Loads from `~/.claude/skills/CORE/USER/pronunciations.json`
  - Applies word-boundary-aware regex replacements before TTS
  - Example: `{"PAI": "pie"}` makes "PAI" pronounce as "pie"
- **Settings.json Integration**: Voice configuration from central PAI settings
  - Reads `daidentity.voiceId` for default voice
  - Reads `daidentity.voice` for prosody settings (stability, style, speed, volume)
  - Reads `daidentity.name` for identification

### Changed
- **Improved .env Parsing**: Better handling of quoted values and edge cases
- **Prosody Layering**: Request prosody > voice config > DA config > defaults

## [1.5.0] - 2026-01-12

### Removed
- **Prosody System**: Removed emotional markers and prosody enhancement system
  - Eliminated `extractEmotionalMarker()` function
  - Removed `EMOTIONAL_PRESETS` configuration
  - Simplified voice settings to use personality defaults only
  - Text sanitization handled server-side via existing `sanitizeForSpeech()`

### Changed
- **Simplified Architecture**: Voice server now receives clean text, handles all processing
  - Hooks no longer pre-process text with prosody markers
  - Removed dependency on hook-side text cleaning
  - More predictable TTS output without marker interference

### Philosophy
- Prosody markers were over-engineered: they added complexity that TTS sometimes spoke literally
- Simpler is better: personality-based voice settings (stability, similarity_boost) provide sufficient variation

## [1.4.0] - 2025-12-09

### Added
- **Volume Control**: New `default_volume` setting in voices.json (0.0-1.0 scale)
  - Default set to 0.8 (80% volume) for less intrusive notifications
  - Passed to afplay via `-v` flag for system-level volume control

### Changed
- **Calmer Startup Voice**: Simplified startup message tone

## [1.3.2] - 2025-11-16

### Changed
- **DRAMATIC Voice Differentiation**: Voice parameters dramatically increased in range using personality psychology mapping
  - **Speaking Speed**: 97% range increase - from 205 wpm (Serena - slowest) to 270 wpm (Dev - fastest)
  - **Stability**: 42% range increase - from 0.18 (Rook - most chaotic) to 0.75 (Serena - most measured)
  - **Similarity Boost**: 54% range increase - from 0.52 (Priya - most creative) to 0.92 (Ava Chen - most authoritative)

### Enhanced
- **Personality Psychology Mapping**: Voice parameters derived from Big Five personality traits and expertise levels
- **Maximum Distinctiveness**: Every agent voice now unmistakably unique through extreme parameter variation
- **Ultrathink Analysis**: Deep reasoning applied to map character psychology to voice prosody characteristics

### Philosophy
- **Extreme Variation**: From chaotic creative (Rook 0.18, Priya 0.20) to measured wisdom (Marcus 0.72, Serena 0.75)
- **Psychological Authenticity**: Voice characteristics match personality traits (openness, conscientiousness, extraversion, neuroticism)
- **Maximum Emotional Range**: Dramatic differentiation enables richer character expression and personality distinction

## [1.3.1] - 2025-11-16

### Added
- **Deep Character Development**: All 12 agents now have authentic backstories and life histories
  - **Real Names**: Each agent has a personal name (Jamie, Rook, Priya, Aditi, Dev, etc.)
  - **Life Events**: Key formative experiences that shaped each personality
  - **Character Arcs**: Backstories explain why they communicate the way they do
  - **Psychological Depth**: Voice characteristics derive from lived experiences

### Changed
- **Refined Voice Characteristics**: Voice parameters now match character histories
  - **Speaking Speed**: Ranges from 217 wpm (Serena - thoughtful academic) to 250 wpm (Dev - racing brain)
  - **Stability**: 0.25 (Rook - chaotic hacker energy) to 0.65 (Marcus/Serena - measured wisdom)
  - **Similarity Boost**: 0.62 (Priya - maximum creative freedom) to 0.88 (Researchers - authoritative consistency)
  - All adjustments reflect personality development and formative experiences

### Enhanced
- **Character Archetypes**: Organized agents by personality type
  - The Enthusiasts: Rook, Priya, Dev (low stability, driven by excitement)
  - The Professionals: Jamie, Zoe, Emma (medium stability, warm expertise)
  - The Analysts: Ava Chen, Ava Sterling, Alex (medium-high stability, earned authority)
  - The Critics: Aditi (controlled variation, precise standards)
  - The Wise Leaders: Marcus, Serena (high stability, long-term thinking)

### Philosophy
- **History Shapes Voice**: Speaking patterns reflect life experiences and personality formation
- **Authentic Personalities**: Each agent feels like a real person with depth and backstory
- **Natural Variation**: Voice characteristics match character development arcs
- **Consistent Growth**: Personality traits derive from formative events and learned behaviors

### Examples
- **Jamie (Kai)**: Former teaching assistant, eldest sibling - explains warm supportive presence
- **Rook (Pentester)**: Reformed grey hat who fixed family computer at 12 - explains playful chaos
- **Ava Chen (Perplexity)**: Investigative journalist who triple-checks sources - explains research confidence
- **Marcus (Principal)**: Battle-scarred from architectural decisions - explains measured wisdom

## [1.3.0] - 2025-11-16

### Changed
- **BREAKING: Centralized Configuration Architecture**
  - Agent personalities now defined in `~/.claude/Skills/CORE/agent-personalities.md`
  - Voice server reads from CORE skill (canonical source of truth)
  - Personality definitions separated from infrastructure (proper architecture)
  - Markdown format with embedded JSON for human-readable + machine-parseable config
  - `voices.json` now deprecated (fallback only)

- **Universal Expressiveness Enhancement**
  - Increased expressiveness for ALL 12 agents (reduced stability values by 0.08-0.13)
  - More animated delivery reflects genuine personality across all agents
  - Stability range: 0.28 (Pentester - most chaotic) to 0.62 (Architect/Principal - most measured)
  - Enhanced emotional range while maintaining character consistency

### Technical
- Added markdown JSON extraction via regex in server.ts
- Configuration loading priority: CORE markdown > local voices.json > defaults
- Updated console logging to indicate configuration source

### Architecture
- Single source of truth: `~/.claude/Skills/CORE/agent-personalities.md`
- Voice server consumes identity data (doesn't own it)
- Proper separation: personality definitions (CORE) vs infrastructure (voice-server)

## [1.2.1] - 2025-11-16

### Changed
- **Kai Personality Enhancement**: Increased expressiveness and eagerness
  - Reduced stability from 0.58 → 0.50 (more animated, expressive variation)
  - Reduced similarity_boost from 0.78 → 0.75 (more creative interpretation)
  - Updated description: "Expressive eager buddy: genuinely excited to help, animated celebrations, warm and enthusiastic partner"
  - Voice now delivers more energetic, enthusiastic responses while maintaining warmth

## [1.2.0] - 2025-11-16

### Added
- **Enhanced Character Personalities**: Deep personality development for 5 key agents with creative character arcs
  - **Kai**: "Golden Retriever Engineer" - Warm buddy who celebrates wins together, eager but stable (0.58/0.78)
  - **Pentester**: "Mischievous Hacker" - Overly excited finding vulnerabilities, playful chaos (0.32/0.88)
  - **Artist**: "Dreamy Visionary" - Eccentric and flighty, distracted by beauty, unconventional thinking (0.38/0.68)
  - **Designer**: "Sophisticated Critic" - Snobby perfectionist with judgmental eye, dismissive of mediocrity (0.62/0.85)
  - **Intern**: "Brilliant Overachiever" - Insatiably curious, eager to prove themselves, enthusiastic (0.42/0.72)

### Changed
- Refined voice prosody settings to match enhanced character personalities
- Updated voice descriptions with character archetypes for clearer personality expression
- Adjusted stability ranges: 0.32 (most chaotic) to 0.62 (most authoritative) for enhanced agents
- Fine-tuned similarity_boost for personality consistency while allowing expressive variation

### Philosophy
- Characters now have distinct "voice" beyond technical settings - each agent embodies a persona
- Prosody tuning reflects personality: chaos vs. control, excitement vs. judgment, curiosity vs. confidence
- Voice server now delivers not just information, but personality-driven communication

## [1.1.0] - 2025-11-16

### Added
- **Agent Voice Personalities**: Each agent now has personality-tuned voice settings (stability & similarity_boost) for distinct emotional delivery
  - Pentester: Low stability (0.35) for edgy, intense delivery
  - Researcher: High stability (0.65) for confident, authoritative tone
  - Architect: Very high stability (0.7) for measured, strategic wisdom
  - Intern: Medium-low stability (0.45) for enthusiastic, high-energy delivery
  - All agents configured in `voices.json` with ElevenLabs voice IDs

### Changed
- Upgraded voice configuration system to support per-agent personality settings
- Enhanced server logging to show active personality settings
- Updated `voices.json` with complete agent voice configurations and ElevenLabs IDs

### Technical
- Added `getVoiceConfig()` function for voice personality lookup
- Updated `generateSpeech()` to accept optional voice settings parameter

## [1.0.0] - 2025-11-16

### Added
- Initial release of Voice Server
- ElevenLabs TTS integration with `eleven_turbo_v2_5` model
- Multi-voice support for Kai and specialized agents
- REST API endpoints: `/notify`, `/pai`, `/health`
- Security features: Input validation, rate limiting, CORS restrictions
- macOS notification integration with AppleScript
- Voice configuration via `voices.json`
- Environment-based configuration via `~/.claude/.env`

### Security
- Input sanitization to prevent command injection
- Rate limiting (10 requests/minute per IP)
- CORS restricted to localhost only
- Automatic cleanup of temporary audio files

[1.3.1]: https://github.com/danielmiessler/voice-server/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/danielmiessler/voice-server/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/danielmiessler/voice-server/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/danielmiessler/voice-server/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/danielmiessler/voice-server/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/danielmiessler/voice-server/releases/tag/v1.0.0
