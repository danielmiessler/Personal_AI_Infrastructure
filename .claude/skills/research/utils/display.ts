/**
 * Confidence Scoring Display System
 *
 * Generates visual confidence indicators and comprehensive result reports
 * Implements transparent confidence scoring (Feature 5)
 */

import { ResearchResult } from './confidence';
import { ConfidenceBreakdown, getConfidenceBreakdown } from './confidence';
import { ValidationResult } from './validation';

export interface DisplayConfig {
  showEmojis: boolean;
  showBreakdown: boolean;
  showSources: boolean;
  showValidation: boolean;
  colorize: boolean;
}

const DEFAULT_CONFIG: DisplayConfig = {
  showEmojis: true,
  showBreakdown: true,
  showSources: true,
  showValidation: true,
  colorize: false // Terminal color support optional
};

/**
 * Get emoji indicator for confidence level
 */
function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 0.8) return '✅'; // High confidence
  if (confidence >= 0.6) return '⚠️'; // Medium confidence
  if (confidence >= 0.4) return '⚡'; // Low confidence
  return '❌'; // Very low confidence
}

/**
 * Get text indicator for confidence level
 */
function getConfidenceText(confidence: number): string {
  if (confidence >= 0.8) return 'HIGH';
  if (confidence >= 0.6) return 'MEDIUM';
  if (confidence >= 0.4) return 'LOW';
  return 'VERY LOW';
}

/**
 * Format confidence percentage
 */
function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Create confidence bar visualization
 */
