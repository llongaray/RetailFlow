import { DomainError } from './domain-error';
import { roundMoney } from './money';

export const POLICY_CHANGE_CONFIRMATION = 'VALIDAR_ANTES_DO_DEPLOY';
export const CREDIT_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_ANALYSIS', 'APPROVED', 'REJECTED', 'CONTRACTED'] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

const TRANSITIONS: Record<CreditStatus, readonly CreditStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_ANALYSIS'],
  UNDER_ANALYSIS: ['APPROVED', 'REJECTED'],
  APPROVED: ['CONTRACTED'],
  REJECTED: [],
  CONTRACTED: [],
};

export type CreditPolicySnapshot = {
  analystLimit: number;
  managerLimit: number;
  monthlyInterestRate: number;
  maxInstallments: number;
};

export type ApprovalLevel = 'ANALYST' | 'MANAGER' | 'MANAGER_PLUS';

export function assertTransition(current: string, next: CreditStatus): void {
  const allowed = TRANSITIONS[current as CreditStatus];
  if (!allowed?.includes(next)) {
    throw new DomainError('RN005', `A proposta não pode ir de ${current} para ${next}.`);
  }
}

export function approvalLevel(amount: number, policy: Pick<CreditPolicySnapshot, 'analystLimit' | 'managerLimit'>): ApprovalLevel {
  if (amount <= policy.analystLimit) return 'ANALYST';
  if (amount <= policy.managerLimit) return 'MANAGER';
  return 'MANAGER_PLUS';
}

export function assertCanReviewOwnProposal(actorId: string, sellerId: string): void {
  if (actorId === sellerId) {
    throw new DomainError('RN006', 'Quem criou a proposta não pode analisá-la nem aprová-la.');
  }
}

export function assertApprover(input: {
  actorId: string;
  actorRole: string;
  sellerId: string;
  amount: number;
  policy: Pick<CreditPolicySnapshot, 'analystLimit' | 'managerLimit'>;
  additionalPolicyConfirmed: boolean;
}): void {
  assertCanReviewOwnProposal(input.actorId, input.sellerId);
  const level = approvalLevel(input.amount, input.policy);
  const manager = input.actorRole === 'GERENTE' || input.actorRole === 'ADMIN';
  const analyst = manager || input.actorRole === 'ANALISTA_CREDITO';
  if (level === 'ANALYST' && !analyst) {
    throw new DomainError('RN007', 'Esta alçada exige analista, gerente ou administrador.');
  }
  if (level === 'MANAGER' && !manager) {
    throw new DomainError('RN007', 'Valor acima da alçada do analista. A aprovação exige gerente.');
  }
  if (level === 'MANAGER_PLUS') {
    if (!manager) throw new DomainError('RN007', 'Valor acima do limite de gerente.');
    if (!input.additionalPolicyConfirmed) {
      throw new DomainError('RN007', 'Acima do limite de gerente, a política adicional precisa ser confirmada.');
    }
  }
}

export function assertInstallmentCount(count: number, maxInstallments: number): void {
  if (!Number.isInteger(count) || count < 1 || count > maxInstallments) {
    throw new DomainError('RN007', `O parcelamento deve ficar entre 1 e ${maxInstallments}.`);
  }
}

export function calculateInstallment(amount: number, count: number, monthlyRate: number): number {
  if (monthlyRate === 0) return roundMoney(amount / count);
  const factor = (1 + monthlyRate) ** count;
  return roundMoney((amount * (monthlyRate * factor)) / (factor - 1));
}

export type InstallmentDraft = { number: number; amount: number; dueDate: Date };

export function buildInstallments(amount: number, count: number, monthlyRate: number, start: Date): {
  installmentAmount: number;
  total: number;
  items: InstallmentDraft[];
} {
  const installmentAmount = calculateInstallment(amount, count, monthlyRate);
  const total = roundMoney(installmentAmount * count);
  const items: InstallmentDraft[] = [];
  let allocated = 0;
  for (let number = 1; number <= count; number += 1) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + number);
    const value = number === count ? roundMoney(total - allocated) : installmentAmount;
    allocated = roundMoney(allocated + value);
    items.push({ number, amount: value, dueDate });
  }
  return { installmentAmount, total, items };
}

export function assertRejectionReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? '';
  if (trimmed.length < 5) throw new DomainError('RN005', 'A rejeição exige um motivo.');
  return trimmed;
}
