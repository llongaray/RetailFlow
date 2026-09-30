import { DomainError } from './domain-error';
import { assertRefundable, resolvePaymentIntent } from './payment.rules';

describe('RN013 idempotência de pagamento', () => {
  const incoming = { saleId: 'sale-1', installmentId: null, amount: 3500 };

  it('cria, reconhece repetição e rejeita o mesmo identificador com outro valor', () => {
    expect(resolvePaymentIntent(null, incoming)).toBe('create');
    expect(resolvePaymentIntent(incoming, incoming)).toBe('replay');
    expect(() => resolvePaymentIntent({ ...incoming, amount: 10 }, incoming)).toThrow(DomainError);
    try {
      resolvePaymentIntent({ ...incoming, amount: 10 }, incoming);
    } catch (error) {
      expect(error).toMatchObject({ code: 'RN013' });
    }
  });

  it('não estorna duas vezes', () => {
    expect(() => assertRefundable('CONFIRMED')).not.toThrow();
    expect(() => assertRefundable('REFUNDED')).toThrow(DomainError);
  });
});
