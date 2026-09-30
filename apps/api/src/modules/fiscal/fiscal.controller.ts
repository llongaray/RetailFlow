import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsIn, IsUUID } from 'class-validator';
import { Permissions } from '../../common/decorators';
import { FiscalService } from './fiscal.service';

class EmitDto {
  @IsUUID()
  saleId!: string;

  @IsIn(['NFE', 'NFSE'])
  kind!: 'NFE' | 'NFSE';
}

@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscal: FiscalService) {}

  @Get('status')
  @Permissions('audit.read')
  status() {
    return this.fiscal.status();
  }

  @Post('documents')
  @Permissions('sale.create')
  emit(@Body() dto: EmitDto) {
    return this.fiscal.emit(dto.saleId, dto.kind);
  }
}
