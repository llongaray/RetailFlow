import { Body, Controller, Patch } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, requestIp, type RequestWithContext } from '../../common/decorators';
import { InventoryService } from './inventory.service';

export class AdjustInventoryDto {
  @IsUUID()
  storeId!: string;

  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsBoolean()
  allowNegative?: boolean;
}

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Patch()
  @Permissions('inventory.adjust')
  adjust(@Body() dto: AdjustInventoryDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.inventory.adjust(dto, actor, requestIp(request));
  }
}
