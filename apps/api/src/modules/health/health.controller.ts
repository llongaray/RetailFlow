import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let database: 'up' | 'down' = 'down';
    if (this.prisma.ready) {
      try {
        await this.prisma.$queryRaw`SELECT 1 AS ok`;
        database = 'up';
      } catch {
        database = 'down';
      }
    }
    return { status: database === 'up' ? 'ok' : 'degraded', service: 'retailflow-api', database, timestamp: new Date().toISOString() };
  }
}
