/**
 * Result Aggregation Types
 *
 * Types for aggregating results from multiple agents.
 */

import type { FarmResult } from './task.ts';

export interface AggregatedResults {
  summary: string;
  successCount: number;
  failureCount: number;
  blockedCount: number;
  artifacts: string[];
  issues: string[];
  nextSteps: string[];
  totalDuration: number;
}

/**
 * Result Aggregator class
 */
export class ResultAggregator {
  private results: FarmResult[] = [];

  /**
   * Add a result to the aggregator
   */
  add(result: FarmResult): void {
    this.results.push(result);
  }

  /**
   * Add multiple results
   */
  addAll(results: FarmResult[]): void {
    this.results.push(...results);
  }

  /**
   * Get current result count
   */
  get count(): number {
    return this.results.length;
  }

  /**
   * Aggregate all results
   */
  aggregate(): AggregatedResults {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const failureCount = this.results.filter(r => r.status === 'failure').length;
    const blockedCount = this.results.filter(r => r.status === 'blocked').length;

    const artifacts = this.results
      .flatMap(r => r.artifacts || [])
      .filter((v, i, a) => a.indexOf(v) === i); // Unique

    const issues = this.results
      .flatMap(r => r.issues || [])
      .filter((v, i, a) => a.indexOf(v) === i); // Unique

    const totalDuration = this.results
      .reduce((sum, r) => sum + (r.duration || 0), 0);

    const nextSteps = this.generateNextSteps(successCount, failureCount, blockedCount);

    return {
      summary: this.generateSummary(successCount, failureCount, blockedCount),
      successCount,
      failureCount,
      blockedCount,
      artifacts,
      issues,
      nextSteps,
      totalDuration,
    };
  }

  /**
   * Get partial aggregation (for progress updates)
   */
  getPartial(): Partial<AggregatedResults> {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const failureCount = this.results.filter(r => r.status === 'failure').length;
    const blockedCount = this.results.filter(r => r.status === 'blocked').length;

    return {
      successCount,
      failureCount,
      blockedCount,
      artifacts: this.results.flatMap(r => r.artifacts || []),
      issues: this.results.flatMap(r => r.issues || []),
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(success: number, failure: number, blocked: number): string {
    const total = success + failure + blocked;
    if (total === 0) return 'No tasks completed';

    if (failure === 0 && blocked === 0) {
      return `All ${success} tasks completed successfully`;
    }

    const parts: string[] = [];
    if (success > 0) parts.push(`${success} succeeded`);
    if (failure > 0) parts.push(`${failure} failed`);
    if (blocked > 0) parts.push(`${blocked} blocked`);

    return `${total} tasks: ${parts.join(', ')}`;
  }

  /**
   * Generate next steps based on results
   */
  private generateNextSteps(success: number, failure: number, blocked: number): string[] {
    const steps: string[] = [];

    if (failure > 0) {
      steps.push('Review failed tasks and address issues');
    }

    if (blocked > 0) {
      steps.push('Resolve blockers for blocked tasks');
    }

    if (success > 0 && failure === 0 && blocked === 0) {
      steps.push('All tasks complete - proceed to next phase');
    }

    return steps;
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Get all raw results
   */
  getResults(): FarmResult[] {
    return [...this.results];
  }
}

/**
 * Create aggregated results from array of results
 */
export function aggregateResults(results: FarmResult[]): AggregatedResults {
  const aggregator = new ResultAggregator();
  aggregator.addAll(results);
  return aggregator.aggregate();
}

/**
 * Check if aggregated results indicate overall success
 */
export function isOverallSuccess(results: AggregatedResults): boolean {
  return results.failureCount === 0 && results.blockedCount === 0;
}

/**
 * Format aggregated results as markdown
 */
export function formatResultsMarkdown(results: AggregatedResults): string {
  let md = `## Orchestration Results\n\n`;
  md += `**Summary:** ${results.summary}\n\n`;

  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Success | ${results.successCount} |\n`;
  md += `| Failed | ${results.failureCount} |\n`;
  md += `| Blocked | ${results.blockedCount} |\n`;
  md += `| Duration | ${results.totalDuration}ms |\n\n`;

  if (results.artifacts.length > 0) {
    md += `### Artifacts\n\n`;
    results.artifacts.forEach(a => md += `- ${a}\n`);
    md += '\n';
  }

  if (results.issues.length > 0) {
    md += `### Issues\n\n`;
    results.issues.forEach(i => md += `- ${i}\n`);
    md += '\n';
  }

  if (results.nextSteps.length > 0) {
    md += `### Next Steps\n\n`;
    results.nextSteps.forEach(s => md += `- ${s}\n`);
  }

  return md;
}
