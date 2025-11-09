/**
 * Structured Logging System for Research Workflows
 *
 * Captures execution details in JSON format for:
 * - Debugging failed executions
 * - Performance analysis
 * - Quality improvement
 * - Audit trails
 *
 * Implements TAC Leverage Point #5 (Standard-out) and #10 (Observability)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AgentExecution {
  agent_id: string;
  agent_type: string;
  query: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'running' | 'success' | 'failed' | 'timeout';
  error?: string;
  result_preview?: string;
}

export interface ValidationEvent {
  timestamp: string;
  gate: 'sources' | 'confidence' | 'contradictions';
  status: 'pass' | 'fail' | 'warning';
  details: any;
}

export interface WorkflowExecution {
  workflow_id: string;
  workflow_type: string;
  query: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'running' | 'success' | 'failed' | 'partial';
  agents: AgentExecution[];
  validation_events: ValidationEvent[];
  confidence_score?: number;
  auto_saved?: boolean;
  output_path?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionLogEntry {
  log_id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'workflow' | 'agent' | 'validation' | 'system';
  message: string;
  data?: any;
}

/**
 * Execution Logger
 * Thread-safe logging with structured JSON output
 */
export class ExecutionLogger {
  private logDir: string;
  private currentWorkflow: WorkflowExecution | null = null;
  private logEntries: ExecutionLogEntry[] = [];

  constructor(logDir: string = './logs/research') {
    this.logDir = logDir;
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `workflow-${timestamp}-${random}`;
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `log-${timestamp}-${random}`;
  }

  /**
   * Start tracking a new workflow execution
   */
  startWorkflow(query: string, workflowType: string = 'research'): string {
    const workflowId = this.generateWorkflowId();

    this.currentWorkflow = {
      workflow_id: workflowId,
      workflow_type: workflowType,
      query,
      started_at: new Date().toISOString(),
      status: 'running',
      agents: [],
      validation_events: []
    };

    this.log('info', 'workflow', `Workflow started: ${query}`, {
      workflow_id: workflowId
    });

    return workflowId;
  }

  /**
   * Log agent execution start
   */
  startAgent(agentId: string, agentType: string, query: string): void {
    if (!this.currentWorkflow) {
      this.log('warn', 'agent', 'Agent started without active workflow', {
        agent_id: agentId
      });
      return;
    }

    const agentExecution: AgentExecution = {
      agent_id: agentId,
      agent_type: agentType,
      query,
      started_at: new Date().toISOString(),
      status: 'running'
    };

    this.currentWorkflow.agents.push(agentExecution);

    this.log('info', 'agent', `Agent started: ${agentId}`, {
      agent_type: agentType,
      query
    });
  }

  /**
   * Log agent execution completion
   */
  completeAgent(
    agentId: string,
    status: 'success' | 'failed' | 'timeout',
    resultPreview?: string,
    error?: string
  ): void {
    if (!this.currentWorkflow) return;

    const agent = this.currentWorkflow.agents.find(a => a.agent_id === agentId);
    if (!agent) {
      this.log('warn', 'agent', `Agent completion logged for unknown agent: ${agentId}`);
      return;
    }

    agent.completed_at = new Date().toISOString();
    agent.status = status;
    agent.result_preview = resultPreview;
    agent.error = error;

    // Calculate duration
    const startTime = new Date(agent.started_at).getTime();
    const endTime = new Date(agent.completed_at).getTime();
    agent.duration_ms = endTime - startTime;

    this.log(status === 'success' ? 'info' : 'error', 'agent', `Agent ${status}: ${agentId}`, {
      duration_ms: agent.duration_ms,
      error
    });
  }

  /**
   * Log validation event
   */
  logValidation(
    gate: 'sources' | 'confidence' | 'contradictions',
    status: 'pass' | 'fail' | 'warning',
    details: any
  ): void {
    if (!this.currentWorkflow) return;

    const validationEvent: ValidationEvent = {
      timestamp: new Date().toISOString(),
      gate,
      status,
      details
    };

    this.currentWorkflow.validation_events.push(validationEvent);

    this.log(
      status === 'fail' ? 'error' : status === 'warning' ? 'warn' : 'info',
      'validation',
      `Validation ${gate}: ${status}`,
      details
    );
  }

  /**
   * Complete workflow execution
   */
  completeWorkflow(
    status: 'success' | 'failed' | 'partial',
    confidenceScore?: number,
    autoSaved?: boolean,
    outputPath?: string
  ): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.completed_at = new Date().toISOString();
    this.currentWorkflow.status = status;
    this.currentWorkflow.confidence_score = confidenceScore;
    this.currentWorkflow.auto_saved = autoSaved;
    this.currentWorkflow.output_path = outputPath;

    // Calculate duration
    const startTime = new Date(this.currentWorkflow.started_at).getTime();
    const endTime = new Date(this.currentWorkflow.completed_at).getTime();
    this.currentWorkflow.duration_ms = endTime - startTime;

