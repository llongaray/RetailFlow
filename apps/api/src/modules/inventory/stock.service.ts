import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainError } from '../../domain/domain-error';
import { assertSufficientStock } from '../../domain/inventory.rules';

@Injectable()
export class StockService {
  async decrement(
    tx: Prisma.TransactionClient,
    storeId: string,
    lines: { productId: string; quantity: number }[],
    allowNegative: boolean,
  ) {
    for (const line of lines) {
      assertSufficientStock(line.quantity, line.quantity, false);
      if (allowNegative) {
        await tx.inventory.update({
          where: { storeId_productId: { storeId, productId: line.productId } },
          data: { quantity: { decrement: line.quantity } },
        });
        continue;
      }
      const updated = await tx.inventory.updateMany({
        where: { storeId, productId: line.productId, quantity: { gte: line.quantity } },
        data: { quantity: { decrement: line.quantity } },
      });
      if (updated.count !== 1) {
        throw new DomainError('RN004', 'O estoque da filial não pode ficar negativo.');
      }
    }
  }

  async restore(tx: Prisma.TransactionClient, storeId: string, lines: { productId: string; quantity: number }[]) {
    for (const line of lines) {
      await tx.inventory.update({
        where: { storeId_productId: { storeId, productId: line.productId } },
        data: { quantity: { increment: line.quantity } },
      });
    }
  }
}
