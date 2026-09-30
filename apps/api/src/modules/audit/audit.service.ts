import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(entity?: string, entityId?: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { ...(entity ? { entity } : {}), ...(entityId ? { entityId } : {}) },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      oldValue: row.oldValue,
      newValue: row.newValue,
      ip: row.ip,
      createdAt: row.createdAt,
      userName: row.user?.name ?? 'Sistema',
    }));
  }
}
