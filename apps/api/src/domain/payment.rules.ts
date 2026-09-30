import { DomainError } from './domain-error';

export type PaymentIdentity = {
  saleId: string | null;
  installmentId: string | null;
  amount: number;
};

export function resolvePaymentIntent(existing: PaymentIdentity | null, incoming: PaymentIdentity): 'create' | 'replay' {
  if (!existing) return 'create';
  const same =
    existing.saleId === incoming.saleId &&
    existing.installmentId === incoming.installmentId &&
    existing.amount === incoming.amount;
  if (!same) {
    throw new DomainError('RN013', 'Já existe um pagamento com este identificador externo.');
  }
  return 'replay';
}

export function assertRefundable(status: string): void {
  if (status === 'REFUNDED') throw new DomainError('RN013', 'Este pagamento já foi estornado.');
  if (status !== 'CONFIRMED') throw new DomainError('RN008', 'Somente pagamento confirmado pode ser estornado.');
}
