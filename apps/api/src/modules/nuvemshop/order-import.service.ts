import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { RemoteOrder } from '../../domain/nuvemshop-order';
import { importDraft, type OrderBook } from '../../domain/order-import';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StockService } from '../inventory/stock.service';

type ConnectionRef = { id: string; storeId: string };

@Injectable()
export class OrderImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
  ) {}

  importOne(connection: ConnectionRef, draft: RemoteOrder, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await importDraft(this.book(tx, connection.storeId, actorId), draft);
      await tx.nuvemshopConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date() } });
      return result;
    });
  }

  private book(tx: Prisma.TransactionClient, storeId: string, actorId: string): OrderBook {
    return {
      findOrderSaleId: async (externalOrderId) => {
        const link = await tx.externalIdentity.findUnique({
          where: { provider_kind_externalId: { provider: 'NUVEMSHOP', kind: 'ORDER', externalId: externalOrderId } },
        });
        return link?.localId ?? null;
      },
      findCustomerByCpf: async (cpf) => {
        const customer = await tx.customer.findUnique({ where: { cpf } });
        return customer ? { id: customer.id } : null;
      },
      createCustomer: async (input) => {
        const customer = await tx.customer.create({ data: { ...input, source: 'NUVEMSHOP' } });
        return customer.id;
      },
      updateCustomer: async (id, input) => {
        await tx.customer.update({ where: { id }, data: input });
      },
      link: async (kind, externalId, localId, sku) => {
        const where = { provider_kind_externalId: { provider: 'NUVEMSHOP', kind, externalId } };
        if (kind === 'ORDER') {
          await tx.externalIdentity.create({ data: { provider: 'NUVEMSHOP', kind, externalId, localId, sku: sku ?? null } });
          return;
        }
        await tx.externalIdentity.upsert({
          where,
          update: { localId, sku: sku ?? null },
          create: { provider: 'NUVEMSHOP', kind, externalId, localId, sku: sku ?? null },
        });
      },
      findProductBySku: async (sku) => {
        const product = await tx.product.findUnique({ where: { sku } });
        return product ? { id: product.id } : null;
      },
      createProduct: async (input) => {
        const product = await tx.product.create({
          data: { sku: input.sku, name: input.name, price: input.price, inventory: { create: { storeId, quantity: input.stock } } },
        });
        return product.id;
      },
      decrement: (productId, quantity) => this.stock.decrement(tx, storeId, [{ productId, quantity }], false),
      createSale: async (input) => {
        const sale = await tx.sale.create({
          data: {
            storeId,
            customerId: input.customerId,
            sellerId: actorId,
            status: input.status,
            paymentMethod: input.paymentMethod,
            channel: 'NUVEMSHOP',
            externalOrderId: input.externalOrderId,
            total: input.total,
            items: { create: input.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })) },
          },
        });
        if (input.paid) {
          await tx.payment.create({
            data: {
              saleId: sale.id,
              amount: input.total,
              method: input.paymentMethod,
              externalTransactionId: `nuvemshop-${input.externalOrderId}`,
              status: 'CONFIRMED',
              registeredById: actorId,
            },
          });
        }
        await this.audit.record(tx, {
          userId: actorId,
          action: input.paid ? 'SALE_COMPLETED' : 'SALE_OPENED',
          entity: 'Sale',
          entityId: sale.id,
          newValue: { channel: 'NUVEMSHOP', externalOrderId: input.externalOrderId, status: input.status },
          ip: null,
        });
        return sale.id;
      },
    };
  }
}
