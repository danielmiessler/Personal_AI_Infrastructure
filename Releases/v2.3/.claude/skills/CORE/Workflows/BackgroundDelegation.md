# Background Delegation Workflow

Launch agents that run in the background while you continue working. Results are retrieved on demand.

## Triggers

- "background agents", "spin up background agents"
- "in the background", "while I work"
- "background research", "background:"
- "parallel background agents"

## How It Works

1. Parse the task(s) to delegate
2. Launch each agent with `run_in_background: true`
3. Report launched agents with their IDs
4. Continue working - agents run independently
5. Check status or retrieve results when ready

## Launching Background Agents

Use the Task tool with `run_in_background: true`:

```typescript
Task({
  description: "Research OpenAI news",
  prompt: "Research the latest OpenAI developments...",
  subagent_type: "PerplexityResearcher",  // or Intern, ClaudeResearcher, etc.
  model: "haiku",  // Use haiku for parallel grunt work
  run_in_background: true
})
// Returns immediately: { agent_id: "abc123", status: "running" }
```

**Model Selection for Background Agents:**
- `haiku` - Fast, cheap, good for research/exploration (DEFAULT for background)
- `sonnet` - Balanced, use for complex analysis
- `opus` - Deep reasoning, use sparingly

## Checking Status

When user says: "check background agents", "agent status", "how are my agents doing"

```typescript
TaskOutput({
  agentId: "abc123",
  block: false  // Don't wait, just check
})
// Returns: { status: "running|completed|failed", output: "..." }
```

## Retrieving Results

When user says: "get background results", "what did the agents find"

```typescript
TaskOutput({
  agentId: "abc123",
  block: true,  // Wait for completion
  wait_up_to: 300  // Max 5 minutes
})
// Returns full output when agent completes
```

## Example Flows

### Newsletter Research

```
User: "I'm writing the newsletter. Background agents research
       the OpenAI drama, Anthropic's new model, and Google's update."

→ Launches 3 background agents in parallel
→ Reports agent IDs and what each is researching
→ User continues writing
→ User checks "Background status" periodically
→ User retrieves results when ready
```

### OSINT Investigation

```
User: "Background agents investigate John Smith, Jane Doe,
       and Acme Corp for due diligence."

→ Launches 3 Intern agents with OSINT prompts
→ User continues other work
→ Status check shows 2/3 complete
→ Results retrieved when ready
```

### Code Exploration

```
User: "Background agents explore the codebase for
       auth patterns, API endpoints, and test coverage."

→ Launches 3 Explore agents
→ Reports what each is analyzing
→ User continues coding
```

## Best Practices

1. **Use for parallel work** - When you have 3+ independent tasks
2. **Pick the right model** - Haiku for speed, Sonnet for quality
3. **Don't over-spawn** - 3-5 agents is usually optimal
4. **Check periodically** - Poll status every few minutes if curious
5. **Retrieve when needed** - Don't wait for completion unless you need results

## Contrast with Foreground Delegation

| Aspect | Foreground (default) | Background |
|--------|---------------------|------------|
| Blocking | Yes - waits for all | No - immediate return |
| When to use | Need results now | Can work on other things |
| Syntax | Normal Task call | `run_in_background: true` |
| Retrieval | Automatic | Manual via TaskOutput |

## Integration

- Works with all agent types: Intern, Researchers, Explore, etc.
- Combine with Research skill for background research workflows
- Use with OSINT skill for parallel investigations
- Pairs well with newsletter/content workflows
