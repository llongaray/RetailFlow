import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '../../domain/permissions';
import { IS_PUBLIC, PERMISSIONS_KEY, type RequestWithContext } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<RequestWithContext>().user;
    if (!user || !required.every((permission) => user.permissions.includes(permission))) {
      throw new ForbiddenException('Permissão insuficiente para esta operação.');
    }
    return true;
  }
}
