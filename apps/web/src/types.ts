export type Role = 'ADMIN' | 'GERENTE' | 'ANALISTA_CREDITO' | 'VENDEDOR' | 'ATENDIMENTO' | 'FINANCEIRO';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  storeName: string | null;
  active: boolean;
  permissions: string[];
};

export type Customer = {
  id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  creditLimit: number;
  stage: string;
  active: boolean;
  proposalCount?: number;
  openTickets?: number;
  lastPurchase?: { id: string; number: number; total: number; createdAt: string } | null;
};

export type Store = { id: string; code: string; name: string; city: string; active: boolean };

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  networkStock: number;
  stock: { storeId: string; storeName: string; quantity: number }[];
};

export type Sale = {
  id: string;
  number: number;
  status: string;
  paymentMethod: string;
  total: number;
  cancelReason: string | null;
  createdAt: string;
  store: { id: string; name: string; code: string };
  customer: { id: string; name: string; cpf: string };
  seller: { id: string; name: string };
  items: { productId: string; sku: string; name: string; quantity: number; unitPrice: number }[];
  proposal: {
    id: string;
    status: string;
    installments: number;
    installmentAmount: number;
    financedTotal: number;
    rejectionReason: string | null;
  } | null;
  payments: { id: string; amount: number; status: string; externalTransactionId: string }[];
  contract: {
    id: string;
    number: number;
    status: string;
    total: number;
    schedule: { id: string; number: number; amount: number; dueDate: string; status: string }[];
  } | null;
};

export type Proposal = {
  id: string;
  status: string;
  amount: number;
  installments: number;
  installmentAmount: number;
  financedTotal: number;
  rejectionReason: string | null;
  createdAt: string;
  saleId: string | null;
  customer: { id: string; name: string; cpf: string; creditLimit: number };
  seller: { id: string; name: string };
  store: { id: string; name: string };
};

export type Dashboard = {
  salesCount: number;
  salesTotal: number;
  pendingCredit: number;
  openTickets: number;
  lowStock: number;
  delinquentInstallments: number;
  stores: { name: string; salesTotal: number; salesCount: number }[];
};

export type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  customerId?: string;
  customerName: string;
  phone?: string | null;
  openedBy: string;
  createdAt: string;
};
