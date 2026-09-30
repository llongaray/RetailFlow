import { DomainError } from './domain-error';
import { assertLogoRatio } from './logo.rules';

describe('logos', () => {
  it('aceita 1:1, faixa 6:1 e 9:16', () => {
    expect(() => assertLogoRatio('square', 200, 200)).not.toThrow();
    expect(() => assertLogoRatio('banner', 600, 100)).not.toThrow();
    expect(() => assertLogoRatio('story', 90, 160)).not.toThrow();
  });

  it('recusa um recorte fora da proporção', () => {
    expect(() => assertLogoRatio('square', 300, 100)).toThrow(DomainError);
  });
});