import { settlementFor } from './channel.rules';
import { assertValidCpf } from './cpf';
import { DomainError } from './domain-error';
import { roundMoney } from './money';
import type { RemoteOrder } from './nuvemshop-order';

export type OrderBook = {
  findOrderSaleId(externalOrderId: string): Promise<string | null>;
  findCustomerByCpf(cpf: string): Promise<{ id: string } | null>;
  createCustomer(input: { name: string; cpf: string; phone: string | null }): Promise<string>;
  updateCustomer(id: string, input: { name: string; phone: string | null }): Promise<void>;
  link(kind: string, externalId: string, localId: string, sku?: string | null): Promise<void>;
  findProductBySku(sku: string): Promise<{ id: string } | null>;
  createProduct(input: { sku: string; name: string; price: number; stock: number }): Promise<string>;
  decrement(productId: string, quantity: number): Promise<void>;
  createSale(input: {
    customerId: string;
    status: string;
    paymentMethod: string;
    total: number;
    externalOrderId: string;
    paid: boolean;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }): Promise<string>;
};

export async function importDraft(book: OrderBook, draft: RemoteOrder): Promise<{ saleId: string; created: boolean }> {
  if (!draft.id || draft.items.length === 0) throw new DomainError('ORDER', 'Pedido externo sem itens.');
  const existing = await book.findOrderSaleId(draft.id);
  if (existing) return { saleId: existing, created: false };
  const cpf = assertValidCpf(draft.customer.cpf);
  const found = await book.findCustomerByCpf(cpf);
  const customerId = found
    ? found.id
    : await book.createCustomer({ name: draft.customer.name.trim(), cpf, phone: draft.customer.phone });
  if (found) await book.updateCustomer(found.id, { name: draft.customer.name.trim(), phone: draft.customer.phone });
  await book.link('CUSTOMER', draft.customer.id, customerId);
  const lines: { productId: string; quantity: number; unitPrice: number }[] = [];
  for (const item of draft.items) {
    if (!item.sku || item.quantity < 1) throw new DomainError('ORDER', 'Item externo sem SKU ou quantidade.');
    let product = await book.findProductBySku(item.sku);
    if (!product) {
      const id = await book.createProduct({ sku: item.sku, name: item.name, price: item.unitPrice, stock: item.quantity });
      product = { id };
    }
    await book.link('PRODUCT', item.productId, product.id, item.sku);
    await book.link('VARIANT', item.variantId, product.id, item.sku);
    lines.push({ productId: product.id, quantity: item.quantity, unitPrice: item.unitPrice });
  }
  const settlement = settlementFor(draft.paymentStatus);
  if (settlement.decrementStock) {
    for (const line of lines) await book.decrement(line.productId, line.quantity);
  }
  const total = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const saleId = await book.createSale({
    customerId,
    status: settlement.status,
    paymentMethod: draft.paymentMethod,
    total,
    externalOrderId: draft.id,
    paid: settlement.decrementStock,
    items: lines,
  });
  await book.link('ORDER', draft.id, saleId);
  return { saleId, created: true };
}
