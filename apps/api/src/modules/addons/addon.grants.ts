const grants = new Map<string, string[]>();

export function setAddonGrants(tenantId: string, permissions: string[]) {
  grants.set(tenantId, permissions);
}

export function addonPermissionsFor(role: string, tenantId = 'company'): string[] {
  if (role !== 'ADMIN') return [];
  return grants.get(tenantId) ?? [];
}
