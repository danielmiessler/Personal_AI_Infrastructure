---
description: Comprehensive research workflow with reliability features (validation, confidence scoring, auto-save, logging, templates)
globs: ""
alwaysApply: false
---

# 🔬 ENHANCED RESEARCH WORKFLOW (with Reliability Features)

**NEW:** This workflow extends the standard research workflow with 5 reliability features:
- ✅ **3-Gate Validation** - Source citations, confidence thresholds, contradiction detection
- 🎯 **Confidence Scoring** - Transparent 4-factor scoring (sources, count, agreement, specificity)
- 💾 **Autonomous Completion** - Auto-save safe tasks, require review for risky ones
- 📝 **Structured Logging** - JSON execution logs for debugging and analysis
- 📚 **Workflow Templates** - Save and reuse successful research patterns

## 🚀 QUICK START

**When to use this workflow:**
- Research tasks requiring high reliability
- Results that inform important decisions
- Building reusable research patterns
- Debugging failed research executions

**When to use standard workflow:**
- Quick one-off research
- Low-stakes queries
- Speed over validation

## 📋 ENHANCED WORKFLOW STEPS

### Step 1: Check for Template Match

**FIRST:** Before decomposing the query, check if a proven template exists:

```typescript
import { getTemplateManager } from '../utils/templates';

const templateManager = getTemplateManager();
const matches = templateManager.findMatchingTemplates(userQuery, 3);

if (matches.length > 0) {
  // Display matches to user
  console.log(displayTemplateMatch(userQuery, matches));

  // Use top match if confidence > 0.7
  const topMatch = matches[0];
  if (topMatch.confidence > 0.7) {
    const template = topMatch.template;

    // Apply template configuration
    agentTypes = template.agent_config.agent_types;
    minConfidence = template.validation_config.min_confidence;
    requireSources = template.validation_config.require_sources;
    autoSaveEnabled = template.auto_save_config.enabled;

    console.log(`📚 Using template: ${template.name} (${Math.round(topMatch.confidence * 100)}% match)`);
  }
}
```

### Step 2: Initialize Logging

**START logging at the beginning of workflow:**

```typescript
import { getLogger } from '../utils/logging';

const logger = getLogger('./logs/research');
const workflowId = logger.startWorkflow(userQuery, 'research');

logger.addMetadata('mode', researchMode); // 'quick', 'standard', or 'extensive'
logger.addMetadata('template_used', templateId || null);
```

### Step 3: Launch Agents with Logging

**When launching agents, track each one:**

```typescript
// Example: Standard mode with 9 agents
const agents = [
  { id: 'perp-1', type: 'perplexity-researcher', query: 'Query 1...' },
  { id: 'perp-2', type: 'perplexity-researcher', query: 'Query 2...' },
  { id: 'perp-3', type: 'perplexity-researcher', query: 'Query 3...' },
  { id: 'claude-1', type: 'claude-researcher', query: 'Query 4...' },
  { id: 'claude-2', type: 'claude-researcher', query: 'Query 5...' },
  { id: 'claude-3', type: 'claude-researcher', query: 'Query 6...' },
  { id: 'gemini-1', type: 'gemini-researcher', query: 'Query 7...' },
  { id: 'gemini-2', type: 'gemini-researcher', query: 'Query 8...' },
  { id: 'gemini-3', type: 'gemini-researcher', query: 'Query 9...' }
];

// Log agent starts
agents.forEach(agent => {
  logger.startAgent(agent.id, agent.type, agent.query);
});

// Launch all agents in parallel (SINGLE message)
// ... Task calls here ...
```

### Step 4: Collect Results with Confidence Scoring

**When agents return, calculate confidence for each result:**

