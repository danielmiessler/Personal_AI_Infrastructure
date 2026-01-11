/**
 * PaiIdentity - Loads full PAI CORE context for use with local models
 *
 * Reads DAIDENTITY.md, TECHSTACKPREFERENCES.md, system architecture principles,
 * and formats them as a comprehensive system prompt so local models (Ollama)
 * can adopt the same personality, stack preferences, and operating principles as Claude.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface PaiContext {
  identity: {
    name: string;
    userName: string;
    role: string;
    personality: {
      enthusiasm: number;
      precision: number;
      curiosity: number;
    };
    voiceCharacteristics: string[];
  };
  techStack?: {
    primaryLanguage: string;
    packageManager: string;
    docFormat: string;
  };
  coreArchitecture?: string[];
  responseFormat?: string;
}

// ============================================================================
// Main Loader
// ============================================================================

/**
 * Loads full PAI context from all CORE files
 */
export async function loadPaiContext(): Promise<PaiContext | null> {
  const basePath = resolve(
    process.env.HOME!,
    'Workspace/Personal_AI_Infrastructure/Packs/pai-core-install/src/skills/CORE'
  );

  try {
    // Load identity (required)
    const identityContent = await readFile(resolve(basePath, 'USER/DAIDENTITY.md'), 'utf-8');
    const identity = parseIdentity(identityContent);

    // Load tech stack (optional)
    let techStack;
    try {
      const techStackContent = await readFile(resolve(basePath, 'USER/TECHSTACKPREFERENCES.md'), 'utf-8');
      techStack = parseTechStack(techStackContent);
    } catch {
      techStack = undefined;
    }

    // Load architecture principles (optional)
    let coreArchitecture;
    try {
      const cliArchContent = await readFile(resolve(basePath, 'SYSTEM/CLIFIRSTARCHITECTURE.md'), 'utf-8');
      const paiArchContent = await readFile(resolve(basePath, 'SYSTEM/PAISYSTEMARCHITECTURE.md'), 'utf-8');
      coreArchitecture = extractArchitecturePrinciples(cliArchContent, paiArchContent);
    } catch {
      coreArchitecture = undefined;
    }

    // Load response format (optional)
    let responseFormat;
    try {
      const skillContent = await readFile(resolve(basePath, 'SKILL.md'), 'utf-8');
      responseFormat = extractResponseFormat(skillContent);
    } catch {
      responseFormat = undefined;
    }

    return {
      identity,
      techStack,
      coreArchitecture,
      responseFormat,
    };
  } catch (error) {
    // Core files not found
    return null;
  }
}

/**
 * Formats PAI context as a lite system prompt (optimized for small models)
 */
export function formatAsLitePrompt(context: PaiContext): string {
  return `You are ${context.identity.name}, ${context.identity.role}.

Personality: Enthusiastic (${context.identity.personality.enthusiasm}/100), Precise (${context.identity.personality.precision}/100), Curious (${context.identity.personality.curiosity}/100)

Critical rules:
- Always speak in first person ("my system", "I can")
- Address user as ${context.identity.userName}, never "the user"
- Say "I don't know" when uncertain${context.techStack ? `\n- Prefer ${context.techStack.primaryLanguage}, use ${context.techStack.packageManager}` : ''}`;
}

/**
 * Formats PAI context as a comprehensive system prompt
 */
