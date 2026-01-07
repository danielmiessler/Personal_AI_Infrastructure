# RunStandup Workflow

Main workflow for executing multi-agent standups using the Council Framework.

## Metadata

```yaml
workflow: RunStandup
skill: standup
version: 1.0.0
triggers:
  - standup
  - standup about *
  - standup on *
  - council on *
  - team review *
```

## Overview

This workflow handles the complete lifecycle of a standup session:
1. Parse user request to extract topic and options
2. Determine domain and select roster
3. Configure visibility and output adapters
4. Delegate to Council Framework
5. Present synthesized decision

## Input Parsing

### Extract Topic

Parse the user's request to extract the discussion topic:

```typescript
function extractTopic(userMessage: string): string {
  // Patterns: "standup about X", "standup on X", "council on X", "team review X"
  const patterns = [
    /standup\s+(?:about|on)\s+(.+?)(?:\s+with|\s+using|\s+save|\s*$)/i,
    /council\s+on\s+(.+?)(?:\s+with|\s+using|\s+save|\s*$)/i,
    /team\s+review\s+(.+?)(?:\s+with|\s+using|\s+save|\s*$)/i,
  ];

  for (const pattern of patterns) {
    const match = userMessage.match(pattern);
    if (match) return match[1].trim();
  }

  return null; // Will trigger interactive prompt
}
```

### Extract Options

Parse optional configuration from the request:

```typescript
interface StandupOptions {
  roster?: string[] | string;  // Agent names or roster preset
  visibility?: 'full' | 'progress' | 'summary';
  saveToJoplin?: boolean;
  saveToFile?: boolean;
  maxRounds?: number;
}

function extractOptions(userMessage: string): StandupOptions {
  const options: StandupOptions = {};

  // Roster: "with Daniel, Clay, and Amy" or "using security-review roster"
  const withMatch = userMessage.match(/with\s+([A-Z][a-z]+(?:,?\s+(?:and\s+)?[A-Z][a-z]+)*)/i);
  if (withMatch) {
    options.roster = withMatch[1]
      .replace(/\s+and\s+/g, ', ')
      .split(/,\s*/)
      .map(name => name.trim());
  }

  const usingMatch = userMessage.match(/using\s+(\S+)\s+roster/i);
  if (usingMatch) {
    options.roster = usingMatch[1];
  }

  // Visibility: "with summary visibility", "summary only"
  if (/summary\s+(visibility|only)/i.test(userMessage)) {
    options.visibility = 'summary';
  } else if (/progress\s+visibility/i.test(userMessage)) {
    options.visibility = 'progress';
  }

  // Output: "save to Joplin", "save to file"
  if (/save\s+to\s+joplin/i.test(userMessage)) {
    options.saveToJoplin = true;
  }
  if (/save\s+to\s+file/i.test(userMessage)) {
    options.saveToFile = true;
  }

  return options;
}
```

## Workflow Steps

### Step 1: Parse Request

```typescript
async function parseRequest(userMessage: string): Promise<{
  topic: string;
  options: StandupOptions;
}> {
  let topic = extractTopic(userMessage);
  const options = extractOptions(userMessage);

  // If no topic found, prompt interactively
  if (!topic) {
    topic = await promptUser("What topic should we discuss in this standup?");
  }

  return { topic, options };
}
```

### Step 2: Determine Domain

Analyze the topic to identify the primary domain(s):

```typescript
import { DomainMapping } from 'kai-devsecops-agents/DomainMapping';

function determineDomain(topic: string): string[] {
  const domains: string[] = [];
  const topicLower = topic.toLowerCase();

  for (const [domain, keywords] of Object.entries(DomainMapping.keywords)) {
    for (const keyword of keywords) {
      if (topicLower.includes(keyword)) {
        domains.push(domain);
        break;
      }
    }
  }

  // Default to 'general' if no domains matched
  return domains.length > 0 ? domains : ['general'];
}
```

### Step 3: Select Roster