```typescript
import { calculateConfidence, calculateAllConfidences } from '../utils/confidence';
import { ResearchResult } from '../utils/confidence';

// Collect agent results
const results: ResearchResult[] = [];

// For each agent that completes:
agentResults.forEach(agentResult => {
  const result: ResearchResult = {
    agent_id: agentResult.agent_id,
    agent_type: agentResult.agent_type,
    query: agentResult.query,
    content: agentResult.findings,
    sources: agentResult.sources || [],
    timestamp: new Date().toISOString()
  };

  results.push(result);

  // Log agent completion
  const preview = result.content.substring(0, 100);
  logger.completeAgent(result.agent_id, 'success', preview);
});

// Calculate confidence for all results (includes cross-agent agreement)
const resultsWithConfidence = calculateAllConfidences(results);
```

### Step 5: Run 3-Gate Validation

**Validate results through all three gates:**

```typescript
import { validateResults } from '../utils/validation';

const validation = await validateResults(resultsWithConfidence, {
  minConfidence: template?.validation_config.min_confidence || 0.70,
  requireSources: template?.validation_config.require_sources !== false,
  checkContradictions: true
});

// Log each validation gate
logger.logValidation('sources', validation.sourceCheck.status, validation.sourceCheck.details);
logger.logValidation('confidence', validation.confidenceCheck.status, validation.confidenceCheck.details);
logger.logValidation('contradictions', validation.contradictionCheck.status, validation.contradictionCheck.details);

// Display validation status to user
console.log(displayValidationStatus({
  ...validation,
  allPassed: validation.allPassed
}));
```

**Gate 1: Source Citations**
- ✅ **PASS**: All results have source citations
- ❌ **FAIL**: Some results missing sources → Re-query needed

**Gate 2: Confidence Threshold**
- ✅ **PASS**: All results meet minimum confidence (default 70%)
- ⚠️ **WARNING**: Some results below threshold → Follow-up recommended
- ❌ **FAIL**: Too many low-confidence results → Review needed

**Gate 3: Contradiction Detection**
- ✅ **PASS**: No contradictions detected
- ⚠️ **WARNING**: Potential contradictions → Disambiguation needed

### Step 6: Handle Validation Actions

**If validation fails, take automatic corrective actions:**

```typescript
// Gate 1 failures: Re-query for missing sources
if (validation.sourceCheck.status === 'fail') {
  const resultsWithoutSources = resultsWithConfidence.filter(r => !r.sources || r.sources.length === 0);

  // Launch follow-up agents for missing sources
  for (const result of resultsWithoutSources) {
    logger.log('warn', 'validation', `Re-querying for sources: ${result.agent_id}`);

    // Launch new agent with explicit source requirement
    // Task({ ... prompt: "Research X. YOU MUST cite specific sources." })
  }
}

// Gate 2 failures: Follow-up for low confidence
if (validation.confidenceCheck.status === 'warning' || validation.confidenceCheck.status === 'fail') {
  const lowConfidenceResults = resultsWithConfidence.filter(r => (r.confidence || 0) < 0.70);

  for (const result of lowConfidenceResults) {
    logger.log('warn', 'validation', `Low confidence detected: ${result.agent_id} (${Math.round((result.confidence || 0) * 100)}%)`);

    // Options:
    // 1. Launch follow-up agent for additional validation
    // 2. Flag in final report as "needs verification"
    // 3. Exclude from auto-save (require manual review)
  }
}

// Gate 3 failures: Disambiguation for contradictions
if (validation.contradictionCheck.status === 'warning') {
  const contradictions = validation.contradictionCheck.details?.contradictions || [];

  for (const contradiction of contradictions) {
    logger.log('warn', 'validation', `Contradiction detected: ${contradiction.result_a} vs ${contradiction.result_b}`);

    // Launch disambiguation agent to resolve conflict
    // Task({ ... prompt: "Resolve contradiction between: [claim A] and [claim B]" })
  }
}
```

### Step 7: Classify Risk & Auto-Save

**Determine if results should be auto-saved:**