function createConfidenceBar(confidence: number, width: number = 20): string {
  const filled = Math.round(confidence * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}]`;
}

/**
 * Format factor breakdown for display
 */
function formatFactorBreakdown(breakdown: ConfidenceBreakdown): string {
  const { factors } = breakdown;

  let output = '\n  Factor Breakdown:\n';
  output += `    Source Quality:  ${formatConfidencePercent(factors.sourceQuality).padEnd(5)} ${createConfidenceBar(factors.sourceQuality, 10)}\n`;
  output += `    Source Count:    ${formatConfidencePercent(factors.sourceCount).padEnd(5)} ${createConfidenceBar(factors.sourceCount, 10)}\n`;
  output += `    Agent Agreement: ${formatConfidencePercent(factors.agentAgreement).padEnd(5)} ${createConfidenceBar(factors.agentAgreement, 10)}\n`;
  output += `    Specificity:     ${formatConfidencePercent(factors.specificity).padEnd(5)} ${createConfidenceBar(factors.specificity, 10)}\n`;

  return output;
}

/**
 * Format validation results for display
 */
function formatValidationResults(
  sourceCheck: ValidationResult,
  confidenceCheck: ValidationResult,
  contradictionCheck: ValidationResult
): string {
  let output = '\n  Validation Gates:\n';

  const formatGate = (name: string, result: ValidationResult): string => {
    const emoji = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    return `    ${emoji} ${name.padEnd(20)} ${result.status.toUpperCase().padEnd(8)} - ${result.message}\n`;
  };

  output += formatGate('Source Citations', sourceCheck);
  output += formatGate('Confidence Threshold', confidenceCheck);
  output += formatGate('Contradictions', contradictionCheck);

  return output;
}

/**
 * Format sources for display
 */
function formatSources(result: ResearchResult): string {
  if (!result.sources || result.sources.length === 0) {
    return '\n  Sources: None\n';
  }

  let output = '\n  Sources:\n';

  result.sources.forEach((source, idx) => {
    output += `    ${idx + 1}. ${source.title}\n`;
    if (source.type) {
      output += `       Type: ${source.type}\n`;
    }
    if (source.url) {
      output += `       URL: ${source.url}\n`;
    }
  });

  return output;
}

/**
 * Display single research result with confidence scoring
 */
export function displayResult(
  result: ResearchResult,
  allResults: ResearchResult[] = [],
  config: Partial<DisplayConfig> = {}
): string {
  const displayConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate confidence if not already present
  const confidence = result.confidence || 0;
  const breakdown = getConfidenceBreakdown(result, allResults);

  let output = '';

  // Header
  output += '\n' + '='.repeat(80) + '\n';
  output += `Agent: ${result.agent_id} (${result.agent_type})\n`;
  output += `Query: ${result.query}\n`;
  output += '='.repeat(80) + '\n';

  // Confidence Score
  const emoji = displayConfig.showEmojis ? getConfidenceEmoji(confidence) + ' ' : '';
  output += `\n${emoji}CONFIDENCE: ${formatConfidencePercent(confidence)} (${getConfidenceText(confidence)})\n`;
  output += `  ${createConfidenceBar(confidence, 40)}\n`;

  // Factor Breakdown
  if (displayConfig.showBreakdown) {
    output += formatFactorBreakdown(breakdown);
  }

  // Interpretation
  output += `\n  ${breakdown.interpretation}\n`;

  // Sources
  if (displayConfig.showSources) {
    output += formatSources(result);
  }

  // Result Content (preview)
  output += '\n  Result Preview:\n';
  const preview = result.content.substring(0, 300);
  output += `    ${preview}${result.content.length > 300 ? '...' : ''}\n`;

  output += '\n' + '='.repeat(80) + '\n';

  return output;
}

/**
 * Display comprehensive research report with all results
 */
export function displayResearchReport(
  results: ResearchResult[],
  validation?: {
    sourceCheck: ValidationResult;
    confidenceCheck: ValidationResult;
    contradictionCheck: ValidationResult;
  },
  config: Partial<DisplayConfig> = {}
): string {
  const displayConfig = { ...DEFAULT_CONFIG, ...config };

  let output = '';

  // Header
  output += '\n' + '━'.repeat(80) + '\n';
  output += '  RESEARCH REPORT\n';
  output += '━'.repeat(80) + '\n';

  // Summary Statistics
  const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
  const highConfidence = results.filter(r => (r.confidence || 0) >= 0.7).length;
  const totalSources = results.reduce((sum, r) => sum + (r.sources?.length || 0), 0);

  output += '\n📊 Summary:\n';
  output += `  Total Results: ${results.length}\n`;
  output += `  Average Confidence: ${formatConfidencePercent(avgConfidence)} ${createConfidenceBar(avgConfidence, 20)}\n`;
  output += `  High Confidence Results: ${highConfidence}/${results.length}\n`;
  output += `  Total Sources: ${totalSources}\n`;

  // Validation Results
  if (displayConfig.showValidation && validation) {
    output += formatValidationResults(
      validation.sourceCheck,
      validation.confidenceCheck,
      validation.contradictionCheck
    );
  }

  // Individual Results
  output += '\n' + '─'.repeat(80) + '\n';
  output += '  INDIVIDUAL RESULTS\n';
  output += '─'.repeat(80) + '\n';

  results.forEach((result, idx) => {
    output += `\n[Result ${idx + 1}/${results.length}]\n`;
    output += displayResult(result, results, {
      ...displayConfig,
      showBreakdown: false // Less verbose in summary
    });
  });

  // Footer
  output += '\n' + '━'.repeat(80) + '\n';
  output += `  Report generated at ${new Date().toISOString()}\n`;
  output += '━'.repeat(80) + '\n';

  return output;
}

/**
 * Display compact confidence summary (for quick status)
 */
export function displayConfidenceSummary(results: ResearchResult[]): string {
  if (results.length === 0) {
    return '❌ No results to display';
  }

  const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
  const emoji = getConfidenceEmoji(avgConfidence);

  return `${emoji} ${results.length} results | Avg confidence: ${formatConfidencePercent(avgConfidence)} ${createConfidenceBar(avgConfidence, 10)}`;
}

/**
 * Display validation gate status (for pipeline monitoring)
 */
export function displayValidationStatus(validation: {
  sourceCheck: ValidationResult;
  confidenceCheck: ValidationResult;
  contradictionCheck: ValidationResult;
  allPassed: boolean;
}): string {
  let output = '\n🔍 Validation Status:\n';

  const gates = [
    { name: 'Sources', result: validation.sourceCheck },
    { name: 'Confidence', result: validation.confidenceCheck },
    { name: 'Contradictions', result: validation.contradictionCheck }
  ];

  gates.forEach(gate => {
    const emoji = gate.result.status === 'pass' ? '✅' : gate.result.status === 'warning' ? '⚠️' : '❌';
    output += `  ${emoji} ${gate.name}: ${gate.result.message}\n`;
  });

  output += `\n${validation.allPassed ? '✅ All gates passed' : '⚠️  Some gates require attention'}\n`;

  return output;
}

/**
 * Display template match suggestion
 */
export function displayTemplateMatch(
  query: string,
  matches: Array<{
    template: any;
    confidence: number;
    reason: string;
  }>
): string {
  if (matches.length === 0) {
    return '💡 No matching templates found for this query';
  }

  let output = '\n💡 Template Suggestions:\n';

  matches.forEach((match, idx) => {
    const confidence = formatConfidencePercent(match.confidence);
    output += `\n  ${idx + 1}. ${match.template.name} (${confidence} match)\n`;
    output += `     ${match.template.description}\n`;
    output += `     Reason: ${match.reason}\n`;
  });

  return output;
}

/**
 * Display auto-save notification
 */
export function displayAutoSaveNotification(
  saved: boolean,
  filePath?: string,
  reason?: string
): string {
  if (saved && filePath) {
    return `\n✅ Auto-saved research result to: ${filePath}\n`;
  } else {
    return `\n⚠️  Auto-save skipped: ${reason || 'Unknown reason'}\n`;
  }
}

/**
 * Display workflow completion summary
 */
export function displayWorkflowSummary(
  query: string,
  duration_ms: number,
  agentCount: number,
  confidence: number,
  autoSaved: boolean,
  outputPath?: string
): string {
  let output = '\n' + '═'.repeat(80) + '\n';
  output += '  WORKFLOW COMPLETE\n';
  output += '═'.repeat(80) + '\n';

  output += `\n  Query: "${query}"\n`;
  output += `  Duration: ${(duration_ms / 1000).toFixed(2)}s\n`;
  output += `  Agents Used: ${agentCount}\n`;
  output += `  Final Confidence: ${formatConfidencePercent(confidence)} ${getConfidenceEmoji(confidence)}\n`;

  if (autoSaved && outputPath) {
    output += `  ✅ Auto-saved to: ${outputPath}\n`;
  } else {
    output += `  ⚠️  Manual review required\n`;
  }

  output += '\n' + '═'.repeat(80) + '\n';

  return output;
}

/**
 * Export all display functions for easy access
 */
export default {
  displayResult,
  displayResearchReport,
  displayConfidenceSummary,
  displayValidationStatus,
  displayTemplateMatch,
  displayAutoSaveNotification,
  displayWorkflowSummary
};
