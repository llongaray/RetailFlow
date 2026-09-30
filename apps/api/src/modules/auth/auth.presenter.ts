import { permissionsFor } from '../../domain/permissions';

export function presentUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId: string | null;
  active: boolean;
  store?: { name: string } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    storeName: user.store?.name ?? null,
    active: user.active,
    permissions: permissionsFor(user.role),
  };
}