```typescript
import { classifyTaskRisk, handleResearchCompletion } from '../utils/auto-save';

// Classify task risk
const taskClassification = classifyTaskRisk(userQuery);

// Calculate overall confidence
const avgConfidence = resultsWithConfidence.reduce((sum, r) => sum + (r.confidence || 0), 0) / resultsWithConfidence.length;

// Attempt auto-save (will only save if SAFE + high confidence)
const completionResult = await handleResearchCompletion(
  {
    agent_id: 'workflow-synthesizer',
    agent_type: 'research-workflow',
    query: userQuery,
    content: synthesizedReport, // Your synthesized markdown report
    sources: allSources,
    confidence: avgConfidence,
    validated: validation.allPassed,
    timestamp: new Date().toISOString()
  },
  avgConfidence,
  './research-output'
);

// Display auto-save notification
console.log(displayAutoSaveNotification(
  completionResult.autoSaveResult.saved,
  completionResult.autoSaveResult.filePath,
  completionResult.classification.reason
));

// Log completion
logger.completeWorkflow(
  validation.allPassed ? 'success' : 'partial',
  avgConfidence,
  completionResult.autoSaveResult.saved,
  completionResult.autoSaveResult.filePath
);
```

**Risk Classification:**
- **SAFE** (auto-save enabled): Factual queries ("what is", "explain", "define")
- **REVIEW** (manual review): Informational queries that inform decisions
- **MANUAL** (no auto-save): Decision-making queries ("should I", "recommend")

**Auto-Save Criteria:**
- ✅ Task classified as SAFE
- ✅ Confidence ≥ 70% (configurable)
- ✅ All validation gates passed or warnings only

If auto-save occurs:
- File saved to `./research-output/[date]-[query].md`
- Notification displayed to user
- Rollback path stored (can be undone if needed)

If auto-save skipped:
- Results displayed for manual review
- Reason shown (risk level or low confidence)
- User can manually save if desired

### Step 8: Display Enhanced Report

**Generate comprehensive report with confidence scoring:**

```typescript
import { displayResearchReport, displayWorkflowSummary } from '../utils/display';

// Display full research report
const report = displayResearchReport(resultsWithConfidence, validation, {
  showEmojis: true,
  showBreakdown: true,
  showSources: true,
  showValidation: true
});

console.log(report);

// Display workflow summary
const workflowSummary = displayWorkflowSummary(
  userQuery,
  durationMs,
  agents.length,
  avgConfidence,
  completionResult.autoSaveResult.saved,
  completionResult.autoSaveResult.filePath
);

console.log(workflowSummary);
```

**Enhanced Report Includes:**
- 📊 Summary statistics (confidence, sources, validation status)
- ✅/⚠️/❌ Validation gate results
- 🎯 Individual result confidence scores with breakdowns
- 📈 Confidence factor analysis (source quality, count, agreement, specificity)
- 💾 Auto-save status and file location
- 🔍 Recommendations for follow-up if needed

### Step 9: Update Template Metrics (if template used)

**If a template was used, update its success metrics:**

```typescript
if (templateId) {
  const success = validation.allPassed && avgConfidence >= 0.70;

  templateManager.updateTemplateMetrics(
    templateId,
    success,
    avgConfidence
  );

  logger.log('info', 'system', `Updated template metrics: ${templateId}`);
}
```

### Step 10: Consider Creating New Template

**If this was a successful novel query pattern (no template match), consider templating it:**

```typescript
// Check if this should become a template
const shouldTemplate = (
  avgConfidence >= 0.75 &&
  validation.allPassed &&
  matches.length === 0 // No existing template matched
);

if (shouldTemplate) {
  console.log('\n💡 This research pattern was successful!');
  console.log('   Consider creating a template for similar queries:');
  console.log(`   1. Query type: ${taskClassification.riskLevel}`);
  console.log(`   2. Agent configuration: ${agents.map(a => a.type).join(', ')}`);
  console.log(`   3. Success rate: ${Math.round(avgConfidence * 100)}%`);
  console.log('');
  console.log('   Suggested template name: [Describe the pattern]');
  console.log('   Suggested query pattern: [Regex for matching similar queries]');

  // Optionally auto-create template (or ask user for confirmation)
}
```

