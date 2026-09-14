import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { config } from './config';
import { getRedisConnection } from './lib/redis';
import { initEmailQueue, emailScheduler } from './queues/email.queue';
import { startEmailWorker } from './queues/email.worker';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import statsRoutes from './routes/stats.routes';

async function bootstrap() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 1. Establish Redis connection (external or embedded fallback)
  const { host, port } = await getRedisConnection();
  const redisConnectionOptions = {
    host,
    port,
    maxRetriesPerRequest: null,
  };

  // 2. Initialize BullMQ Queue and Worker
  const emailQueue = initEmailQueue(redisConnectionOptions);
  const worker = startEmailWorker(redisConnectionOptions);

  // 3. Mount Bull-Board Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter: serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // 4. API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/stats', statsRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', redis: `${host}:${port}`, timestamp: new Date().toISOString() });
  });

  // 5. Start Express HTTP Server
  const server = app.listen(config.PORT, async () => {
    console.log('=======================================================');
    console.log(`?? ReachInbox Scheduler Backend running on port ${config.PORT}`);
    console.log(`?? Bull-Board Dashboard: http://localhost:${config.PORT}/admin/queues`);
    console.log(`? Worker Concurrency: ${config.WORKER_CONCURRENCY}`);
    console.log(`?? Provider Delay: ${config.MIN_DELAY_BETWEEN_EMAILS_MS}ms`);
    console.log(`??? Rate Limit: ${config.MAX_EMAILS_PER_HOUR_PER_SENDER} emails/hour/sender`);
    console.log('=======================================================');

    await emailScheduler.recoverPendingJobs();
  });

  // 6. Graceful Shutdown Handler
  async function gracefulShutdown(signal: string) {
    console.log(`[Server] Received ${signal}. Closing worker and server...`);
    await worker.close();
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal startup error:', err);
  process.exit(1);
});
