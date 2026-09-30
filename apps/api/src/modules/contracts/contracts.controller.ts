import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, requestIp, type RequestWithContext } from '../../common/decorators';
import { ContractsService } from './contracts.service';

export class CreateContractDto {
  @IsUUID()
  proposalId!: string;
}

export class RenegotiateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments!: number;
}

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post()
  @Permissions('contract.create')
  create(@Body() dto: CreateContractDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.contracts.createFromProposal(dto.proposalId, actor, requestIp(request));
  }

  @Get(':id')
  @Permissions('contract.read')
  get(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.contracts.get(id, actor);
  }

  @Delete(':id')
  @Permissions('contract.cancel')
  remove(@Param('id') id: string) {
    return this.contracts.remove(id);
  }

  @Post(':id/renegotiations')
  @Permissions('contract.create')
  renegotiate(@Param('id') id: string, @Body() dto: RenegotiateDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.contracts.renegotiate(id, dto.amount, dto.installments, actor, requestIp(request));
  }
}
