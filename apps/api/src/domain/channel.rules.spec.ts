import { assertSaleMethod, assertUniqueFiscal, retryDelayMs, settlementFor, shouldRetry } from './channel.rules';
import { DomainError } from './domain-error';
import { demoOrders, mapNuvemshopOrder } from './nuvemshop-order';
import { readState, signState } from './oauth-state';
import { importDraft, type OrderBook } from './order-import';

type MemoryCustomer = { id: string; cpf: string; name: string; phone: string | null; source: string };
type MemoryProduct = { id: string; sku: string; stock: number };

function memory(seed?: { customers?: MemoryCustomer[]; products?: MemoryProduct[] }) {
  const customers = [...(seed?.customers ?? [])];
  const products = [...(seed?.products ?? [])];
  const links = new Map<string, string>();
  const sales: { id: string; externalOrderId: string; status: string; customerId: string }[] = [];
  let seq = 1;
  const book: OrderBook = {
    async findOrderSaleId(externalOrderId) {
      return links.get(`ORDER:${externalOrderId}`) ?? null;
    },
    async findCustomerByCpf(cpf) {
      const found = customers.find((customer) => customer.cpf === cpf);
      return found ? { id: found.id } : null;
    },
    async createCustomer(input) {
      const id = `cus-${seq++}`;
      customers.push({ id, ...input, source: 'NUVEMSHOP' });
      return id;
    },
    async updateCustomer(id, input) {
      const customer = customers.find((entry) => entry.id === id);
      if (!customer) throw new Error('cliente ausente');
      customer.name = input.name;
      customer.phone = input.phone;
    },
    async link(kind, externalId, localId) {
      const key = `${kind}:${externalId}`;
      if (kind === 'ORDER' && links.has(key)) throw new DomainError('ORDER', 'Pedido já importado.');
      links.set(key, localId);
    },
    async findProductBySku(sku) {
      const product = products.find((entry) => entry.sku === sku);
      return product ? { id: product.id } : null;
    },
    async createProduct(input) {
      const id = `prd-${seq++}`;
      products.push({ id, sku: input.sku, stock: input.stock });
      return id;
    },
    async decrement(productId, quantity) {
      const product = products.find((entry) => entry.id === productId);
      if (!product || product.stock < quantity) throw new DomainError('RN004', 'O estoque da filial não pode ficar negativo.');
      product.stock -= quantity;
    },
    async createSale(input) {
      const id = `sale-${seq++}`;
      sales.push({ id, externalOrderId: input.externalOrderId, status: input.status, customerId: input.customerId });
      return id;
    },
  };
  return { book, customers, products, sales };
}

describe('canal, pedido externo e nota', () => {
  it('trata PIX e cartão como venda imediata e o financiado como proposta', () => {
    expect(assertSaleMethod('PIX')).toBe('IMMEDIATE');
    expect(assertSaleMethod('CARD')).toBe('IMMEDIATE');
    expect(assertSaleMethod('FINANCED')).toBe('FINANCED');
  });

  it('conclui o pedido pago e deixa o não pago fora do crédito', () => {
    expect(settlementFor('paid')).toEqual({ status: 'COMPLETED', decrementStock: true });
    expect(settlementFor('pending').status).toBe('AWAITING_PAYMENT');
    expect(settlementFor('pending').status).not.toBe('PENDING_CREDIT');
  });

  it('importa o mesmo pedido uma vez e baixa o estoque só na primeira', async () => {
    const paid = demoOrders()[0];
    const state = memory({ products: [{ id: 'gel', sku: 'GEL-450', stock: 12 }] });
    const first = await importDraft(state.book, paid);
    const second = await importDraft(state.book, paid);
    expect(first.created).toBe(true);
    expect(second).toEqual({ saleId: first.saleId, created: false });
    expect(state.products[0].stock).toBe(11);
    expect(state.sales).toHaveLength(1);
    expect(state.sales[0].status).toBe('COMPLETED');
  });

  it('atualiza o cliente quando o CPF já existe e cria quando não existe', async () => {
    const [paid, pending] = demoOrders();
    const state = memory({
      customers: [{ id: 'joao', cpf: paid.customer.cpf, name: 'João', phone: 'antigo', source: 'LOJA' }],
      products: [
        { id: 'gel', sku: 'GEL-450', stock: 12 },
        { id: 'fog', sku: 'FOG-5', stock: 6 },
      ],
    });
    await importDraft(state.book, { ...paid, customer: { ...paid.customer, name: 'João Silva', phone: '51999990001' } });
    await importDraft(state.book, pending);
    expect(state.customers).toHaveLength(2);
    expect(state.customers[0]).toMatchObject({ name: 'João Silva', phone: '51999990001', source: 'LOJA' });
    expect(state.customers[1]).toMatchObject({ name: 'Clara Mendes', source: 'NUVEMSHOP' });
    expect(state.products.find((product) => product.sku === 'FOG-5')?.stock).toBe(6);
    expect(state.sales.map((sale) => sale.status)).toEqual(['COMPLETED', 'AWAITING_PAYMENT']);
  });

  it('não baixa estoque quando a quantidade passa do disponível', async () => {
    const paid = demoOrders()[0];
    const state = memory({ products: [{ id: 'gel', sku: 'GEL-450', stock: 0 }] });
    await expect(importDraft(state.book, paid)).rejects.toMatchObject({ code: 'RN004' });
    expect(state.sales).toHaveLength(0);
    expect(state.products[0].stock).toBe(0);
  });

  it('recusa uma segunda nota autorizada do mesmo tipo', () => {
    expect(() => assertUniqueFiscal(null)).not.toThrow();
    expect(() => assertUniqueFiscal({ status: 'AUTHORIZED' })).toThrow(DomainError);
  });

  it('repete o webhook da Nuvemshop com espera crescente e para na quinta falha', () => {
    expect(shouldRetry('NUVEMSHOP_ORDER', 4)).toBe(true);
    expect(shouldRetry('NUVEMSHOP_ORDER', 5)).toBe(false);
    expect(shouldRetry('ORACLE_SALE', 1)).toBe(false);
    expect(retryDelayMs(1)).toBe(2000);
  });

  it('lê o pedido da API e o estado assinado da autorização', () => {
    const order = mapNuvemshopOrder({
      id: 77,
      payment_status: 'paid',
      gateway_name: 'pix',
      customer: { id: 9, name: 'Ana', identification: '52998224725' },
      products: [{ product_id: 1, variant_id: 2, sku: 'GEL-450', name: 'Geladeira', quantity: 1, price: 10 }],
    });
    expect(order).toMatchObject({ id: '77', paymentStatus: 'paid', paymentMethod: 'PIX' });
    const state = signState('loja-poa', 'segredo', Date.now(), 'admin');
    expect(readState(state, 'segredo')).toEqual({ storeId: 'loja-poa', returnTo: 'admin' });
    expect(() => readState(state, 'outro')).toThrow(DomainError);
  });
});
