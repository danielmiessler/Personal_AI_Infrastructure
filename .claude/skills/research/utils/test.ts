/**
 * Test Suite for Research Reliability Utilities
 *
 * Run this file to verify all utilities are working correctly.
 */

import {
  validateSources,
  validateConfidence,
  detectContradictions,
  validateResults,
  ResearchResult as ValidationResearchResult
} from './validation';

import {
  calculateConfidence,
  calculateAllConfidences,
  getConfidenceBreakdown,
  ResearchResult as ConfidenceResearchResult
} from './confidence';

import {
  classifyTaskRisk,
  shouldAutoSave,
  autoSaveResult
} from './auto-save';

import {
  getLogger,
  resetLogger
} from './logging';

import {
  getTemplateManager,
  resetTemplateManager,
  seedDefaultTemplates
} from './templates';

// Type compatibility
type ResearchResult = ValidationResearchResult & ConfidenceResearchResult;

/**
 * Test results tracker
 */
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => boolean | Promise<boolean>): void {
  testsRun++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(passed => {
        if (passed) {
          testsPassed++;
          console.log(`✅ PASS: ${name}`);
        } else {
          testsFailed++;
          console.log(`❌ FAIL: ${name}`);
        }
      }).catch(err => {
        testsFailed++;
        console.log(`❌ ERROR: ${name} - ${err.message}`);
      });
    } else {
      if (result) {
        testsPassed++;
        console.log(`✅ PASS: ${name}`);
      } else {
        testsFailed++;
        console.log(`❌ FAIL: ${name}`);
      }
    }
  } catch (err: any) {
    testsFailed++;
    console.log(`❌ ERROR: ${name} - ${err.message}`);
  }
}

/**
 * Validation Tests
 */
async function testValidation() {
  console.log('\n📋 Testing Validation System...\n');

  // Test 1: Validate sources - all have sources
  test('Validation: All results have sources', async () => {
    const results: ResearchResult[] = [
      {
        agent_id: 'test-1',
        agent_type: 'test',
        query: 'Test query',
        content: 'Test content',
        sources: [{ title: 'Source 1', type: 'peer-reviewed' }]
      }
    ];

    const result = await validateSources(results);
    return result.status === 'pass';
  });

  // Test 2: Validate sources - missing sources
  test('Validation: Detect missing sources', async () => {
    const results: ResearchResult[] = [
      {
        agent_id: 'test-1',
        agent_type: 'test',
        query: 'Test query',
        content: 'Test content',
        sources: []
      }
    ];

    const result = await validateSources(results);
    return result.status === 'fail';
  });

  // Test 3: Validate confidence - all meet threshold
  test('Validation: All meet confidence threshold', async () => {
    const results: ResearchResult[] = [
      {
        agent_id: 'test-1',
        agent_type: 'test',
        query: 'Test query',
        content: 'Test content',
        sources: [],
        confidence: 0.8
      }
    ];

    const result = await validateConfidence(results, 0.7);
    return result.status === 'pass';
  });

  // Test 4: Validate confidence - below threshold
  test('Validation: Detect low confidence', async () => {
    const results: ResearchResult[] = [
      {
        agent_id: 'test-1',
        agent_type: 'test',
        query: 'Test query',
        content: 'Test content',
        sources: [],
        confidence: 0.5
      }
    ];

    const result = await validateConfidence(results, 0.7);
    return result.status === 'warning';
  });

  // Test 5: Detect contradictions - no contradictions
  test('Validation: No contradictions detected', async () => {
    const results: ResearchResult[] = [
      {
        agent_id: 'test-1',
        agent_type: 'test',
        query: 'Test query',
        content: 'The market is growing',
        sources: []
      },
      {
        agent_id: 'test-2',
        agent_type: 'test',
        query: 'Test query',
        content: 'The market is expanding',
        sources: []
      }
    ];

    const result = await detectContradictions(results);
    return result.status === 'pass';
  });
}

/**
 * Confidence Scoring Tests
 */
