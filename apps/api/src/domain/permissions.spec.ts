import { hasPermission } from './permissions';

describe('RBAC', () => {
  it('separa venda, análise e estorno', () => {
    expect(hasPermission('VENDEDOR', 'sale.create')).toBe(true);
    expect(hasPermission('VENDEDOR', 'credit.approve')).toBe(false);
    expect(hasPermission('ANALISTA_CREDITO', 'credit.approve')).toBe(true);
    expect(hasPermission('ANALISTA_CREDITO', 'payment.refund')).toBe(false);
    expect(hasPermission('FINANCEIRO', 'payment.refund')).toBe(true);
    expect(hasPermission('ADMIN', 'inventory.override')).toBe(true);
    expect(hasPermission('GERENTE', 'inventory.override')).toBe(false);
    expect(hasPermission('GERENTE', 'policy.update')).toBe(false);
    expect(hasPermission('ADMIN', 'policy.update')).toBe(true);
  });
});
