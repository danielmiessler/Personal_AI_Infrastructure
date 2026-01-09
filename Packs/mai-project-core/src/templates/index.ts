/**
 * Template loader and renderer for project templates
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ProjectType, ProjectState } from '../types/project.ts';
import type { Gate } from '../types/gate.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type TemplateType = ProjectType | 'local';

/**
 * Load a template file
 */
export function loadTemplate(templateType: TemplateType): string {
  const templatePath = join(__dirname, `${templateType}.md`);
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Template variables for rendering
 */
export interface TemplateVariables {
  [key: string]: string | undefined;
}

/**
 * Render a template with variables
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value || '');
  }

  return result;
}

/**
 * Format gates as a markdown table
 */
export function formatGatesTable(gates: Gate[]): string {
  return gates
    .map(gate => {
      const status = gate.status === 'approved' ? '✅ Approved' :
                     gate.status === 'rejected' ? '❌ Rejected' :
                     '⏳ Pending';
      const date = gate.approvedAt?.split('T')[0] || '-';
      return `| ${gate.name} | ${status} | ${date} |`;
    })
    .join('\n');
}

/**
 * Generate CLAUDE.md content for a project
 */
export function generateClaudeMd(state: ProjectState): string {
  const template = loadTemplate(state.identity.type);

  const nextGate = state.gates.find(g => g.status === 'pending');

  const variables: TemplateVariables = {
    PROJECT_NAME: state.identity.name,
    OWNER: state.identity.owner,
    PHASE: state.phase,
    CURRENT_PHASE: state.phase,
    REQUIRED_GATE: nextGate?.name || 'None',
    GATES_TABLE: formatGatesTable(state.gates),
    PROBLEM_STATEMENT: state.identity.description || '_Define the problem this project solves_',
    SUCCESS_CRITERIA_LIST: '_Define success criteria_',
    CONSTRAINTS_LIST: '_Define constraints_',
    MVP_DEFINITION: '_Define minimum viable product_',
    TASK_LIST_LOCATION: '_Define task list location (Joplin, Linear, etc.)_',
    SECURITY_CONSIDERATIONS: '_Document security considerations_',
  };

  return renderTemplate(template, variables);
}

/**
 * Generate CLAUDE.local.md content
 */
export function generateLocalMd(options: {
  timestamp: string;
  sessionId: string;
  currentTask: string;
  currentStep: string;
  modifiedFiles: string[];
  recentDecisions: string[];
  agents: Array<{ id: string; task: string; status: string }>;
  resumeInstructions: string;
}): string {
  const template = loadTemplate('local');

  const agentRows = options.agents.length > 0
    ? options.agents.map(a => `| ${a.id} | ${a.task} | ${a.status} |`).join('\n')
    : '| - | No agents spawned | - |';

  const decisions = options.recentDecisions.length > 0
    ? options.recentDecisions.map(d => `- ${d}`).join('\n')
    : '- No decisions recorded';

  const variables: TemplateVariables = {
    ISO_TIMESTAMP: options.timestamp,
    SESSION_ID: options.sessionId,
    CURRENT_TASK_TITLE: options.currentTask,
    CURRENT_STEP_DESCRIPTION: options.currentStep,
    COMMA_SEPARATED_FILE_PATHS: options.modifiedFiles.join(', ') || 'None',
    BULLETED_LIST_OF_DECISIONS_WITH_RATIONALE: decisions,
    AGENT_ROWS: agentRows,
    FREE_TEXT_RESUME_GUIDANCE: options.resumeInstructions,
  };

  return renderTemplate(template, variables);
}

/**
 * Available template types
 */
export const TEMPLATE_TYPES: TemplateType[] = [
  'software',
  'physical',
  'documentation',
  'infrastructure',
  'local',
];
