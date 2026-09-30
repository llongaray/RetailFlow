import { cpfFromBase } from './cpf';

export type RemoteOrder = {
  id: string;
  paymentStatus: 'paid' | 'pending';
  paymentMethod: 'CASH' | 'PIX' | 'CARD';
  customer: { id: string; name: string; cpf: string; phone: string | null };
  items: { productId: string; variantId: string; sku: string; name: string; quantity: number; unitPrice: number }[];
};

export function demoOrders(): RemoteOrder[] {
  return [
    {
      id: 'demo-9001',
      paymentStatus: 'paid',
      paymentMethod: 'PIX',
      customer: { id: 'demo-customer-joao', name: 'João Silva', cpf: cpfFromBase('529982247'), phone: '51999990001' },
      items: [{ productId: 'demo-product-gel', variantId: 'demo-variant-gel', sku: 'GEL-450', name: 'Geladeira Frost 450L', quantity: 1, unitPrice: 3500 }],
    },
    {
      id: 'demo-9002',
      paymentStatus: 'pending',
      paymentMethod: 'PIX',
      customer: { id: 'demo-customer-clara', name: 'Clara Mendes', cpf: cpfFromBase('847163291'), phone: '51988880002' },
      items: [{ productId: 'demo-product-fog', variantId: 'demo-variant-fog', sku: 'FOG-5', name: 'Fogão 5 bocas', quantity: 1, unitPrice: 1899.9 }],
    },
  ];
}

export function mapNuvemshopOrder(raw: Record<string, unknown>): RemoteOrder {
  const id = String(raw.id ?? '');
  const customer = (raw.customer ?? {}) as Record<string, unknown>;
  const products = Array.isArray(raw.products) ? raw.products : [];
  const gateway = String(raw.gateway_name ?? raw.gateway ?? '').toLowerCase();
  const paymentMethod = gateway.includes('card') || gateway.includes('cart') ? 'CARD' : gateway.includes('cash') || gateway.includes('dinheiro') ? 'CASH' : 'PIX';
  const phoneValue = raw.contact_phone ?? customer.phone;
  return {
    id,
    paymentStatus: raw.payment_status === 'paid' ? 'paid' : 'pending',
    paymentMethod,
    customer: {
      id: String(customer.id ?? `order-${id}`),
      name: String(customer.name ?? raw.contact_name ?? 'Cliente Nuvemshop'),
      cpf: String(customer.identification ?? raw.contact_identification ?? ''),
      phone: phoneValue ? String(phoneValue) : null,
    },
    items: products.map((entry) => {
      const product = entry as Record<string, unknown>;
      return {
        productId: String(product.product_id ?? ''),
        variantId: String(product.variant_id ?? product.product_id ?? ''),
        sku: String(product.sku ?? ''),
        name: String(product.name ?? 'Produto'),
        quantity: Number(product.quantity ?? 0),
        unitPrice: Number(product.price ?? 0),
      };
    }),
  };
}
