import { DomainError } from './domain-error';

const IMMEDIATE = ['CASH', 'PIX', 'CARD'] as const;

export function assertSaleMethod(method: string): 'IMMEDIATE' | 'FINANCED' {
  if (method === 'FINANCED') return 'FINANCED';
  if ((IMMEDIATE as readonly string[]).includes(method)) return 'IMMEDIATE';
  throw new DomainError('PAYMENT', 'Forma de pagamento desconhecida.');
}

export function settlementFor(paymentStatus: string): { status: 'COMPLETED' | 'AWAITING_PAYMENT'; decrementStock: boolean } {
  if (paymentStatus === 'paid') return { status: 'COMPLETED', decrementStock: true };
  return { status: 'AWAITING_PAYMENT', decrementStock: false };
}

export function assertUniqueFiscal(existing: { status: string } | null): void {
  if (existing?.status === 'AUTHORIZED') {
    throw new DomainError('FISCAL_DUPLICATE', 'Já existe uma nota autorizada deste tipo para a venda.');
  }
}

export function shouldRetry(type: string, attempts: number): boolean {
  return type === 'NUVEMSHOP_ORDER' && attempts < 5;
}

export function retryDelayMs(attempts: number): number {
  return Math.min(60_000, 2 ** attempts * 1000);
}
