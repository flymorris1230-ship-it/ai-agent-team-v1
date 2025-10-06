/**
 * Notification Service
 * Handles alerts via Email, Slack, Discord, etc.
 */

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    apiKey?: string; // e.g., SendGrid, Mailgun
    from: string;
    to: string[];
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel?: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
  };
}

export interface AlertPayload {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export class NotificationService {
  constructor(private config: NotificationConfig) {}

  /**
   * Send alert notification via all configured channels
   */
  async sendAlert(alert: AlertPayload): Promise<{
    success: boolean;
    channels: Record<string, boolean>;
  }> {
    const results: Record<string, boolean> = {};

    // Send to Slack
    if (this.config.slack?.enabled) {
      results.slack = await this.sendToSlack(alert);
    }

    // Send to Discord
    if (this.config.discord?.enabled) {
      results.discord = await this.sendToDiscord(alert);
    }

    // Send to Email
    if (this.config.email?.enabled) {
      results.email = await this.sendToEmail(alert);
    }

    const success = Object.values(results).some(r => r === true);

    return { success, channels: results };
  }

  /**
   * Send notification to Slack
   */
  private async sendToSlack(alert: AlertPayload): Promise<boolean> {
    if (!this.config.slack?.webhookUrl) {
      console.warn('[NotificationService] Slack webhook URL not configured');
      return false;
    }

    const color = this.getSlackColor(alert.level);
    const emoji = this.getAlertEmoji(alert.level);

    const payload = {
      channel: this.config.slack.channel,
      attachments: [
        {
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.message,
          fields: alert.metadata
            ? Object.entries(alert.metadata).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : undefined,
          footer: 'AI Agent Team',
          ts: Math.floor(alert.timestamp / 1000),
        },
      ],
    };

    try {
      const response = await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[NotificationService] Slack notification failed:', await response.text());
        return false;
      }

      console.log('[NotificationService] ✅ Slack notification sent');
      return true;
    } catch (error) {
      console.error('[NotificationService] Slack notification error:', error);
      return false;
    }
  }

  /**
   * Send notification to Discord
   */
  private async sendToDiscord(alert: AlertPayload): Promise<boolean> {
    if (!this.config.discord?.webhookUrl) {
      console.warn('[NotificationService] Discord webhook URL not configured');
      return false;
    }

    const color = this.getDiscordColor(alert.level);
    const emoji = this.getAlertEmoji(alert.level);

    const payload = {
      embeds: [
        {
          title: `${emoji} ${alert.title}`,
          description: alert.message,
          color,
          fields: alert.metadata
            ? Object.entries(alert.metadata).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true,
              }))
            : undefined,
          footer: {
            text: 'AI Agent Team',
          },
          timestamp: new Date(alert.timestamp).toISOString(),
        },
      ],
    };

    try {
      const response = await fetch(this.config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[NotificationService] Discord notification failed:', await response.text());
        return false;
      }

      console.log('[NotificationService] ✅ Discord notification sent');
      return true;
    } catch (error) {
      console.error('[NotificationService] Discord notification error:', error);
      return false;
    }
  }

  /**
   * Send notification via Email (using SendGrid as example)
   */
  private async sendToEmail(alert: AlertPayload): Promise<boolean> {
    if (!this.config.email?.apiKey || !this.config.email?.from || !this.config.email?.to) {
      console.warn('[NotificationService] Email configuration incomplete');
      return false;
    }

    const emoji = this.getAlertEmoji(alert.level);
    const subject = `${emoji} ${alert.title}`;

    const htmlContent = `
      <html>
        <body>
          <h2 style="color: ${this.getEmailColor(alert.level)};">${emoji} ${alert.title}</h2>
          <p>${alert.message}</p>
          ${
            alert.metadata
              ? `
            <h3>Details:</h3>
            <ul>
              ${Object.entries(alert.metadata)
                .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
                .join('')}
            </ul>
          `
              : ''
          }
          <hr>
          <p style="color: #666; font-size: 12px;">
            AI Agent Team Alert System<br>
            ${new Date(alert.timestamp).toLocaleString()}
          </p>
        </body>
      </html>
    `;

    // SendGrid API example
    const payload = {
      personalizations: this.config.email.to.map(email => ({ to: [{ email }] })),
      from: { email: this.config.email.from },
      subject,
      content: [
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    };

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.email.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[NotificationService] Email notification failed:', await response.text());
        return false;
      }

      console.log('[NotificationService] ✅ Email notification sent');
      return true;
    } catch (error) {
      console.error('[NotificationService] Email notification error:', error);
      return false;
    }
  }

  /**
   * Get Slack color based on alert level
   */
  private getSlackColor(level: AlertPayload['level']): string {
    const colors = {
      info: '#36a64f',      // green
      warning: '#ffaa00',   // orange
      error: '#ff0000',     // red
      critical: '#8b0000',  // dark red
    };
    return colors[level];
  }

  /**
   * Get Discord color based on alert level
   */
  private getDiscordColor(level: AlertPayload['level']): number {
    const colors = {
      info: 0x36a64f,      // green
      warning: 0xffaa00,   // orange
      error: 0xff0000,     // red
      critical: 0x8b0000,  // dark red
    };
    return colors[level];
  }

  /**
   * Get Email color based on alert level
   */
  private getEmailColor(level: AlertPayload['level']): string {
    const colors = {
      info: '#36a64f',      // green
      warning: '#ffaa00',   // orange
      error: '#ff0000',     // red
      critical: '#8b0000',  // dark red
    };
    return colors[level];
  }

  /**
   * Get emoji based on alert level
   */
  private getAlertEmoji(level: AlertPayload['level']): string {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return emojis[level];
  }
}

/**
 * Factory function to create notification service
 */
export function createNotificationService(config: NotificationConfig): NotificationService {
  return new NotificationService(config);
}

/**
 * Singleton instance for Workers
 */
let notificationService: NotificationService | null = null;

export function getNotificationService(config?: NotificationConfig): NotificationService {
  if (!notificationService && config) {
    notificationService = new NotificationService(config);
  }
  if (!notificationService) {
    throw new Error('NotificationService not initialized. Call with config first.');
  }
  return notificationService;
}
