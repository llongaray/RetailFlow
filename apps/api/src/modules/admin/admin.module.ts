import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { NuvemshopModule } from '../nuvemshop/nuvemshop.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperuserGuard } from './superuser.guard';

@Module({
  imports: [AuthModule, BillingModule, FiscalModule, NuvemshopModule],
  controllers: [AdminController],
  providers: [AdminService, SuperuserGuard],
})
export class AdminModule {}