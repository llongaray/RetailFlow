import { Body, Controller, Get, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Permissions } from '../../common/decorators';
import { BillingService } from './billing.service';

class ChargeDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  saleId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(['PIX', 'CARD'])
  method!: 'PIX' | 'CARD';
}

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('billing/status')
  @Permissions('audit.read')
  status() {
    return this.billing.status();
  }

  @Post('charges')
  @Permissions('payment.create')
  create(@Body() dto: ChargeDto) {
    return this.billing.createCharge(dto);
  }
}
