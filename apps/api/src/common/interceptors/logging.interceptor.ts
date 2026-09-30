import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../../infrastructure/logging/metrics.service';
import type { RequestWithContext } from '../decorators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.write(request, response.statusCode, started),
        error: (error: { status?: number }) => this.write(request, error.status ?? 500, started, error),
      }),
    );
  }

  private write(request: RequestWithContext, status: number, started: number, error?: unknown) {
    const route = request.route?.path ? `${request.baseUrl ?? ''}${request.route.path}` : request.path;
    this.metrics.hit(request.method, route, status);
    this.logger.log(
      JSON.stringify({
        requestId: request.requestId ?? null,
        userId: request.user?.id ?? null,
        method: request.method,
        route: request.originalUrl,
        status,
        duration: Date.now() - started,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }
}
