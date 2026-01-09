/**
 * Discord Notifier for JAI Finance Core
 *
 * Handles sending notifications to Discord via webhooks.
 */

import type {
  DiscordConfig,
  DiscordEmbed,
  NotificationPayload,
  NotificationAction,
} from './types';

// -----------------------------------------------------------------------------
// Discord Component Types
// -----------------------------------------------------------------------------

/** Discord component types */
const COMPONENT_TYPE = {
  ACTION_ROW: 1,
  BUTTON: 2,
} as const;

/** Discord button styles */
const BUTTON_STYLE = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
} as const;

// -----------------------------------------------------------------------------
// Discord Webhook Payload Types
// -----------------------------------------------------------------------------

interface DiscordButton {
  type: typeof COMPONENT_TYPE.BUTTON;
  style: number;
  label: string;
  custom_id: string;
}

interface DiscordActionRow {
  type: typeof COMPONENT_TYPE.ACTION_ROW;
  components: DiscordButton[];
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordActionRow[];
}

// -----------------------------------------------------------------------------
// DiscordNotifier Class
// -----------------------------------------------------------------------------

/**
 * Sends notifications to Discord via webhooks
 */
export class DiscordNotifier {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    this.config = config;
  }

  /**
   * Send an alert notification (uses 'alerts' webhook)
   */
  async sendAlert(payload: NotificationPayload): Promise<boolean> {
    return this.sendToChannel('alerts', payload);
  }

  /**
   * Send a brief notification (uses 'briefs' webhook)
   */
  async sendBrief(payload: NotificationPayload): Promise<boolean> {
    return this.sendToChannel('briefs', payload);
  }

  /**
   * Send a log notification (uses 'logs' webhook)
   */
  async sendLog(payload: NotificationPayload): Promise<boolean> {
    return this.sendToChannel('logs', payload);
  }

  /**
   * Send a notification to a specific channel/webhook
   */
  async sendToChannel(channel: string, payload: NotificationPayload): Promise<boolean> {
    const webhookUrl = this.config.webhooks[channel];

    if (!webhookUrl) {
      console.error(`[DiscordNotifier] No webhook configured for channel: ${channel}`);
      return false;
    }

    return this.send(webhookUrl, payload);
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Send a notification to a Discord webhook
   */
  private async send(webhookUrl: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const discordPayload = this.buildWebhookPayload(payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discordPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DiscordNotifier] Webhook failed: ${response.status} - ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[DiscordNotifier] Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Build the Discord webhook payload from our notification payload
   */
  private buildWebhookPayload(payload: NotificationPayload): DiscordWebhookPayload {
    const discordPayload: DiscordWebhookPayload = {};

    // Add content with optional user mention for urgent messages
    if (payload.content) {
      let content = payload.content;

      // Add user mention if urgent and userId is configured
      if (payload.urgent && this.config.userId) {
        content = `<@${this.config.userId}> ${content}`;
      }

      discordPayload.content = content;
    } else if (payload.urgent && this.config.userId) {
      // Add mention even without content for urgent messages
      discordPayload.content = `<@${this.config.userId}>`;
    }

    // Add embeds
    if (payload.embeds && payload.embeds.length > 0) {
      discordPayload.embeds = payload.embeds;
    }

    // Add button components
    if (payload.actions && payload.actions.length > 0) {
      discordPayload.components = this.buildComponents(payload.actions);
    }

    return discordPayload;
  }

  /**
   * Build Discord component structure from notification actions
   */
  private buildComponents(actions: NotificationAction[]): DiscordActionRow[] {
    // Discord allows max 5 buttons per action row
    const MAX_BUTTONS_PER_ROW = 5;
    const rows: DiscordActionRow[] = [];

    // Split actions into chunks of 5
    for (let i = 0; i < actions.length; i += MAX_BUTTONS_PER_ROW) {
      const chunk = actions.slice(i, i + MAX_BUTTONS_PER_ROW);
      const buttons = chunk.map(action => this.buildButton(action));

      rows.push({
        type: COMPONENT_TYPE.ACTION_ROW,
        components: buttons,
      });
    }

    return rows;
  }

  /**
   * Build a Discord button from a notification action
   */
  private buildButton(action: NotificationAction): DiscordButton {
    return {
      type: COMPONENT_TYPE.BUTTON,
      style: BUTTON_STYLE[action.style],
      label: action.label,
      custom_id: action.id,
    };
  }
}
