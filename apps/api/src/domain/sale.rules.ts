import { DomainError } from './domain-error';

export function assertActiveOperation(userActive: boolean, storeActive: boolean): void {
  if (!userActive || !storeActive) {
    throw new DomainError('RN002', 'A venda exige usuário ativo e loja ativa.');
  }
}

export function assertSellerStore(actorRole: string, actorStoreId: string | null, storeId: string): void {
  if (actorRole === 'ADMIN') return;
  if (!actorStoreId || actorStoreId !== storeId) {
    throw new DomainError('RN002', 'O usuário só pode vender pela própria filial.');
  }
}

export function assertCancelReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? '';
  if (trimmed.length < 5) {
    throw new DomainError('RN010', 'O cancelamento exige uma justificativa.');
  }
  return trimmed;
}

export function assertFinancedSaleAllowed(proposalStatus: string): void {
  if (proposalStatus !== 'APPROVED') {
    throw new DomainError('RN011', 'Venda financiada exige crédito aprovado.');
  }
}
