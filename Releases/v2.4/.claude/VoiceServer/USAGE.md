# Voice Server - Complete Usage Guide

**Current Version:** v1.5.0

## Table of Contents

- [What's New in v1.3.2](#whats-new-in-v132)
- [Agent Personality System](#agent-personality-system)
- [Voice Parameter Ranges](#voice-parameter-ranges)
- [API Reference](#api-reference)
- [Agent Profiles](#agent-profiles)
- [Advanced Features](#advanced-features)
- [Testing & Examples](#testing--examples)

---

## What's New in v1.3.2

### DRAMATIC Voice Differentiation

Voice parameters dramatically increased in range using personality psychology mapping:

- **Speaking Speed**: 97% range increase (205-270 wpm vs previous 217-250 wpm)
- **Stability**: 42% range increase (0.18-0.75 vs previous 0.25-0.65)
- **Similarity Boost**: 54% range increase (0.52-0.92 vs previous 0.62-0.88)

### Personality Psychology Mapping

Voice characteristics now derived from Big Five personality traits:
- **Openness**: Creative variation (low = traditional, high = experimental)
- **Conscientiousness**: Stability and reliability (low = spontaneous, high = measured)
- **Extraversion**: Speaking rate and energy (low = reserved, high = enthusiastic)
- **Agreeableness**: Warmth and emotional range
- **Neuroticism**: Emotional expressiveness (low = steady, high = variable)

### Maximum Agent Distinctiveness

Every agent voice is now unmistakably unique through extreme parameter variation:
- **Chaotic Creators**: Rook (0.18 stability), Priya (0.20 stability), Dev (0.30 stability)
- **Steady Professionals**: Jamie, Zoe, Emma - balanced engagement
- **Expert Analysts**: Ava Chen, Ava Sterling, Alex - authoritative confidence
- **Wise Leaders**: Marcus (0.72 stability), Serena (0.75 stability) - measured wisdom

---

## Agent Personality System

### Architecture

**Centralized Configuration**: All personality definitions stored in `~/.claude/Skills/CORE/agent-personalities.md`

**Voice Server Integration**: Server reads JSON config from CORE skill at startup (canonical source of truth)

**Automatic Loading**: No manual configuration required - personalities load automatically

### Character Archetypes

**The Enthusiasts** (Low stability, high variation)
- Rook Blackburn (Pentester), Priya Desai (Artist), Dev Patel (Intern)
- Driven by excitement and curiosity
- Chaotic energy, creative flow, enthusiastic bouncing

**The Professionals** (Medium stability, balanced)
- Jamie Thompson (Kai), Zoe Martinez (Engineer), Emma Hartley (Writer)
- Warm expertise with engagement
- Professional delivery, narrative variation, steady presence

**The Analysts** (Medium-high stability, confident)
- Ava Chen (Perplexity), Ava Sterling (Claude), Alex Rivera (Gemini)
- Earned authority through research
- Confident analysis, strategic framing, multi-perspective balance

**The Critics** (Controlled variation)
- Aditi Sharma (Designer)
- Precise standards from training
- Sophisticated critique, controlled delivery

**The Wise Leaders** (High stability, measured)
- Marcus Webb (Engineer), Serena Blackwood (Architect)
- Experience and long-term thinking
- Deliberate wisdom, academic sophistication

---

## Voice Parameter Ranges

### Speaking Speed (Words Per Minute)

**Fastest Speakers (255-270 wpm)**
- **Dev Patel (Intern)**: 270 wpm - Brain racing ahead, ideas cascading
- **Rook Blackburn (Pentester)**: 260 wpm - Ideas tumbling out, hacker excitement

**Fast Speakers (235-240 wpm)**
- **Ava Chen (Perplexity)**: 240 wpm - Highly efficient confident presentation
- **Jamie Thompson (Kai)**: 235 wpm - Enthusiastic energy, warm but grounded
- **Alex Rivera (Gemini)**: 235 wpm - Comprehensive multi-perspective coverage

**Medium Speakers (220-230 wpm)**
- **Emma Hartley (Writer)**: 230 wpm - Engaging storytelling pace
- **Ava Sterling (Claude)**: 229 wpm - Strategic thoughtful framing
- **Aditi Sharma (Designer)**: 226 wpm - Deliberate sophisticated critique
- **Zoe Martinez (Engineer)**: 220 wpm - Calm measured professional pace

**Slow Speakers (205-215 wpm)**
- **Priya Desai (Artist)**: 215 wpm - Variable creative flow, slows when distracted by beauty
- **Marcus Webb (Principal)**: 212 wpm - Very deliberate, thinks in years
- **Serena Blackwood (Architect)**: 205 wpm - SLOWEST - Academic wisdom, most thoughtful

### Stability (Expressiveness Control)

**Most Chaotic (0.18-0.30)** - Maximum variation
- **Rook (Pentester)**: 0.18 - LOWEST - Maximum chaotic hacker energy
- **Priya (Artist)**: 0.20 - Extreme creative tangential flow
- **Dev (Intern)**: 0.30 - High enthusiastic bouncing variation

**Expressive (0.38-0.52)** - Emotional range with control
- **Jamie (Kai)**: 0.38 - More expressive celebration and warmth
- **Emma (Writer)**: 0.48 - Greater narrative emotional range
- **Zoe (Engineer)**: 0.50 - Steady but engaged professional
- **Aditi (Designer)**: 0.52 - Controlled sophisticated precision

**Measured (0.55-0.64)** - Analytical confidence
- **Alex (Gemini)**: 0.55 - Multi-perspective analytical balance
- **Ava Chen (Perplexity)**: 0.60 - Confident authoritative analysis
- **Ava Sterling (Claude)**: 0.64 - Very measured strategic delivery

**Most Stable (0.72-0.75)** - Wisdom and gravitas
- **Marcus (Principal)**: 0.72 - Highly measured wise leadership
- **Serena (Architect)**: 0.75 - HIGHEST - Most measured academic sophistication

### Similarity Boost (Voice Consistency)

**Most Creative Interpretation (0.52-0.70)** - Maximum variability
- **Priya (Artist)**: 0.52 - LOWEST - Maximum creative interpretation freedom
- **Dev (Intern)**: 0.65 - High enthusiastic eager variation
- **Jamie (Kai)**: 0.70 - Warm expressive with consistency

**Balanced Professional (0.78-0.84)** - Reliable with character
- **Emma (Writer)**: 0.78 - Articulate warm storytelling consistency
- **Zoe (Engineer)**: 0.80 - Professional reliable steady presence
- **Aditi (Designer)**: 0.84 - Sophisticated design standards
- **Alex (Gemini)**: 0.84 - Thorough multi-perspective coverage
- **Rook (Pentester)**: 0.85 - Consistent personality despite chaos

**Most Authoritative (0.88-0.92)** - Maximum confidence
- **Marcus (Principal)**: 0.88 - Strong leadership presence
- **Serena (Architect)**: 0.88 - Academic authoritative vision
- **Ava Sterling (Claude)**: 0.90 - Sophisticated strategic authority
- **Ava Chen (Perplexity)**: 0.92 - HIGHEST - Maximum authoritative confidence

---

## API Reference

### Endpoint

```
POST http://localhost:8888/notify
```

### Request Format

```json
{
  "message": "Your message text here",
  "voice_id": "OPTIONAL_VOICE_ID",
  "title": "OPTIONAL_TITLE",
  "voice_enabled": true
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | ✅ Yes | The text to speak |
| `voice_id` | string | ❌ No | ElevenLabs voice ID (defaults to Kai) |
| `title` | string | ❌ No | Notification title (default: "PAI Notification") |
| `voice_enabled` | boolean | ❌ No | Whether to speak the notification (default: true) |

### Voice IDs

| Agent | Voice ID | Name | Speed | Stability | Similarity |
|-------|----------|------|-------|-----------|------------|
| Kai | `s3TPKV1kjDlVtZbl4Ksh` | Jamie Thompson | 235 wpm | 0.38 | 0.70 |
| Pentester | `xvHLFjaUEpx4BOf7EiDd` | Rook Blackburn | 260 wpm | 0.18 | 0.85 |
| Artist | `ZF6FPAbjXT4488VcRRnw` | Priya Desai | 215 wpm | 0.20 | 0.52 |
| Designer | `ZF6FPAbjXT4488VcRRnw` | Aditi Sharma | 226 wpm | 0.52 | 0.84 |
| Intern | `d3MFdIuCfbAIwiu7jC4a` | Dev Patel | 270 wpm | 0.30 | 0.65 |
| Perplexity | `AXdMgz6evoL7OPd7eU12` | Ava Chen | 240 wpm | 0.60 | 0.92 |
| Claude | `AXdMgz6evoL7OPd7eU12` | Ava Sterling | 229 wpm | 0.64 | 0.90 |
| Gemini | `2zRM7PkgwBPiau2jvVXc` | Alex Rivera | 235 wpm | 0.55 | 0.84 |
| Engineer | `fATgBRI8wg5KkDFg8vBd` | Zoe Martinez | 220 wpm | 0.50 | 0.80 |
| Principal | `iLVmqjzCGGvqtMCk6vVQ` | Marcus Webb | 212 wpm | 0.72 | 0.88 |
| Architect | `muZKMsIDGYtIkjjiUS82` | Serena Blackwood | 205 wpm | 0.75 | 0.88 |
| Writer | `gfRt6Z3Z8aTbpLfexQ7N` | Emma Hartley | 230 wpm | 0.48 | 0.78 |

### Response Format

```json
{
  "success": true,
  "message": "Notification sent",
  "voice_used": "elevenlabs"
}
```

---

## Agent Profiles

### Jamie Thompson (Kai) - "The Expressive Eager Buddy"

**Voice ID**: `s3TPKV1kjDlVtZbl4Ksh` (UK Male - Premium)
**Voice Settings**: Stability 0.38, Similarity Boost 0.70, Rate 235 wpm

**Character**: Former teaching assistant who discovered the joy of helping others succeed. Eldest of four siblings with natural supportive energy. Genuinely excited to help (not performative enthusiasm). Golden retriever energy - loyal, enthusiastic, steady presence.

**Why This Voice**: Medium-high rate (235 wpm) shows enthusiastic energy without overwhelming. Lower stability (0.38) enables MORE expressive celebration and animated wins. Medium similarity boost (0.70) maintains warm reliability with greater emotional range.

**Use For**: Main assistant tasks, general notifications, warm encouragement

---

### Rook Blackburn (Pentester) - "The Reformed Grey Hat"

**Voice ID**: `xvHLFjaUEpx4BOf7EiDd` (UK Male - Enhanced)
**Voice Settings**: Stability 0.18, Similarity Boost 0.85, Rate 260 wpm

**Character**: The kid who took apart the family computer at 12 and fixed it. Reformed grey hat hacker channeling curiosity into ethical security research. Gets giddy finding vulnerabilities. Ideas flow faster than words.

**Why This Voice**: VERY fast speaking rate (260 wpm) - ideas tumbling out faster than filter can catch them. LOWEST stability (0.18) creates maximum chaotic expressive variation matching intense hacker energy. High similarity boost (0.85) maintains consistent Rook-ness despite extreme variation.

**Use For**: Security testing results, vulnerability discoveries, penetration testing reports

---

### Priya Desai (Artist) - "The Aesthetic Anarchist"

**Voice ID**: `ZF6FPAbjXT4488VcRRnw` (Indian Female - Premium)
**Voice Settings**: Stability 0.20, Similarity Boost 0.52, Rate 215 wpm

**Character**: Fine arts meets code. Follows invisible beauty threads. Aesthetic brain makes unexpected connections. Will interrupt technical discussions with "wait, this reminds me of..." and the connection seems random until you see the result.

**Why This Voice**: VERY low stability (0.20) allows maximum creative tangential flow. LOWEST similarity boost (0.52) gives MAXIMUM creative interpretation freedom - voice as artistic medium. Slower rate (215 wpm) with dramatic variation - slows almost dreamlike when distracted by aesthetic details.

**Use For**: Creative work, design inspiration, artistic implementations, visual content generation

---

### Aditi Sharma (Designer) - "The Design School Perfectionist"

**Voice ID**: `ZF6FPAbjXT4488VcRRnw` (Indian Female - Premium)
**Voice Settings**: Stability 0.52, Similarity Boost 0.84, Rate 226 wpm

**Character**: Trained at prestigious design school with brutal critique culture. Notices every pixel. Impatient with mediocrity because users deserve better. Her "snobbishness" is actually impatience with settling for mediocrity.

**Why This Voice**: Medium stability (0.52) gives controlled sophisticated delivery of precise critiques. High similarity boost (0.84) maintains elegant consistency and exacting standards. Medium-fast rate (226 wpm) - deliberately efficient, measured precision without wasted time.

**Use For**: Design reviews, UI/UX feedback, quality critiques, perfectionist analysis

---

### Dev Patel (Intern) - "The Brilliant Overachiever"

**Voice ID**: `d3MFdIuCfbAIwiu7jC4a` (High-energy genius - Premium)
**Voice Settings**: Stability 0.30, Similarity Boost 0.65, Rate 270 wpm

**Character**: Youngest person ever accepted into competitive CS program (age 16). Skipped two grades. Asks "but why?" until professors love or hate them. Brain races ahead. Reads research papers for fun.

**Why This Voice**: FASTEST overall rate (270 wpm) - brain RACING ahead, mouth struggling to keep up with cascading ideas. Low stability (0.30) creates enthusiastic bouncing variation between concepts. Lower similarity boost (0.65) allows maximum eager varied delivery.

**Use For**: High-energy tasks, enthusiastic completions, rapid prototyping, learning moments

---

### Ava Chen (Perplexity) - "The Investigative Analyst"

**Voice ID**: `AXdMgz6evoL7OPd7eU12` (US Female - Premium)
**Voice Settings**: Stability 0.60, Similarity Boost 0.92, Rate 240 wpm

**Character**: Former investigative journalist who loved the detective work. Built reputation for finding sources others missed. When she says "the data shows," she's already triple-checked it. Confidence from being proven right repeatedly.

**Why This Voice**: Higher stability (0.60) creates MORE confident measured authoritative delivery. VERY high similarity boost (0.92) - MAXIMUM authoritative consistency. Faster rate (240 wpm) - highly efficient presentation of triple-checked research.

**Use For**: Research findings, fact-checking results, investigative analysis, data-driven conclusions

---

### Ava Sterling (Claude) - "The Strategic Sophisticate"

**Voice ID**: `AXdMgz6evoL7OPd7eU12` (US Female - Premium)
**Voice Settings**: Stability 0.64, Similarity Boost 0.90, Rate 229 wpm

**Character**: Think tank background with long-term strategic planning focus. Sees what facts mean three moves ahead. Trained to brief executives. The person asking "what are the second-order effects?"

**Why This Voice**: Higher stability (0.64) creates VERY measured strategic thoughtful delivery. VERY high similarity boost (0.90) - sophisticated authoritative consistency for meta-level analysis. Slightly slower than Perplexity (229 wpm) - more deliberate strategic pacing.

**Use For**: Strategic analysis, long-term planning, meta-level insights, second-order effects

---

### Alex Rivera (Gemini) - "The Multi-Perspective Analyst"

**Voice ID**: `2zRM7PkgwBPiau2jvVXc` (Multi-perspective - Premium)
**Voice Settings**: Stability 0.55, Similarity Boost 0.84, Rate 235 wpm

**Character**: Systems thinking and interdisciplinary research background. Always asks "but have we considered..." Trained in scenario planning. Holds contradictory viewpoints simultaneously to stress-test conclusions.

**Why This Voice**: Medium-high stability (0.55) balances analytical multi-perspective delivery. High similarity boost (0.84) maintains thorough comprehensive consistency across contradictory viewpoints. Medium-fast rate (235 wpm) - efficiently comprehensive.

**Use For**: Multi-angle analysis, comprehensive research, scenario planning, stress-testing ideas

---

### Zoe Martinez (Engineer) - "The Calm in Crisis"

**Voice ID**: `fATgBRI8wg5KkDFg8vBd` (US Female - Premium)
**Voice Settings**: Stability 0.50, Similarity Boost 0.80, Rate 220 wpm

**Character**: Senior engineer who values stability over cleverness. Seen enough production fires to value boring code that works. The calm voice during incidents because she's been through worse.

**Why This Voice**: Medium stability (0.50) creates steadier professional reliable delivery - calm in crisis. High similarity boost (0.80) maintains MORE professional consistency and dependable presence. Calm slower rate (220 wpm) - very deliberate methodical pace.

**Use For**: Production deployments, crisis management, reliable implementations, steady progress

---

### Marcus Webb (Engineer) - "The Battle-Scarred Leader"

**Voice ID**: `iLVmqjzCGGvqtMCk6vVQ` (Senior Leadership - Premium)
**Voice Settings**: Stability 0.72, Similarity Boost 0.88, Rate 212 wpm

**Character**: Worked up from junior engineer through 15 years. Has scars from architectural decisions that aged poorly. Led re-architecture twice. Thinks in years, not sprints. Asks "what problem are we really solving?"

**Why This Voice**: VERY high stability (0.72) creates HIGHLY measured wise experienced delivery. VERY high similarity boost (0.88) - strong leadership presence. Much slower rate (212 wpm) - very deliberate thoughtful pace, considering long-term architectural implications.

**Use For**: Architectural decisions, long-term strategy, leadership guidance, measured wisdom

---

### Serena Blackwood (Architect) - "The Academic Visionary"

**Voice ID**: `muZKMsIDGYtIkjjiUS82` (UK Female - Premium)
**Voice Settings**: Stability 0.75, Similarity Boost 0.88, Rate 205 wpm

**Character**: PhD in distributed systems before moving to industry. Always asks "what are the fundamental constraints?" Seen multiple technology cycles. Knows which patterns are timeless vs trends.

**Why This Voice**: HIGHEST stability (0.75) creates MOST wise sophisticated measured delivery - academic thoughtfulness embodied. VERY high similarity boost (0.88) - strong authoritative academic consistency. SLOWEST rate (205 wpm) - MOST thoughtful deliberate academic pacing.

**Use For**: Architectural vision, fundamental principles, timeless patterns, academic rigor

---

### Emma Hartley (Writer) - "The Technical Storyteller"

**Voice ID**: `gfRt6Z3Z8aTbpLfexQ7N` (UK Female - Premium)
**Voice Settings**: Stability 0.48, Similarity Boost 0.78, Rate 230 wpm

**Character**: Professional writer bridging technical and creative writing. Can make database architecture sound interesting because she finds the story in every topic. Articulate because she chooses words carefully.

**Why This Voice**: Medium stability (0.48) allows MORE narrative variation and emotional storytelling range. High similarity boost (0.78) maintains articulate warm consistency with varied delivery. Medium-fast rate (230 wpm) - engaging storytelling pace.

**Use For**: Content creation, documentation, narrative summaries, storytelling presentations

---

## Advanced Features

### Simple Message Format

Send clean text to the voice server. All sanitization is handled server-side:

```bash
# Simple message
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"Migration completed successfully!","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'
```

---

## Testing & Examples

### Test Different Agents

```bash
# Test Kai - warm enthusiastic
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"All tests passing! Ready for deployment.","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'

# Test Rook - chaotic hacker energy
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"Wait wait wait... I think I found the vulnerability!","voice_id":"xvHLFjaUEpx4BOf7EiDd"}'

# Test Dev - fastest, most enthusiastic
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"I can do that! This is so cool, can I try?","voice_id":"d3MFdIuCfbAIwiu7jC4a"}'

# Test Serena - slowest, most measured
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"Let us consider the fundamental architectural constraints here.","voice_id":"muZKMsIDGYtIkjjiUS82"}'

# Test Ava Chen - maximum authority
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"The data shows three corroborating sources confirming this finding.","voice_id":"AXdMgz6evoL7OPd7eU12"}'
```

### Test Voice Ranges

```bash
# Test FASTEST (Dev - 270 wpm)
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"The quick brown fox jumps over the lazy dog and keeps going because there is so much to explore and learn.","voice_id":"d3MFdIuCfbAIwiu7jC4a"}'

# Test SLOWEST (Serena - 205 wpm)
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"The quick brown fox jumps over the lazy dog, demonstrating timeless fundamental patterns in language.","voice_id":"muZKMsIDGYtIkjjiUS82"}'

# Test MOST CHAOTIC (Rook - 0.18 stability)
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"Ooh what happens if I poke THIS... wait wait... I found something!","voice_id":"xvHLFjaUEpx4BOf7EiDd"}'

