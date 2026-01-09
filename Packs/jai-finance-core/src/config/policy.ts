/**
 * Config Module - Policy Loader
 *
 * Loads and validates investment policy from YAML files.
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type {
  Policy,
  PolicyRule,
  PolicyConstraints,
  ConstraintCheckResult,
  RuleEventType,
} from './types';
import { DEFAULT_POLICY } from './defaults';

// ============================================================================
// Policy Error
// ============================================================================

export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PolicyError';
  }
}

// ============================================================================
// Policy Loader
// ============================================================================

export class PolicyLoader {
  private policy: Policy | null = null;
  private readonly policyPath: string;

  constructor(policyPath: string) {
    // Expand ~ to home directory
    this.policyPath = policyPath.replace(/^~/, process.env.HOME || '');
  }

  /**
   * Load policy from YAML file
   */
  load(): Policy {
    if (!existsSync(this.policyPath)) {
      throw new PolicyError(
        `Policy file not found: ${this.policyPath}`,
        'policyPath'
      );
    }

    try {
      const content = readFileSync(this.policyPath, 'utf-8');
      const parsed = parseYaml(content);

      if (!parsed || typeof parsed !== 'object') {
        throw new PolicyError('Policy file is empty or invalid');
      }

      this.validate(parsed);
      this.policy = parsed as Policy;
      return this.policy;
    } catch (error) {
      if (error instanceof PolicyError) {
        throw error;
      }
      throw new PolicyError(
        `Failed to parse policy file: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Get cached policy or load from file
   */
  getPolicy(): Policy {
    if (this.policy) {
      return this.policy;
    }
    return this.load();
  }

  /**
   * Find a rule by its ID across all rule categories
   */
  getRule(ruleId: string): PolicyRule | undefined {
    const policy = this.getPolicy();
    const allRules = [
      ...policy.rules.entry,
      ...policy.rules.exit,
      ...policy.rules.hold,
    ];
    return allRules.find((rule) => rule.id === ruleId);
  }

  /**
   * Get all rules applicable to an event type
   */
  getApplicableRules(event: RuleEventType): PolicyRule[] {
    const policy = this.getPolicy();
    return policy.rules[event] || [];
  }

  /**
   * Check if a value satisfies a constraint
   */
  checkConstraint(
    constraint: keyof PolicyConstraints,
    value: number
  ): ConstraintCheckResult {
    const policy = this.getPolicy();
    const limit = policy.constraints[constraint];

    if (limit === undefined) {
      // Constraint not defined, use default if available
      const defaultLimit = DEFAULT_POLICY.constraints[constraint];
      if (defaultLimit === undefined) {
        return {
          passed: true,
          limit: Infinity,
          current: value,
          constraint,
        };
      }
      return {
        passed: value <= defaultLimit,
        limit: defaultLimit,
        current: value,
        constraint,
      };
    }

    return {
      passed: value <= limit,
      limit,
      current: value,
      constraint,
    };
  }

  /**
   * Validate policy structure
   */
  private validate(policy: unknown): void {
    const p = policy as Record<string, unknown>;

    // Required top-level fields
    const requiredFields = [
      'meta',
      'objectives',
      'constraints',
      'rules',
      'schedule',
      'escalation',
      'notifications',
    ];

    for (const field of requiredFields) {
      if (!p[field]) {
        throw new PolicyError(`Missing required field: ${field}`, field);
      }
    }

    // Validate meta
    this.validateMeta(p.meta as Record<string, unknown>);

    // Validate objectives
    this.validateObjectives(p.objectives as Record<string, unknown>);

    // Validate constraints
    this.validateConstraints(p.constraints as Record<string, unknown>);

    // Validate rules
    this.validateRules(p.rules as Record<string, unknown>);

    // Validate schedule
    this.validateSchedule(p.schedule as Record<string, unknown>);

    // Validate escalation
    this.validateEscalation(p.escalation as Record<string, unknown>);

    // Validate notifications
    this.validateNotifications(p.notifications as Record<string, unknown>);
  }

  private validateMeta(meta: Record<string, unknown>): void {
    const required = ['name', 'version', 'last_review', 'next_review'];
    for (const field of required) {
      if (!meta[field]) {
        throw new PolicyError(`Missing required meta field: ${field}`, `meta.${field}`);
      }
    }
  }

  private validateObjectives(objectives: Record<string, unknown>): void {
    if (!objectives.primary) {
      throw new PolicyError('Missing primary objective', 'objectives.primary');
    }
    if (!Array.isArray(objectives.secondary)) {
      throw new PolicyError(
        'objectives.secondary must be an array',
        'objectives.secondary'
      );
    }
    if (!Array.isArray(objectives.tactical)) {
      throw new PolicyError(
        'objectives.tactical must be an array',
        'objectives.tactical'
      );
    }
  }

  private validateConstraints(constraints: Record<string, unknown>): void {
    const required = [
      'max_single_position',
      'penny_stock_max',
      'max_sector_concentration',
      'cash_reserve',
    ];
    for (const field of required) {
      if (constraints[field] === undefined) {
        throw new PolicyError(
          `Missing required constraint: ${field}`,
          `constraints.${field}`
        );
      }
      if (typeof constraints[field] !== 'number') {
        throw new PolicyError(
          `Constraint ${field} must be a number`,
          `constraints.${field}`
        );
      }
    }
  }

  private validateRules(rules: Record<string, unknown>): void {
    const categories = ['entry', 'exit', 'hold'];
    for (const category of categories) {
      if (!Array.isArray(rules[category])) {
        throw new PolicyError(
          `rules.${category} must be an array`,
          `rules.${category}`
        );
      }
      const ruleArray = rules[category] as Record<string, unknown>[];
      for (let i = 0; i < ruleArray.length; i++) {
        const rule = ruleArray[i];
        if (!rule.id) {
          throw new PolicyError(
            `Rule missing id`,
            `rules.${category}[${i}].id`
          );
        }
        if (!rule.name) {
          throw new PolicyError(
            `Rule missing name`,
            `rules.${category}[${i}].name`
          );
        }
        if (!rule.rule) {
          throw new PolicyError(
            `Rule missing rule definition`,
            `rules.${category}[${i}].rule`
          );
        }
      }
    }
  }

  private validateSchedule(schedule: Record<string, unknown>): void {
    const periods = ['daily', 'weekly', 'monthly', 'quarterly'];
    for (const period of periods) {
      if (!Array.isArray(schedule[period])) {
        throw new PolicyError(
          `schedule.${period} must be an array`,
          `schedule.${period}`
        );
      }
    }
  }

  private validateEscalation(escalation: Record<string, unknown>): void {
    const levels = ['auto_approve', 'notify_and_wait', 'requires_discussion'];
    for (const level of levels) {
      if (!Array.isArray(escalation[level])) {
        throw new PolicyError(
          `escalation.${level} must be an array`,
          `escalation.${level}`
        );
      }
    }
  }

  private validateNotifications(notifications: Record<string, unknown>): void {
    if (!Array.isArray(notifications.channels)) {
      throw new PolicyError(
        'notifications.channels must be an array',
        'notifications.channels'
      );
    }
    if (!notifications.preferences || typeof notifications.preferences !== 'object') {
      throw new PolicyError(
        'notifications.preferences must be an object',
        'notifications.preferences'
      );
    }
    const prefs = notifications.preferences as Record<string, unknown>;
    if (!Array.isArray(prefs.enabled)) {
      throw new PolicyError(
        'notifications.preferences.enabled must be an array',
        'notifications.preferences.enabled'
      );
    }
  }
}
