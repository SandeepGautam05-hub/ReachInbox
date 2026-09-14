import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getEmailQueue } from '../queues/email.queue';
import { config } from '../config';
import { rateLimiterService } from '../services/rateLimiter.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const queue = getEmailQueue();
    const [
      totalScheduled,
      totalSent,
      totalFailed,
      totalRateLimited,
      queueCounts,
      sendersStats
    ] = await Promise.all([
      prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.emailJob.count({ where: { status: 'RATE_LIMITED_RESCHEDULED' } }),
      queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused'),
      Promise.all(config.DEFAULT_SENDERS.map(sender => rateLimiterService.getSenderStats(sender)))
    ]);

    return res.json({
      metrics: {
        scheduled: totalScheduled,
        sent: totalSent,
        failed: totalFailed,
        rescheduled: totalRateLimited,
        totalJobs: totalScheduled + totalSent + totalFailed
      },
      queue: queueCounts,
      senders: sendersStats,
      config: {
        workerConcurrency: config.WORKER_CONCURRENCY,
        minDelayBetweenEmailsMs: config.MIN_DELAY_BETWEEN_EMAILS_MS,
        maxEmailsPerHour: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
        availableSenders: config.DEFAULT_SENDERS
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
