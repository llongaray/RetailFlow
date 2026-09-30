import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from './auth-user';

export function scopedStoreId(user: AuthUser): string | undefined {
  if (user.role === 'VENDEDOR' || user.role === 'GERENTE') {
    return user.storeId ?? '00000000-0000-0000-0000-000000000000';
  }
  return undefined;
}

export function assertStoreAccess(user: AuthUser, storeId: string) {
  const scoped = scopedStoreId(user);
  if (scoped && scoped !== storeId) {
    throw new ForbiddenException('Operação restrita à filial do usuário.');
  }
}
