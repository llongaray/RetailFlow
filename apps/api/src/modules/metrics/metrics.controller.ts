import { Controller, Get, Header } from '@nestjs/common';
import { Permissions } from '../../common/decorators';
import { MetricsService } from '../../infrastructure/logging/metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Permissions('audit.read')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  snapshot() {
    return this.metrics.prometheus();
  }
}
