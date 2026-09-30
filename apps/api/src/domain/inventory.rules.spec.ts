import { DomainError } from './domain-error';
import { assertNonNegativeQuantity, assertSufficientStock } from './inventory.rules';

describe('RN003 / RN004 estoque por filial', () => {
  it('permite baixar quando a filial tem saldo', () => {
    expect(() => assertSufficientStock(12, 1, false)).not.toThrow();
  });

  it('impede saldo negativo sem permissão administrativa', () => {
    expect(() => assertSufficientStock(0, 1, false)).toThrow(DomainError);
    try {
      assertSufficientStock(2, 4, false);
    } catch (error) {
      expect(error).toMatchObject({ code: 'RN004' });
    }
  });

  it('permite saldo negativo somente com permissão explícita', () => {
    expect(() => assertSufficientStock(0, 1, true)).not.toThrow();
    expect(() => assertNonNegativeQuantity(-1, false)).toThrow(DomainError);
    expect(() => assertNonNegativeQuantity(-1, true)).not.toThrow();
  });
});
