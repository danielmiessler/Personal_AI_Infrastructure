export const meta = {
  name: 'research',
  description:
    'Multi-agent research fan-out: parallel researchers -> per-result URL verification -> confidence-tagged cited synthesis. Deterministic port of the Research skill Standard (3 researchers) and Extensive (7 explorers + 2 verifiers) workflows.',
  whenToUse:
    'Run for Quick, Standard, or Extensive research when you want the researcher roster, the mandatory URL-verification stage, and the cross-checked synthesis fixed in code instead of improvised each run. Pass args {question, depth: "quick"|"standard"|"extensive"}. quick = 1 researcher + URL verify + short synthesis (same rails, lighter).',
  phases: [
    { title: 'Search', detail: 'parallel researcher fan-out, one angle each' },
    { title: 'Verify', detail: 'per-result URL verification via curl inside an agent' },
    { title: 'Synthesize', detail: 'cross-check, confidence-tag, cite, story-explain' },
  ],
}

// ---- Rosters — faithful to QuickResearch.md, StandardResearch.md, ExtensiveResearch.md ----

// Quick: 1 live-web researcher, one query. Same URL-verify + synthesis rails as the
// heavier tiers, just one angle instead of a fan-out (faithful to QuickResearch.md).
const QUICK_ROSTER = [
  { agentType: 'PerplexityResearcher', label: 'perplexity', angle: 'live-web current state with citations' },
]

// Standard: 3 researcher types, one query each.
const STANDARD_ROSTER = [
  { agentType: 'ClaudeResearcher', label: 'claude', angle: 'academic depth, scholarly sources, detailed analysis' },
  { agentType: 'GeminiResearcher', label: 'gemini', angle: 'multi-perspective synthesis, cross-domain connections' },
  { agentType: 'PerplexityResearcher', label: 'perplexity', angle: 'live-web current state with citations' },
]

// Extensive: 7 explorers (Claude x3, Gemini x4) + 2 verifiers (Perplexity x1, Claude x1).
// Verifier angles are topic-level so they work without explorer results (explorer-verifier pattern).
const EXTENSIVE_ROSTER = [
  { agentType: 'ClaudeResearcher', label: 'claude-1', role: 'explorer', angle: 'academic depth' },
  { agentType: 'ClaudeResearcher', label: 'claude-2', role: 'explorer', angle: 'strategic analysis' },
  { agentType: 'GeminiResearcher', label: 'gemini-1', role: 'explorer', angle: 'cross-domain perspective A' },
  { agentType: 'GeminiResearcher', label: 'gemini-2', role: 'explorer', angle: 'cross-domain perspective B' },
  { agentType: 'GeminiResearcher', label: 'gemini-3', role: 'explorer', angle: 'cross-domain perspective C' },
  { agentType: 'ClaudeResearcher', label: 'claude-3', role: 'explorer', angle: 'contrarian angle A — fact-based counterevidence' },
  { agentType: 'GeminiResearcher', label: 'gemini-4', role: 'explorer', angle: 'contrarian angle B — fact-based counterevidence' },
  { agentType: 'PerplexityResearcher', label: 'verify-claims', role: 'verifier', angle: 'independently verify the most commonly cited facts, statistics, and dates — quantitative claims first, they are most likely wrong' },
  { agentType: 'ClaudeResearcher', label: 'find-contradictions', role: 'verifier', angle: 'contradictory evidence, debunked claims, and common misconceptions' },
]

// ---- Structured-output schemas (validated + retried at the tool layer) ----

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['claim', 'confidence', 'urls'],
        properties: {
          claim: { type: 'string' },
          confidence: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
          urls: { type: 'array', items: { type: 'string' } },
          source: { type: 'string' },
        },
      },
    },
  },
}

const VERIFIED_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['claim', 'confidence', 'urls'],
        properties: {
          claim: { type: 'string' },
          confidence: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
          urls: { type: 'array', items: { type: 'string' } },
          droppedUrls: { type: 'array', items: { type: 'string' } },
          source: { type: 'string' },
        },
      },
    },
  },
}

