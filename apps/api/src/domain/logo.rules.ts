import { DomainError } from './domain-error';

export const LOGO_SLOTS = ['square', 'banner', 'story'] as const;
export type LogoSlot = (typeof LOGO_SLOTS)[number];

const EXPECTED: Record<LogoSlot, number> = { square: 1, banner: 6, story: 9 / 16 };

export function assertLogoRatio(slot: LogoSlot, width: number, height: number) {
  if (width <= 0 || height <= 0) throw new DomainError('LOGO', 'A imagem não tem tamanho válido.');
  const delta = Math.abs(width / height - EXPECTED[slot]) / EXPECTED[slot];
  if (delta > 0.03) {
    const label = slot === 'square' ? '1:1' : slot === 'banner' ? '1:6' : '9:16';
    throw new DomainError('LOGO', `O recorte precisa estar na proporção ${label}.`);
  }
}