## 📊 CONFIDENCE SCORING BREAKDOWN

Each result gets a confidence score (0-1) based on 4 factors:

### Factor 1: Source Quality (40% weight)
- **Peer-reviewed**: 1.0 (highest quality)
- **Preprint**: 0.8 (good quality, not peer-reviewed)
- **Media**: 0.6 (reputable news sources)
- **Blog**: 0.4 (individual perspectives)
- **Unknown**: 0.3 (unverified sources)

### Factor 2: Source Count (20% weight)
- More sources = higher confidence
- Caps at 3 sources (diminishing returns)
- Formula: `min(source_count / 3, 1.0)`

### Factor 3: Agent Agreement (30% weight)
- How many other agents found similar information?
- Cross-agent validation increases confidence
- Formula: `agreeing_agents / (total_agents - 1)`

### Factor 4: Specificity (10% weight)
- Concrete claims > vague statements
- Numbers, dates, citations, measurements boost score
- Hedging language ("might", "possibly") reduces score

**Overall Confidence:**
```
confidence = source_quality * 0.4 +
             source_count * 0.2 +
             agent_agreement * 0.3 +
             specificity * 0.1
```

**Confidence Levels:**
- **HIGH (80%+)**: Well-sourced, specific, validated
- **MEDIUM (60-79%)**: Adequate sources, some validation
- **LOW (40-59%)**: Limited sources or vague claims
- **VERY LOW (<40%)**: Needs follow-up research

## 🔍 3-GATE VALIDATION SYSTEM

### Gate 1: Source Citation Check
**Requirement:** Every research result MUST have source citations

**Actions if failed:**
- Re-query agents that returned results without sources
- Explicit instruction: "YOU MUST cite specific sources"
- Continue with results that have sources

### Gate 2: Confidence Threshold Check
**Requirement:** Results should meet minimum confidence (default 70%)

**Actions if failed/warned:**
- Flag low-confidence results for follow-up
- Launch additional validation agents
- Require manual review before auto-save
- Note in final report: "Needs verification"

### Gate 3: Contradiction Detection
**Requirement:** No contradictory claims across results

**Actions if warned:**
- Launch disambiguation agent
- Prompt: "Resolve contradiction between [claim A] and [claim B]"
- Present both sides in final report
- Note uncertainty in synthesis

**All gates must PASS or WARN (not FAIL) for auto-save to proceed.**

## 💾 AUTO-SAVE DECISION MATRIX

| Task Risk | Confidence | Validation | Auto-Save? |
|-----------|------------|------------|------------|
| SAFE      | ≥70%       | All passed | ✅ YES     |
| SAFE      | ≥70%       | Warnings   | ✅ YES     |
| SAFE      | <70%       | Any        | ❌ NO (review) |
| REVIEW    | ≥80%       | All passed | ⚠️ ASK USER |
| REVIEW    | Any        | Warnings/fail | ❌ NO (review) |
| MANUAL    | Any        | Any        | ❌ NO (always review) |

## 📝 STRUCTURED LOGGING

**Every workflow execution generates a JSON log:**

