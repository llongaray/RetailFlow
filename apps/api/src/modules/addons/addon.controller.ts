import { All, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Permissions, Public } from '../../common/decorators';
import { permissionsFor } from '../../domain/permissions';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { addonPermissionsFor } from './addon.grants';
import { AddonEngine } from './addon.engine';

@Controller()
export class AddonController {
  constructor(
    private readonly addons: AddonEngine,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Permissions('addon.manage')
  @Get('addons')
  list() {
    return this.addons.installations('company');
  }

  @Permissions('addon.manage')
  @Post('addons/:name/activate')
  activate(@Param('name') name: string) {
    return this.addons.activate('company', name);
  }

  @Permissions('addon.manage')
  @Post('addons/:name/deactivate')
  deactivate(@Param('name') name: string) {
    return this.addons.deactivate('company', name);
  }

  @Public()
  @All('ext/*path')
  async handle(@Req() request: Request, @Param('path') path: string | string[]) {
    const suffix = `/${(Array.isArray(path) ? path : String(path).split('/')).filter(Boolean).join('/')}`;
    const method = request.method.toUpperCase();
    const route = this.addons.routeTable().find((item) => item.method === method && item.path === suffix);
    if (!route) throw new NotFoundException('Rota não encontrada.');
    const host = String(request.query.host ?? request.headers['x-retailflow-host'] ?? request.headers.host ?? '');
    let userId: string | null = null;
    let role: string | null = null;
    if (route.permission) {
      const header = request.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) throw new UnauthorizedException('Autenticação necessária.');
      let payload: { sub?: string };
      try {
        payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      } catch {
        throw new UnauthorizedException('Sessão inválida ou expirada.');
      }
      const user = payload.sub ? await this.prisma.user.findUnique({ where: { id: payload.sub } }) : null;
      if (!user?.active) throw new UnauthorizedException('Usuário inativo.');
      const permissions = [...permissionsFor(user.role), ...addonPermissionsFor(user.role)];
      if (!permissions.includes(route.permission)) throw new ForbiddenException('Permissão insuficiente para esta operação.');
      userId = user.id;
      role = user.role;
    }
    return this.addons.dispatch(method, suffix, {
      body: request.body,
      query: request.query as Record<string, string | undefined>,
      host,
      userId,
      role,
      ip: request.ip ?? null,
    });
  }
}
