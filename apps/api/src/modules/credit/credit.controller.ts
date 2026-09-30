import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, requestIp, type RequestWithContext } from '../../common/decorators';
import { ApproveCreditDto, RejectCreditDto, SimulationDto, UpdatePolicyDto } from './credit.dto';
import { CreditService } from './credit.service';

@Controller('credit')
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Get('policy')
  @Permissions('credit.read')
  policy() {
    return this.credit.policy();
  }

  @Patch('policy')
  @Permissions('policy.update')
  updatePolicy(@Body() dto: UpdatePolicyDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.credit.updatePolicy(dto, actor, requestIp(request));
  }

  @Post('simulations')
  @Permissions('credit.read')
  simulate(@Body() dto: SimulationDto) {
    return this.credit.simulate(dto);
  }

  @Get('proposals')
  @Permissions('credit.read')
  list(@CurrentUser() actor: AuthUser, @Query('status') status?: string) {
    return this.credit.list(actor, status);
  }

  @Post('proposals/:id/start-analysis')
  @Permissions('credit.analyze')
  start(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.credit.startAnalysis(id, actor, requestIp(request));
  }

  @Post('proposals/:id/approve')
  @Permissions('credit.approve')
  approve(@Param('id') id: string, @Body() dto: ApproveCreditDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.credit.approve(id, dto, actor, requestIp(request));
  }

  @Post('proposals/:id/reject')
  @Permissions('credit.approve')
  reject(@Param('id') id: string, @Body() dto: RejectCreditDto, @CurrentUser() actor: AuthUser, @Req() request: RequestWithContext) {
    return this.credit.reject(id, dto, actor, requestIp(request));
  }
}
