import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { NuvemshopController, NuvemshopWebhookController } from './nuvemshop.controller';
import { NuvemshopService } from './nuvemshop.service';
import { OrderImportService } from './order-import.service';

@Module({
  imports: [InventoryModule],
  controllers: [NuvemshopController, NuvemshopWebhookController],
  providers: [NuvemshopService, OrderImportService],
  exports: [NuvemshopService, OrderImportService],
})
export class NuvemshopModule {}
