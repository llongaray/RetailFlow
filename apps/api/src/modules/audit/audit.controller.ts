import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../../common/decorators';
import { AuditQueryService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditQueryService) {}

  @Get()
  @Permissions('audit.read')
  list(@Query('entity') entity?: string, @Query('entityId') entityId?: string) {
    return this.audit.list(entity, entityId);
  }
}
