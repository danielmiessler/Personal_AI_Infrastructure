/**
 * Notification Service
 * Multi-channel notification system for PAI infrastructure
 *
 * Channels:
 * - ntfy.sh: Mobile push notifications
 * - Discord: Team/server notifications (optional)
 * - Desktop: Native notifications (macOS + Linux)
 *
 * Design principles:
 * - Async, non-blocking (fire-and-forget)
 * - Fail gracefully (never block hook execution)
 * - Priority-based routing
 * - Conservative defaults (avoid notification fatigue)
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getIdentity } from './identity';

// ============================================================================
// Types
// ============================================================================

export type NotificationPriority = 'min' | 'low' | 'default' | 'high' | 'urgent';

export type NotificationEvent =
  | 'taskComplete'      // Normal task completion
  | 'longTask'          // Task that took >5 minutes
  | 'backgroundAgent'   // Background agent completed
  | 'error'             // Error occurred
  | 'security';         // Security alert

export interface NotificationOptions {
  title?: string;
  priority?: NotificationPriority;
  tags?: string[];        // ntfy emoji tags like 'robot', 'white_check_mark'
  click?: string;         // URL to open on click
  actions?: Array<{       // ntfy action buttons
    action: 'view' | 'http';
    label: string;
    url: string;
  }>;
}

export interface NotificationConfig {
  ntfy: {
    enabled: boolean;
    topic: string;
    server: string;
  };
  discord: {
    enabled: boolean;
    webhook: string;
  };
  twilio: {
    enabled: boolean;
    toNumber: string;  // User's phone number for SMS alerts
  };
  thresholds: {
    longTaskMinutes: number;
  };
  routing: {
    [key in NotificationEvent]: ('ntfy' | 'discord' | 'desktop' | 'sms')[];
  };
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: NotificationConfig = {
  ntfy: {
    enabled: false,  // Disabled by default - configure in settings.json
    topic: '',       // Required: set in settings.json notifications.ntfy.topic
    server: 'ntfy.sh'
  },
  discord: {
    enabled: false,
    webhook: ''
  },
  twilio: {
    enabled: false,
    toNumber: ''
  },
  thresholds: {
    longTaskMinutes: 5
  },
  routing: {
    taskComplete: [],                    // Voice only (existing behavior)
    longTask: ['ntfy'],                  // Push for long tasks
    backgroundAgent: ['ntfy'],           // Push for background completions
    error: ['ntfy', 'discord'],          // Multiple channels for errors
    security: ['ntfy', 'discord', 'sms'] // All channels for security
  }
};

/**
 * Expand ${VAR} patterns in a string using environment variables
 */
function expandEnvVars(content: string): string {
  return content.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '');
}

/**
 * Load notification config from settings.json
 */
export function getNotificationConfig(): NotificationConfig {
  try {
    const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
    const settingsPath = join(paiDir, 'settings.json');

    if (existsSync(settingsPath)) {
      const rawContent = readFileSync(settingsPath, 'utf-8');
      const expandedContent = expandEnvVars(rawContent);
      const settings = JSON.parse(expandedContent);
      if (settings.notifications) {
        return {
          ...DEFAULT_CONFIG,
          ...settings.notifications,
          ntfy: { ...DEFAULT_CONFIG.ntfy, ...settings.notifications?.ntfy },
          discord: { ...DEFAULT_CONFIG.discord, ...settings.notifications?.discord },
          twilio: { ...DEFAULT_CONFIG.twilio, ...settings.notifications?.twilio },
          thresholds: { ...DEFAULT_CONFIG.thresholds, ...settings.notifications?.thresholds },
          routing: { ...DEFAULT_CONFIG.routing, ...settings.notifications?.routing }
        };
      }
    }
  } catch (error) {
    // Fail gracefully, use defaults
    console.error('Failed to load notification config:', error);
  }

  return DEFAULT_CONFIG;
}

// ============================================================================
// Session Timing
// ============================================================================

const SESSION_START_FILE = '/tmp/kai-session-start.txt';

/**
 * Record session start time (call from SessionStart hook)
 */
export function recordSessionStart(): void {
  try {
    writeFileSync(SESSION_START_FILE, Date.now().toString());
  } catch (error) {
    // Fail gracefully
  }
}

/**
 * Get session duration in minutes
 */
