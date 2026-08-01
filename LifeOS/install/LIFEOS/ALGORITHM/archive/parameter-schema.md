## Algorithm Parameter Schema

Canonical reference for the tunable parameter system. Referenced by the Algorithm, CLI, ideate-loop, optimize-loop, and Observatory.

### Architecture: Three Layers

```
Layer 1: Preset (optional)     → named config, resolves to Layer 2+3 values
Layer 2: Focus (optional)      → single 0.0-1.0 composite, maps to Layer 3
Layer 3: Individual parameters → the actual behavioral controls
```

**Resolution order:** Preset → Focus → Individual overrides → Meta-Learner adjustments

Each layer overrides the previous. The final resolved values are written to ISA `algorithm_config.params`.

---

### Ideation Parameters

| Parameter | Range | Default | Meta-Learner | Concrete Effect |
|-----------|-------|---------|-------------|-----------------|
| `problemConnection` | 0.0–1.0 | 0.5 | Yes | How tightly ideas must connect to the problem statement |
| `selectionPressure` | 0.0–1.0 | 0.5 | Yes | How aggressively weak ideas are culled in EVOLVE |
| `domainDiversity` | 0.0–1.0 | 0.5 | Yes | How different source domains can be from the problem domain |
| `phaseBalance` | 0.0–1.0 | 0.5 | Yes | Balance between generative (0.0) and analytical (1.0) phases |
| `ideaVolume` | 3–50 | 12 | Yes | Ideas generated per cycle before selection |
| `mutationRate` | 0.0–1.0 | 0.4 | Yes | How much ideas can mutate between generations |
| `generativeTemperature` | 0.0–1.0 | 0.5 | Yes | Wildness of DREAM/DAYDREAM phases |
| `maxCycles` | 1–20 | 3 | Yes* | Evolutionary cycles before completing |

**Behavioral tiers** (LLMs respond to qualitative bands, not continuous floats):

**problemConnection:**
- 0.0–0.2: "Explore tangential and unrelated domains freely. Connection to the problem can be discovered later or never."
- 0.3–0.5: "Explore adjacent and surprising angles. Stay in the general problem space."
- 0.6–0.8: "Stay focused on the problem but explore unconventional solutions."
- 0.9–1.0: "Every idea must be a direct, viable solution attempt."

**selectionPressure:**
- 0.0–0.2: "Preserve every idea regardless of apparent quality — hidden value may emerge later."
- 0.3–0.5: "Remove only clearly unworkable ideas, err on the side of keeping. Keep ~70%."
- 0.6–0.8: "Evaluate against fitness criteria, remove bottom half. Keep ~40%."
- 0.9–1.0: "Only the strongest ideas survive. Apply strict evaluation and cull aggressively. Keep top ~15%."

**domainDiversity:**
- 0.0–0.2: "Draw inspiration only from the same industry and adjacent technical domains."
- 0.3–0.5: "Include analogies from related industries and different scales of the same problem."
- 0.6–0.8: "Draw from biology, art, game design, economics, and other distant domains."
- 0.9–1.0: "The more unrelated the source domain, the better. Seek inspiration from dreams, mythology, particle physics, cooking, dance."

**phaseBalance:**
- 0.0–0.2: 80% of cycle budget to DREAM/DAYDREAM/STEAL/MATE, 20% to CONSUME/CONTEMPLATE/TEST/EVOLVE
- 0.3–0.5: 60/40 generative/analytical split
- 0.5: Equal allocation
- 0.6–0.8: 40/60 generative/analytical split
- 0.9–1.0: 20/80 generative/analytical. Heavy evaluation, brief generation.

**generativeTemperature:**
- 0.0–0.2: "Generate practical, grounded ideas. Prefer proven patterns and conventional approaches."
- 0.3–0.5: "Balance novelty with plausibility. Some should surprise, none should be impossible."
- 0.6–0.8: "Generate bold, provocative ideas. Embrace the strange. Include ideas that make you uncomfortable."
- 0.9–1.0: "Free-associate wildly. Dream. What if physics worked differently? What would an alien civilization do? Ignore all constraints temporarily."