```json
{
  "workflow": {
    "workflow_id": "workflow-1234567890-abc123",
    "workflow_type": "research",
    "query": "What is quantum computing?",
    "started_at": "2025-01-08T10:00:00Z",
    "completed_at": "2025-01-08T10:01:30Z",
    "duration_ms": 90000,
    "status": "success",
    "confidence_score": 0.85,
    "auto_saved": true,
    "output_path": "./research-output/2025-01-08-quantum-computing.md",
    "agents": [
      {
        "agent_id": "perp-1",
        "agent_type": "perplexity-researcher",
        "query": "Latest quantum computing breakthroughs 2025",
        "started_at": "2025-01-08T10:00:05Z",
        "completed_at": "2025-01-08T10:00:35Z",
        "duration_ms": 30000,
        "status": "success",
        "result_preview": "Recent breakthroughs include..."
      }
      // ... more agents
    ],
    "validation_events": [
      {
        "timestamp": "2025-01-08T10:01:20Z",
        "gate": "sources",
        "status": "pass",
        "details": { "with_sources": 9, "without_sources": 0 }
      },
      {
        "timestamp": "2025-01-08T10:01:21Z",
        "gate": "confidence",
        "status": "pass",
        "details": { "average_confidence": 0.85 }
      },
      {
        "timestamp": "2025-01-08T10:01:22Z",
        "gate": "contradictions",
        "status": "pass",
        "details": { "contradictions_found": 0 }
      }
    ]
  },
  "log_entries": [
    // Detailed execution logs
  ]
}
```

**Logs saved to:** `./logs/research/workflow-[id].json`

**Use logs for:**
- Debugging failed executions
- Performance analysis (which agents are slow?)
- Quality improvement (what patterns lead to high confidence?)
- Audit trails (what research was conducted when?)

## 📚 WORKFLOW TEMPLATES

**Templates capture successful research patterns for reuse.**

### Creating a Template

```typescript
templateManager.createTemplate(
  'Factual Research',
  'Straightforward factual queries requiring reliable sources',
  '(what is|define|explain|history of)',
  [
    'What is quantum computing?',
    'Explain how photosynthesis works'
  ],
  {
    agentTypes: ['perplexity-researcher', 'claude-researcher'],
    parallel: true,
    minConfidence: 0.75,
    requireSources: true,
    autoSave: true
  },
  ['factual', 'educational', 'safe']
);
```

### Using a Template

Templates are automatically matched at Step 1:
- Find templates with similar query patterns
- Apply proven agent configurations
- Use validated confidence thresholds
- Inherit auto-save settings

### Template Metrics

Track template performance:
- **Usage count**: How many times used
- **Success rate**: % of successful executions
- **Average confidence**: Typical confidence scores
- **Last used**: When last applied

### Default Templates

Three templates are seeded by default:
1. **Factual Research** - "what is", "define", "explain"
2. **Comparative Analysis** - "compare", "vs", "pros and cons"
3. **Current Events** - "latest", "recent", "news about"

## 🎯 COMPLETE EXAMPLE: Enhanced Standard Research

**User query:** "What is quantum computing?"

```typescript
// Step 1: Check templates
const matches = templateManager.findMatchingTemplates("What is quantum computing?");
// Matches: "Factual Research" template (90% confidence)

const template = matches[0].template;
// Uses: perplexity-researcher, claude-researcher
// Min confidence: 0.75
// Auto-save: enabled

// Step 2: Initialize logging
const logger = getLogger();
const workflowId = logger.startWorkflow("What is quantum computing?", "research");
logger.addMetadata('template_used', template.template_id);

// Step 3: Launch agents (from template config)
const agents = [
  { id: 'perp-1', type: 'perplexity-researcher', query: 'What is quantum computing - basics' },
  { id: 'perp-2', type: 'perplexity-researcher', query: 'Quantum computing applications 2025' },
  { id: 'claude-1', type: 'claude-researcher', query: 'How does quantum computing work technically' }
];

agents.forEach(a => logger.startAgent(a.id, a.type, a.query));

// Launch in parallel...
// [Task calls]

// Step 4: Collect results with confidence
const results = calculateAllConfidences(agentResults);
// Result confidences: [0.82, 0.78, 0.85]
// Average: 0.82 (HIGH)

agents.forEach(a => logger.completeAgent(a.id, 'success', preview));

// Step 5: Validate
const validation = await validateResults(results, {
  minConfidence: template.validation_config.min_confidence,
  requireSources: true,
  checkContradictions: true
});

logger.logValidation('sources', validation.sourceCheck.status, {});
logger.logValidation('confidence', validation.confidenceCheck.status, {});
logger.logValidation('contradictions', validation.contradictionCheck.status, {});

// All gates: PASS ✅

// Step 6: No corrective actions needed (all passed)

// Step 7: Auto-save
const taskRisk = classifyTaskRisk("What is quantum computing?");
// Risk: SAFE (factual query)

const completion = await handleResearchCompletion(synthesizedResult, 0.82);
// Auto-saved: ✅ YES (SAFE + 82% confidence + all gates passed)
// File: ./research-output/2025-01-08-what-is-quantum-computing.md

logger.completeWorkflow('success', 0.82, true, completion.autoSaveResult.filePath);

// Step 8: Display enhanced report
console.log(displayResearchReport(results, validation));

// Step 9: Update template
templateManager.updateTemplateMetrics(template.template_id, true, 0.82);
// Template stats updated: usage +1, success rate, avg confidence

// Step 10: No new template needed (matched existing)
```

