/**
 * methodology-help.ts - Inline Methodology Help System
 *
 * Provides help content for PKM methodologies: PARA, Zettelkasten, Luhmann, Fabric.
 *
 * REQ-METHOD-HELP-001 from cultivation-practices-v1.2
 */

// ============================================================================
// PARA Method Help
// ============================================================================

export function getParaHelp(): string {
  return `
PARA METHOD - Organize by Actionability
═══════════════════════════════════════

📁 PROJECTS (status/project)
   Active tasks with a deadline or end goal
   "What am I actively working on?"

   Examples: Launch website, Write report, Plan trip

📂 AREAS (status/area)
   Ongoing responsibilities without deadlines
   "What roles/standards must I maintain?"

   Examples: Health, Finance, Career, Relationships

📚 RESOURCES (status/resource)
   Topics of interest for future reference
   "What might be useful someday?"

   Examples: Recipes, Travel guides, Research topics

🗄️ ARCHIVE (status/archived)
   Completed or inactive items
   "What's done or no longer relevant?"

   Examples: Finished projects, Old references

DECISION TREE
─────────────
1. Is it actionable?
   → No → Resources or Archive

2. Has a deadline or end goal?
   → Yes → Projects

3. Ongoing responsibility?
   → Yes → Areas

COMMON MISTAKES
───────────────
• Putting reference material in Projects
• Confusing Areas (ongoing) with Projects (finite)
• Keeping completed items in Projects instead of Archive
`.trim();
}

// ============================================================================
// Zettelkasten Help
// ============================================================================

export function getZkHelp(): string {
  return `
ZETTELKASTEN - Build Knowledge Through Connection
══════════════════════════════════════════════════

ATOMIC NOTES
────────────
• One idea per note
• Can be summarized in one sentence
• Self-contained but linkable

  Good: "Compound interest accelerates wealth growth exponentially"
  Bad:  "All my thoughts on investing" (too broad)

LINKING PHILOSOPHY
──────────────────
• Connections create value, not individual notes
• Links are more important than categories
• Cross-domain links are most valuable

  Ask: "What does this remind me of?"
  Ask: "Where else does this apply?"

GROWTH PATTERN
──────────────
• Start small, grow organically
• Structure will emerge from connections
• Don't pre-organize; let it evolve

  ❌ Don't: Create elaborate folder hierarchies first
  ✅ Do: Write notes, link them, see what clusters form

THE POWER OF LINKING
────────────────────
When you link two notes, you're saying:
"These ideas have a relationship worth remembering."

The more surprising the connection, the more valuable.
`.trim();
}

// ============================================================================
// Luhmann Help
// ============================================================================

export function getLuhmannHelp(): string {
  return `
LUHMANN'S APPROACH - The Slip-Box as Partner
═════════════════════════════════════════════

THE METHOD
──────────
• Created 90,000+ notes over 40 years
• Published 70+ books and 400+ articles
• No hierarchical organization
• Connections drove discovery

HOW HE WORKED
─────────────
1. READ with purpose, not to accumulate
   "What problem does this help me solve?"

2. WRITE in your own words (understanding test)
   If you can't explain it simply, you don't understand it

3. LINK to existing notes (where does this fit?)
   "What existing ideas does this connect to?"

4. LET clusters emerge (don't force structure)
   Themes will reveal themselves through links

THE DAILY PRACTICE
──────────────────
• Review recent notes
• Look for unexpected connections
• Follow the links, not the folders
• Let the slip-box surprise you

KEY INSIGHT
───────────
"I don't think everything on my own.
 It happens mainly within the slip-box."

 — Niklas Luhmann

Your notes become a conversation partner.
Surprising connections lead to new ideas.
The slip-box thinks with you, not for you.
`.trim();
}

// ============================================================================
// Fabric Help
// ============================================================================

export function getFabricHelp(): string {
  return `
FABRIC PATTERNS FOR WEAVE
═════════════════════════

Fabric processes notes through AI patterns, creating derived notes
while preserving the original source.

RECOMMENDED PATTERNS
────────────────────
extract_wisdom    Key insights, lessons learned, memorable quotes
extract_insights  Main takeaways and implications
summarize         Concise summary of content
extract_main_idea Core concept in one sentence
create_mermaid    Visual diagram of concepts

USAGE
─────
ctx weave --fabric extract_wisdom note.md
ctx weave --fabric summarize note.md
ctx weave --fabric-list              # See all patterns

DERIVED NOTES
─────────────
• Source note is NEVER modified
• New file created: {source}-{pattern}.md
• Frontmatter links back to source:

  derived_from: "[[original-note]]"
  fabric_pattern: extract_wisdom

• Find derived notes via backlinks in source

SESSION INTEGRATION
───────────────────
Derived notes created during a weave session
are tagged with the session tag, keeping all
work traceable.

[🧵 weave-2025-12-23-1030] Processing note.md...
`.trim();
}

