import { getRedisClient } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { slackService } from './slack.service';
import { config } from '../config';

export class RateLimiterService {
  getHourWindowKey(date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}-${hh}`;
  }

  getDelayUntilNextHour(date: Date = new Date()): number {
    const nextHour = new Date(date);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1);
    nextHour.setUTCMinutes(0);
    nextHour.setUTCSeconds(0);
    nextHour.setUTCMilliseconds(0);
    return Math.max(nextHour.getTime() - date.getTime(), 1000);
  }

  async checkAndIncrement(
    senderEmail: string,
    hourlyLimit: number = config.MAX_EMAILS_PER_HOUR_PER_SENDER,
    userId?: string | null
  ): Promise<{ allowed: boolean; currentCount: number; delayMs: number; hourWindow: string }> {
    const now = new Date();
    const hourWindow = this.getHourWindowKey(now);
    const redisKey = `rate_limit:${senderEmail}:${hourWindow}`;
    const redis = getRedisClient();

    let currentCount = 1;
    let allowed = true;

    try {
      currentCount = await redis.incr(redisKey);
      if (currentCount === 1) {
        await redis.expire(redisKey, 7200);
      }
    } catch (err: any) {
      console.warn(`[RateLimiter] Redis fallback to DB:`, err.message);
      const log = await prisma.senderRateLimitLog.upsert({
        where: { senderEmail_hourWindow: { senderEmail, hourWindow } },
        update: { count: { increment: 1 } },
        create: { senderEmail, hourWindow, count: 1 },
      });
      currentCount = log.count;
    }

    if (currentCount > hourlyLimit) {
      allowed = false;
      const delayMs = this.getDelayUntilNextHour(now);

      const lockKey = `slack_notified:${senderEmail}:${hourWindow}`;
      try {
        const isNotified = await redis.set(lockKey, 'true', 'EX', 7200, 'NX');
        if (isNotified) {
          const nextWindow = this.getHourWindowKey(new Date(now.getTime() + delayMs + 1000));
          await slackService.sendRateLimitAlert({
            senderEmail,
            limit: hourlyLimit,
            currentCount,
            hourWindow,
            nextAvailableWindow: nextWindow
          }, userId);
        }
      } catch (e: any) {
        console.warn('[RateLimiter] Failed to check slack notification lock:', e.message);
      }

      return { allowed: false, currentCount, delayMs, hourWindow };
    }

    return { allowed: true, currentCount, delayMs: 0, hourWindow };
  }

  async getSenderStats(senderEmail: string): Promise<{ senderEmail: string; hourWindow: string; currentCount: number; limit: number }> {
    const now = new Date();
    const hourWindow = this.getHourWindowKey(now);
    const redisKey = `rate_limit:${senderEmail}:${hourWindow}`;
    const redis = getRedisClient();

    let count = 0;
    try {
      const val = await redis.get(redisKey);
      count = val ? parseInt(val, 10) : 0;
    } catch {
      const log = await prisma.senderRateLimitLog.findUnique({
        where: { senderEmail_hourWindow: { senderEmail, hourWindow } },
      });
      count = log?.count || 0;
    }

    return {
      senderEmail,
      hourWindow,
      currentCount: count,
      limit: config.MAX_EMAILS_PER_HOUR_PER_SENDER
    };
  }
}

export const rateLimiterService = new RateLimiterService();
