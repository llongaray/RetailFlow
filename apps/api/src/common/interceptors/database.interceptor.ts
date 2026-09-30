import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class DatabaseInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const url = context.switchToHttp().getRequest<{ originalUrl?: string }>().originalUrl ?? '';
    if (!url.includes('/health')) this.prisma.assertReady();
    return next.handle();
  }
}
