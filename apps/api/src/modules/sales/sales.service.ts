import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth-user';
import { assertStoreAccess } from '../../common/access';
import { asNumber } from '../../common/decimal';
import { assertInstallmentCount, buildInstallments } from '../../domain/credit.rules';
import { DomainError } from '../../domain/domain-error';
import { assertSufficientStock } from '../../domain/inventory.rules';
import { roundMoney } from '../../domain/money';
import { assertActiveOperation, assertCancelReason, assertSellerStore } from '../../domain/sale.rules';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { enqueueOutbox } from '../../infrastructure/integrations/outbox';
import { StockService } from '../inventory/stock.service';
import type { CancelSaleDto, CreateSaleDto } from './sales.dto';
import { presentSale, saleInclude } from './sales.presenter';

type QuoteLine = { productId: string; quantity: number; unitPrice: number; available: number };

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
  ) {}

  async list(actor: AuthUser, status?: string) {
    const storeId = actor.role === 'VENDEDOR' || actor.role === 'GERENTE' ? actor.storeId ?? 'none' : undefined;
    const sales = await this.prisma.sale.findMany({
      where: { ...(status ? { status } : {}), ...(storeId ? { storeId } : {}) },
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sales.map(presentSale);
  }

  async get(id: string, actor: AuthUser) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!sale) throw new NotFoundException('Venda não encontrada.');
    assertStoreAccess(actor, sale.storeId);
    return presentSale(sale);
  }

  async create(dto: CreateSaleDto, actor: AuthUser, ip: string | null) {
    const [store, seller, customer] = await Promise.all([
      this.prisma.store.findUnique({ where: { id: dto.storeId } }),
      this.prisma.user.findUnique({ where: { id: actor.id } }),
      this.prisma.customer.findUnique({ where: { id: dto.customerId } }),
    ]);
    assertActiveOperation(Boolean(seller?.active), Boolean(store?.active));
    assertSellerStore(actor.role, actor.storeId, dto.storeId);
    if (!customer?.active) throw new NotFoundException('Cliente não encontrado.');
    const lines = await this.quote(dto.storeId, dto.items);
    const total = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
    if (dto.paymentMethod === 'CASH') return this.completeCash(dto, actor, ip, lines, total);
    return this.openFinanced(dto, actor, ip, lines, total);
  }

  async cancel(id: string, dto: CancelSaleDto, actor: AuthUser, ip: string | null) {
    const reason = assertCancelReason(dto.reason);
    await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true, contract: { include: { schedule: true } }, payments: true, proposal: true },
      });
      if (!sale) throw new NotFoundException('Venda não encontrada.');
      assertStoreAccess(actor, sale.storeId);
      if (sale.status === 'CANCELLED') throw new DomainError('RN010', 'A venda já está cancelada.');
      const previous = sale.status;
      if (sale.status === 'COMPLETED') await this.stock.restore(tx, sale.storeId, sale.items);
      if (sale.contract && sale.contract.status === 'ACTIVE') {
        await tx.contract.update({
          where: { id: sale.contract.id },
          data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date(), cancelledById: actor.id },
        });
        await tx.installment.updateMany({
          where: { contractId: sale.contract.id, status: 'OPEN' },
          data: { status: 'CANCELLED' },
        });
        await this.audit.record(tx, {
          userId: actor.id,
          action: 'CONTRACT_CANCELLED',
          entity: 'Contract',
          entityId: sale.contract.id,
          oldValue: { status: 'ACTIVE' },
          newValue: { status: 'CANCELLED', reason },
          ip,
        });
      }
      const installmentIds = sale.contract?.schedule.map((item) => item.id) ?? [];
      const payments = await tx.payment.findMany({
        where: { OR: [{ saleId: sale.id }, ...(installmentIds.length ? [{ installmentId: { in: installmentIds } }] : [])] },
      });
      for (const payment of payments) {
        if (payment.status !== 'CONFIRMED') continue;
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED', refundedById: actor.id, refundReason: reason },
        });
        await this.audit.record(tx, {
          userId: actor.id,
          action: 'PAYMENT_REFUNDED',
          entity: 'Payment',
          entityId: payment.id,
          oldValue: { status: 'CONFIRMED', amount: asNumber(payment.amount) },
          newValue: { status: 'REFUNDED', reason },
          ip,
        });
      }
      if (sale.proposal && !['REJECTED', 'CONTRACTED'].includes(sale.proposal.status)) {
        await tx.creditProposal.update({
          where: { id: sale.proposal.id },
          data: { status: 'REJECTED', rejectionReason: reason, reviewerId: actor.id, reviewedAt: new Date() },
        });
      }
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date(), cancelledById: actor.id },
      });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'SALE_CANCELLED',
        entity: 'Sale',
        entityId: id,
        oldValue: { status: previous },
        newValue: { status: 'CANCELLED', reason },
        ip,
      });
    });
    return this.get(id, actor);
  }

  private async quote(storeId: string, items: CreateSaleDto['items']): Promise<QuoteLine[]> {
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const ids = [...quantities.keys()];
    const products = await this.prisma.product.findMany({ where: { id: { in: ids }, active: true } });
    const inventory = await this.prisma.inventory.findMany({ where: { storeId, productId: { in: ids } } });
    return ids.map((productId) => {
      const product = products.find((entry) => entry.id === productId);
      if (!product) throw new NotFoundException('Produto indisponível para a venda.');
      const available = inventory.find((entry) => entry.productId === productId)?.quantity ?? 0;
      const quantity = quantities.get(productId) ?? 0;
      assertSufficientStock(available, quantity, false);
      return { productId, quantity, unitPrice: asNumber(product.price), available };
    });
  }

  private async completeCash(dto: CreateSaleDto, actor: AuthUser, ip: string | null, lines: QuoteLine[], total: number) {
    const saleId = await this.prisma.$transaction(async (tx) => {
      await this.stock.decrement(tx, dto.storeId, lines, false);
      const sale = await tx.sale.create({
        data: {
          storeId: dto.storeId,
          customerId: dto.customerId,
          sellerId: actor.id,
          status: 'COMPLETED',
          paymentMethod: 'CASH',
          total,
          items: { create: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })) },
        },
      });
      try {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: total,
            method: 'CASH',
            externalTransactionId: dto.externalTransactionId ?? `cash-${sale.id}`,
            status: 'CONFIRMED',
            registeredById: actor.id,
          },
        });
      } catch (error) {
        this.rethrowDuplicatePayment(error);
      }
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'SALE_COMPLETED',
        entity: 'Sale',
        entityId: sale.id,
        newValue: { total, paymentMethod: 'CASH' },
        ip,
      });
      await enqueueOutbox(tx, 'ORACLE_SALE', { saleId: sale.id, total, paymentMethod: 'CASH' });
      return sale.id;
    });
    return this.get(saleId, actor);
  }

  private async openFinanced(dto: CreateSaleDto, actor: AuthUser, ip: string | null, lines: QuoteLine[], total: number) {
    const policy = await this.prisma.creditPolicy.findFirst({ where: { active: true } });
    if (!policy) throw new DomainError('RN007', 'Política de crédito não configurada.');
    assertInstallmentCount(dto.installments ?? 0, policy.maxInstallments);
    const quote = buildInstallments(total, dto.installments ?? 0, asNumber(policy.monthlyInterestRate), new Date());
    const saleId = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.creditProposal.create({
        data: {
          customerId: dto.customerId,
          storeId: dto.storeId,
          sellerId: actor.id,
          amount: total,
          installments: dto.installments ?? 0,
          installmentAmount: quote.installmentAmount,
          financedTotal: quote.total,
          monthlyInterestRate: policy.monthlyInterestRate,
          status: 'SUBMITTED',
        },
      });
      const sale = await tx.sale.create({
        data: {
          storeId: dto.storeId,
          customerId: dto.customerId,
          sellerId: actor.id,
          status: 'PENDING_CREDIT',
          paymentMethod: 'FINANCED',
          total,
          proposalId: proposal.id,
          items: { create: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })) },
        },
      });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CREDIT_SUBMITTED',
        entity: 'CreditProposal',
        entityId: proposal.id,
        newValue: { amount: total, installments: dto.installments, saleId: sale.id },
        ip,
      });
      await enqueueOutbox(tx, 'ORACLE_CREDIT_PROPOSAL', { proposalId: proposal.id, saleId: sale.id });
      return sale.id;
    });
    return this.get(saleId, actor);
  }

  private rethrowDuplicatePayment(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DomainError('RN013', 'Já existe um pagamento com este identificador externo.');
    }
    throw error;
  }
}
