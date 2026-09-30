import { Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerKeyGuard } from './partner-key.guard';
import { PartnerService } from './partner.service';

@Module({ controllers: [PartnerController], providers: [PartnerService, PartnerKeyGuard] })
export class PartnerModule {}
