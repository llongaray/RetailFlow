import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, requestIp, type RequestWithContext } from '../../common/decorators';
import { Req } from '@nestjs/common';
import { CustomersService } from './customers.service';

export class CreateCustomerDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  cpf!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateCreditLimitDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit!: number;
}

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Permissions('customer.read')
  list(@Query('q') q?: string) {
    return this.customers.list(q);
  }

  @Get(':id')
  @Permissions('customer.read')
  get(@Param('id') id: string) {
    return this.customers.get(id);
  }

  @Post()
  @Permissions('customer.create')
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Patch(':id/credit-limit')
  @Permissions('customer.update_limit')
  updateLimit(
    @Param('id') id: string,
    @Body() dto: UpdateCreditLimitDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: RequestWithContext,
  ) {
    return this.customers.updateLimit(id, dto.creditLimit, actor, requestIp(request));
  }
}