function testConfidence() {
  console.log('\n🎯 Testing Confidence Scoring...\n');

  // Test 1: Calculate confidence with good sources
  test('Confidence: High quality sources score well', () => {
    const result: ResearchResult = {
      agent_id: 'test-1',
      agent_type: 'test',
      query: 'Test query',
      content: 'Specific content with 2024 data showing 50% increase',
      sources: [
        { title: 'Source 1', type: 'peer-reviewed' },
        { title: 'Source 2', type: 'peer-reviewed' }
      ]
    };

    const confidence = calculateConfidence(result, [result]);
    return confidence > 0.6; // Should be fairly high
  });

  // Test 2: Calculate confidence with poor sources
  test('Confidence: Low quality sources score lower', () => {
    const result: ResearchResult = {
      agent_id: 'test-1',
      agent_type: 'test',
      query: 'Test query',
      content: 'Vague content that might possibly indicate something',
      sources: [{ title: 'Blog post', type: 'blog' }]
    };

    const confidence = calculateConfidence(result, [result]);
    return confidence < 0.6; // Should be lower
  });

  // Test 3: Calculate all confidences
  test('Confidence: Calculate for multiple results', () => {
    const results: ResearchResult[] = [
      {
        agent_id: 'test-1',
        agent_type: 'test',
        query: 'Test query',
        content: 'Content 1',
        sources: [{ title: 'Source 1', type: 'peer-reviewed' }]
      },
      {
        agent_id: 'test-2',
        agent_type: 'test',
        query: 'Test query',
        content: 'Content 2',
        sources: [{ title: 'Source 2', type: 'media' }]
      }
    ];

    const withConfidence = calculateAllConfidences(results);
    return (
      withConfidence.length === 2 &&
      withConfidence[0].confidence !== undefined &&
      withConfidence[1].confidence !== undefined
    );
  });

  // Test 4: Get confidence breakdown
  test('Confidence: Generate detailed breakdown', () => {
    const result: ResearchResult = {
      agent_id: 'test-1',
      agent_type: 'test',
      query: 'Test query',
      content: 'Content with 2024 data',
      sources: [{ title: 'Source 1', type: 'peer-reviewed' }]
    };

    const breakdown = getConfidenceBreakdown(result, [result]);
    return (
      breakdown.overall !== undefined &&
      breakdown.factors.sourceQuality !== undefined &&
      breakdown.interpretation !== undefined
    );
  });
}

/**
 * Auto-Save Tests
 */
function testAutoSave() {
  console.log('\n💾 Testing Auto-Save System...\n');

  // Test 1: Classify safe task
  test('Auto-Save: Classify safe factual query', () => {
    const classification = classifyTaskRisk('What is quantum computing?');
    return classification.riskLevel === 'safe' && classification.autoSaveEnabled;
  });

  // Test 2: Classify review task
  test('Auto-Save: Classify review query', () => {
    const classification = classifyTaskRisk('Compare React vs Vue');
    return classification.riskLevel === 'review' && !classification.autoSaveEnabled;
  });

  // Test 3: Classify manual task
  test('Auto-Save: Classify decision-making query', () => {
    const classification = classifyTaskRisk('Should I invest in Bitcoin?');
    return classification.riskLevel === 'manual' && !classification.autoSaveEnabled;
  });

  // Test 4: Should auto-save - safe + high confidence
  test('Auto-Save: Allow safe task with high confidence', () => {
    const classification = classifyTaskRisk('What is X?');
    const should = shouldAutoSave(classification, 0.8);
    return should === true;
  });

  // Test 5: Should not auto-save - safe but low confidence
  test('Auto-Save: Block safe task with low confidence', () => {
    const classification = classifyTaskRisk('What is X?');
    const should = shouldAutoSave(classification, 0.5);
    return should === false;
  });
}

/**
 * Logging Tests
 */
