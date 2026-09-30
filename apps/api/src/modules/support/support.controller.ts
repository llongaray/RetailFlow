import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions } from '../../common/decorators';
import { SupportService } from './support.service';

export class CreateTicketDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description!: string;
}

export class UpdateTicketDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
  status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

@Controller('support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @Permissions('support.read')
  list() {
    return this.support.list();
  }

  @Post()
  @Permissions('support.write')
  create(@Body() dto: CreateTicketDto, @CurrentUser() actor: AuthUser) {
    return this.support.create(dto, actor);
  }

  @Patch(':id')
  @Permissions('support.write')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.support.update(id, dto.status);
  }
}