**Result:**
- ✅ 3 agents completed in 30s
- ✅ All validation gates passed
- ✅ Average confidence: 82% (HIGH)
- ✅ Auto-saved to file
- ✅ Template metrics updated
- ✅ Structured log saved

## 🔧 CONFIGURATION

**All thresholds are configurable:**

```typescript
// In your research workflow
const CONFIG = {
  // Confidence thresholds
  minConfidence: 0.70,        // Default confidence threshold
  highConfidence: 0.80,       // Threshold for "high confidence"

  // Auto-save settings
  autoSaveEnabled: true,
  autoSaveDir: './research-output',
  safeTasksOnly: true,        // Only auto-save SAFE tasks

  // Validation settings
  requireSources: true,
  checkContradictions: true,
  allowWarnings: true,        // Auto-save even with warnings

  // Logging settings
  logDir: './logs/research',
  logLevel: 'info',           // 'debug', 'info', 'warn', 'error'

  // Template settings
  templateDir: './.claude/templates/research',
  minTemplateMatch: 0.70,     // Minimum confidence to use template
  autoCreateTemplates: false  // Auto-create templates from successful runs
};
```

## 🚨 IMPORTANT NOTES

1. **Backward Compatible**: This enhanced workflow is fully backward compatible. If you don't want reliability features, use the standard workflow.

2. **Optional Features**: All features can be disabled individually:
   - Skip template matching
   - Disable validation (use results as-is)
   - Disable auto-save (always manual)
   - Disable logging (no JSON logs)
   - Disable confidence display (simple output)

3. **Performance Impact**: Minimal. Validation and confidence calculation add ~100-200ms total.

4. **Storage**: Logs and auto-saved files accumulate over time. Implement cleanup strategy:
   - Logs: Archive or delete after 30 days
   - Saved results: User responsibility to organize

5. **Template Maintenance**: Review templates quarterly:
   - Delete low-performing templates (success rate <50%)
   - Update patterns as query styles evolve
   - Add new templates for emerging patterns

## 📖 RELATED DOCUMENTATION

- **Standard Research Workflow**: `./conduct.md` (original workflow without reliability features)
- **Utils Documentation**:
  - `../utils/validation.ts` - 3-gate validation system
  - `../utils/confidence.ts` - Confidence scoring algorithm
  - `../utils/auto-save.ts` - Autonomous completion logic
  - `../utils/logging.ts` - Structured logging system
  - `../utils/templates.ts` - Workflow template management
  - `../utils/display.ts` - Enhanced display formatting

---

**This enhanced workflow implements TAC Tactics #3 (Template Engineering), #4 (Let Agents Ship), and #5 (Add Feedback) for reliable autonomous research.**
