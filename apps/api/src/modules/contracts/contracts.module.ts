import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({ imports: [InventoryModule], controllers: [ContractsController], providers: [ContractsService] })
export class ContractsModule {}
