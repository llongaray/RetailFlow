import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type Writer = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class AuditService {
  async record(
    db: Writer,
    entry: {
      userId?: string | null;
      action: string;
      entity: string;
      entityId: string;
      oldValue?: unknown;
      newValue?: unknown;
      ip?: string | null;
    },
  ) {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValue: entry.oldValue === undefined ? null : JSON.stringify(entry.oldValue),
        newValue: entry.newValue === undefined ? null : JSON.stringify(entry.newValue),
        ip: entry.ip ?? null,
      },
    });
  }
}
