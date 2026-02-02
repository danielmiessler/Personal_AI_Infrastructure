# CustomPipeline Workflow

Execute a user-defined skill sequence for dynamic multi-skill orchestration.

**Pipeline:** Dynamically composed from user specification

---

## Voice Notification

**MANDATORY - Execute immediately:**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the CustomPipeline workflow in the WisdomSynthesis skill for dynamic skill orchestration"}' \
  > /dev/null 2>&1 &
```

**Text notification:**
```
Running the **CustomPipeline** workflow in the **WisdomSynthesis** skill for dynamic skill orchestration...
```

---

## Workflow Steps

### Step 0: Parse User's Skill Sequence

Extract the requested skill chain from user input:

| User Says | Skill Chain |
|-----------|-------------|
| "Chain Research, Fabric, Council" | Research → Fabric → Council |
| "Orchestrate: Research → RedTeam → FirstPrinciples" | Research → RedTeam → FirstPrinciples |
| "Custom pipeline: [skill1], [skill2], [skill3]" | skill1 → skill2 → skill3 |
| "Run Research then analyze with Fabric pattern X then Council debate" | Research → Fabric(pattern X) → Council |

**Validation:**
1. Verify each skill exists in PAI
2. Check skills have required capabilities
3. Confirm data handoff is possible
4. Warn about incompatible combinations

### Step 1: Skill Sequence Validation

```typescript
// Validate skill availability
const requestedSkills = ["Research", "Fabric", "Council"];  // Example
const availableSkills = readFileSync("~/.claude/skills/skill-index.json");

for (const skill of requestedSkills) {
  if (!availableSkills.includes(skill)) {
    console.error(`❌ Skill '${skill}' not found. Available skills:`);
    console.error(availableSkills.map(s => `  - ${s}`).join('\n'));
    process.exit(1);
  }
}

// Validate skill compatibility
const compatibilityWarnings = [];

if (requestedSkills.includes("BeCreative") && requestedSkills.length > 3) {
  compatibilityWarnings.push("⚠️ BeCreative is slow - pipeline may take 90+ seconds");
}

if (requestedSkills.includes("Research") && requestedSkills.includes("OSINT")) {
  compatibilityWarnings.push("⚠️ Research and OSINT overlap - consider using one");
}

if (compatibilityWarnings.length > 0) {
  console.warn(compatibilityWarnings.join('\n'));
  console.warn('\nContinue anyway? [Y/N]');
}
```

### Step 2: Dynamic Pipeline Execution

Execute each skill in sequence, passing output from one to the next:

```typescript
let pipelineData = {
  input: userProvidedContent,  // Initial input
  results: [],
  metadata: {
    startTime: Date.now(),
    skillChain: requestedSkills
  }
};

// Execute skill chain
for (let i = 0; i < requestedSkills.length; i++) {
  const skill = requestedSkills[i];
  const skillInput = i === 0 ? pipelineData.input : pipelineData.results[i - 1].output;

  console.log(`\n📍 Step ${i + 1}/${requestedSkills.length}: ${skill}`);

  const result = await executeSkill(skill, skillInput, pipelineData);

  pipelineData.results.push({
    skill: skill,
    output: result,
    timestamp: Date.now()
  });
}
```

### Step 3: Skill-Specific Execution

**Research Skill:**
```typescript
Task({
  subagent_type: "ClaudeResearcher",
  description: "Research phase",
  prompt: `Research this topic: ${input}

  Focus on comprehensive information gathering.
  Return findings with sources.`,
  model: "sonnet"
})
```

**Fabric Skill:**
```typescript
// Extract pattern from user specification
const pattern = extractPattern(userInput) || "extract_wisdom";

Task({
  subagent_type: "general-purpose",
  description: `Fabric ${pattern} execution`,
  prompt: `Using Fabric pattern '${pattern}', analyze:

  ${input}

  Apply pattern instructions and return structured output.`,
  model: "sonnet"
})
```

**FirstPrinciples Skill:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "First principles decomposition",
  prompt: `Decompose to first principles:

  ${input}

  Identify fundamental axioms and building blocks.
  Return structured analysis.`,
  model: "sonnet"
})
```

**Council Skill:**
```typescript
// Extract perspectives from user specification or use defaults
const perspectives = extractPerspectives(userInput) || [
  "optimist", "skeptic", "pragmatist", "expert"
];

Task({
  subagent_type: "general-purpose",
  description: "Council multi-perspective debate",
  prompt: `Invoke Council skill with perspectives: ${perspectives.join(', ')}

  Topic: ${input}

  Return synthesized debate outcomes.`,
  model: "sonnet"
})
```

**RedTeam Skill:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "RedTeam adversarial critique",
  prompt: `Invoke RedTeam skill to critique:

  ${input}

  Challenge assumptions and find weaknesses.
  Return critical analysis.`,
  model: "sonnet"
})
```

**BeCreative Skill:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "Deep creative synthesis",
  prompt: `Invoke BeCreative skill for deep synthesis:

  ${input}

  Use extended reasoning to generate insights.
  Return comprehensive synthesis.`,
  model: "opus"
})
```

