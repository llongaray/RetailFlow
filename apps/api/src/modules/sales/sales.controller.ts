import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, requestIp, type RequestWithContext } from '../../common/decorators';
import { CancelSaleDto, CreateSaleDto } from './sales.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @Permissions('sale.read')
  list(@CurrentUser() actor: AuthUser, @Query('status') status?: string) {
    return this.sales.list(actor, status);
  }

  @Get('payment-options')
  @Permissions('sale.read')
  paymentOptions() {
    return this.sales.activePayments();
  }

  @Get(':id')
  @Permissions('sale.read')
  get(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.sales.get(id, actor);
  }

  @Post()
  @Permissions('sale.create')
  create(@Body() dto: CreateSaleDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.sales.create(dto, actor, requestIp(request));
  }

  @Post(':id/cancel')
  @Permissions('sale.cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSaleDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.sales.cancel(id, dto, actor, requestIp(request));
  }
}