    this.log('info', 'workflow', `Workflow ${status}`, {
      workflow_id: this.currentWorkflow.workflow_id,
      duration_ms: this.currentWorkflow.duration_ms,
      confidence_score: confidenceScore,
      auto_saved: autoSaved
    });

    // Persist workflow execution log
    this.persistWorkflowLog();

    // Reset for next workflow
    this.currentWorkflow = null;
  }

  /**
   * Add a log entry
   */
  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    category: 'workflow' | 'agent' | 'validation' | 'system',
    message: string,
    data?: any
  ): void {
    const entry: ExecutionLogEntry = {
      log_id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    this.logEntries.push(entry);

    // Also console log for immediate visibility
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };

    console.log(`${levelEmoji[level]} [${category}] ${message}`);
    if (data) {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Persist workflow log to file
   */
  private persistWorkflowLog(): void {
    if (!this.currentWorkflow) return;

    try {
      const filename = `${this.currentWorkflow.workflow_id}.json`;
      const filepath = path.join(this.logDir, filename);

      const logData = {
        workflow: this.currentWorkflow,
        log_entries: this.logEntries
      };

      fs.writeFileSync(filepath, JSON.stringify(logData, null, 2), 'utf-8');

      console.log(`📝 Workflow log saved: ${filepath}`);
    } catch (error) {
      console.error(`Failed to persist workflow log:`, error);
    }

    // Clear log entries for next workflow
    this.logEntries = [];
  }

  /**
   * Get current workflow state
   */
  getCurrentWorkflow(): WorkflowExecution | null {
    return this.currentWorkflow;
  }

  /**
   * Add metadata to current workflow
   */
  addMetadata(key: string, value: any): void {
    if (!this.currentWorkflow) return;

    if (!this.currentWorkflow.metadata) {
      this.currentWorkflow.metadata = {};
    }

    this.currentWorkflow.metadata[key] = value;
  }
}

/**
 * Global logger instance
 * Can be imported and used across workflow
 */
let globalLogger: ExecutionLogger | null = null;

export function getLogger(logDir?: string): ExecutionLogger {
  if (!globalLogger) {
    globalLogger = new ExecutionLogger(logDir);
  }
  return globalLogger;
}

/**
 * Reset global logger (useful for testing)
 */
export function resetLogger(): void {
  globalLogger = null;
}

/**
 * Query historical logs
 */
export function queryLogs(
  logDir: string = './logs/research',
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'success' | 'failed' | 'partial';
    minDuration?: number;
    maxDuration?: number;
  }
): WorkflowExecution[] {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.json'));

  const workflows: WorkflowExecution[] = [];

  for (const file of logFiles) {
    try {
      const filepath = path.join(logDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      const logData = JSON.parse(content);

      const workflow = logData.workflow as WorkflowExecution;

      // Apply filters
      if (filters) {
        if (filters.startDate && new Date(workflow.started_at) < filters.startDate) continue;
        if (filters.endDate && new Date(workflow.started_at) > filters.endDate) continue;
        if (filters.status && workflow.status !== filters.status) continue;
        if (filters.minDuration && (workflow.duration_ms || 0) < filters.minDuration) continue;
        if (filters.maxDuration && (workflow.duration_ms || 0) > filters.maxDuration) continue;
      }

      workflows.push(workflow);
    } catch (error) {
      console.error(`Failed to parse log file ${file}:`, error);
    }
  }

  return workflows;
}

/**
 * Generate summary statistics from logs
 */
export function generateLogStatistics(workflows: WorkflowExecution[]): {
  total_workflows: number;
  successful: number;
  failed: number;
  partial: number;
  avg_duration_ms: number;
  avg_confidence: number;
  auto_save_rate: number;
} {
  const total = workflows.length;
  if (total === 0) {
    return {
      total_workflows: 0,
      successful: 0,
      failed: 0,
      partial: 0,
      avg_duration_ms: 0,
      avg_confidence: 0,
      auto_save_rate: 0
    };
  }

  const successful = workflows.filter(w => w.status === 'success').length;
  const failed = workflows.filter(w => w.status === 'failed').length;
  const partial = workflows.filter(w => w.status === 'partial').length;

  const totalDuration = workflows.reduce((sum, w) => sum + (w.duration_ms || 0), 0);
  const avgDuration = totalDuration / total;

  const workflowsWithConfidence = workflows.filter(w => w.confidence_score !== undefined);
  const totalConfidence = workflowsWithConfidence.reduce((sum, w) => sum + (w.confidence_score || 0), 0);
  const avgConfidence = workflowsWithConfidence.length > 0
    ? totalConfidence / workflowsWithConfidence.length
    : 0;

  const autoSaved = workflows.filter(w => w.auto_saved === true).length;
  const autoSaveRate = autoSaved / total;

  return {
    total_workflows: total,
    successful,
    failed,
    partial,
    avg_duration_ms: Math.round(avgDuration),
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    auto_save_rate: Math.round(autoSaveRate * 100) / 100
  };
}
