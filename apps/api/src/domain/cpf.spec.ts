import { assertValidCpf, cpfFromBase, isValidCpf, normalizeCpf } from './cpf';

describe('CPF', () => {
  it('aceita CPF com dígitos verificadores corretos', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(assertValidCpf('52998224725')).toBe('52998224725');
  });

  it('rejeita sequência repetida e dígito incorreto', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('52998224700')).toBe(false);
    expect(() => assertValidCpf('123')).toThrow('CPF inválido');
  });

  it('monta CPF válido a partir da base', () => {
    expect(isValidCpf(cpfFromBase('390533447'))).toBe(true);
  });
});
