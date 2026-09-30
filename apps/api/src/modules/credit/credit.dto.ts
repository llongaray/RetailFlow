import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SimulationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments!: number;
}

export class ApproveCreditDto {
  @IsOptional()
  @IsBoolean()
  additionalPolicyConfirmed?: boolean;
}

export class RejectCreditDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class UpdatePolicyDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  analystLimit!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  managerLimit!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyInterestRate!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxInstallments!: number;

  @IsString()
  confirmation!: string;
}
