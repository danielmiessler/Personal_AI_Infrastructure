/**
 * Config Module - Default Values
 *
 * Default configuration values for JAI.
 */

import type {
  Policy,
  PolicyConstraints,
  JAIConfig,
} from './types';

// ============================================================================
// Default Constraints
// ============================================================================

export const DEFAULT_CONSTRAINTS: PolicyConstraints = {
  max_single_position: 10,
  penny_stock_max: 5,
  max_sector_concentration: 25,
  cash_reserve: 5,
  emergency_reserve: 10000,
  max_daily_trades: 10,
  min_position_size: 500,
  max_portfolio_drawdown: 20,
  single_stock_stop_loss: 15,
};

// ============================================================================
// Default Policy
// ============================================================================

export const DEFAULT_POLICY: Policy = {
  meta: {
    name: 'Default JAI Policy',
    version: '1.0.0',
    last_review: new Date().toISOString().split('T')[0],
    next_review: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
  },
  objectives: {
    primary: 'Long-term capital appreciation',
    secondary: ['Dividend income', 'Capital preservation'],
    tactical: [],
    target_return: 10,
    time_horizon: 10,
  },
  constraints: DEFAULT_CONSTRAINTS,
  rules: {
    entry: [
      {
        id: 'entry-001',
        name: 'Basic Due Diligence',
        rule: 'Research company fundamentals before any purchase',
        rationale: 'Avoid impulse buys',
      },
    ],
    exit: [
      {
        id: 'exit-001',
        name: 'Stop Loss',
        rule: 'Exit position if loss exceeds stop loss threshold',
        rationale: 'Limit downside risk',
      },
    ],
    hold: [
      {
        id: 'hold-001',
        name: 'Quarterly Review',
        rule: 'Review all positions quarterly',
        rationale: 'Ensure thesis remains valid',
      },
    ],
  },
  schedule: {
    daily: ['Check market news', 'Review open positions'],
    weekly: ['Portfolio performance review'],
    monthly: ['Rebalancing check'],
    quarterly: ['Full portfolio review', 'Policy review'],
  },
  escalation: {
    auto_approve: ['Small position adjustments < 1% portfolio'],
    notify_and_wait: ['Position changes 1-5% portfolio'],
    requires_discussion: ['Position changes > 5% portfolio', 'New sector entry'],
  },
  notifications: {
    channels: ['discord'],
    preferences: {
      enabled: ['trades', 'alerts', 'daily_summary'],
      quiet_hours: '22:00-07:00',
      bypass_quiet: ['critical_alerts'],
    },
  },
};

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONFIG: JAIConfig = {
  policyPath: '~/.jai/policy.yaml',
  dataDir: '~/.jai/data',
  cacheDir: '~/.jai/cache',
  env: {},
};
