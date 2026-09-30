import { decryptSecret, encryptSecret } from './secret-box';

describe('cofre de segredo', () => {
  const secret = 'retailflow-demo-integration-secret';

  it('recupera o texto cifrado com AES-256-GCM', () => {
    const boxed = encryptSecret('demo-token', secret);
    expect(boxed).not.toContain('demo-token');
    expect(decryptSecret(boxed, secret)).toBe('demo-token');
  });

  it('recusa um payload alterado', () => {
    const boxed = encryptSecret('demo-token', secret);
    const [iv, tag, data] = boxed.split('.');
    expect(() => decryptSecret(`${iv}.${tag}.${data.slice(0, -2)}aa`, secret)).toThrow();
  });
});
