export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId: string | null;
  active: boolean;
  permissions: string[];
};