function testLogging() {
  console.log('\n📝 Testing Logging System...\n');

  // Reset logger for clean tests
  resetLogger();

  // Test 1: Create logger
  test('Logging: Create logger instance', () => {
    const logger = getLogger('./test-logs');
    return logger !== null;
  });

  // Test 2: Start workflow
  test('Logging: Start workflow tracking', () => {
    const logger = getLogger('./test-logs');
    const workflowId = logger.startWorkflow('Test query', 'test');
    return workflowId.startsWith('workflow-');
  });

  // Test 3: Log agent execution
  test('Logging: Track agent execution', () => {
    const logger = getLogger('./test-logs');
    logger.startAgent('agent-1', 'test-agent', 'Test query');
    logger.completeAgent('agent-1', 'success', 'Preview');

    const workflow = logger.getCurrentWorkflow();
    return workflow !== null && workflow.agents.length === 1;
  });

  // Test 4: Log validation
  test('Logging: Track validation events', () => {
    const logger = getLogger('./test-logs');
    logger.logValidation('sources', 'pass', { details: 'test' });

    const workflow = logger.getCurrentWorkflow();
    return workflow !== null && workflow.validation_events.length > 0;
  });

  // Test 5: Complete workflow
  test('Logging: Complete workflow tracking', () => {
    const logger = getLogger('./test-logs');
    logger.completeWorkflow('success', 0.85, true, './output.md');

    // Workflow should be reset to null after completion
    const workflow = logger.getCurrentWorkflow();
    return workflow === null; // Completed workflows are cleared
  });
}

/**
 * Template Tests
 */
function testTemplates() {
  console.log('\n📚 Testing Template System...\n');

  // Reset template manager for clean tests
  resetTemplateManager();

  // Test 1: Create template manager
  test('Templates: Create template manager', () => {
    const manager = getTemplateManager('./test-templates');
    return manager !== null;
  });

  // Test 2: Seed default templates
  test('Templates: Seed default templates', () => {
    const manager = getTemplateManager('./test-templates');
    seedDefaultTemplates(manager);

    const templates = manager.listTemplates();
    return templates.length === 3; // 3 default templates
  });

  // Test 3: Create custom template
  test('Templates: Create custom template', () => {
    const manager = getTemplateManager('./test-templates');

    const template = manager.createTemplate(
      'Test Template',
      'Test description',
      'test.*pattern',
      ['test query 1', 'test query 2'],
      {
        agentTypes: ['test-agent'],
        minConfidence: 0.7,
        autoSave: true
      },
      ['test', 'custom']
    );

    return template.template_id.startsWith('template-');
  });

  // Test 4: Find matching templates
  test('Templates: Find matching templates', () => {
    const manager = getTemplateManager('./test-templates');

    // Should match "Factual Research" template
    const matches = manager.findMatchingTemplates('What is quantum computing?', 3);

    return matches.length > 0;
  });

  // Test 5: Update template metrics
  test('Templates: Update template metrics', () => {
    const manager = getTemplateManager('./test-templates');

    const templates = manager.listTemplates();
    if (templates.length === 0) return false;

    const templateId = templates[0].template_id;
    const oldCount = templates[0].success_metrics.usage_count;

    manager.updateTemplateMetrics(templateId, true, 0.85);

    const updated = manager.getTemplate(templateId);
    return updated && updated.success_metrics.usage_count === oldCount + 1;
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('═'.repeat(80));
  console.log('🧪 RESEARCH RELIABILITY UTILITIES - TEST SUITE');
  console.log('═'.repeat(80));

  await testValidation();
  testConfidence();
  testAutoSave();
  testLogging();
  testTemplates();

  // Wait a bit for async tests to complete
  setTimeout(() => {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TEST RESULTS');
    console.log('═'.repeat(80));
    console.log(`Total Tests: ${testsRun}`);
    console.log(`Passed: ${testsPassed} ✅`);
    console.log(`Failed: ${testsFailed} ❌`);
    console.log(`Success Rate: ${Math.round((testsPassed / testsRun) * 100)}%`);
    console.log('═'.repeat(80));

    if (testsFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!\n');
    } else {
      console.log(`\n⚠️  ${testsFailed} TEST(S) FAILED\n`);
    }
  }, 1000);
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export default runAllTests;