**mutationRate:**
- 0.0–0.2: "Make only incremental improvements to surviving ideas — preserve their core identity."
- 0.3–0.5: "Ideas can be meaningfully modified, combined, or reframed while retaining recognizable lineage."
- 0.6–0.8: "Ideas can be radically reinterpreted, merged into hybrids, or have their assumptions inverted."
- 0.9–1.0: "Treat surviving ideas as raw material. Deconstruct, invert, blend, or metamorphose them freely."

---

### Optimize Parameters

| Parameter | Range | Default | Meta-Learner | Concrete Effect |
|-----------|-------|---------|-------------|-----------------|
| `stepSize` | 0.0–1.0 | 0.3 | No | How large a change per optimization step |
| `regressionTolerance` | 0.0–1.0 | 0.1 | No | Willingness to accept temporary regression |
| `earlyStopPatience` | 1–20 | 3 | No | Consecutive no-improvement iterations before stopping |
| `maxIterations` | 1–100 | 10 | No | Maximum optimization iterations |

**stepSize behavioral tiers:**
- 0.0–0.3: "Propose only small, safe changes. Adjust one variable at a time. Minimize blast radius."
- 0.4–0.6: "Propose moderate changes. May touch 2-3 related variables."
- 0.7–1.0: "Propose structural changes. Rethink entire subsystems."

**regressionTolerance behavioral tiers:**
- 0.0: "Only accept changes where MEASURE shows improvement. Roll back any regression."
- 0.1–0.3: "Accept minor regressions (< 5%) if the hypothesis addresses a structural limitation."
- 0.4–0.7: "Accept moderate regressions. Give new approaches 2-3 iterations to prove out."
- 0.8–1.0: "Freely explore. Regression is acceptable to escape local optima."

---

### Cross-Mode Parameters

| Parameter | Range | Default | Meta-Learner | Concrete Effect |
|-----------|-------|---------|-------------|-----------------|
| `contextCarryover` | 0.0–1.0 | 0.6 | Yes (ideate) | How much context from previous cycles to carry forward |
| `parallelAgents` | 1–8 | 1 | No | Parallel agents for independent workstreams |

---

### Focus Mapping (Ideation Composite)

The `focus` parameter (0.0–1.0) maps to all ideation parameters via linear interpolation:

| Parameter | focus=0.0 (Dream) | focus=0.5 (Balanced) | focus=1.0 (Laser) |
|-----------|-------------------|---------------------|-------------------|
| problemConnection | 0.05 | 0.50 | 0.95 |
| selectionPressure | 0.10 | 0.50 | 0.90 |
| domainDiversity | 0.90 | 0.50 | 0.10 |
| phaseBalance | 0.15 | 0.50 | 0.85 |
| ideaVolume | 40 | 22 | 5 |
| mutationRate | 0.80 | 0.45 | 0.10 |
| generativeTemperature | 0.90 | 0.50 | 0.10 |
| contextCarryover | 0.30 | 0.55 | 0.80 |

**Formula:** `value = at_focus_0 + (at_focus_1 - at_focus_0) × focus`

---

### Named Presets

#### Ideation Presets

| Preset | Focus | Description | Key Overrides |
|--------|-------|-------------|---------------|
| `dream` | 0.05 | Pure creative exploration. No constraints, maximum wildness. "Wouldn't it be cool if..." | maxCycles: 5, parallelAgents: 2 |
| `explore` | 0.25 | Broad exploration with gentle guidance. Good default for open-ended brainstorming. | maxCycles: 4 |
| `balanced` | 0.50 | Equal weight to generation and evaluation. Default when not sure. | (none) |
| `directed` | 0.75 | Problem-focused ideation. Must address stated problem. Moderately strict. | maxCycles: 3 |
| `surgical` | 0.95 | Maximum analytical focus. Every idea is a direct solution attempt. | maxCycles: 2, ideaVolume: 4 |

#### Hybrid Ideation Presets

| Preset | Focus | Description | Key Overrides |
|--------|-------|-------------|---------------|
| `wild-but-picky` | 0.15 | Dream wildly, select ruthlessly. "Surprise me, but it has to work." | selectionPressure: 0.85, maxCycles: 5 |
| `focused-but-diverse` | 0.70 | Stay on-problem but draw from wildly diverse domains. | domainDiversity: 0.85 |

#### Optimize Presets

