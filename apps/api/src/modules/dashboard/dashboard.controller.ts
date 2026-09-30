import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { graphql, buildSchema } from 'graphql';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions, Public, type RequestWithContext } from '../../common/decorators';
import { permissionsFor } from '../../domain/permissions';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DashboardService } from './dashboard.service';

const schema = buildSchema(`
  type StoreMetric { name: String! salesTotal: Float! salesCount: Int! }
  type ManagementDashboard {
    salesCount: Int!
    salesTotal: Float!
    pendingCredit: Int!
    openTickets: Int!
    lowStock: Int!
    delinquentInstallments: Int!
    stores: [StoreMetric!]!
  }
  type Query { managementDashboard: ManagementDashboard! }
`);

@Controller()
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @Permissions('dashboard.read')
  summary(@CurrentUser() actor: AuthUser) {
    return this.dashboard.summary(actor);
  }

  @Public()
  @Post('graphql')
  @HttpCode(200)
  async graphqlQuery(@Body() body: { query?: string }, @Req() request: RequestWithContext) {
    const actor = await this.actorFrom(request);
    if (!actor.permissions.includes('dashboard.read')) {
      throw new UnauthorizedException('Consulta gerencial sem permissão.');
    }
    return graphql({
      schema,
      source: body.query ?? '',
      rootValue: { managementDashboard: () => this.dashboard.summary(actor) },
    });
  }

  private async actorFrom(request: RequestWithContext): Promise<AuthUser> {
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Autenticação necessária.');
    let payload: { sub?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    if (!payload.sub) throw new UnauthorizedException('Sessão inválida ou expirada.');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.active) throw new UnauthorizedException('Usuário inativo.');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      active: user.active,
      permissions: permissionsFor(user.role),
    };
  }
}
