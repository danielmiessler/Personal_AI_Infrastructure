/**
 * Notification Types for JAI Finance Core
 *
 * Defines all types for Discord notifications, alerts, and messaging.
 */

// -----------------------------------------------------------------------------
// Discord Configuration
// -----------------------------------------------------------------------------

/**
 * Discord webhook configuration
 */
export interface DiscordConfig {
  /** Named webhook URLs (e.g., { alerts: "https://...", briefs: "https://..." }) */
  webhooks: Record<string, string>;
  /** Discord user ID for mentions (optional) */
  userId?: string;
  /** Discord guild/server ID (optional) */
  guildId?: string;
}

/**
 * Discord embed field
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord embed object
 */
export interface DiscordEmbed {
  title: string;
  description?: string;
  /** Color as decimal number (e.g., 0xff0000 for red) */
  color: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

// -----------------------------------------------------------------------------
// Notification Types
// -----------------------------------------------------------------------------

/**
 * Types of notifications the system can send
 */
export type NotificationType =
  | 'STOP_LOSS'
  | 'DEALBREAKER'
  | 'BUY_SIGNAL'
  | 'TARGET_HIT'
  | 'WATCH'
  | 'BRIEF'
  | 'INFO';

/**
 * Urgency levels for notifications
 */
export type NotificationUrgency = 'IMMEDIATE' | 'TODAY' | 'SOON' | 'MONITOR';

/**
 * Button styles for Discord components
 */
export type NotificationActionStyle = 'primary' | 'secondary' | 'success' | 'danger';

/**
 * Action button for notifications
 */
export interface NotificationAction {
  id: string;
  label: string;
  style: NotificationActionStyle;
}

/**
 * Payload for sending notifications
 */
export interface NotificationPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  actions?: NotificationAction[];
  channel?: string;
  urgent?: boolean;
}

// -----------------------------------------------------------------------------
// Forward-compatible types (will be imported from other modules later)
// -----------------------------------------------------------------------------

/**
 * Position type for notification formatting
 * This mirrors the portfolio module's Position type
 */
export interface Position {
  ticker: string;
  shares: number;
  averageCost: number;
  currentPrice?: number;
  stopLossPrice?: number;
  targetPrice?: number;
  purchaseDate?: string;
}

/**
 * Policy type for notification formatting
 * This mirrors the config module's Policy type
 */
export interface Policy {
  rules: PolicyRule[];
  stopLossPercent?: number;
  targetGainPercent?: number;
}

/**
 * Individual policy rule
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category?: string;
}

/**
 * Alert information for briefs
 */
export interface Alert {
  type: NotificationType;
  ticker: string;
  message: string;
  urgency: NotificationUrgency;
}

/**
 * Opportunity information for briefs
 */
export interface Opportunity {
  ticker: string;
  currentPrice: number;
  targetPrice: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Portfolio state for briefs
 */
export interface PortfolioState {
  totalValue: number;
  cashBalance: number;
  positions: Position[];
  dayChange: number;
  dayChangePercent: number;
}

/**
 * Charles recommendation for actions
 */
export interface Recommendation {
  action: 'SELL' | 'BUY' | 'HOLD' | 'WATCH' | 'REVIEW';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  policyRuleId?: string;
}

/**
 * Analysis result for buy signals
 */
export interface BuyAnalysis {
  fundamentals: string;
  technicals: string;
  catalyst?: string;
  risks: string[];
}
