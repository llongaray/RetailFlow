import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class PartnerKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-api-key'];
    const token = typeof header === 'string' ? header.trim() : '';
    if (!token) throw new UnauthorizedException('Chave de parceiro necessária.');
    this.prisma.assertReady();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const key = await this.prisma.partnerApiKey.findFirst({ where: { tokenHash, active: true } });
    if (!key) throw new UnauthorizedException('Chave de parceiro inválida.');
    return true;
  }
}
