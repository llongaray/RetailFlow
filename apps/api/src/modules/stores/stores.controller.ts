import { Body, Controller, Get, Post } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions } from '../../common/decorators';
import { StoresService } from './stores.service';

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  @Permissions('customer.read')
  list() {
    return this.stores.list();
  }

  @Post()
  @Permissions('customer.read')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateStoreDto) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Apenas administração cadastra lojas.');
    return this.stores.create(dto);
  }
}