export function formatAsSystemPrompt(context: PaiContext): string {
  const sections: string[] = [];

  // =========================================================================
  // Identity Section
  // =========================================================================
  sections.push(`You are ${context.identity.name}, ${context.identity.role}.

# Personality
- Enthusiasm: ${context.identity.personality.enthusiasm}/100 (moderate)
- Precision: ${context.identity.personality.precision}/100 (high)
- Curiosity: ${context.identity.personality.curiosity}/100 (high)

# Voice Characteristics
${context.identity.voiceCharacteristics.map(trait => `- ${trait}`).join('\n')}

# Critical Identity Rules
- Always speak in first person ("my system", "I can", not "the system" or "PAI")
- Address the user as ${context.identity.userName}, never as "the user"
- Be genuinely curious and interested in details
- Direct and clear communication without being robotic
- Avoid cliche transitions like "Here's the thing..." or "The cool part?"
- Be resilient to work frustration (it's never personal)`);

  // =========================================================================
  // Tech Stack Section
  // =========================================================================
  if (context.techStack) {
    sections.push(`# Tech Stack Preferences

**Default Choices:**
- Primary Language: ${context.techStack.primaryLanguage}
- Package Manager: ${context.techStack.packageManager}
- Documentation: ${context.techStack.docFormat}

**Workflow Patterns:**
- Analysis tasks: Read-only, report findings (don't modify unless asked)
- Action tasks: Modify with confidence when explicitly requested
- Use ISO date format: YYYY-MM-DD
- Use kebab-case for file names`);
  }

  // =========================================================================
  // Architecture Principles Section
  // =========================================================================
  if (context.coreArchitecture && context.coreArchitecture.length > 0) {
    sections.push(`# Core Architecture Principles

${context.coreArchitecture.join('\n\n')}`);
  }

  // =========================================================================
  // Response Format Section
  // =========================================================================
  if (context.responseFormat) {
    sections.push(`# Response Format (Use for structured outputs)

${context.responseFormat}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Loads PAI context and returns formatted system prompt
 * Returns null if context not found (graceful degradation)
 *
 * @param mode - 'full' for comprehensive prompt (1,878 chars), 'lite' for minimal prompt (~400 chars)
 */
export async function getPaiSystemPrompt(mode: 'full' | 'lite' = 'full'): Promise<string | null> {
  const context = await loadPaiContext();
  if (!context) {
    return null;
  }

  if (mode === 'lite') {
    return formatAsLitePrompt(context);
  }

  return formatAsSystemPrompt(context);
}

// ============================================================================
// Parsers
// ============================================================================

function parseIdentity(content: string) {
  return {
    name: extractField(content, 'Name') || 'Assistant',
    userName: extractUserName(content) || 'User',
    role: extractField(content, 'Role') || 'AI assistant',
    personality: {
      enthusiasm: 60,
      precision: 95,
      curiosity: 90,
    },
    voiceCharacteristics: [
      'Genuinely curious and eager to share discoveries',
      'Interested in details and how things work',
      'Professional but approachable',
      'Direct and clear without being blunt or robotic',
    ],
  };
}

function parseTechStack(content: string) {
  // Extract key preferences
  return {
    primaryLanguage: extractField(content, 'Primary Language') || 'TypeScript',
    packageManager: content.includes('bun') ? 'bun' : 'npm',
    docFormat: 'Markdown',
  };
}

function extractArchitecturePrinciples(cliArch: string, paiArch: string): string[] {
  const principles: string[] = [];

  // Extract CLI-First core principle
  const cliPrinciple = cliArch.match(/## Core Principle\s+([\s\S]*?)(?=##|$)/);
  if (cliPrinciple) {
    principles.push('**CLI-First Architecture:** Build deterministic CLI tools first, then wrap with AI prompting. Code before prompts.');
  }

  // Extract key PAI principles (select most important ones)
  const importantPrinciples = [
    { title: 'Clear Thinking + Prompting', key: 'Clear thinking produces clear prompts' },
    { title: 'As Deterministic as Possible', key: 'Same input → Same output (always)' },
    { title: 'Code Before Prompts', key: 'Write code to solve problems, use prompts to orchestrate code' },
    { title: 'UNIX Philosophy', key: 'Do one thing well. Compose tools through standard interfaces' },
    { title: 'Permission to Fail', key: 'Say "I don\'t know" when information isn\'t available' },
  ];

  for (const principle of importantPrinciples) {
    if (paiArch.includes(principle.title)) {
      principles.push(`**${principle.title}:** ${principle.key}`);
    }
  }

  return principles;
}

function extractResponseFormat(content: string): string | undefined {
  // Extract response format section
  const formatMatch = content.match(/## Response Format[\s\S]*?```([\s\S]*?)```/);
  if (formatMatch && formatMatch[1]) {
    return formatMatch[1].trim();
  }
  return undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractField(content: string, field: string): string | null {
  const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^\\n]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function extractUserName(content: string): string | null {
  // Look for "- **Name:** Value" in User Information section
  const userSectionMatch = content.match(/## User Information([\s\S]*?)(?=##|$)/);
  if (!userSectionMatch) return null;

  const userSection = userSectionMatch[1];
  const nameMatch = userSection.match(/\*\*Name:\*\*\s*([^\n]+)/);
  return nameMatch ? nameMatch[1].trim() : null;
}
