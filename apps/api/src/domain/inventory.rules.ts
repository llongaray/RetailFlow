import { DomainError } from './domain-error';

export function assertSufficientStock(available: number, requested: number, allowNegative: boolean): void {
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new DomainError('RN004', 'A quantidade vendida deve ser um inteiro maior que zero.');
  }
  if (available - requested < 0 && !allowNegative) {
    throw new DomainError('RN004', 'O estoque da filial não pode ficar negativo.');
  }
}

export function assertNonNegativeQuantity(quantity: number, allowNegative: boolean): void {
  if (!Number.isInteger(quantity)) {
    throw new DomainError('RN004', 'A quantidade em estoque deve ser inteira.');
  }
  if (quantity < 0 && !allowNegative) {
    throw new DomainError('RN004', 'O estoque da filial não pode ficar negativo.');
  }
}