**OSINT Skill:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "OSINT investigation",
  prompt: `Invoke OSINT skill to investigate:

  ${input}

  Gather open-source intelligence.
  Return findings with source verification.`,
  model: "sonnet"
})
```

### Step 4: Generate Pipeline Report

Synthesize results from all skills:

**Report Structure:**

```markdown
# Custom Pipeline Report

**Pipeline**: ${skillChain.join(' → ')}
**Execution Time**: ${totalTime}
**Input**: ${originalInput}

---

## Pipeline Overview

### Skill Chain
1. **${skill1}** - ${purpose1}
2. **${skill2}** - ${purpose2}
3. **${skill3}** - ${purpose3}

### Data Flow
```mermaid
graph LR
    Input[User Input] --> Skill1[${skill1}]
    Skill1 --> Skill2[${skill2}]
    Skill2 --> Skill3[${skill3}]
    Skill3 --> Output[Final Synthesis]
```

---

## Step 1: ${Skill1}

### Input
${input1}

### Output
${output1}

### Execution Time
${time1}

### Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

---

## Step 2: ${Skill2}

### Input
${input2} *(from ${skill1})*

### Output
${output2}

### Execution Time
${time2}

### Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

---

## Step 3: ${Skill3}

### Input
${input3} *(from ${skill2})*

### Output
${output3}

### Execution Time
${time3}

### Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

---

## Synthesis Across Steps

### Emergent Insights
[Insights that only become visible by combining all steps]

### Contradictions or Tensions
[Where different skills produced conflicting outputs]

### Confidence Assessment
| Skill | Output Quality | Confidence |
|-------|---------------|------------|
| ${skill1} | [assessment] | [High/Med/Low] |
| ${skill2} | [assessment] | [High/Med/Low] |
| ${skill3} | [assessment] | [High/Med/Low] |

### Information Gain by Layer
```
Layer 1 (${skill1}): ${informationGain1}
Layer 2 (${skill2}): ${informationGain2}
Layer 3 (${skill3}): ${informationGain3}
```

---

## Final Synthesis

### The Big Picture
[Comprehensive understanding from all pipeline steps]

### Actionable Insights
1. [Actionable insight 1]
2. [Actionable insight 2]
3. [Actionable insight 3]

### Recommended Next Steps
- [Next step 1]
- [Next step 2]

---

## Pipeline Performance

### Execution Stats
- **Total Time**: ${totalTime}
- **Skills Executed**: ${skillCount}
- **Average Time per Skill**: ${avgTime}
- **Token Estimate**: ${tokenEstimate}

### Bottlenecks
[Which skills took longest and why]

### Optimization Suggestions
[How to make this pipeline faster if needed]

---

## Meta-Analysis

### Pipeline Effectiveness
- **Information Quality**: [assessment]
- **Skill Synergy**: [how well skills complemented each other]
- **Data Handoff Quality**: [how well output→input worked]

### Recommended Modifications
[Suggested changes to improve this pipeline]

### Reusable Pipeline?
[Should this become a pre-built pipeline?]

---

*Generated by WisdomSynthesis CustomPipeline v1.0.0*
*Skill Chain: ${skillChain.join(' → ')}*
*Total Execution Time: ${totalTime}*
```

---

## Common Pipeline Patterns

### Pattern 1: Deep Content Analysis
**Chain**: Research → Fabric → FirstPrinciples
**Use for**: Articles, papers, documentation
**Time**: ~30-45s

### Pattern 2: Security Analysis
**Chain**: Research → Fabric(threat_model) → RedTeam
**Use for**: Security assessments, vulnerability analysis
**Time**: ~45-60s

### Pattern 3: Controversial Topic
**Chain**: Research → Council → RedTeam → FirstPrinciples
**Use for**: Nuanced debates, multi-perspective analysis
**Time**: ~60-90s

### Pattern 4: Creative Synthesis
**Chain**: Research → Fabric → BeCreative
**Use for**: Novel insights, creative connections
**Time**: ~45-60s

### Pattern 5: Comprehensive Investigation
**Chain**: OSINT → Research → Fabric → Council
**Use for**: Due diligence, comprehensive background
**Time**: ~60-90s

### Pattern 6: Product Evaluation
**Chain**: Research → Fabric(analyze_product) → Council → RedTeam
**Use for**: Technology decisions, vendor evaluation
**Time**: ~45-60s

### Pattern 7: Learning Path
**Chain**: Research → Fabric(extract_wisdom) → FirstPrinciples → Council
**Use for**: Mastering new topics
**Time**: ~60s

---

## Advanced Features

### Conditional Branching
```
User: "Research, then if controversial use Council, else use Fabric"

