import { Module } from '@nestjs/common';
import { IntegrationService } from '../../infrastructure/integrations/integration.service';
import { OracleLegacyAdapter } from '../../infrastructure/integrations/oracle.adapter';
import { IntegrationsController } from './integrations.controller';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationService, OracleLegacyAdapter],
  exports: [IntegrationService],
})
export class IntegrationsModule {}
