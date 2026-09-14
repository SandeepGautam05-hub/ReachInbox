import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { smtpService } from '../services/smtp.service';
import { rateLimiterService } from '../services/rateLimiter.service';
import { emailScheduler, EMAIL_QUEUE_NAME, EmailJobData } from './email.queue';
import { elasticsearchService } from '../services/elasticsearch.service';
import { config } from '../config';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function startEmailWorker(connectionOptions: any): Worker {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { jobId, senderEmail, recipientEmail, subject, body, delayBetweenEmailsMs, hourlyLimit, userId } = job.data;
      console.log(`[Worker] Processing email job ${job.id} -> Recipient: ${recipientEmail}, Sender: ${senderEmail}`);

      const dbJob = await prisma.emailJob.findUnique({
        where: { id: jobId }
      });

      if (!dbJob) {
        console.warn(`[Worker] Job ${jobId} not found in DB. Skipping.`);
        return;
      }

      if (dbJob.status === 'CANCELLED' || dbJob.status === 'SENT') {
        console.log(`[Worker] Job ${jobId} already '${dbJob.status}'. Skipping.`);
        return;
      }

      const rateLimitCheck = await rateLimiterService.checkAndIncrement(senderEmail, hourlyLimit, userId);
      if (!rateLimitCheck.allowed) {
        console.warn(`[Worker] Sender '${senderEmail}' reached hourly limit (${rateLimitCheck.currentCount}/${hourlyLimit}). Rescheduling job '${jobId}'.`);
        await emailScheduler.rescheduleJobForNextWindow(job.data, rateLimitCheck.delayMs);
        return { status: 'RATE_LIMITED_RESCHEDULED', nextWindowDelay: rateLimitCheck.delayMs };
      }

      await prisma.emailJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' }
      });

      try {
        const throttleDelay = Math.max(delayBetweenEmailsMs || config.MIN_DELAY_BETWEEN_EMAILS_MS, 500);
        if (throttleDelay > 0) {
          console.log(`[Worker] Enforcing provider delay of ${throttleDelay}ms before dispatch...`);
          await sleep(throttleDelay);
        }

        const sendResult = await smtpService.sendEmail({
          from: senderEmail,
          to: recipientEmail,
          subject: subject,
          html: body,
        });

        const updatedJob = await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: sendResult.previewUrl || null,
            messageId: sendResult.messageId,
            errorMessage: null,
          }
        });

        await elasticsearchService.indexEmail(updatedJob);
        console.log(`[Worker] Successfully sent email to ${recipientEmail}! Ethereal preview: ${sendResult.previewUrl}`);
        return { status: 'SENT', messageId: sendResult.messageId, previewUrl: sendResult.previewUrl };
      } catch (sendErr: any) {
        console.error(`[Worker] Failed to send email to ${recipientEmail}:`, sendErr.message);

        const failedJob = await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: sendErr.message,
            retryCount: { increment: 1 }
          }
        });

        await elasticsearchService.indexEmail(failedJob);
        throw sendErr;
      }
    },
    {
      connection: connectionOptions,
      concurrency: config.WORKER_CONCURRENCY,
      limiter: {
        max: 10,
        duration: 1000
      }
    }
  );

  worker.on('ready', () => {
    console.log(`[Worker] BullMQ worker ready (concurrency: ${config.WORKER_CONCURRENCY})`);
  });

  return worker;
}