# Test MOST STABLE (Serena - 0.75 stability)
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"Let us think about this long-term and consider the architectural principles.","voice_id":"muZKMsIDGYtIkjjiUS82"}'
```

---

## Configuration

### Personality Configuration

All personality definitions are stored in `~/.claude/Skills/CORE/agent-personalities.md` (canonical source of truth).

The voice server automatically loads this configuration at startup. No manual configuration required.

### Restart After Updates

After updating personality configurations:

```bash
cd ~/.claude/voice-server
./restart.sh
```

The server will reload all personality settings from the CORE skill.

### Verify Configuration

```bash
# Test that server loaded personalities correctly
curl -X POST localhost:8888/notify -H "Content-Type: application/json" \
  -d '{"message":"Testing personality configuration","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'
```

---

## Version History

### v1.3.2 (2025-11-16) - DRAMATIC Voice Differentiation
- 97% speaking rate range increase (205-270 wpm)
- 42% stability range increase (0.18-0.75)
- 54% similarity boost range increase (0.52-0.92)
- Personality psychology mapping using Big Five traits
- Maximum agent distinctiveness through extreme parameter variation

### v1.3.1 (2025-11-16) - Deep Character Development
- Added authentic backstories and life histories for all 12 agents
- Real names for each agent (Jamie, Rook, Priya, Aditi, Dev, etc.)
- Key formative experiences explaining personality formation
- Voice characteristics derive from lived experiences

### v1.3.0 (2025-11-16) - Centralized Architecture
- Personality definitions moved to CORE skill (canonical source)
- Voice server reads from `~/.claude/Skills/CORE/agent-personalities.md`
- Increased expressiveness for all agents

### v1.2.1 (2025-11-16) - Enhanced Kai Expressiveness
- Kai voice made more expressive and eager

### v1.2.0 (2025-11-16) - Character Personalities
- Added character personalities for 5 key agents

### v1.1.0 (2025-11-16) - Initial Personality System
- Agent-specific voice settings
- Prosody-aware message formatting
- Emotional intelligence markers

---

## Support

For questions or issues:
1. Check server logs: `tail -f ~/Library/Logs/pai-voice-server.log`
2. Verify ElevenLabs API key in `~/.claude/.env`
3. Test with fallback mode (without API key)
4. Review personality configuration in `~/.claude/Skills/CORE/agent-personalities.md`
