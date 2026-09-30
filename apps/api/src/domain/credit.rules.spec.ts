import { DomainError } from './domain-error';
import {
  approvalLevel,
  assertApprover,
  assertTransition,
  buildInstallments,
  calculateInstallment,
} from './credit.rules';
import { roundMoney } from './money';

const policy = { analystLimit: 5000, managerLimit: 15000, monthlyInterestRate: 0.0199, maxInstallments: 24 };

describe('RN005 workflow de crédito', () => {
  it('segue o fluxo até a contratação e bloqueia atalho', () => {
    expect(() => assertTransition('DRAFT', 'SUBMITTED')).not.toThrow();
    expect(() => assertTransition('SUBMITTED', 'UNDER_ANALYSIS')).not.toThrow();
    expect(() => assertTransition('UNDER_ANALYSIS', 'APPROVED')).not.toThrow();
    expect(() => assertTransition('APPROVED', 'CONTRACTED')).not.toThrow();
    expect(() => assertTransition('SUBMITTED', 'APPROVED')).toThrow(DomainError);
    expect(() => assertTransition('UNDER_ANALYSIS', 'REJECTED')).not.toThrow();
  });
});

describe('RN006 e RN007 alçada', () => {
  const base = {
    actorId: 'analista',
    actorRole: 'ANALISTA_CREDITO',
    sellerId: 'vendedor',
    amount: 1000,
    policy,
    additionalPolicyConfirmed: false,
  };

  it('vendedor não aprova a própria proposta', () => {
    expect(() => assertApprover({ ...base, actorId: 'vendedor', sellerId: 'vendedor' })).toThrow(
      expect.objectContaining({ code: 'RN006' }),
    );
  });

  it('analista aprova até o limite e gerente assume a faixa seguinte', () => {
    expect(approvalLevel(5000, policy)).toBe('ANALYST');
    expect(() => assertApprover({ ...base, amount: 5000 })).not.toThrow();
    expect(() => assertApprover({ ...base, amount: 5001 })).toThrow(expect.objectContaining({ code: 'RN007' }));
    expect(() => assertApprover({ ...base, actorRole: 'GERENTE', amount: 15000 })).not.toThrow();
  });

  it('acima do limite de gerente exige política adicional', () => {
    expect(() => assertApprover({ ...base, actorRole: 'GERENTE', amount: 15001, additionalPolicyConfirmed: false })).toThrow(
      'política adicional',
    );
    expect(() =>
      assertApprover({ ...base, actorRole: 'GERENTE', amount: 15001, additionalPolicyConfirmed: true }),
    ).not.toThrow();
  });
});

describe('parcelas', () => {
  it('calcula prestação maior que a divisão simples e fecha a soma', () => {
    const installment = calculateInstallment(3500, 12, 0.0199);
    expect(installment).toBeGreaterThan(roundMoney(3500 / 12));
    const built = buildInstallments(3500, 12, 0.0199, new Date('2026-09-30T12:00:00Z'));
    const sum = roundMoney(built.items.reduce((total, item) => total + item.amount, 0));
    expect(sum).toBe(built.total);
    expect(built.items).toHaveLength(12);
    expect(built.items[1].dueDate.getMonth()).not.toBe(built.items[0].dueDate.getMonth());
  });
});
