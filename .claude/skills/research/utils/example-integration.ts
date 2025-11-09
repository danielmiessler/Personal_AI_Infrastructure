/**
 * Example Integration: Using All 5 Reliability Features
 *
 * This file demonstrates how to integrate all reliability features
 * into a research workflow execution.
 */

import {
  getLogger,
  ExecutionLogger
} from './logging';

import {
  validateResults,
  ValidationResult
} from './validation';

import {
  calculateAllConfidences,
  getConfidenceBreakdown,
  ResearchResult
} from './confidence';

import {
  classifyTaskRisk,
  handleResearchCompletion,
  AutoSaveResult
} from './auto-save';

import {
  getTemplateManager,
  TemplateManager,
  TemplateMatch
} from './templates';

import {
  displayResearchReport,
  displayValidationStatus,
  displayWorkflowSummary,
  displayTemplateMatch,
  displayAutoSaveNotification
} from './display';

/**
 * Complete research workflow with all reliability features
 */
export async function executeEnhancedResearch(
  userQuery: string,
  agentResults: Array<{
    agent_id: string;
    agent_type: string;
    query: string;
    findings: string;
    sources: any[];
  }>,
  config?: {
    minConfidence?: number;
    autoSaveDir?: string;
    logDir?: string;
  }
): Promise<{
  success: boolean;
  avgConfidence: number;
  autoSaved: boolean;
  outputPath?: string;
  logPath: string;
}> {
  const minConfidence = config?.minConfidence || 0.70;
  const autoSaveDir = config?.autoSaveDir || './research-output';
  const logDir = config?.logDir || './logs/research';

  // ========================================
  // Step 1: Check for Template Match
  // ========================================

  console.log('\n🔍 Checking for existing templates...\n');

  const templateManager = getTemplateManager();
  const matches = templateManager.findMatchingTemplates(userQuery, 3);

  let templateUsed: TemplateMatch | null = null;

  if (matches.length > 0) {
    console.log(displayTemplateMatch(userQuery, matches));

    // Use template if confidence > 70%
    if (matches[0].confidence > 0.7) {
      templateUsed = matches[0];
      console.log(`\n✅ Using template: ${templateUsed.template.name}\n`);
    }
  } else {
    console.log('❌ No matching templates found\n');
  }

  // ========================================
  // Step 2: Initialize Logging
  // ========================================

  console.log('📝 Initializing workflow logging...\n');

  const logger = getLogger(logDir);
  const workflowId = logger.startWorkflow(userQuery, 'research');

  logger.addMetadata('mode', 'standard');
  logger.addMetadata('agent_count', agentResults.length);

  if (templateUsed) {
    logger.addMetadata('template_id', templateUsed.template.template_id);
    logger.addMetadata('template_name', templateUsed.template.name);
  }

  // ========================================
  // Step 3: Log Agent Executions
  // ========================================

  console.log('🤖 Processing agent results...\n');

  agentResults.forEach(agent => {
    // Log agent start and completion
    // Note: In real implementation, you'd log start BEFORE agent runs
    logger.startAgent(agent.agent_id, agent.agent_type, agent.query);

    const preview = agent.findings.substring(0, 100);
    logger.completeAgent(agent.agent_id, 'success', preview);
  });

  // ========================================
  // Step 4: Calculate Confidence Scores
  // ========================================

  console.log('🎯 Calculating confidence scores...\n');

  // Convert agent results to ResearchResult format
  const results: ResearchResult[] = agentResults.map(agent => ({
    agent_id: agent.agent_id,
    agent_type: agent.agent_type,
    query: agent.query,
    content: agent.findings,
    sources: agent.sources || [],
    timestamp: new Date().toISOString()
  }));

  // Calculate confidence for all results (includes cross-agent agreement)
  const resultsWithConfidence = calculateAllConfidences(results);

  // Calculate average confidence
  const avgConfidence = resultsWithConfidence.reduce((sum, r) => sum + (r.confidence || 0), 0) / resultsWithConfidence.length;

  console.log(`Average Confidence: ${Math.round(avgConfidence * 100)}%\n`);

  // ========================================
  // Step 5: Run 3-Gate Validation
  // ========================================

  console.log('🔍 Running 3-gate validation...\n');

  const validation = await validateResults(resultsWithConfidence, {
    minConfidence: templateUsed?.template.validation_config.min_confidence || minConfidence,
    requireSources: templateUsed?.template.validation_config.require_sources !== false,
    checkContradictions: true
  });

  // Log each validation gate
  logger.logValidation('sources', validation.sourceCheck.status, validation.sourceCheck.details || {});
  logger.logValidation('confidence', validation.confidenceCheck.status, validation.confidenceCheck.details || {});
  logger.logValidation('contradictions', validation.contradictionCheck.status, validation.contradictionCheck.details || {});

  // Display validation status
  console.log(displayValidationStatus({
    ...validation,
    allPassed: validation.allPassed
  }));

  // ========================================
  // Step 6: Handle Validation Failures
  // ========================================

  if (validation.sourceCheck.status === 'fail') {
    console.log('\n⚠️  Some results missing sources - would re-query in production\n');
    // In real implementation: launch follow-up agents
  }

  if (validation.confidenceCheck.status === 'warning' || validation.confidenceCheck.status === 'fail') {
    console.log('\n⚠️  Low confidence detected - flagging for review\n');
    // In real implementation: launch validation agents or flag for manual review
  }

  if (validation.contradictionCheck.status === 'warning') {
    console.log('\n⚠️  Contradictions detected - would launch disambiguation in production\n');
    // In real implementation: launch disambiguation agent
  }

  // ========================================
  // Step 7: Classify Risk & Auto-Save
  // ========================================

  console.log('💾 Attempting auto-save...\n');

  // Classify task risk
  const taskClassification = classifyTaskRisk(userQuery);

  console.log(`Task Classification: ${taskClassification.riskLevel.toUpperCase()}`);
  console.log(`Reason: ${taskClassification.reason}\n`);

  // Create synthesized report (simplified for example)
  const synthesizedReport = resultsWithConfidence
    .map((r, i) => `## Result ${i + 1} (${r.agent_type})\n\n${r.content}\n`)
    .join('\n---\n\n');

  // Collect all sources
  const allSources = resultsWithConfidence.flatMap(r => r.sources || []);

  // Attempt auto-save
  const completionResult = await handleResearchCompletion(
    {
      agent_id: 'workflow-synthesizer',
      agent_type: 'research-workflow',
      query: userQuery,
      content: synthesizedReport,
      sources: allSources,
      confidence: avgConfidence,
      validated: validation.allPassed,
      timestamp: new Date().toISOString()
    },
    avgConfidence,
    autoSaveDir
  );

  // Display auto-save notification
  console.log(displayAutoSaveNotification(
    completionResult.autoSaveResult.saved,
    completionResult.autoSaveResult.filePath,
    completionResult.classification.reason
  ));

  // ========================================
  // Step 8: Complete Workflow Logging
  // ========================================

  const workflowStatus = validation.allPassed ? 'success' : 'partial';

  logger.completeWorkflow(
    workflowStatus,
    avgConfidence,
    completionResult.autoSaveResult.saved,
    completionResult.autoSaveResult.filePath
  );

  const workflowLog = logger.getCurrentWorkflow();
  const logPath = `${logDir}/${workflowId}.json`;

  console.log(`\n📝 Workflow log saved: ${logPath}\n`);

  // ========================================
  // Step 9: Display Enhanced Report
  // ========================================

  console.log('📊 Generating enhanced report...\n');

  const report = displayResearchReport(resultsWithConfidence, validation, {
    showEmojis: true,
    showBreakdown: true,
    showSources: true,
    showValidation: true
  });

  console.log(report);

  // ========================================
  // Step 10: Update Template Metrics
  // ========================================

  if (templateUsed) {
    const success = validation.allPassed && avgConfidence >= minConfidence;

    templateManager.updateTemplateMetrics(
      templateUsed.template.template_id,
      success,
      avgConfidence
    );

    console.log(`\n📚 Updated template metrics: ${templateUsed.template.name}\n`);
  }

  // ========================================
  // Step 11: Consider Creating Template
  // ========================================

  const shouldCreateTemplate = (
    avgConfidence >= 0.75 &&
    validation.allPassed &&
    !templateUsed // No existing template matched
  );

  if (shouldCreateTemplate) {
    console.log('\n💡 This research pattern was successful!');
    console.log('   Consider creating a template for similar queries.');
    console.log('   (In production, would auto-create or prompt user)\n');
  }

  // ========================================
  // Step 12: Display Workflow Summary
  // ========================================

  const durationMs = workflowLog?.duration_ms || 0;

  const summary = displayWorkflowSummary(
    userQuery,
    durationMs,
    agentResults.length,
    avgConfidence,
    completionResult.autoSaveResult.saved,
    completionResult.autoSaveResult.filePath
  );

  console.log(summary);

  // ========================================
  // Return Results
  // ========================================

  return {
    success: validation.allPassed,
    avgConfidence,
    autoSaved: completionResult.autoSaveResult.saved,
    outputPath: completionResult.autoSaveResult.filePath,
    logPath
  };
}