// ---- Entry ----

const question = (args && args.question) || (typeof args === 'string' ? args : '')
const depth = (args && args.depth) || 'standard'
if (!question) throw new Error('research.mjs requires args.question')

const roster = depth === 'extensive' ? EXTENSIVE_ROSTER : depth === 'quick' ? QUICK_ROSTER : STANDARD_ROSTER
log(`research: "${question}" — depth=${depth}, ${roster.length} agents`)

// Search: parallel fan-out. Barrier — both batch-verify and synthesis need all findings,
// and URL verification is cheap, so a single post-barrier verify beats N per-researcher
// verify agents (faithful to the prose's single orchestrator batch-curl; see ISA D-5).
const found = (
  await parallel(
    roster.map(
      (r) => () =>
        agent(
          `Research this question with ONE focused search: "${question}".\n` +
            `Your angle: ${r.angle}.\n` +
            `Tag every finding [HIGH], [MED], or [LOW]. Include the source URL(s) for each finding. ` +
            `Self-verify each URL before returning — research agents hallucinate URLs and a single broken link is a catastrophic failure.`,
          { agentType: r.agentType, label: `search:${r.label}`, phase: 'Search', schema: FINDINGS_SCHEMA },
        ),
    ),
  )
).map((res, i) => ({ roster: roster[i], res }))

// Verify: ONE batch agent curls every collected URL. Runs inside an agent because the
// workflow sandbox has no Bash/curl (see ISA D-3).
phase('Verify')
const flatFindings = found
  .filter((x) => x.res)
  .flatMap((x) =>
    ((x.res && x.res.findings) || []).map((f) => ({ ...f, by: x.roster.label, role: x.roster.role || 'researcher' })),
  )
const verified = await agent(
  `You are the URL-verification gate. For EVERY url across the findings below run ` +
    `\`curl -s -o /dev/null -w "%{http_code}" -L <url>\` and confirm the content matches the claim. ` +
    `Move any url that is not 200 (or whose content does not match) into droppedUrls. ` +
    `If a finding's only support was a dropped url, downgrade its confidence one level. Return the cleaned findings.\n` +
    `FINDINGS:\n${JSON.stringify(flatFindings)}`,
  { label: 'url-verify', phase: 'Verify', schema: VERIFIED_SCHEMA },
)

// Synthesize: cross-check explorers vs verifiers (by role), confidence-tag, cite.
const vf = (verified && verified.findings) || []
const explorerFindings = depth === 'extensive' ? vf.filter((f) => f.role !== 'verifier') : vf
const verifierFindings = depth === 'extensive' ? vf.filter((f) => f.role === 'verifier') : []

phase('Synthesize')
const report = await agent(
  `Synthesize a cited research report answering: "${question}".\n\n` +
    `EXPLORER findings (JSON):\n${JSON.stringify(explorerFindings)}\n\n` +
    (verifierFindings.length
      ? `VERIFIER findings (independent, topic-level) (JSON):\n${JSON.stringify(verifierFindings)}\n\n`
      : '') +
    `Rules:\n` +
    `- Cross-check confidence: explorers agree OR a verifier confirms an explorer -> [HIGH]; single-source -> [MED]; ` +
    `verifier contradicts explorer -> [CONFLICT] with both sides quoted; unconfirmed -> [LOW].\n` +
    `- Every claim keeps a verified URL. Never invent or restore a dropped URL.\n` +
    `- Structure: ## Executive Summary, ## Verified Findings (by theme, each tagged), ` +
    `## Conflicts & Low-Confidence, then a numbered STORY EXPLANATION ` +
    `(${depth === 'extensive' ? '8' : depth === 'quick' ? '3-5' : '5-8'} points, each a standalone thought suitable for social extraction).`,
  { label: 'synthesize', phase: 'Synthesize' },
)

return { question, depth, agents: roster.length, report }
