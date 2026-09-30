import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { RequestWithContext } from '../../common/decorators';

@Injectable()
export class SuperuserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<RequestWithContext>().user;
    if (user?.role !== 'SUPERUSER') throw new ForbiddenException('Apenas o superusuário acessa o admin.');
    return true;
  }
}
