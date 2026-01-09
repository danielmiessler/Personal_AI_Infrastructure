/**
 * Config Module
 *
 * Configuration and policy management for JAI.
 */

// Types
export type {
  Policy,
  PolicyMeta,
  PolicyObjectives,
  PolicyConstraints,
  PolicyRule,
  PolicyRules,
  PolicySchedule,
  PolicyEscalation,
  PolicyNotifications,
  NotificationPreferences,
  JAIConfig,
  ApiKeys,
  ConstraintCheckResult,
  RuleEventType,
} from './types';

// Policy Loader
export { PolicyLoader, PolicyError } from './policy';

// Config Loader
export { ConfigLoader, ConfigError } from './loader';

// Defaults
export {
  DEFAULT_POLICY,
  DEFAULT_CONFIG,
  DEFAULT_CONSTRAINTS,
} from './defaults';
