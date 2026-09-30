import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Allow, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, Public } from '../../common/decorators';
import { NuvemshopService } from './nuvemshop.service';

class ConnectDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class WebhookDto {
  @Allow()
  store_id?: unknown;

  @Allow()
  event?: unknown;

  @Allow()
  id?: unknown;
}

@Controller('integrations/nuvemshop')
export class NuvemshopController {
  constructor(private readonly nuvemshop: NuvemshopService) {}

  @Get()
  @Permissions('audit.read')
  status() {
    return this.nuvemshop.status();
  }

  @Post('connect')
  @Permissions('audit.read')
  connect(@Body() dto: ConnectDto) {
    return this.nuvemshop.connect(dto.storeId);
  }

  @Public()
  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() response: Response) {
    const back = this.nuvemshop.oauthReturn(state ?? '');
    try {
      await this.nuvemshop.finishOAuth(code ?? '', state ?? '');
      response.redirect(`${back.origin}${back.path}?nuvemshop=ok`);
    } catch {
      response.redirect(`${back.origin}${back.path}?nuvemshop=erro`);
    }
  }

  @Post('sync')
  @Permissions('audit.read')
  sync(@CurrentUser() actor: AuthUser) {
    return this.nuvemshop.sync(actor.id);
  }

  @Post('disconnect')
  @Permissions('audit.read')
  disconnect() {
    return this.nuvemshop.disconnect();
  }
}

@Controller('webhooks')
export class NuvemshopWebhookController {
  constructor(private readonly nuvemshop: NuvemshopService) {}

  @Public()
  @Post('nuvemshop')
  receive(@Body() dto: WebhookDto) {
    return this.nuvemshop.receiveWebhook(dto);
  }
}
