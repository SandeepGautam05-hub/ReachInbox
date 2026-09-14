import { Client } from '@elastic/elasticsearch';
import { prisma } from '../lib/prisma';
import { config } from '../config';

class ElasticsearchService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private indexName = 'reachinbox-emails';

  constructor() {
    if (config.ELASTICSEARCH_ENABLED) {
      this.init();
    }
  }

  private async init() {
    try {
      this.client = new Client({ node: config.ELASTICSEARCH_URL });
      await this.client.ping();
      this.isConnected = true;
      console.log('[Elasticsearch] Connected successfully to', config.ELASTICSEARCH_URL);
      await this.createIndexIfNotExists();
    } catch (err: any) {
      console.warn('[Elasticsearch] Running in DB Full-Text mode:', err.message);
      this.isConnected = false;
    }
  }

  private async createIndexIfNotExists() {
    if (!this.client || !this.isConnected) return;
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                senderEmail: { type: 'keyword' },
                recipientEmail: { type: 'keyword' },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                userId: { type: 'keyword' }
              }
            }
          }
        });
        console.log(`[Elasticsearch] Created index '${this.indexName}'`);
      }
    } catch (e: any) {
      console.warn('[Elasticsearch] Index init error:', e.message);
    }
  }

  async indexEmail(job: any) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.index({
        index: this.indexName,
        id: job.id,
        document: {
          id: job.id,
          senderEmail: job.senderEmail,
          recipientEmail: job.recipientEmail,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduledAt,
          sentAt: job.sentAt || null,
          userId: job.userId || null
        }
      });
    } catch (e: any) {
      console.warn('[Elasticsearch] Failed to index document:', e.message);
    }
  }

  async searchEmails(query: string, status?: string) {
    if (this.client && this.isConnected && query) {
      try {
        const must: any[] = [
          {
            multi_match: {
              query,
              fields: ['subject^3', 'recipientEmail^2', 'senderEmail^2', 'body'],
              fuzziness: 'AUTO'
            }
          }
        ];

        if (status) {
          must.push({ term: { status } });
        }

        const res = await this.client.search({
          index: this.indexName,
          query: { bool: { must } }
        });

        const hits = res.hits.hits.map((h: any) => h._source);
        return hits;
      } catch (e: any) {
        console.warn('[Elasticsearch] Search query failed, falling back to DB:', e.message);
      }
    }

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (query) {
      whereClause.OR = [
        { recipientEmail: { contains: query } },
        { senderEmail: { contains: query } },
        { subject: { contains: query } },
        { body: { contains: query } }
      ];
    }

    return await prisma.emailJob.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'desc' },
      take: 50
    });
  }
}

export const elasticsearchService = new ElasticsearchService();
