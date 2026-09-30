export const ROLES = ['ADMIN', 'GERENTE', 'ANALISTA_CREDITO', 'VENDEDOR', 'ATENDIMENTO', 'FINANCEIRO'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'customer.read',
  'customer.create',
  'customer.update_limit',
  'catalog.read',
  'inventory.adjust',
  'inventory.override',
  'sale.read',
  'sale.create',
  'sale.cancel',
  'credit.read',
  'credit.submit',
  'credit.analyze',
  'credit.approve',
  'contract.read',
  'contract.create',
  'contract.cancel',
  'payment.create',
  'payment.refund',
  'support.read',
  'support.write',
  'audit.read',
  'dashboard.read',
  'policy.update',
  'user.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ALL,
  GERENTE: ALL.filter((permission) => permission !== 'inventory.override' && permission !== 'policy.update'),
  ANALISTA_CREDITO: [
    'customer.read',
    'catalog.read',
    'sale.read',
    'credit.read',
    'credit.analyze',
    'credit.approve',
    'contract.read',
    'dashboard.read',
    'support.read',
  ],
  VENDEDOR: [
    'customer.read',
    'customer.create',
    'catalog.read',
    'sale.read',
    'sale.create',
    'sale.cancel',
    'credit.read',
    'credit.submit',
    'contract.read',
    'contract.create',
    'dashboard.read',
  ],
  ATENDIMENTO: ['customer.read', 'customer.create', 'sale.read', 'contract.read', 'support.read', 'support.write', 'dashboard.read'],
  FINANCEIRO: [
    'customer.read',
    'sale.read',
    'credit.read',
    'contract.read',
    'contract.create',
    'contract.cancel',
    'payment.create',
    'payment.refund',
    'dashboard.read',
    'audit.read',
  ],
};

export function permissionsFor(role: string): Permission[] {
  if (!isRole(role)) return [];
  return [...ROLE_PERMISSIONS[role]];
}

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function hasPermission(role: string, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}