export function getSessionDurationMinutes(): number {
  try {
    if (existsSync(SESSION_START_FILE)) {
      const startTime = parseInt(readFileSync(SESSION_START_FILE, 'utf-8'));
      const duration = (Date.now() - startTime) / 1000 / 60; // minutes
      return duration;
    }
  } catch (error) {
    // Fail gracefully
  }
  return 0;
}

/**
 * Determine if current task is "long running" based on threshold
 */
export function isLongRunningTask(): boolean {
  const config = getNotificationConfig();
  const duration = getSessionDurationMinutes();
  return duration >= config.thresholds.longTaskMinutes;
}

// ============================================================================
// Channel Implementations
// ============================================================================

/**
 * Send push notification via ntfy.sh
 */
export async function sendPush(
  message: string,
  options: NotificationOptions = {}
): Promise<boolean> {
  const config = getNotificationConfig();

  if (!config.ntfy.enabled || !config.ntfy.topic) {
    return false;
  }

  try {
    const url = `https://${config.ntfy.server}/${config.ntfy.topic}`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };

    if (options.title) {
      headers['Title'] = options.title;
    }

    if (options.priority) {
      // ntfy uses numeric priorities: 1 (min) to 5 (max)
      const priorityMap: Record<NotificationPriority, string> = {
        'min': '1',
        'low': '2',
        'default': '3',
        'high': '4',
        'urgent': '5'
      };
      headers['Priority'] = priorityMap[options.priority] || '3';
    }

    if (options.tags && options.tags.length > 0) {
      headers['Tags'] = options.tags.join(',');
    }

    if (options.click) {
      headers['Click'] = options.click;
    }

    if (options.actions && options.actions.length > 0) {
      headers['Actions'] = options.actions
        .map(a => `${a.action}, ${a.label}, ${a.url}`)
        .join('; ');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: message
    });

    return response.ok;
  } catch (error) {
    // Fail silently - don't block hook execution
    console.error('ntfy send failed:', error);
    return false;
  }
}

/**
 * Send notification to Discord webhook
 */
export async function sendDiscord(
  message: string,
  options: {
    title?: string;
    description?: string;
    color?: number;       // Embed color (decimal)
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  } = {}
): Promise<boolean> {
  const config = getNotificationConfig();

  if (!config.discord.enabled || !config.discord.webhook) {
    return false;
  }

  try {
    const payload: any = {};

    if (options.title || options.description || options.fields) {
      // Use embed for rich messages
      payload.embeds = [{
        title: options.title,
        description: options.description || message,
        color: options.color || 0x7289da, // Discord blurple
        fields: options.fields,
        timestamp: new Date().toISOString()
      }];
    } else {
      // Simple text message
      payload.content = message;
    }

    const response = await fetch(config.discord.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Discord send failed:', error);
    return false;
  }
}

/**
 * Send native desktop notification (macOS + Linux)
 */
export async function sendDesktop(
  title: string,
  message: string,
  options: {
    sound?: string;       // Sound name (e.g., 'Glass', 'Ping') - macOS only
    subtitle?: string;
  } = {}
): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      const soundPart = options.sound ? ` sound name "${options.sound}"` : '';
      const subtitlePart = options.subtitle ? ` subtitle "${options.subtitle}"` : '';

      const script = `display notification "${message}" with title "${title}"${subtitlePart}${soundPart}`;

      const proc = Bun.spawn(['osascript', '-e', script]);
      await proc.exited;

      return proc.exitCode === 0;
    } else if (process.platform === 'linux') {
      // Use notify-send (libnotify) on Linux
      const args = [title, message];

      const proc = Bun.spawn(['notify-send', ...args]);
      await proc.exited;

      return proc.exitCode === 0;
    }

    // Unsupported platform
    return false;
  } catch (error) {
    // Gracefully handle missing notify-send (headless Linux) or other errors
    console.error('Desktop notification failed:', error);
    return false;
  }
}

/**
 * Send SMS via Twilio
 * Uses curl for reliability (Bun fetch has connection issues with Twilio)
 */