// ============================================================================
// Weave-Specific Methodology Help
// ============================================================================

/**
 * PARA guidance specifically for weave sessions (connection-making focus)
 * REQ-METHOD-WEAVE-001
 */
export function getWeaveParaHelp(): string {
  return `
PARA CONNECTION GUIDE FOR WEAVE
═══════════════════════════════

During weave, consider how notes connect across PARA buckets.

CROSS-BUCKET CONNECTIONS
────────────────────────
📁 Projects ←→ 📚 Resources
   "What resources support this active project?"
   "Which projects could use this reference material?"

📂 Areas ←→ 📚 Resources
   "What resources strengthen this area of responsibility?"
   "Which areas benefit from this knowledge?"

📁 Projects ←→ 📂 Areas
   "Which ongoing areas spawn new projects?"
   "How does this project serve a larger area?"

ACTIONABILITY LINKING
─────────────────────
• Connect resources to where they'll be USED (projects/areas)
• Link projects to their supporting knowledge base
• Bridge areas to specific actionable projects

WEAVE QUESTIONS
───────────────
• "If this note is a resource, where will it be applied?"
• "If this note is a project, what resources support it?"
• "Does this connection increase actionability?"

AVOID
─────
• Orphan resources with no project/area connections
• Projects without supporting resource links
• Areas that don't generate projects
`.trim();
}

/**
 * Zettelkasten guidance specifically for weave sessions (linking focus)
 * REQ-METHOD-WEAVE-001
 */
export function getWeaveZkHelp(): string {
  return `
ZETTELKASTEN LINKING GUIDE FOR WEAVE
════════════════════════════════════

During weave, apply Luhmann's connection-making principles.

CONNECTION PHILOSOPHY
─────────────────────
• Links are MORE valuable than the notes themselves
• Every connection is a potential insight waiting to emerge
• The best links surprise you—they weren't obvious

CROSS-DOMAIN LINKING
────────────────────
The most valuable connections bridge different domains:

  Biology ←→ Business
  "Natural selection applies to market competition"

  Physics ←→ Psychology
  "Entropy applies to attention and focus"

  History ←→ Technology
  "Past innovation patterns predict future trends"

WEAVE QUESTIONS
───────────────
• "What does this note remind me of in a completely different field?"
• "What would happen if I applied this idea elsewhere?"
• "What surprising connection exists that I haven't made?"

LUHMANN'S EMERGENT STRUCTURE
────────────────────────────
• Don't force notes into categories
• Let clusters emerge from connections
• Structure reveals itself through linking
• Trust the process—meaning will emerge

CONNECTION TYPES
────────────────
→ SUPPORTS: This idea reinforces that idea
→ CONTRADICTS: These ideas are in tension
→ EXTENDS: This builds on that foundation
→ APPLIES: This example demonstrates that principle
`.trim();
}

// ============================================================================
// Help Router
// ============================================================================

type MethodologyName = "para" | "zk" | "zettelkasten" | "luhmann" | "fabric";

const METHODOLOGY_ALIASES: Record<string, MethodologyName> = {
  para: "para",
  zk: "zk",
  zettelkasten: "zk",
  luhmann: "luhmann",
  fabric: "fabric",
};

/**
 * Get help content for a methodology by name
 */
export function getMethodologyHelp(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  const methodology = METHODOLOGY_ALIASES[normalized];

  if (!methodology) {
    return null;
  }

  switch (methodology) {
    case "para":
      return getParaHelp();
    case "zk":
    case "zettelkasten":
      return getZkHelp();
    case "luhmann":
      return getLuhmannHelp();
    case "fabric":
      return getFabricHelp();
    default:
      return null;
  }
}

/**
 * Get list of available methodology help topics
 */
export function getAvailableMethodologies(): string[] {
  return ["para", "zk", "luhmann", "fabric"];
}

/**
 * Format help with header for CLI display
 */
export function formatHelpForCli(methodology: string): string {
  const help = getMethodologyHelp(methodology);
  if (!help) {
    const available = getAvailableMethodologies().join(", ");
    return `Unknown methodology: ${methodology}\n\nAvailable: ${available}`;
  }
  return help;
}
