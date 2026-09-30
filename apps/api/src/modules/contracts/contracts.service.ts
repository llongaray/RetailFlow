import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { assertStoreAccess } from '../../common/access';
import { asNumber } from '../../common/decimal';
import { assertInstallmentCount, assertTransition, buildInstallments } from '../../domain/credit.rules';
import { assertContractActive, rejectContractDeletion } from '../../domain/contract.rules';
import { DomainError } from '../../domain/domain-error';
import { assertFinancedSaleAllowed } from '../../domain/sale.rules';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { enqueueOutbox } from '../../infrastructure/integrations/outbox';
import { StockService } from '../inventory/stock.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
  ) {}

  async createFromProposal(proposalId: string, actor: AuthUser, ip: string | null) {
    const proposal = await this.prisma.creditProposal.findUnique({
      where: { id: proposalId },
      include: { sales: { include: { items: true } } },
    });
    const sale = proposal?.sales[0];
    if (!proposal || !sale) throw new NotFoundException('Proposta sem venda vinculada.');
    assertStoreAccess(actor, proposal.storeId);
    assertTransition(proposal.status, 'CONTRACTED');
    assertFinancedSaleAllowed(proposal.status);
    if (sale.status !== 'PENDING_CREDIT') {
      throw new DomainError('RN011', 'A venda financiada não está aguardando crédito.');
    }
    const quote = buildInstallments(asNumber(proposal.amount), proposal.installments, asNumber(proposal.monthlyInterestRate), new Date());
    const contractId = await this.prisma.$transaction(async (tx) => {
      await this.stock.decrement(tx, proposal.storeId, sale.items, false);
      const contract = await tx.contract.create({
        data: {
          proposalId: proposal.id,
          saleId: sale.id,
          status: 'ACTIVE',
          total: quote.total,
          installmentCount: proposal.installments,
          schedule: { create: quote.items.map((item) => ({ number: item.number, amount: item.amount, dueDate: item.dueDate, status: 'OPEN' })) },
        },
      });
      await tx.creditProposal.update({ where: { id: proposal.id }, data: { status: 'CONTRACTED' } });
      await tx.sale.update({ where: { id: sale.id }, data: { status: 'COMPLETED' } });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CONTRACT_CREATED',
        entity: 'Contract',
        entityId: contract.id,
        newValue: { total: quote.total, installments: proposal.installments, saleId: sale.id },
        ip,
      });
      await enqueueOutbox(tx, 'ORACLE_CONTRACT', { contractId: contract.id, saleId: sale.id });
      return contract.id;
    });
    return this.get(contractId, actor);
  }

  async get(id: string, actor: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { schedule: { orderBy: { number: 'asc' } }, sale: true, proposal: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertStoreAccess(actor, contract.sale.storeId);
    return {
      id: contract.id,
      number: contract.number,
      status: contract.status,
      total: asNumber(contract.total),
      installmentCount: contract.installmentCount,
      cancelReason: contract.cancelReason,
      saleId: contract.saleId,
      proposalId: contract.proposalId,
      schedule: contract.schedule.map((item) => ({
        id: item.id,
        number: item.number,
        amount: asNumber(item.amount),
        dueDate: item.dueDate,
        status: item.status,
      })),
    };
  }

  async remove(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    rejectContractDeletion();
  }

  async renegotiate(id: string, amount: number, installments: number, actor: AuthUser, ip: string | null) {
    const contract = await this.prisma.contract.findUnique({ where: { id }, include: { proposal: true, schedule: true, sale: true } });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractActive(contract.status);
    assertStoreAccess(actor, contract.sale.storeId);
    const policy = await this.prisma.creditPolicy.findFirst({ where: { active: true } });
    if (!policy) throw new DomainError('RN007', 'Política de crédito não configurada.');
    assertInstallmentCount(installments, policy.maxInstallments);
    const previousSchedule = contract.schedule.map((item) => ({ number: item.number, amount: asNumber(item.amount) }));
    const quote = buildInstallments(amount, installments, asNumber(policy.monthlyInterestRate), new Date());
    const proposal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.creditProposal.create({
        data: {
          customerId: contract.proposal.customerId,
          storeId: contract.proposal.storeId,
          sellerId: contract.proposal.sellerId,
          amount,
          installments,
          installmentAmount: quote.installmentAmount,
          financedTotal: quote.total,
          monthlyInterestRate: policy.monthlyInterestRate,
          status: 'DRAFT',
        },
      });
      const unchanged = await tx.installment.findMany({ where: { contractId: id }, orderBy: { number: 'asc' } });
      if (unchanged.some((item, index) => asNumber(item.amount) !== previousSchedule[index]?.amount)) {
        throw new DomainError('RN012', 'Parcelas de contrato efetivado são imutáveis. Abra uma renegociação.');
      }
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CONTRACT_RENEGOTIATION_OPENED',
        entity: 'Contract',
        entityId: id,
        oldValue: { schedule: previousSchedule },
        newValue: { proposalId: created.id, amount, installments },
        ip,
      });
      return created;
    });
    return { proposalId: proposal.id, status: proposal.status, previousSchedule };
  }
}
