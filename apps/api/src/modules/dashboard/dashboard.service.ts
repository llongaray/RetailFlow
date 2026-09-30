import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { scopedStoreId } from '../../common/access';
import { asNumber } from '../../common/decimal';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: AuthUser) {
    const storeId = scopedStoreId(actor);
    const saleWhere = { status: 'COMPLETED' as const, ...(storeId ? { storeId } : {}) };
    const [salesCount, salesAgg, pendingCredit, openTickets, lowStock, delinquentInstallments, grouped, stores] = await Promise.all([
      this.prisma.sale.count({ where: saleWhere }),
      this.prisma.sale.aggregate({ where: saleWhere, _sum: { total: true } }),
      this.prisma.creditProposal.count({ where: { status: { in: ['SUBMITTED', 'UNDER_ANALYSIS'] }, ...(storeId ? { storeId } : {}) } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.inventory.count({ where: { quantity: { lte: 2 }, ...(storeId ? { storeId } : {}) } }),
      this.prisma.installment.count({ where: { status: 'OPEN', dueDate: { lt: new Date() }, ...(storeId ? { contract: { sale: { storeId } } } : {}) } }),
      this.prisma.sale.groupBy({ by: ['storeId'], where: saleWhere, _sum: { total: true }, _count: true }),
      this.prisma.store.findMany(),
    ]);
    const names = new Map(stores.map((store) => [store.id, store.name]));
    return {
      salesCount,
      salesTotal: asNumber(salesAgg._sum.total ?? 0),
      pendingCredit,
      openTickets,
      lowStock,
      delinquentInstallments,
      stores: grouped.map((row) => ({
        name: names.get(row.storeId) ?? row.storeId,
        salesTotal: asNumber(row._sum.total ?? 0),
        salesCount: row._count,
      })),
    };
  }
}
