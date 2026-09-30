import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PartnerKeyGuard } from './partner-key.guard';
import { PartnerService } from './partner.service';

@Public()
@UseGuards(PartnerKeyGuard)
@Controller('partner')
export class PartnerController {
  constructor(private readonly partner: PartnerService) {}

  @Get('products')
  products() {
    return this.partner.products();
  }

  @Get('customers')
  customers() {
    return this.partner.customers();
  }

  @Get('sales')
  sales() {
    return this.partner.sales();
  }
}