/**
 * Example usage
 */
async function main() {
  console.log('🔬 ENHANCED RESEARCH WORKFLOW EXAMPLE\n');
  console.log('═'.repeat(80));

  // Example: Simulate agent results for "What is quantum computing?"
  const userQuery = 'What is quantum computing?';

  const agentResults = [
    {
      agent_id: 'perp-1',
      agent_type: 'perplexity-researcher',
      query: 'What is quantum computing - basics',
      findings: 'Quantum computing is a revolutionary computing paradigm that leverages quantum mechanical phenomena like superposition and entanglement to process information. Unlike classical computers that use bits (0 or 1), quantum computers use qubits that can exist in multiple states simultaneously.',
      sources: [
        { title: 'IBM Quantum Computing Overview', url: 'https://www.ibm.com/quantum', type: 'media' as const, publication: 'IBM', date: '2024' },
        { title: 'Nature: Quantum Computing Explained', url: 'https://nature.com/quantum', type: 'peer-reviewed' as const, publication: 'Nature', date: '2024' }
      ]
    },
    {
      agent_id: 'perp-2',
      agent_type: 'perplexity-researcher',
      query: 'Quantum computing applications 2025',
      findings: 'Recent applications of quantum computing in 2025 include drug discovery, cryptography, optimization problems, and financial modeling. Companies like Google, IBM, and Amazon are making significant advances in quantum hardware.',
      sources: [
        { title: 'Quantum Computing Applications 2025', url: 'https://techcrunch.com/quantum-2025', type: 'media' as const, publication: 'TechCrunch', date: '2025' }
      ]
    },
    {
      agent_id: 'claude-1',
      agent_type: 'claude-researcher',
      query: 'How does quantum computing work technically',
      findings: 'Quantum computers work by manipulating qubits through quantum gates to perform calculations. The key quantum phenomena are: 1) Superposition - qubits can be in multiple states simultaneously, 2) Entanglement - qubits can be correlated in ways classical particles cannot, 3) Interference - quantum states can be combined to amplify correct answers and cancel wrong ones.',
      sources: [
        { title: 'Quantum Computing Principles', url: 'https://arxiv.org/quantum-principles', type: 'preprint' as const, publication: 'arXiv', date: '2024' },
        { title: 'IEEE Quantum Computing Guide', url: 'https://ieee.org/quantum', type: 'peer-reviewed' as const, publication: 'IEEE', date: '2024' }
      ]
    }
  ];

  // Execute enhanced research workflow
  const result = await executeEnhancedResearch(userQuery, agentResults, {
    minConfidence: 0.70,
    autoSaveDir: './research-output',
    logDir: './logs/research'
  });

  console.log('\n🎉 WORKFLOW COMPLETE!\n');
  console.log(`Success: ${result.success}`);
  console.log(`Average Confidence: ${Math.round(result.avgConfidence * 100)}%`);
  console.log(`Auto-Saved: ${result.autoSaved}`);
  if (result.outputPath) {
    console.log(`Output: ${result.outputPath}`);
  }
  console.log(`Log: ${result.logPath}`);
}

// Run example if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default executeEnhancedResearch;
