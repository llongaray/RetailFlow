import { DomainError } from './domain-error';

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(base: string, factor: number): number {
  let total = 0;
  for (const char of base) {
    total += Number(char) * factor;
    factor -= 1;
  }
  const mod = (total * 10) % 11;
  return mod === 10 ? 0 : mod;
}

export function cpfFromBase(base9: string): string {
  if (!/^\d{9}$/.test(base9)) {
    throw new DomainError('CPF_INVALID', 'Base de CPF deve ter 9 dígitos.');
  }
  const first = checkDigit(base9, 10);
  const second = checkDigit(`${base9}${first}`, 11);
  return `${base9}${first}${second}`;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  return cpfFromBase(digits.slice(0, 9)) === digits;
}

export function assertValidCpf(value: string): string {
  const digits = normalizeCpf(value);
  if (!isValidCpf(digits)) throw new DomainError('CPF_INVALID', 'CPF inválido.');
  return digits;
}
