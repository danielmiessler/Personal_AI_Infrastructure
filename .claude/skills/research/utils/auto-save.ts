/**
 * Autonomous Completion System
 *
 * Auto-saves research results for safe tasks while requiring review for risky ones.
 * Implements TAC Tactic #4 (Let Agents Ship) with appropriate safety gates.
 *
 * Risk Classification:
 * - SAFE: Factual research, no decision-making impact
 * - REVIEW: Research informing decisions, needs human validation
 * - MANUAL: High-stakes research, requires human oversight
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ResearchResult {
  agent_id: string;
  agent_type: string;
  query: string;
  content: string;
  sources: any[];
  confidence?: number;
  validated?: boolean;
  timestamp?: string;
}

export type RiskLevel = 'safe' | 'review' | 'manual';

export interface TaskClassification {
  riskLevel: RiskLevel;
  reason: string;
  autoSaveEnabled: boolean;
}

export interface AutoSaveResult {
  saved: boolean;
  filePath?: string;
  timestamp: string;
  notification: string;
  rollbackPath?: string;
}

/**
 * Classify task risk based on query content
 */
export function classifyTaskRisk(query: string): TaskClassification {
  const lowerQuery = query.toLowerCase();

  // HIGH RISK: Decision-making or financial queries
  const highRiskIndicators = [
    'should i',
    'recommend',
    'invest',
    'buy',
    'sell',
    'choose',
    'decide',
    'strategy',
    'medical',
    'legal',
    'financial advice'
  ];

  for (const indicator of highRiskIndicators) {
    if (lowerQuery.includes(indicator)) {
      return {
        riskLevel: 'manual',
        reason: `Decision-making query detected: "${indicator}"`,
        autoSaveEnabled: false
      };
    }
  }

  // MEDIUM RISK: Research that informs important decisions
  const mediumRiskIndicators = [
    'compare',
    'pros and cons',
    'best practices',
    'how to',
    'guide',
    'options for',
    'alternatives',
    'impact of'
  ];

  for (const indicator of mediumRiskIndicators) {
    if (lowerQuery.includes(indicator)) {
      return {
        riskLevel: 'review',
        reason: `Informational research requiring review: "${indicator}"`,
        autoSaveEnabled: false
      };
    }
  }

  // LOW RISK: Factual, informational queries
  const safeIndicators = [
    'what is',
    'define',
    'explain',
    'history of',
    'when did',
    'who is',
    'where is',
    'fact check',
    'latest news',
    'recent developments'
  ];

  for (const indicator of safeIndicators) {
    if (lowerQuery.includes(indicator)) {
      return {
        riskLevel: 'safe',
        reason: `Factual research query: "${indicator}"`,
        autoSaveEnabled: true
      };
    }
  }

  // Default to REVIEW if unclear
  return {
    riskLevel: 'review',
    reason: 'Query type unclear - defaulting to manual review',
    autoSaveEnabled: false
  };
}

/**
 * Additional safety check: confidence-based gating
 */
export function shouldAutoSave(
  classification: TaskClassification,
  confidence: number,
  minConfidence: number = 0.70
): boolean {
  // Never auto-save if task is risky
  if (!classification.autoSaveEnabled) {
    return false;
  }

  // Only auto-save if confidence meets threshold
  return confidence >= minConfidence;
}

/**
 * Generate timestamped filename for research result
 */
function generateFilename(query: string, timestamp: string): string {
  // Sanitize query for filename
  const sanitized = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50); // Limit length

  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  return `${dateStr}-${sanitized}.md`;
}

/**
 * Format research result as markdown
 */
