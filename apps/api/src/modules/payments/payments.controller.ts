import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, requestIp, type RequestWithContext } from '../../common/decorators';
import { PaymentsService } from './payments.service';

export class CreatePaymentDto {
  @IsUUID()
  installmentId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  externalTransactionId!: string;
}

export class RefundPaymentDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @Permissions('payment.create')
  create(@Body() dto: CreatePaymentDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.payments.create(dto.installmentId, dto.amount, dto.externalTransactionId, actor, requestIp(request));
  }

  @Post(':id/refund')
  @Permissions('payment.refund')
  refund(@Param('id') id: string, @Body() dto: RefundPaymentDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.payments.refund(id, dto.reason, actor, requestIp(request));
  }
}
