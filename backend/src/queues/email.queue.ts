import { Queue } from 'bullmq';
import { prisma } from '../lib/prisma';
import { elasticsearchService } from '../services/elasticsearch.service';

export interface EmailJobData {
  jobId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  userId?: string | null;
  batchId?: string;
  attempt?: number;
}

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

let emailQueueInstance: Queue<EmailJobData> | null = null;

export function initEmailQueue(connectionOptions: any): Queue<EmailJobData> {
  if (emailQueueInstance) return emailQueueInstance;

  emailQueueInstance = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
    connection: connectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 86400,
        count: 5000
      },
      removeOnFail: {
        age: 86400 * 7
      }
    }
  });

  return emailQueueInstance;
}

export function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueueInstance) {
    throw new Error('Email queue has not been initialized yet.');
  }
  return emailQueueInstance;
}

export class EmailScheduler {
  async scheduleEmail(jobRecord: {
    id: string;
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    delayBetweenEmailsMs?: number;
    hourlyLimit?: number;
    userId?: string | null;
    batchId?: string;
  }): Promise<string> {
    const queue = getEmailQueue();
    const now = Date.now();
    const targetTime = new Date(jobRecord.scheduledAt).getTime();
    const delay = Math.max(targetTime - now, 0);

    const bullmqJobId = `email-job-${jobRecord.id}`;

    const jobData: EmailJobData = {
      jobId: jobRecord.id,
      senderEmail: jobRecord.senderEmail,
      recipientEmail: jobRecord.recipientEmail,
      subject: jobRecord.subject,
      body: jobRecord.body,
      delayBetweenEmailsMs: jobRecord.delayBetweenEmailsMs || 2000,
      hourlyLimit: jobRecord.hourlyLimit || 200,
      userId: jobRecord.userId,
      batchId: jobRecord.batchId,
      attempt: 1
    };

    const job = await queue.add('send-email', jobData, {
      jobId: bullmqJobId,
      delay: delay,
    });

    await prisma.emailJob.update({
      where: { id: jobRecord.id },
      data: { bullmqJobId: job.id }
    });

    await elasticsearchService.indexEmail({
      ...jobRecord,
      status: 'SCHEDULED'
    });

    console.log(`[Scheduler] Enqueued delayed email job '${bullmqJobId}' for ${jobRecord.recipientEmail} with delay ${delay}ms`);
    return job.id!;
  }

  async rescheduleJobForNextWindow(jobData: EmailJobData, delayMs: number): Promise<void> {
    const queue = getEmailQueue();
    const nextRun = new Date(Date.now() + delayMs);
    const newBullmqJobId = `email-job-${jobData.jobId}-retry-${Date.now()}`;

    await queue.add('send-email', {
      ...jobData,
      attempt: (jobData.attempt || 1) + 1
    }, {
      jobId: newBullmqJobId,
      delay: delayMs,
    });

    await prisma.emailJob.update({
      where: { id: jobData.jobId },
      data: {
        status: 'RATE_LIMITED_RESCHEDULED',
        scheduledAt: nextRun,
        bullmqJobId: newBullmqJobId,
        errorMessage: `Hourly rate limit exceeded. Rescheduled to ${nextRun.toISOString()}`
      }
    });

    console.log(`[Scheduler] Rescheduled job '${jobData.jobId}' into next window with ${delayMs}ms delay (run at: ${nextRun.toISOString()})`);
  }

  async recoverPendingJobs(): Promise<void> {
    try {
      const queue = getEmailQueue();
      const pendingJobs = await prisma.emailJob.findMany({
        where: {
          status: { in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'] }
        }
      });

      console.log(`[Scheduler Recovery] Found ${pendingJobs.length} pending jobs in DB during startup check.`);

      for (const job of pendingJobs) {
        const existingJob = await queue.getJob(`email-job-${job.id}`);
        if (!existingJob) {
          const now = Date.now();
          const targetTime = new Date(job.scheduledAt).getTime();
          const delay = Math.max(targetTime - now, 0);

          await queue.add('send-email', {
            jobId: job.id,
            senderEmail: job.senderEmail,
            recipientEmail: job.recipientEmail,
            subject: job.subject,
            body: job.body,
            delayBetweenEmailsMs: job.delayBetweenEmailsMs,
            hourlyLimit: job.hourlyLimit,
            userId: job.userId,
            batchId: job.batchId || undefined
          }, {
            jobId: `email-job-${job.id}`,
            delay
          });
          console.log(`[Scheduler Recovery] Re-queued pending job ${job.id} for ${job.recipientEmail} (delay ${delay}ms)`);
        }
      }
    } catch (e: any) {
      console.warn('[Scheduler Recovery] Error during startup recovery:', e.message);
    }
  }
}

export const emailScheduler = new EmailScheduler();
