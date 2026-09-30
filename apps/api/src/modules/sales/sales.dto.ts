import { Type } from 'class-transformer';
import { ArrayMinSize, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class SaleItemDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateSaleDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  storeId!: string;

  @IsIn(['CASH', 'FINANCED'])
  paymentMethod!: 'CASH' | 'FINANCED';

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalTransactionId?: string;
}

export class CancelSaleDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
