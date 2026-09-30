import { DomainError } from './domain-error';

export function rejectContractDeletion(): never {
  throw new DomainError('RN009', 'Contrato efetivado não pode ser apagado. Registre um cancelamento formal.');
}

export function rejectInstallmentChange(): never {
  throw new DomainError('RN012', 'Parcelas de contrato efetivado são imutáveis. Abra uma renegociação.');
}

export function assertContractActive(status: string): void {
  if (status !== 'ACTIVE') {
    throw new DomainError('RN009', 'Somente contrato ativo pode ser cancelado ou renegociado.');
  }
}
