import { Router, Request, Response } from 'express';
import { slackService } from '../services/slack.service';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: { isActive: true }
    });

    return res.json({
      connected: !!integration,
      integration: integration ? {
        teamName: integration.teamName || 'ReachInbox Workspace',
        channel: integration.channel || '#email-alerts',
        hasWebhook: !!integration.webhookUrl,
        hasOAuth: !!integration.accessToken,
        createdAt: integration.createdAt
      } : null
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/connect', (req: Request, res: Response) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.SLACK_CLIENT_ID}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(config.SLACK_REDIRECT_URI)}`;
  return res.json({ url: slackAuthUrl });
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send('Missing code parameter from Slack');
    }

    await slackService.exchangeOAuthCode(code);
    return res.redirect('http://localhost:5173?slack_connected=true');
  } catch (err: any) {
    console.error('[SlackCallback] Error:', err);
    return res.status(500).send('Slack authorization failed: ' + err.message);
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channel } = req.body;
    if (!webhookUrl) return res.status(400).json({ error: 'Webhook URL is required' });

    const integration = await prisma.slackIntegration.upsert({
      where: { userId: 'default-user' },
      update: {
        webhookUrl,
        channel: channel || '#email-alerts',
        teamName: 'Custom Webhook Workspace',
        isActive: true
      },
      create: {
        userId: 'default-user',
        webhookUrl,
        channel: channel || '#email-alerts',
        teamName: 'Custom Webhook Workspace',
        isActive: true
      }
    });

    return res.json({ success: true, integration });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/test-alert', async (req: Request, res: Response) => {
  try {
    const sent = await slackService.sendRateLimitAlert({
      senderEmail: 'growth@reachinbox-outreach.com',
      limit: 5,
      currentCount: 6,
      hourWindow: new Date().toISOString().substring(0, 13),
      nextAvailableWindow: 'Next hour'
    });

    return res.json({ success: sent, message: sent ? 'Alert sent to Slack!' : 'No active Slack connection found.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    await prisma.slackIntegration.deleteMany({});
    return res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
