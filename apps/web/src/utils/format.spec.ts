import { describe, expect, it } from 'vitest';
import { formatBRL, formatCpf } from './format';

describe('formatação', () => {
  it('mostra real e CPF mascarado', () => {
    expect(formatBRL(3500)).toContain('3.500,00');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});
