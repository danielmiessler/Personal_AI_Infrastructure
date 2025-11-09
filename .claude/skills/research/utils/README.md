# Research Reliability Utilities

This directory contains 5 reliability features for the PAI Research Skill, implementing TAC Tactics #3 (Template Engineering), #4 (Let Agents Ship), and #5 (Add Feedback).

## 📦 What's Included

### Core Utilities

1. **validation.ts** - 3-Gate Validation System
2. **confidence.ts** - Confidence Scoring Algorithm
3. **auto-save.ts** - Autonomous Completion Logic
4. **logging.ts** - Structured Execution Logging
5. **templates.ts** - Workflow Template Management
6. **display.ts** - Enhanced Display Formatting

### Supporting Files

- **example-integration.ts** - Complete integration example
- **README.md** - This file

## 🚀 Quick Start

### Basic Usage

```typescript
import { executeEnhancedResearch } from './example-integration';

// Execute research with all reliability features
const result = await executeEnhancedResearch(
  'What is quantum computing?',
  agentResults,
  {
    minConfidence: 0.70,
    autoSaveDir: './research-output',
    logDir: './logs/research'
  }
);

console.log(`Success: ${result.success}`);
console.log(`Confidence: ${Math.round(result.avgConfidence * 100)}%`);
console.log(`Auto-saved: ${result.autoSaved}`);
```

### Individual Features

#### 1. Validation

```typescript
import { validateResults } from './validation';

const validation = await validateResults(results, {
  minConfidence: 0.70,
  requireSources: true,
  checkContradictions: true
});

console.log(`All passed: ${validation.allPassed}`);
console.log(`Source check: ${validation.sourceCheck.status}`);
console.log(`Confidence check: ${validation.confidenceCheck.status}`);
console.log(`Contradiction check: ${validation.contradictionCheck.status}`);
```

#### 2. Confidence Scoring

```typescript
import { calculateAllConfidences, getConfidenceBreakdown } from './confidence';

// Calculate confidence for all results
const resultsWithConfidence = calculateAllConfidences(results);

// Get detailed breakdown
const breakdown = getConfidenceBreakdown(results[0], results);

console.log(`Overall: ${Math.round(breakdown.overall * 100)}%`);
console.log(`Source Quality: ${Math.round(breakdown.factors.sourceQuality * 100)}%`);
console.log(`Agent Agreement: ${Math.round(breakdown.factors.agentAgreement * 100)}%`);
```

#### 3. Auto-Save

```typescript
import { classifyTaskRisk, handleResearchCompletion } from './auto-save';

// Classify task risk
const classification = classifyTaskRisk(userQuery);
console.log(`Risk: ${classification.riskLevel}`);

// Attempt auto-save
const completion = await handleResearchCompletion(
  result,
  confidence,
  './research-output'
);

console.log(`Saved: ${completion.autoSaveResult.saved}`);
if (completion.autoSaveResult.filePath) {
  console.log(`File: ${completion.autoSaveResult.filePath}`);
}
```

#### 4. Logging

```typescript
import { getLogger } from './logging';

const logger = getLogger('./logs/research');

// Start workflow
const workflowId = logger.startWorkflow('What is X?', 'research');

// Log agent execution
logger.startAgent('agent-1', 'perplexity-researcher', 'Query...');
logger.completeAgent('agent-1', 'success', 'Preview of findings...');

// Log validation
logger.logValidation('sources', 'pass', { with_sources: 5 });

// Complete workflow
logger.completeWorkflow('success', 0.85, true, './output.md');
```

#### 5. Templates

```typescript
import { getTemplateManager } from './templates';

const manager = getTemplateManager();

// Find matching templates
const matches = manager.findMatchingTemplates('What is quantum computing?', 3);

if (matches.length > 0) {
  const template = matches[0].template;
  console.log(`Using template: ${template.name}`);

  // Apply template configuration
  const agentTypes = template.agent_config.agent_types;
  const minConfidence = template.validation_config.min_confidence;
}

// Create new template
const template = manager.createTemplate(
  'Factual Research',
  'Straightforward factual queries',
  '(what is|define|explain)',
  ['What is X?', 'Explain Y'],
  {
    agentTypes: ['perplexity-researcher', 'claude-researcher'],
    parallel: true,
    minConfidence: 0.75,
    autoSave: true
  },
  ['factual', 'safe']
);
```

#### 6. Display

```typescript
import { displayResearchReport, displayValidationStatus } from './display';

// Display full research report
const report = displayResearchReport(results, validation, {
  showEmojis: true,
  showBreakdown: true,
  showSources: true,
  showValidation: true
});

console.log(report);

// Display validation status
const status = displayValidationStatus(validation);
console.log(status);
```

## 📊 Feature Details

### 1. 3-Gate Validation System

**Purpose:** Ensure research quality through automated checks

**Gates:**
- **Gate 1: Source Citations** - Every result must have sources
- **Gate 2: Confidence Threshold** - Results meet minimum confidence (default 70%)
- **Gate 3: Contradiction Detection** - No conflicting claims across results

**Outputs:**
- `pass` - Gate passed, no action needed
- `warning` - Gate passed with concerns, review recommended
- `fail` - Gate failed, corrective action required

**Use Case:** Prevent low-quality results from being auto-saved or presented as high-confidence

### 2. Confidence Scoring Algorithm

