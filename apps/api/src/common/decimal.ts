import { Prisma } from '@prisma/client';

export function asNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}
