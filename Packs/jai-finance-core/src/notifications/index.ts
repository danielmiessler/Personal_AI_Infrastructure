/**
 * Notifications Module for JAI Finance Core
 *
 * Provides Discord notification capabilities for alerts, briefs, and logs.
 */

// Types
export type {
  DiscordConfig,
  DiscordEmbed,
  DiscordEmbedField,
  NotificationPayload,
  NotificationAction,
  NotificationActionStyle,
  NotificationType,
  NotificationUrgency,
  Position,
  Policy,
  PolicyRule,
  Alert,
  Opportunity,
  PortfolioState,
  Recommendation,
  BuyAnalysis,
} from './types';

// Discord Notifier
export { DiscordNotifier } from './discord';

// Formatter
export { NotificationFormatter, EMBED_COLORS } from './formatter';
export type { FormattedPayload } from './formatter';

// Templates
export {
  STOP_LOSS_TEMPLATE,
  BUY_SIGNAL_TEMPLATE,
  TARGET_HIT_TEMPLATE,
  BRIEF_TEMPLATE,
} from './templates';

export type {
  StopLossTemplateData,
  BuySignalTemplateData,
  TargetHitTemplateData,
  BriefTemplateData,
} from './templates';