function formatResultAsMarkdown(
  result: ResearchResult,
  classification: TaskClassification,
  confidence: number
): string {
  const timestamp = new Date(result.timestamp || Date.now()).toISOString();

  let markdown = `# Research Result: ${result.query}\n\n`;
  markdown += `**Generated**: ${timestamp}\n`;
  markdown += `**Agent**: ${result.agent_id} (${result.agent_type})\n`;
  markdown += `**Confidence**: ${Math.round(confidence * 100)}%\n`;
  markdown += `**Risk Level**: ${classification.riskLevel.toUpperCase()}\n`;
  markdown += `**Validated**: ${result.validated ? 'Yes' : 'No'}\n\n`;

  markdown += `---\n\n`;

  markdown += `## Query\n\n${result.query}\n\n`;

  markdown += `## Result\n\n${result.content}\n\n`;

  if (result.sources && result.sources.length > 0) {
    markdown += `## Sources\n\n`;
    result.sources.forEach((source, idx) => {
      markdown += `${idx + 1}. **${source.title}**\n`;
      if (source.url) markdown += `   - URL: ${source.url}\n`;
      if (source.type) markdown += `   - Type: ${source.type}\n`;
      if (source.publication) markdown += `   - Publication: ${source.publication}\n`;
      if (source.date) markdown += `   - Date: ${source.date}\n`;
      markdown += `\n`;
    });
  }

  markdown += `---\n\n`;
  markdown += `*Auto-saved by PAI Research Skill*\n`;

  return markdown;
}

/**
 * Save research result to file
 */
export async function autoSaveResult(
  result: ResearchResult,
  classification: TaskClassification,
  confidence: number,
  outputDir: string = './research-output'
): Promise<AutoSaveResult> {
  const timestamp = new Date().toISOString();

  // Check if auto-save should proceed
  if (!shouldAutoSave(classification, confidence)) {
    return {
      saved: false,
      timestamp,
      notification: `⚠️  Auto-save skipped: ${classification.reason} (confidence: ${Math.round(confidence * 100)}%)`
    };
  }

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename and path
    const filename = generateFilename(result.query, timestamp);
    const filePath = path.join(outputDir, filename);

    // Format result as markdown
    const markdown = formatResultAsMarkdown(result, classification, confidence);

    // Write to file
    fs.writeFileSync(filePath, markdown, 'utf-8');

    return {
      saved: true,
      filePath,
      timestamp,
      notification: `✅ Auto-saved to: ${filePath}`,
      rollbackPath: filePath
    };
  } catch (error) {
    return {
      saved: false,
      timestamp,
      notification: `❌ Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Rollback/delete auto-saved file if needed
 */
export function rollbackAutoSave(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Rollback failed: ${error}`);
    return false;
  }
}

/**
 * List all auto-saved results in directory
 */
export function listAutoSavedResults(outputDir: string = './research-output'): string[] {
  try {
    if (!fs.existsSync(outputDir)) {
      return [];
    }

    return fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(outputDir, file));
  } catch (error) {
    console.error(`Failed to list results: ${error}`);
    return [];
  }
}

/**
 * Complete workflow: classify, validate, auto-save
 */
export async function handleResearchCompletion(
  result: ResearchResult,
  confidence: number,
  outputDir?: string
): Promise<{
  classification: TaskClassification;
  autoSaveResult: AutoSaveResult;
  requiresReview: boolean;
}> {
  // Step 1: Classify task risk
  const classification = classifyTaskRisk(result.query);

  // Step 2: Attempt auto-save
  const autoSaveResult = await autoSaveResult(
    result,
    classification,
    confidence,
    outputDir
  );

  // Step 3: Determine if human review needed
  const requiresReview = !autoSaveResult.saved;

  return {
    classification,
    autoSaveResult,
    requiresReview
  };
}

/**
 * Configuration options for auto-save behavior
 */
export interface AutoSaveConfig {
  enabled: boolean;
  outputDir: string;
  minConfidence: number;
  safeTasksOnly: boolean;
  notificationStyle: 'emoji' | 'text' | 'silent';
}

export const DEFAULT_CONFIG: AutoSaveConfig = {
  enabled: true,
  outputDir: './research-output',
  minConfidence: 0.70,
  safeTasksOnly: true,
  notificationStyle: 'emoji'
};
