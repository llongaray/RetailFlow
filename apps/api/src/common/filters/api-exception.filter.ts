import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { DomainError } from '../../domain/domain-error';
import type { RequestWithContext } from '../decorators';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithContext>();
    const mapped = this.map(exception);
    if (mapped.status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(mapped.status).json({
      statusCode: mapped.status,
      code: mapped.code,
      message: mapped.message,
      requestId: request.requestId ?? null,
    });
  }

  private map(exception: unknown): { status: number; code: string; message: string } {
    if (exception instanceof DomainError) {
      const status = exception.code === 'RN001' || exception.code === 'RN013' ? HttpStatus.CONFLICT : HttpStatus.UNPROCESSABLE_ENTITY;
      return { status, code: exception.code, message: exception.message };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      const target = JSON.stringify(exception.meta?.target ?? '');
      if (target.toLowerCase().includes('cpf')) {
        return { status: HttpStatus.CONFLICT, code: 'RN001', message: 'Já existe um cliente com este CPF.' };
      }
      if (target.toLowerCase().includes('externaltransactionid')) {
        return { status: HttpStatus.CONFLICT, code: 'RN013', message: 'Já existe um pagamento com este identificador externo.' };
      }
      return { status: HttpStatus.CONFLICT, code: 'CONFLICT', message: 'Registro duplicado.' };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message).join(' ')
            : ((body as { message?: string }).message ?? exception.message);
      return { status, code: status === HttpStatus.UNAUTHORIZED ? 'UNAUTHORIZED' : status === HttpStatus.FORBIDDEN ? 'FORBIDDEN' : 'HTTP_ERROR', message };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL', message: 'Falha interna ao processar a operação.' };
  }
}
