import type { AuthUser } from '../../common/auth-user';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { loadRootEnv } from '../../load-env';
import { StockService } from '../inventory/stock.service';
import { SalesService } from './sales.service';

loadRootEnv();

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('venda e estoque na mesma transação', () => {
  const prisma = new PrismaService();
  const sales = new SalesService(prisma, new AuditService(), new StockService());
  let storeId = '';
  let sellerId = '';
  let customerId = '';
  let productId = '';

  beforeAll(async () => {
    await prisma.$connect();
    const store = await prisma.store.findUniqueOrThrow({ where: { code: 'POA' } });
    const seller = await prisma.user.findUniqueOrThrow({ where: { email: 'lucas.ferreira@retailflow.local' } });
    const customer = await prisma.customer.findFirstOrThrow();
    const product = await prisma.product.create({ data: { sku: `TST-${Date.now()}`, name: 'Item de teste', price: 10 } });
    await prisma.inventory.create({ data: { storeId: store.id, productId: product.id, quantity: 1 } });
    storeId = store.id;
    sellerId = seller.id;
    customerId = customer.id;
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { sale: { items: { some: { productId } } } } });
    await prisma.saleItem.deleteMany({ where: { productId } });
    await prisma.sale.deleteMany({ where: { items: { some: { productId } } } });
    await prisma.inventory.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.$disconnect();
  });

  it('não deixa o estoque negativo quando a segunda venda falha', async () => {
    const actor: AuthUser = { id: sellerId, role: 'VENDEDOR', storeId, permissions: ['sale.create'], name: 'Lucas', email: 'lucas', active: true };
    await sales.create({ customerId, storeId, paymentMethod: 'CASH', items: [{ productId, quantity: 1 }] }, actor, null);
    await expect(
      sales.create({ customerId, storeId, paymentMethod: 'CASH', items: [{ productId, quantity: 1 }] }, actor, null),
    ).rejects.toMatchObject({ code: 'RN004' });
    const stock = await prisma.inventory.findUniqueOrThrow({ where: { storeId_productId: { storeId, productId } } });
    expect(stock.quantity).toBe(0);
  });

  it('desfaz a baixa se o pagamento duplicado falha dentro da transação', async () => {
    const actor: AuthUser = { id: sellerId, role: 'VENDEDOR', storeId, permissions: ['sale.create'], name: 'Lucas', email: 'lucas', active: true };
    await prisma.inventory.update({ where: { storeId_productId: { storeId, productId } }, data: { quantity: 2 } });
    const externalTransactionId = `dup-${productId}`;
    await prisma.payment.create({ data: { amount: 1, method: 'CASH', externalTransactionId, status: 'CONFIRMED' } });
    await expect(
      sales.create({ customerId, storeId, paymentMethod: 'CASH', items: [{ productId, quantity: 1 }], externalTransactionId }, actor, null),
    ).rejects.toMatchObject({ code: 'RN013' });
    const stock = await prisma.inventory.findUniqueOrThrow({ where: { storeId_productId: { storeId, productId } } });
    expect(stock.quantity).toBe(2);
    await prisma.payment.deleteMany({ where: { externalTransactionId } });
  });
});