→ Research phase
→ Analyze output for controversy markers
→ Branch to Council OR Fabric based on analysis
```

### Parallel Execution
```
User: "Research, then run Fabric AND RedTeam in parallel, then synthesize"

→ Research phase
→ Launch Fabric + RedTeam simultaneously
→ Wait for both
→ Synthesize combined outputs
```

### Iterative Refinement
```
User: "Research, Fabric, then iterate FirstPrinciples until depth reached"

→ Research
→ Fabric extraction
→ FirstPrinciples decomposition (depth 1)
→ Check: foundational enough?
  → No: Run FirstPrinciples again on output (depth 2)
  → Yes: Complete
```

### Parameter Passing
```
User: "Research with extensive mode, Fabric with pattern=analyze_claims, Council with 6 perspectives"

→ Research(mode: extensive, agents: 12)
→ Fabric(pattern: analyze_claims)
→ Council(perspectives: 6 custom perspectives)
```

---

## Error Handling

### Skill Not Found
```
❌ Error: Skill 'XYZ' not found in PAI

Available skills:
  - Research
  - Fabric
  - FirstPrinciples
  - Council
  - RedTeam
  - BeCreative
  - OSINT
  [... list all available skills]

Did you mean: [closest match]?
```

### Data Handoff Failure
```
⚠️ Warning: ${skill2} received unexpected input format from ${skill1}

Expected: [format description]
Received: [actual format]

Attempting automatic conversion...
[Success/Failure]
```

### Skill Timeout
```
⚠️ Timeout: ${skill} exceeded time limit (120s)

Options:
1. Accept partial output
2. Retry with extended timeout
3. Skip this skill and continue pipeline
4. Abort entire pipeline

Selection: [user choice]
```

### Pipeline Too Long
```
⚠️ Warning: Pipeline has ${skillCount} skills (estimated time: ${estimatedTime}s)

Recommendations:
- Consider pre-built pipelines for common patterns
- Use parallel execution where possible
- Split into multiple pipeline runs

Continue anyway? [Y/N]
```

---

## Performance Notes

**Time estimates:**
- Research: ~10-15s (standard), ~20-30s (extensive)
- Fabric: ~10-15s
- FirstPrinciples: ~10-15s (sonnet), ~15-20s (opus)
- Council: ~15-20s
- RedTeam: ~15-20s
- BeCreative: ~20-30s (sonnet), ~30-45s (opus)
- OSINT: ~15-30s

**Model selection:**
- Default: `sonnet` for all skills
- Fast mode: `haiku` for Research only
- Quality mode: `opus` for FirstPrinciples, BeCreative

---

## Examples

**Example 1: Quick custom analysis**
```
User: "Chain Research and Fabric extract_wisdom on AI safety"

→ Research: Gather AI safety information
→ Fabric: Extract structured wisdom
→ Output: 2-layer synthesis in ~25s
```

**Example 2: Multi-layer investigation**
```
User: "Orchestrate: OSINT → Research → Fabric analyze_claims → RedTeam"

→ OSINT: Gather open-source intelligence
→ Research: Comprehensive background
→ Fabric: Analyze specific claims
→ RedTeam: Challenge findings
→ Output: 4-layer critical analysis in ~60s
```

**Example 3: Creative synthesis**
```
User: "Custom pipeline: Research extensive, Fabric extract_insights, BeCreative"

→ Research: 12 parallel agents for max coverage
→ Fabric: Extract key insights
→ BeCreative: Deep creative synthesis
→ Output: Novel connections and insights in ~75s
```

**Example 4: Balanced perspective**
```
User: "Run Research then Council with 8 perspectives then FirstPrinciples"

→ Research: Gather comprehensive information
→ Council: 8-agent multi-perspective debate
→ FirstPrinciples: Strip to core values
→ Output: Nuanced balanced analysis in ~50s
```

---

## Saving Custom Pipelines

If you find yourself using the same custom pipeline repeatedly, you can save it:

1. **Add to USER customizations:**
```yaml
# ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/WisdomSynthesis/Pipelines.yaml

pipelines:
  my_custom_analysis:
    name: "My Custom Analysis"
    steps:
      - skill: Research
        mode: standard
      - skill: Fabric
        pattern: extract_wisdom
      - skill: Council
        perspectives: 4
```

2. **Use with standard invocation:**
```
User: "Run my_custom_analysis on [topic]"
→ Executes saved pipeline
```

---

## Integration Notes

**Compatible with all PAI skills:**
- Research (quick/standard/extensive)
- Fabric (240+ patterns)
- FirstPrinciples
- Council
- RedTeam
- BeCreative
- OSINT
- PromptInjection
- WebAssessment
- [All 33 PAI skills]

**Output formats:**
- Markdown report (default)
- JSON (structured data)
- Plain text (for further processing)

**Future enhancements:**
- Pipeline visualization (Mermaid diagrams)
- Performance profiling
- Automatic optimization suggestions
- Pipeline library and sharing
