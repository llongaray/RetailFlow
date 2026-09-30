import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  ready = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.ready = true;
    } catch (error) {
      this.ready = false;
      this.logger.error('SQL Server indisponível. Suba o Docker Compose e execute npm run db:setup.');
      this.logger.error(error instanceof Error ? error.message : String(error));
    }
  }

  assertReady() {
    if (!this.ready) throw new ServiceUnavailableException('Banco de dados indisponível.');
  }
}