```typescript
import { RosterSelector } from 'kai-council-framework/Engine/RosterSelector';

async function selectRoster(
  topic: string,
  domains: string[],
  userRoster?: string[] | string
): Promise<string[]> {
  // If user specified agents, use them
  if (Array.isArray(userRoster)) {
    return validateAgents(userRoster);
  }

  // If user specified a roster preset, load it
  if (typeof userRoster === 'string') {
    return loadRosterPreset(userRoster);
  }

  // Auto-select based on domains
  return RosterSelector.selectForDomains(domains, {
    minAgents: 2,
    maxAgents: 4,
    agentPack: 'kai-devsecops-agents'
  });
}

async function loadRosterPreset(presetName: string): Promise<string[]> {
  const presets = {
    'full-team': ['Daniel', 'Mary', 'Clay', 'Hefley', 'Amy', 'Geoff', 'Justin', 'Rekha', 'Roger'],
    'security-review': ['Daniel', 'Clay', 'Amy', 'Geoff'],
    'architecture-review': ['Clay', 'Daniel', 'Amy', 'Roger'],
    'planning-estimation': ['Clay', 'Hefley', 'Amy', 'Rekha'],
    'quick-review': ['Clay', 'Hefley'],
  };

  const roster = presets[presetName];
  if (!roster) {
    console.warn(`Unknown roster preset: ${presetName}, falling back to auto-select`);
    return null;
  }

  return roster;
}
```

### Step 4: Configure Output

```typescript
import { loadConfig } from '../Config/standup.yaml';
import { ConsoleAdapter } from 'kai-council-framework/Adapters/ConsoleAdapter';
import { FileAdapter } from 'kai-council-framework/Adapters/FileAdapter';
import { JoplinAdapter } from 'kai-council-framework/Adapters/JoplinAdapter';

function configureAdapters(options: StandupOptions): Adapter[] {
  const config = loadConfig();
  const adapters: Adapter[] = [];

  // Console is always enabled
  adapters.push(new ConsoleAdapter({
    visibility: options.visibility || config.defaults.visibility
  }));

  // File adapter if requested or enabled by default
  if (options.saveToFile || config.outputDestinations.file.enabled) {
    adapters.push(new FileAdapter({
      path: config.outputDestinations.file.path,
      filenamePattern: 'standup-{date}-{topic}.md'
    }));
  }

  // Joplin adapter if requested or enabled by default
  if (options.saveToJoplin || config.outputDestinations.joplin.enabled) {
    adapters.push(new JoplinAdapter({
      notebookName: config.outputDestinations.joplin.notebookName
    }));
  }

  return adapters;
}
```

### Step 5: Run Council

```typescript
import { runCouncil } from 'kai-council-framework/Engine/Orchestrator';

async function executeStandup(
  topic: string,
  roster: string[],
  adapters: Adapter[],
  options: StandupOptions
): Promise<CouncilResult> {
  return runCouncil({
    topic,
    roster,
    adapters,
    maxRounds: options.maxRounds || 3,
    visibility: options.visibility || 'full',
    synthesisStrategy: 'consensus',
    agentPack: 'kai-devsecops-agents'
  });
}
```

### Step 6: Present Results

```typescript
function presentResults(result: CouncilResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('STANDUP SYNTHESIS');
  console.log('='.repeat(60));

  // Decision
  console.log('\n## Decision\n');
  console.log(result.synthesis.decision);

  // Confidence
  console.log(`\n**Confidence:** ${formatConfidence(result.synthesis.confidence)}`);

  // Trade-offs (if any)
  if (result.synthesis.tradeoffs.length > 0) {
    console.log('\n## Trade-offs\n');
    for (const tradeoff of result.synthesis.tradeoffs) {
      console.log(`- **${tradeoff.dimension}**: ${tradeoff.resolution}`);
    }
  }

  // Action Items
  if (result.synthesis.actionItems.length > 0) {
    console.log('\n## Action Items\n');
    for (const item of result.synthesis.actionItems) {
      console.log(`- [ ] ${item.description}`);
      if (item.owner) console.log(`      Owner: ${item.owner}`);
    }
  }

  // Dissent (if any)
  if (result.synthesis.dissent) {
    console.log('\n## Dissenting Views\n');
    console.log(result.synthesis.dissent);
  }

  console.log('\n' + '='.repeat(60));
}

function formatConfidence(confidence: number): string {
  const percentage = Math.round(confidence * 100);
  if (percentage >= 90) return `Very High (${percentage}%)`;
  if (percentage >= 70) return `High (${percentage}%)`;
  if (percentage >= 50) return `Moderate (${percentage}%)`;
  if (percentage >= 30) return `Low (${percentage}%)`;
  return `Very Low (${percentage}%)`;
}
```

## Complete Workflow

