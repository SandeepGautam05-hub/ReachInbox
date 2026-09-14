import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { emailScheduler, getEmailQueue } from '../queues/email.queue';
import { elasticsearchService } from '../services/elasticsearch.service';
import { config } from '../config';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/schedule', upload.single('csvFile'), async (req: Request, res: Response) => {
  try {
    let {
      senderEmail,
      recipientEmails,
      subject,
      body,
      scheduledAt,
      delayBetweenEmailsMs,
      hourlyLimit,
      userId
    } = req.body;

    const parsedRecipients: string[] = [];

    if (recipientEmails) {
      if (typeof recipientEmails === 'string') {
        try {
          const parsed = JSON.parse(recipientEmails);
          if (Array.isArray(parsed)) parsedRecipients.push(...parsed);
          else parsedRecipients.push(...recipientEmails.split(',').map(e => e.trim()));
        } catch {
          parsedRecipients.push(...recipientEmails.split(',').map(e => e.trim()));
        }
      } else if (Array.isArray(recipientEmails)) {
        parsedRecipients.push(...recipientEmails);
      }
    }

    if (req.file) {
      const csvStream = Readable.from(req.file.buffer.toString('utf-8'));
      await new Promise<void>((resolve, reject) => {
        csvStream
          .pipe(csvParser())
          .on('data', (row: any) => {
            const values = Object.values(row);
            for (const val of values) {
              const str = String(val).trim();
              if (str.includes('@') && str.includes('.')) {
                parsedRecipients.push(str);
                break;
              }
            }
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
    }

    const uniqueRecipients = Array.from(new Set(parsedRecipients)).filter(e => e.includes('@'));

    if (uniqueRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses found.' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required.' });
    }

    const sender = senderEmail || config.DEFAULT_SENDERS[0];
    const startTime = scheduledAt ? new Date(scheduledAt) : new Date();
    const delayBetween = delayBetweenEmailsMs ? parseInt(delayBetweenEmailsMs, 10) : config.MIN_DELAY_BETWEEN_EMAILS_MS;
    const maxPerHour = hourlyLimit ? parseInt(hourlyLimit, 10) : config.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const batchId = uuidv4();

    const createdJobs: any[] = [];

    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      const targetScheduledAt = new Date(startTime.getTime() + (i * delayBetween));
      const idempotencyKey = `email-${sender}-${recipient}-${targetScheduledAt.getTime()}-${uuidv4().substring(0, 8)}`;

      const jobRecord = await prisma.emailJob.create({
        data: {
          senderEmail: sender,
          recipientEmail: recipient,
          subject,
          body,
          scheduledAt: targetScheduledAt,
          delayBetweenEmailsMs: delayBetween,
          hourlyLimit: maxPerHour,
          batchId,
          idempotencyKey,
          userId: userId || null,
          status: 'SCHEDULED'
        }
      });

      await emailScheduler.scheduleEmail({
        id: jobRecord.id,
        senderEmail: jobRecord.senderEmail,
        recipientEmail: jobRecord.recipientEmail,
        subject: jobRecord.subject,
        body: jobRecord.body,
        scheduledAt: jobRecord.scheduledAt,
        delayBetweenEmailsMs: jobRecord.delayBetweenEmailsMs,
        hourlyLimit: jobRecord.hourlyLimit,
        userId: jobRecord.userId,
        batchId: jobRecord.batchId || undefined
      });

      createdJobs.push(jobRecord);
    }

    return res.json({
      success: true,
      batchId,
      totalScheduled: createdJobs.length,
      firstEmailScheduledAt: startTime.toISOString(),
      lastEmailScheduledAt: createdJobs[createdJobs.length - 1].scheduledAt.toISOString(),
      sender,
      delayBetweenEmailsMs: delayBetween,
      hourlyLimit: maxPerHour,
      jobs: createdJobs
    });
  } catch (err: any) {
    console.error('[EmailRoute] Schedule error:', err);
    return res.status(500).json({ error: 'Failed to schedule emails: ' + err.message });
  }
});

router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = (req.query.search as string || '').trim();
    const sender = req.query.sender as string;

    const where: any = {
      status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED_RESCHEDULED'] }
    };

    if (sender) where.senderEmail = sender;
    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { subject: { contains: search } },
        { senderEmail: { contains: search } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      })
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sent', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string;

    const where: any = {
      status: status ? status : { in: ['SENT', 'FAILED'] }
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { subject: { contains: search } },
        { senderEmail: { contains: search } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/cancel/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (job.bullmqJobId) {
      const queue = getEmailQueue();
      const bJob = await queue.getJob(job.bullmqJobId);
      if (bJob) {
        await bJob.remove();
      }
    }

    const updated = await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    await elasticsearchService.indexEmail(updated);

    return res.json({ success: true, message: 'Email job cancelled successfully', job: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    const status = req.query.status as string;
    const results = await elasticsearchService.searchEmails(query, status);
    return res.json({ query, total: results.length, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
