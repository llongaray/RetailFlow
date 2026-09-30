import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { OracleLegacyAdapter } from './oracle.adapter';

@Injectable()
export class IntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationService.name);
  private timer?: NodeJS.Timeout;
  private queue?: Queue;
  private worker?: Worker;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly oracle: OracleLegacyAdapter,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    this.timer = setInterval(() => void this.drain(), 4000);
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl || this.config.get<string>('USE_BULLMQ') === 'false') return;
    try {
      const connection = this.connection(redisUrl);
      this.queue = new Queue('retailflow.integrations', { connection });
      await Promise.race([
        this.queue.waitUntilReady(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
      ]);
      this.worker = new Worker('retailflow.integrations', async () => this.drain(), { connection });
      await this.queue.upsertJobScheduler('retailflow-drain', { every: 4000 }, { name: 'drain', data: {} });
      this.logger.log('BullMQ conectado ao Redis.');
    } catch (error) {
      this.logger.warn(`Redis indisponível. A outbox segue pelo agendador interno. ${error instanceof Error ? error.message : ''}`);
      await this.queue?.close().catch(() => undefined);
      await this.worker?.close().catch(() => undefined);
      this.queue = undefined;
      this.worker = undefined;
    }
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  async list() {
    const jobs = await this.prisma.integrationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return jobs.map((job) => ({
      id: job.id,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      lastError: job.lastError,
      payload: job.payload,
      createdAt: job.createdAt,
    }));
  }

  async drain() {
    if (!this.prisma.ready || this.draining) return;
    this.draining = true;
    try {
      const jobs = await this.prisma.integrationJob.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 20 });
      for (const job of jobs) {
        const locked = await this.prisma.integrationJob.updateMany({
          where: { id: job.id, status: 'PENDING' },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });
        if (locked.count === 0) continue;
        try {
          await this.oracle.sync(job.type, JSON.parse(job.payload));
          await this.prisma.integrationJob.update({ where: { id: job.id }, data: { status: 'DONE', lastError: null } });
        } catch (error) {
          await this.prisma.integrationJob.update({
            where: { id: job.id },
            data: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'falha na integração' },
          });
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private connection(url: string) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
    };
  }
}
