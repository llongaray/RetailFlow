import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth-user';
import { asNumber } from '../../common/decimal';
import { DomainError } from '../../domain/domain-error';
import { roundMoney } from '../../domain/money';
import { assertRefundable, resolvePaymentIntent } from '../../domain/payment.rules';
import { assertCancelReason } from '../../domain/sale.rules';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { enqueueOutbox } from '../../infrastructure/integrations/outbox';

function presentPayment(payment: {
  id: string;
  amount: Prisma.Decimal;
  method: string;
  status: string;
  externalTransactionId: string;
  saleId: string | null;
  installmentId: string | null;
}, idempotentReplay = false) {
  return {
    id: payment.id,
    amount: asNumber(payment.amount),
    method: payment.method,
    status: payment.status,
    externalTransactionId: payment.externalTransactionId,
    saleId: payment.saleId,
    installmentId: payment.installmentId,
    idempotentReplay,
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(installmentId: string, amount: number, externalTransactionId: string, actor: AuthUser, ip: string | null) {
    const installment = await this.prisma.installment.findUnique({ where: { id: installmentId }, include: { contract: true } });
    if (!installment) throw new NotFoundException('Parcela não encontrada.');
    const existing = await this.prisma.payment.findUnique({ where: { externalTransactionId } });
    const intent = resolvePaymentIntent(
      existing
        ? { saleId: existing.saleId, installmentId: existing.installmentId, amount: asNumber(existing.amount) }
        : null,
      { saleId: installment.contract.saleId, installmentId, amount: roundMoney(amount) },
    );
    if (intent === 'replay' && existing) return presentPayment(existing, true);
    if (installment.status !== 'OPEN') throw new DomainError('RN008', 'A parcela não está aberta para pagamento.');
    if (roundMoney(asNumber(installment.amount)) !== roundMoney(amount)) {
      throw new DomainError('RN008', 'O valor do pagamento deve ser igual ao da parcela.');
    }
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            installmentId,
            saleId: installment.contract.saleId,
            amount: roundMoney(amount),
            method: 'FINANCED',
            externalTransactionId,
            status: 'CONFIRMED',
            registeredById: actor.id,
          },
        });
        await tx.installment.update({ where: { id: installmentId }, data: { status: 'PAID' } });
        await this.audit.record(tx, {
          userId: actor.id,
          action: 'PAYMENT_CONFIRMED',
          entity: 'Payment',
          entityId: created.id,
          newValue: { amount: roundMoney(amount), externalTransactionId, installmentId },
          ip,
        });
        await enqueueOutbox(tx, 'ORACLE_PAYMENT', { paymentId: created.id, externalTransactionId });
        return created;
      });
      return presentPayment(payment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.payment.findUnique({ where: { externalTransactionId } });
        if (replay && asNumber(replay.amount) === roundMoney(amount) && replay.installmentId === installmentId) {
          return presentPayment(replay, true);
        }
        throw new DomainError('RN013', 'Já existe um pagamento com este identificador externo.');
      }
      throw error;
    }
  }

  async refund(id: string, reason: string, actor: AuthUser, ip: string | null) {
    const justification = assertCancelReason(reason);
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Pagamento não encontrado.');
    assertRefundable(payment.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id },
        data: { status: 'REFUNDED', refundedById: actor.id, refundReason: justification },
      });
      if (payment.installmentId) {
        await tx.installment.update({ where: { id: payment.installmentId }, data: { status: 'OPEN' } });
      }
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'PAYMENT_REFUNDED',
        entity: 'Payment',
        entityId: id,
        oldValue: { status: 'CONFIRMED', amount: asNumber(payment.amount) },
        newValue: { status: 'REFUNDED', reason: justification },
        ip,
      });
      return row;
    });
    return presentPayment(updated);
  }
}
