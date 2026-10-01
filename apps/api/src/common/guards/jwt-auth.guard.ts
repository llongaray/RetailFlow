import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { permissionsFor } from '../../domain/permissions';
import { addonPermissionsFor } from '../../modules/addons/addon.grants';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { IS_PUBLIC, type RequestWithContext } from '../decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<RequestWithContext>();
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
    this.prisma.assertReady();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.active) throw new UnauthorizedException('Usuário inativo.');
    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      active: user.active,
      permissions: [...permissionsFor(user.role), ...addonPermissionsFor(user.role)],
    };
    return true;
  }
}