export async function sendSMS(message: string): Promise<boolean> {
  const config = getNotificationConfig();

  if (!config.twilio.enabled || !config.twilio.toNumber) {
    return false;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error('Twilio credentials not found in environment');
    return false;
  }

  try {
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) {
      console.error('TWILIO_FROM_NUMBER not set in environment');
      return false;
    }
    const daName = getIdentity().name;
    const body = `[${daName}] ${message}`.substring(0, 160); // SMS limit

    // Use curl for reliability
    const proc = Bun.spawn([
      'curl', '-s', '-X', 'POST',
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      '-u', `${accountSid}:${authToken}`,
      '-d', `To=${config.twilio.toNumber}`,
      '-d', `From=${fromNumber}`,
      '-d', `Body=${body}`
    ]);

    await proc.exited;
    return proc.exitCode === 0;
  } catch (error) {
    console.error('SMS send failed:', error);
    return false;
  }
}

// ============================================================================
// Smart Router
// ============================================================================

/**
 * Send notification through appropriate channels based on event type
 * This is the main entry point for notifications
 */
export async function notify(
  event: NotificationEvent,
  message: string,
  options: NotificationOptions = {}
): Promise<void> {
  const config = getNotificationConfig();
  const channels = config.routing[event] || [];

  // Fire all notifications in parallel, don't wait for completion
  const promises: Promise<boolean>[] = [];

  for (const channel of channels) {
    switch (channel) {
      case 'ntfy':
        promises.push(sendPush(message, {
          title: options.title || getDefaultTitle(event),
          priority: options.priority || getDefaultPriority(event),
          tags: options.tags || getDefaultTags(event),
          ...options
        }));
        break;

      case 'discord':
        promises.push(sendDiscord(message, {
          title: options.title || getDefaultTitle(event),
          color: getDiscordColor(event)
        }));
        break;

      case 'desktop':
        promises.push(sendDesktop(
          options.title || getDefaultTitle(event),
          message,
          { sound: event === 'error' || event === 'security' ? 'Basso' : 'Glass' }
        ));
        break;

      case 'sms':
        promises.push(sendSMS(message));
        break;
    }
  }

  // Fire and forget - don't await
  Promise.all(promises).catch(() => {
    // Silently ignore failures
  });
}

/**
 * Convenience function for task completion with duration check
 */
export async function notifyTaskComplete(message: string, options: NotificationOptions = {}): Promise<void> {
  const event: NotificationEvent = isLongRunningTask() ? 'longTask' : 'taskComplete';
  await notify(event, message, options);
}

/**
 * Convenience function for background agent completion
 */
export async function notifyBackgroundAgent(
  agentType: string,
  message: string,
  options: NotificationOptions = {}
): Promise<void> {
  await notify('backgroundAgent', message, {
    title: `${agentType} Agent Complete`,
    tags: ['robot', 'white_check_mark'],
    ...options
  });
}

/**
 * Convenience function for error notifications
 */
export async function notifyError(message: string, options: NotificationOptions = {}): Promise<void> {
  await notify('error', message, {
    priority: 'high',
    tags: ['warning', 'x'],
    ...options
  });
}

// ============================================================================
// Helpers
// ============================================================================

function getDefaultTitle(event: NotificationEvent): string {
  const daName = getIdentity().name;
  const titles: Record<NotificationEvent, string> = {
    taskComplete: daName,
    longTask: `${daName} - Task Complete`,
    backgroundAgent: `${daName} - Agent Complete`,
    error: `${daName} - Error`,
    security: `${daName} - Security Alert`
  };
  return titles[event];
}

function getDefaultPriority(event: NotificationEvent): NotificationPriority {
  const priorities: Record<NotificationEvent, NotificationPriority> = {
    taskComplete: 'default',
    longTask: 'default',
    backgroundAgent: 'default',
    error: 'high',
    security: 'urgent'
  };
  return priorities[event];
}

function getDefaultTags(event: NotificationEvent): string[] {
  const tags: Record<NotificationEvent, string[]> = {
    taskComplete: ['white_check_mark'],
    longTask: ['hourglass', 'white_check_mark'],
    backgroundAgent: ['robot', 'white_check_mark'],
    error: ['warning', 'x'],
    security: ['rotating_light', 'lock']
  };
  return tags[event];
}

function getDiscordColor(event: NotificationEvent): number {
  const colors: Record<NotificationEvent, number> = {
    taskComplete: 0x57f287,   // Green
    longTask: 0x57f287,       // Green
    backgroundAgent: 0x5865f2, // Blurple
    error: 0xed4245,          // Red
    security: 0xfee75c        // Yellow
  };
  return colors[event];
}