| Preset | Description | stepSize | regressionTolerance | earlyStopPatience | maxIterations |
|--------|-------------|----------|--------------------|--------------------|---------------|
| `cautious` | Small steps, no regression. For production systems. | 0.15 | 0.0 | 5 | 20 |
| `standard-optimize` | Default. Moderate step size, minimal regression. | 0.3 | 0.1 | 3 | 10 |
| `aggressive` | Large steps, accepts regression. For prototypes. | 0.7 | 0.5 | 2 | 15 |

---

### Parameter Interaction Rules

**Reinforcing pairs** (same direction amplifies):
- `generativeTemperature` + `domainDiversity` — both high = extremely wild from diverse sources
- `selectionPressure` + `problemConnection` — both high = only practical on-target ideas survive
- `mutationRate` + `generativeTemperature` — both high = rapid evolutionary speed

**Tension pairs** (useful conflicts):
- `generativeTemperature` ↑ + `selectionPressure` ↑ — dream wildly, select ruthlessly (wild-but-picky)
- `domainDiversity` ↑ + `problemConnection` ↑ — diverse sources but stay on-problem (forces creative analogies)
- `mutationRate` ↑ + `contextCarryover` ↑ — radical change but full memory (informed metamorphosis)

**Anti-patterns** (waste cycles):
- `ideaVolume` ↑ + `selectionPressure` ↓ + `maxCycles` ↑ — idea pool explodes unbounded. Require selectionPressure ≥ 0.4 if ideaVolume > 20 and maxCycles > 5.
- `generativeTemperature` ↓ + `domainDiversity` ↓ + `mutationRate` ↓ — everything conventional and static. Suggest maxCycles: 1.
- `contextCarryover` ↑ + `maxCycles` ↑ + `ideaVolume` ↑ — context window overflow risk.

---

### Meta-Learner Interaction Model

The Meta-Learner (Ideate Phase 9) adjusts parameters within bounds:

1. **User-set parameters define INITIAL STATE and BOUNDS**
2. **Meta-Learner adjusts WITHIN bounds during execution**
3. **Locked parameters cannot be adjusted**
4. **All adjustments logged with rationale**

**Default locked params:** `parallelAgents`, `maxCycles`, `maxIterations`, `targetMetric`
**Auto-locked:** Any parameter the user explicitly set via `--param` override

**Safeguards:**
- Max adjustment per cycle: 15% of parameter range
- Max cumulative drift from initial value: 40% of range
- Rationale required for every adjustment

**Config structure:**
```yaml
meta_learner:
  locked_params: [parallelAgents, maxCycles]
  max_adjustment_per_cycle: 0.15
  max_cumulative_drift: 0.40
```

---

### ISA Frontmatter Serialization

```yaml
algorithm_config:
  preset: explore                    # Layer 1 (optional)
  focus: 0.25                        # Layer 2 (optional, ideate only)
  params:                            # Layer 3 (resolved values)
    problemConnection: 0.28
    selectionPressure: 0.30
    domainDiversity: 0.74
    phaseBalance: 0.33
    ideaVolume: 31
    mutationRate: 0.63
    maxCycles: 4
    generativeTemperature: 0.74
    contextCarryover: 0.43
    parallelAgents: 1
  locked_params: [parallelAgents]
  user_overrides: []                 # Params user explicitly set
  meta_learner_adjustments:          # History of changes
    - cycle: 2
      parameter: selectionPressure
      from: 0.30
      to: 0.45
      rationale: "Ideas converging too slowly"
```

---

### CLI Integration

```bash
# Presets
algorithm -m ideate -p ISA --preset dream
algorithm -m ideate -p ISA --preset wild-but-picky
algorithm -m optimize -p ISA --preset aggressive

# Focus dial
algorithm -m ideate -p ISA --focus 0.2

# Individual overrides (repeatable)
algorithm -m ideate -p ISA --focus 0.2 --param selectionPressure=0.9
algorithm -m optimize -p ISA --param stepSize=0.8 --param regressionTolerance=0.3

# Preset + override
algorithm -m ideate -p ISA --preset explore --param generativeTemperature=0.9
```

**Flag precedence:** `--param` > `--preset` overrides > `--focus` mapping > mode defaults