**Purpose:** Calculate transparent confidence scores (0-1) for each result

**Factors:**
- **Source Quality (40%)** - Peer-reviewed > Preprint > Media > Blog
- **Source Count (20%)** - More sources = higher confidence
- **Agent Agreement (30%)** - Cross-agent validation
- **Specificity (10%)** - Concrete claims > vague statements

**Confidence Levels:**
- **HIGH (80%+)** - Well-sourced, specific, validated
- **MEDIUM (60-79%)** - Adequate sources, some validation
- **LOW (40-59%)** - Limited sources or vague claims
- **VERY LOW (<40%)** - Needs follow-up research

**Use Case:** Provide users with transparent quality metrics for each finding

### 3. Autonomous Completion

**Purpose:** Auto-save safe research tasks while requiring review for risky ones

**Risk Classification:**
- **SAFE** - Factual queries (auto-save enabled)
- **REVIEW** - Informational queries (manual review)
- **MANUAL** - Decision-making queries (always manual)

**Auto-Save Criteria:**
- Task classified as SAFE
- Confidence ≥ 70%
- All validation gates passed or warnings only

**Use Case:** Implement TAC Tactic #4 (Let Agents Ship) - agents complete safe tasks autonomously

### 4. Structured Logging

**Purpose:** Capture execution details in JSON for debugging and analysis

**Logged Information:**
- Workflow metadata (ID, query, duration, status)
- Agent executions (timings, results, errors)
- Validation events (gate results, details)
- Custom metadata (template used, mode, etc.)

**Output:** JSON files in `./logs/research/workflow-[id].json`

**Use Case:** Debug failures, analyze performance, improve quality, maintain audit trails

### 5. Workflow Templates

**Purpose:** Save and reuse successful research patterns (TAC Tactic #3)

**Template Contains:**
- Query pattern (regex for matching)
- Agent configuration (types, parallel execution)
- Validation configuration (thresholds)
- Auto-save settings
- Success metrics (usage, success rate, avg confidence)

**Template Matching:**
- Regex pattern matching
- Keyword similarity (Jaccard index)
- Tag matching

**Use Case:** Apply proven patterns to new queries, reduce iterations, increase reliability

### 6. Enhanced Display

**Purpose:** Generate comprehensive reports with confidence indicators

**Display Features:**
- Emoji confidence indicators (✅ ⚠️ ❌)
- Confidence bars (visual representation)
- Factor breakdowns (source quality, agreement, etc.)
- Validation gate status
- Source attribution
- Auto-save notifications

**Use Case:** Present results with full transparency about quality and reliability

## 🔧 Configuration

All features support configuration:

```typescript
const CONFIG = {
  // Validation
  minConfidence: 0.70,
  requireSources: true,
  checkContradictions: true,

  // Auto-Save
  autoSaveEnabled: true,
  autoSaveDir: './research-output',
  safeTasksOnly: true,

  // Logging
  logDir: './logs/research',
  logLevel: 'info',

  // Templates
  templateDir: './.claude/templates/research',
  minTemplateMatch: 0.70,

  // Display
  showEmojis: true,
  showBreakdown: true,
  showSources: true
};
```

## 📁 File Structure

```
utils/
├── README.md                      # This file
├── validation.ts                  # 3-gate validation system
├── confidence.ts                  # Confidence scoring algorithm
├── auto-save.ts                   # Autonomous completion logic
├── logging.ts                     # Structured execution logging
├── templates.ts                   # Workflow template management
├── display.ts                     # Enhanced display formatting
└── example-integration.ts         # Complete integration example
```

## 🎯 Complete Workflow Example

See `example-integration.ts` for a complete working example that:

1. ✅ Checks for template matches
2. ✅ Initializes logging
3. ✅ Tracks agent executions
4. ✅ Calculates confidence scores
5. ✅ Runs 3-gate validation
6. ✅ Handles validation failures
7. ✅ Classifies risk & auto-saves
8. ✅ Displays enhanced report
9. ✅ Updates template metrics
10. ✅ Considers creating new template

**Run example:**
```bash
npm install
npx ts-node utils/example-integration.ts
```

## 📖 Related Documentation

- **Enhanced Workflow**: `../workflows/conduct-enhanced.md` - Complete workflow documentation
- **Standard Workflow**: `../workflows/conduct.md` - Original workflow without reliability features
- **Spec**: `/specs/pai-tac-improvements-spec.md` - Full technical specification
- **Proposal**: `/specs/pai-core-improvements-proposal.md` - GitHub contribution proposal

## 🚨 Important Notes

1. **Backward Compatible**: All features are additive and optional
2. **Type Safety**: Full TypeScript support with exported interfaces
3. **Non-Breaking**: Existing workflows continue to work unchanged
4. **Performance**: Minimal overhead (~100-200ms for full validation)
5. **Storage**: Logs and saved files accumulate - implement cleanup strategy

## 🤝 Contributing

These utilities are designed for contribution to the main PAI repository. They implement core reliability features that benefit ALL PAI users, not individual customizations.

**Core Features** (for everyone):
- Validation system
- Confidence scoring
- Logging infrastructure
- Template system
- Auto-save framework

**Individual Customization** (user-specific):
- Tune confidence thresholds
- Create custom templates
- Configure auto-save rules
- Set logging verbosity

---

**Built with TAC Methodology - Template Engineering, Let Agents Ship, Add Feedback**
