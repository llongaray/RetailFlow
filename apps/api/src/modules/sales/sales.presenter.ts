import { Prisma } from '@prisma/client';
import { asNumber } from '../../common/decimal';

const saleInclude = {
  customer: true,
  store: true,
  seller: true,
  items: { include: { product: true } },
  proposal: true,
  payments: true,
  contract: { include: { schedule: { orderBy: { number: 'asc' as const } } } },
} satisfies Prisma.SaleInclude;

export type SaleRecord = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

export function presentSale(sale: SaleRecord) {
  return {
    id: sale.id,
    number: sale.number,
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    total: asNumber(sale.total),
    cancelReason: sale.cancelReason,
    cancelledAt: sale.cancelledAt,
    createdAt: sale.createdAt,
    store: { id: sale.store.id, name: sale.store.name, code: sale.store.code },
    customer: { id: sale.customer.id, name: sale.customer.name, cpf: sale.customer.cpf },
    seller: { id: sale.seller.id, name: sale.seller.name },
    items: sale.items.map((item) => ({
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: asNumber(item.unitPrice),
    })),
    proposal: sale.proposal
      ? {
          id: sale.proposal.id,
          status: sale.proposal.status,
          installments: sale.proposal.installments,
          installmentAmount: asNumber(sale.proposal.installmentAmount),
          financedTotal: asNumber(sale.proposal.financedTotal),
          monthlyInterestRate: asNumber(sale.proposal.monthlyInterestRate),
          rejectionReason: sale.proposal.rejectionReason,
        }
      : null,
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      amount: asNumber(payment.amount),
      status: payment.status,
      externalTransactionId: payment.externalTransactionId,
      method: payment.method,
    })),
    contract: sale.contract
      ? {
          id: sale.contract.id,
          number: sale.contract.number,
          status: sale.contract.status,
          total: asNumber(sale.contract.total),
          cancelReason: sale.contract.cancelReason,
          schedule: sale.contract.schedule.map((item) => ({
            id: item.id,
            number: item.number,
            amount: asNumber(item.amount),
            dueDate: item.dueDate,
            status: item.status,
          })),
        }
      : null,
  };
}

export { saleInclude };
