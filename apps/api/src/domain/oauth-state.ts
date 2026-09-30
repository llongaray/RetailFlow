import { createHmac, timingSafeEqual } from 'crypto';
import { DomainError } from './domain-error';

export type OAuthReturn = 'admin' | 'panel';

export function signState(storeId: string, secret: string, now = Date.now(), returnTo: OAuthReturn = 'panel'): string {
  const body = Buffer.from(JSON.stringify({ storeId, returnTo, exp: now + 10 * 60 * 1000 })).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readState(state: string, secret: string, now = Date.now()): { storeId: string; returnTo: OAuthReturn } {
  const [body, sig] = state.split('.');
  if (!body || !sig) throw new DomainError('OAUTH_STATE', 'Estado de autorização inválido.');
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new DomainError('OAUTH_STATE', 'Estado de autorização inválido.');
  }
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { storeId?: string; exp?: number; returnTo?: string };
  if (!parsed.storeId || !parsed.exp || parsed.exp < now) throw new DomainError('OAUTH_STATE', 'A autorização expirou.');
  return { storeId: parsed.storeId, returnTo: parsed.returnTo === 'admin' ? 'admin' : 'panel' };
}
