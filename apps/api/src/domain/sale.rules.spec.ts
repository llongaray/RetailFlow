import { DomainError } from './domain-error';
import { assertActiveOperation, assertCancelReason, assertFinancedSaleAllowed, assertSellerStore } from './sale.rules';

describe('regras de venda', () => {
  it('RN002 exige usuário e loja ativos da mesma filial', () => {
    expect(() => assertActiveOperation(true, false)).toThrow(DomainError);
    expect(() => assertSellerStore('VENDEDOR', 'loja-a', 'loja-b')).toThrow(DomainError);
    expect(() => assertSellerStore('ADMIN', null, 'loja-b')).not.toThrow();
  });

  it('RN010 exige justificativa de cancelamento', () => {
    expect(() => assertCancelReason('não')).toThrow(DomainError);
    expect(assertCancelReason('Cliente desistiu da compra')).toBe('Cliente desistiu da compra');
  });

  it('RN011 bloqueia venda financiada sem crédito aprovado', () => {
    expect(() => assertFinancedSaleAllowed('UNDER_ANALYSIS')).toThrow(DomainError);
    expect(() => assertFinancedSaleAllowed('APPROVED')).not.toThrow();
  });
});
