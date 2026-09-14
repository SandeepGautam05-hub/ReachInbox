import axios from 'axios';
import { prisma } from '../lib/prisma';
import { config } from '../config';

interface SlackAlertData {
  senderEmail: string;
  limit: number;
  currentCount: number;
  hourWindow: string;
  rescheduledCount?: number;
  nextAvailableWindow?: string;
}

class SlackService {
  async sendRateLimitAlert(data: SlackAlertData, userId?: string | null): Promise<boolean> {
    try {
      let webhookUrl = config.SLACK_DEFAULT_WEBHOOK_URL;
      let accessToken: string | null = null;
      let channel: string | null = null;

      const integration = await prisma.slackIntegration.findFirst({
        where: userId ? { userId, isActive: true } : { isActive: true },
      });

      if (integration) {
        if (integration.webhookUrl) webhookUrl = integration.webhookUrl;
        if (integration.accessToken) accessToken = integration.accessToken;
        if (integration.channel) channel = integration.channel;
      }

      if (!webhookUrl && !accessToken) {
        console.log(`[Slack] No active Slack webhook or OAuth token connected. Skipping live notification for sender: ${data.senderEmail}`);
        return false;
      }

      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "?? ReachInbox Rate Limit Alert",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Sender Account:*
\`${data.senderEmail}\``
            },
            {
              type: "mrkdwn",
              text: `*Hourly Limit:*
*${data.limit} emails / hour*`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Status:* Limit reached for hour window *${data.hourWindow}* (Processed: *${data.currentCount}* emails).
Subsequent emails for this sender are being *gracefully delayed and rescheduled* into window *${data.nextAvailableWindow || 'next hour'}* without job loss.`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `?? Timestamp: ${new Date().toISOString()} | ReachInbox Scheduler Daemon`
            }
          ]
        }
      ];

      if (webhookUrl) {
        await axios.post(webhookUrl, {
          text: `?? Rate limit exceeded for sender ${data.senderEmail} (${data.currentCount}/${data.limit} emails in window ${data.hourWindow})`,
          blocks
        }, { timeout: 5000 });
        console.log(`[Slack] Successfully delivered rate limit alert to webhook for ${data.senderEmail}`);
        return true;
      } else if (accessToken && channel) {
        await axios.post('https://slack.com/api/chat.postMessage', {
          channel,
          text: `?? Rate limit exceeded for sender ${data.senderEmail}`,
          blocks
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000
        });
        console.log(`[Slack] Successfully delivered rate limit alert via Slack API for ${data.senderEmail}`);
        return true;
      }

      return false;
    } catch (err: any) {
      console.warn('[Slack] Failed to dispatch Slack notification:', err.message);
      return false;
    }
  }

  async exchangeOAuthCode(code: string, userId?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('client_id', config.SLACK_CLIENT_ID);
    params.append('client_secret', config.SLACK_CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', config.SLACK_REDIRECT_URI);

    const res = await axios.post('https://slack.com/api/oauth.v2.access', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!res.data.ok) {
      throw new Error(res.data.error || 'Slack OAuth failed');
    }

    const { incoming_webhook, access_token, team } = res.data;
    const webhookUrl = incoming_webhook?.url;
    const channel = incoming_webhook?.channel;

    const integration = await prisma.slackIntegration.upsert({
      where: { userId: userId || 'default-user' },
      update: {
        accessToken: access_token,
        webhookUrl: webhookUrl || undefined,
        channel: channel || undefined,
        teamId: team?.id,
        teamName: team?.name,
        isActive: true,
      },
      create: {
        userId: userId || 'default-user',
        accessToken: access_token,
        webhookUrl: webhookUrl || undefined,
        channel: channel || undefined,
        teamId: team?.id,
        teamName: team?.name,
        isActive: true,
      }
    });

    return integration;
  }
}

export const slackService = new SlackService();
