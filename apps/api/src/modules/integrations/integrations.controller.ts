import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../common/decorators';
import { IntegrationService } from '../../infrastructure/integrations/integration.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationService) {}

  @Get('jobs')
  @Permissions('audit.read')
  list() {
    return this.integrations.list();
  }

  @Get('providers')
  @Permissions('audit.read')
  catalog() {
    return this.integrations.catalog();
  }
}
