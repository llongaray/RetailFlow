import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { assertStoreAccess } from '../../common/access';
import { assertNonNegativeQuantity } from '../../domain/inventory.rules';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { enqueueOutbox } from '../../infrastructure/integrations/outbox';
import type { AdjustInventoryDto } from './inventory.controller';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async adjust(dto: AdjustInventoryDto, actor: AuthUser, ip: string | null) {
    const allowNegative = dto.allowNegative === true && actor.permissions.includes('inventory.override');
    if (dto.allowNegative && !allowNegative) {
      throw new ForbiddenException('Saldo negativo exige permissão administrativa explícita.');
    }
    assertNonNegativeQuantity(dto.quantity, allowNegative);
    assertStoreAccess(actor, dto.storeId);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!product || !store) throw new NotFoundException('Produto ou loja não encontrado.');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({ where: { storeId_productId: { storeId: dto.storeId, productId: dto.productId } } });
      const row = await tx.inventory.upsert({
        where: { storeId_productId: { storeId: dto.storeId, productId: dto.productId } },
        create: { storeId: dto.storeId, productId: dto.productId, quantity: dto.quantity },
        update: { quantity: dto.quantity },
      });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'INVENTORY_ADJUSTED',
        entity: 'Inventory',
        entityId: row.id,
        oldValue: { quantity: current?.quantity ?? 0 },
        newValue: { quantity: dto.quantity, storeId: dto.storeId, productId: dto.productId },
        ip,
      });
      await enqueueOutbox(tx, 'ORACLE_STOCK', { storeId: dto.storeId, productId: dto.productId, quantity: dto.quantity });
      return { id: row.id, storeId: row.storeId, productId: row.productId, quantity: row.quantity };
    });
  }
}
