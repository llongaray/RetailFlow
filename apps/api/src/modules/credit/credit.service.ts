import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { scopedStoreId } from '../../common/access';
import { asNumber } from '../../common/decimal';
import {
  assertApprover,
  assertCanReviewOwnProposal,
  assertInstallmentCount,
  assertRejectionReason,
  assertTransition,
  buildInstallments,
  POLICY_CHANGE_CONFIRMATION,
} from '../../domain/credit.rules';
import { DomainError } from '../../domain/domain-error';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { ApproveCreditDto, RejectCreditDto, SimulationDto, UpdatePolicyDto } from './credit.dto';

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async policy() {
    const policy = await this.prisma.creditPolicy.findFirst({ where: { active: true } });
    if (!policy) throw new DomainError('RN007', 'Política de crédito não configurada.');
    return {
      id: policy.id,
      analystLimit: asNumber(policy.analystLimit),
      managerLimit: asNumber(policy.managerLimit),
      monthlyInterestRate: asNumber(policy.monthlyInterestRate),
      maxInstallments: policy.maxInstallments,
    };
  }

  async simulate(dto: SimulationDto) {
    const policy = await this.policy();
    assertInstallmentCount(dto.installments, policy.maxInstallments);
    const quote = buildInstallments(dto.amount, dto.installments, policy.monthlyInterestRate, new Date());
    return { ...quote, monthlyInterestRate: policy.monthlyInterestRate, amount: dto.amount };
  }

  async list(actor: AuthUser, status?: string) {
    const storeId = scopedStoreId(actor);
    const rows = await this.prisma.creditProposal.findMany({
      where: { ...(status ? { status } : {}), ...(storeId ? { storeId } : {}) },
      include: { customer: true, seller: true, store: true, sales: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      amount: asNumber(row.amount),
      installments: row.installments,
      installmentAmount: asNumber(row.installmentAmount),
      financedTotal: asNumber(row.financedTotal),
      monthlyInterestRate: asNumber(row.monthlyInterestRate),
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      saleId: row.sales[0]?.id ?? null,
      customer: { id: row.customer.id, name: row.customer.name, cpf: row.customer.cpf, creditLimit: asNumber(row.customer.creditLimit) },
      seller: { id: row.seller.id, name: row.seller.name },
      store: { id: row.store.id, name: row.store.name },
    }));
  }

  async startAnalysis(id: string, actor: AuthUser, ip: string | null) {
    const proposal = await this.mustFind(id);
    assertCanReviewOwnProposal(actor.id, proposal.sellerId);
    assertTransition(proposal.status, 'UNDER_ANALYSIS');
    await this.prisma.$transaction(async (tx) => {
      await tx.creditProposal.update({ where: { id }, data: { status: 'UNDER_ANALYSIS', reviewerId: actor.id } });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CREDIT_ANALYSIS_STARTED',
        entity: 'CreditProposal',
        entityId: id,
        oldValue: { status: proposal.status },
        newValue: { status: 'UNDER_ANALYSIS' },
        ip,
      });
    });
    return { id, status: 'UNDER_ANALYSIS' };
  }

  async approve(id: string, dto: ApproveCreditDto, actor: AuthUser, ip: string | null) {
    const proposal = await this.mustFind(id);
    const policy = await this.policy();
    assertTransition(proposal.status, 'APPROVED');
    assertApprover({
      actorId: actor.id,
      actorRole: actor.role,
      sellerId: proposal.sellerId,
      amount: asNumber(proposal.amount),
      policy,
      additionalPolicyConfirmed: dto.additionalPolicyConfirmed === true,
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.creditProposal.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewerId: actor.id,
          reviewedAt: new Date(),
          additionalPolicyConfirmed: dto.additionalPolicyConfirmed === true,
        },
      });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CREDIT_APPROVED',
        entity: 'CreditProposal',
        entityId: id,
        oldValue: { status: proposal.status },
        newValue: { status: 'APPROVED', amount: asNumber(proposal.amount) },
        ip,
      });
    });
    return { id, status: 'APPROVED' };
  }

  async reject(id: string, dto: RejectCreditDto, actor: AuthUser, ip: string | null) {
    const proposal = await this.mustFind(id);
    const reason = assertRejectionReason(dto.reason);
    assertCanReviewOwnProposal(actor.id, proposal.sellerId);
    assertTransition(proposal.status, 'REJECTED');
    await this.prisma.$transaction(async (tx) => {
      await tx.creditProposal.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason, reviewerId: actor.id, reviewedAt: new Date() },
      });
      const linkedSale = proposal.sales[0];
      if (linkedSale) {
        await tx.sale.update({
          where: { id: linkedSale.id },
          data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date(), cancelledById: actor.id },
        });
      }
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CREDIT_REJECTED',
        entity: 'CreditProposal',
        entityId: id,
        oldValue: { status: proposal.status },
        newValue: { status: 'REJECTED', reason },
        ip,
      });
    });
    return { id, status: 'REJECTED' };
  }

  async updatePolicy(dto: UpdatePolicyDto, actor: AuthUser, ip: string | null) {
    if (dto.confirmation !== POLICY_CHANGE_CONFIRMATION) {
      throw new DomainError('RN014', 'Alteração de política de crédito exige a confirmação de validação antes do deploy.');
    }
    const current = await this.policy();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.creditPolicy.update({
        where: { id: current.id },
        data: {
          analystLimit: dto.analystLimit,
          managerLimit: dto.managerLimit,
          monthlyInterestRate: dto.monthlyInterestRate,
          maxInstallments: dto.maxInstallments,
        },
      });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CREDIT_POLICY_CHANGED',
        entity: 'CreditPolicy',
        entityId: row.id,
        oldValue: current,
        newValue: dto,
        ip,
      });
      return row;
    });
    return {
      id: updated.id,
      analystLimit: asNumber(updated.analystLimit),
      managerLimit: asNumber(updated.managerLimit),
      monthlyInterestRate: asNumber(updated.monthlyInterestRate),
      maxInstallments: updated.maxInstallments,
    };
  }

  private async mustFind(id: string) {
    const proposal = await this.prisma.creditProposal.findUnique({ where: { id }, include: { sales: true } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada.');
    return proposal;
  }
}
