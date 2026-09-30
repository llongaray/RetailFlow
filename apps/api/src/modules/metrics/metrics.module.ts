import { Global, Module } from '@nestjs/common';
import { MetricsService } from '../../infrastructure/logging/metrics.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({ controllers: [MetricsController], providers: [MetricsService], exports: [MetricsService] })
export class MetricsModule {}
