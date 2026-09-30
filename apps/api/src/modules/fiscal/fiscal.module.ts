import { Module } from '@nestjs/common';
import { NuvemshopModule } from '../nuvemshop/nuvemshop.module';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';

@Module({
  imports: [NuvemshopModule],
  controllers: [FiscalController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