```typescript
export async function runStandup(userMessage: string): Promise<void> {
  // Step 1: Parse request
  const { topic, options } = await parseRequest(userMessage);

  console.log(`\nStarting standup on "${topic}"...\n`);

  // Step 2: Determine domain
  const domains = determineDomain(topic);
  console.log(`[Detected domains: ${domains.join(', ')}]`);

  // Step 3: Select roster
  const roster = await selectRoster(topic, domains, options.roster);
  console.log(`[Roster: ${roster.join(', ')}]\n`);

  // Step 4: Configure adapters
  const adapters = configureAdapters(options);

  // Step 5: Run council
  const result = await executeStandup(topic, roster, adapters, options);

  // Step 6: Present results
  presentResults(result);

  // Log output destinations
  const destinations = adapters.map(a => a.name).join(', ');
  console.log(`\n[Results saved to: ${destinations}]`);
}
```

## Interactive Mode

When invoked with just "standup" (no topic), enter interactive mode:

```typescript
async function interactiveMode(): Promise<void> {
  const topic = await promptUser("What topic should we discuss?");

  const rosterChoice = await promptUser(
    "How should we select the team?\n" +
    "  1. Auto-select based on topic\n" +
    "  2. Use a preset roster\n" +
    "  3. Specify agents manually\n" +
    "Choice: "
  );

  let roster: string[] | string | undefined;

  if (rosterChoice === '2') {
    const preset = await promptUser(
      "Available presets:\n" +
      "  - full-team\n" +
      "  - security-review\n" +
      "  - architecture-review\n" +
      "  - planning-estimation\n" +
      "  - quick-review\n" +
      "Preset: "
    );
    roster = preset;
  } else if (rosterChoice === '3') {
    const agents = await promptUser("Enter agent names (comma-separated): ");
    roster = agents.split(',').map(a => a.trim());
  }

  const visibility = await promptUser(
    "Visibility mode (full/progress/summary) [full]: "
  ) || 'full';

  await runStandup(`standup about ${topic} ${roster ? `using ${roster} roster` : ''} with ${visibility} visibility`);
}
```

## Error Handling

```typescript
async function runStandupSafe(userMessage: string): Promise<void> {
  try {
    await runStandup(userMessage);
  } catch (error) {
    if (error instanceof AgentPackNotFoundError) {
      console.error(
        `\nError: Agent pack not found.\n` +
        `Please install kai-devsecops-agents:\n` +
        `  cd ~/PAI/Packs && git clone <repo> kai-devsecops-agents\n`
      );
    } else if (error instanceof RosterNotFoundError) {
      console.error(
        `\nError: Roster preset not found.\n` +
        `Available presets: full-team, security-review, architecture-review, planning-estimation, quick-review\n`
      );
    } else if (error instanceof JoplinUnavailableError) {
      console.warn(
        `\nWarning: Joplin is not available. Continuing without Joplin output.\n`
      );
      // Retry without Joplin adapter
      const options = extractOptions(userMessage);
      options.saveToJoplin = false;
      await runStandup(userMessage);
    } else {
      console.error(`\nStandup failed: ${error.message}`);
      throw error;
    }
  }
}
```

## Output Examples

### Full Visibility

```
Starting standup on "authentication design"...

[Detected domains: security, architecture]
[Roster: Daniel, Clay, Hefley, Amy]

--- Round 1: Independent Perspectives ---

DANIEL (Security Engineer):
Authentication design requires careful consideration of several security aspects:
1. Token management and rotation policies
2. Session handling and timeout configuration
3. MFA requirements for sensitive operations
4. Rate limiting to prevent brute force attacks
...

CLAY (Tech Lead):
From an implementation perspective, we should consider:
1. OAuth2 vs custom token approach
2. Session storage strategy (JWT vs server-side)
3. Integration with existing user service
...

[Additional agents...]

--- Round 2: Cross-Talk & Refinement ---

DANIEL (responding to Clay):
I agree with OAuth2 for the external-facing API, but we need to ensure...

[Cross-talk continues...]

--- Round 3: Final Positions ---

[Final positions...]

============================================================
STANDUP SYNTHESIS
============================================================

## Decision

Implement OAuth2 with JWT access tokens and opaque refresh tokens. Use
server-side session storage for sensitive operations requiring MFA.

**Confidence:** High (82%)

## Trade-offs

- **Token Type**: JWT chosen for performance despite larger payload size
- **Session Storage**: Hybrid approach balances security and scalability

## Action Items

- [ ] Design OAuth2 flow diagram
      Owner: Clay
- [ ] Define token rotation policy
      Owner: Daniel
- [ ] Create test plan for auth edge cases
      Owner: Amy

============================================================

[Results saved to: console, file]
```

## Related Workflows

- [QuickReview.md](./QuickReview.md) - Lightweight 2-agent review
- [SecurityReview.md](./SecurityReview.md) - Security-focused standup with veto power
