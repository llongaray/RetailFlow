import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cpfFromBase } from '../src/domain/cpf';
import { buildInstallments } from '../src/domain/credit.rules';

function loadEnv() {
  try {
    const text = readFileSync(resolve(__dirname, '../../../.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  } catch {
    // ambiente já configurado
  }
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('RetailFlow#2026', 10);
  const stores = [
    { code: 'POA', name: 'Loja Porto Alegre', city: 'Porto Alegre' },
    { code: 'CAN', name: 'Loja Canoas', city: 'Canoas' },
    { code: 'VIA', name: 'Loja Viamão', city: 'Viamão' },
  ];
  for (const store of stores) {
    await prisma.store.upsert({ where: { code: store.code }, update: store, create: store });
  }
  const poa = await prisma.store.findUniqueOrThrow({ where: { code: 'POA' } });
  const canoas = await prisma.store.findUniqueOrThrow({ where: { code: 'CAN' } });
  const users = [
    { name: 'Helena Prado', email: 'helena.prado@retailflow.local', role: 'ADMIN', storeId: null },
    { name: 'Ricardo Almeida', email: 'ricardo.almeida@retailflow.local', role: 'GERENTE', storeId: poa.id },
    { name: 'Camila Nogueira', email: 'camila.nogueira@retailflow.local', role: 'ANALISTA_CREDITO', storeId: null },
    { name: 'Lucas Ferreira', email: 'lucas.ferreira@retailflow.local', role: 'VENDEDOR', storeId: poa.id },
    { name: 'Ana Martins', email: 'ana.martins@retailflow.local', role: 'VENDEDOR', storeId: canoas.id },
    { name: 'Bruno Teixeira', email: 'bruno.teixeira@retailflow.local', role: 'ATENDIMENTO', storeId: null },
    { name: 'Sofia Ribeiro', email: 'sofia.ribeiro@retailflow.local', role: 'FINANCEIRO', storeId: null },
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, storeId: user.storeId, active: true },
      create: { ...user, passwordHash },
    });
  }
  const products = [
    { sku: 'GEL-450', name: 'Geladeira Frost 450L', description: 'Refrigerador frost free para o piso de venda.', price: 3500 },
    { sku: 'FOG-5', name: 'Fogão 5 bocas', description: 'Fogão de piso com acendimento automático.', price: 1899.9 },
    { sku: 'LAV-12', name: 'Lavadora 12kg', description: 'Lavadora automática de abertura superior.', price: 2499 },
    { sku: 'TV-55', name: 'Smart TV 55"', description: 'Televisor 4K para a linha de eletrônicos.', price: 2799 },
    { sku: 'SOF-RET', name: 'Sofá retrátil', description: 'Sofá de 3 lugares com abertura retrátil.', price: 3200 },
  ];
  for (const product of products) {
    await prisma.product.upsert({ where: { sku: product.sku }, update: product, create: product });
  }
  const catalog = await prisma.product.findMany();
  const allStores = await prisma.store.findMany();
  const stock: Record<string, Record<string, number>> = {
    'GEL-450': { POA: 12, CAN: 8, VIA: 4 },
    'FOG-5': { POA: 6, CAN: 4, VIA: 2 },
    'LAV-12': { POA: 5, CAN: 3, VIA: 2 },
    'TV-55': { POA: 6, CAN: 4, VIA: 3 },
    'SOF-RET': { POA: 4, CAN: 2, VIA: 2 },
  };
  for (const product of catalog) {
    for (const store of allStores) {
      const quantity = stock[product.sku]?.[store.code] ?? 0;
      await prisma.inventory.upsert({
        where: { storeId_productId: { storeId: store.id, productId: product.id } },
        update: {},
        create: { storeId: store.id, productId: product.id, quantity },
      });
    }
  }
  const customers = [
    { name: 'João Silva', cpf: cpfFromBase('529982247'), phone: '51999990001', creditLimit: 8000 },
    { name: 'Marina Alves', cpf: cpfFromBase('390533447'), phone: '51999990002', creditLimit: 4000 },
    { name: 'Carlos Pereira', cpf: cpfFromBase('153509460'), phone: '51999990003', creditLimit: 2500 },
  ];
  for (const customer of customers) {
    await prisma.customer.upsert({ where: { cpf: customer.cpf }, update: customer, create: customer });
  }
  const policy = await prisma.creditPolicy.findFirst({ where: { active: true } });
  if (!policy) {
    await prisma.creditPolicy.create({
      data: { analystLimit: 5000, managerLimit: 15000, monthlyInterestRate: 0.0199, maxInstallments: 24, active: true },
    });
  }
  const seller = await prisma.user.findUniqueOrThrow({ where: { email: 'lucas.ferreira@retailflow.local' } });
  const attendant = await prisma.user.findUniqueOrThrow({ where: { email: 'bruno.teixeira@retailflow.local' } });
  const marina = await prisma.customer.findUniqueOrThrow({ where: { cpf: customers[1].cpf } });
  const joao = await prisma.customer.findUniqueOrThrow({ where: { cpf: customers[0].cpf } });
  const tv = catalog.find((product) => product.sku === 'TV-55');
  const sofa = catalog.find((product) => product.sku === 'SOF-RET');
  if ((await prisma.sale.count()) === 0 && tv && sofa) {
    await prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { storeId_productId: { storeId: poa.id, productId: tv.id } },
        data: { quantity: { decrement: 1 } },
      });
      const sale = await tx.sale.create({
        data: {
          storeId: poa.id,
          customerId: marina.id,
          sellerId: seller.id,
          status: 'COMPLETED',
          paymentMethod: 'CASH',
          total: 2799,
          items: { create: [{ productId: tv.id, quantity: 1, unitPrice: 2799 }] },
        },
      });
      await tx.payment.create({
        data: { saleId: sale.id, amount: 2799, method: 'CASH', externalTransactionId: `seed-cash-${sale.id}`, status: 'CONFIRMED', registeredById: seller.id },
      });
      const quote = buildInstallments(3200, 10, 0.0199, new Date('2026-09-30T12:00:00Z'));
      const proposal = await tx.creditProposal.create({
        data: {
          customerId: joao.id,
          storeId: poa.id,
          sellerId: seller.id,
          amount: 3200,
          installments: 10,
          installmentAmount: quote.installmentAmount,
          financedTotal: quote.total,
          monthlyInterestRate: 0.0199,
          status: 'SUBMITTED',
        },
      });
      await tx.sale.create({
        data: {
          storeId: poa.id,
          customerId: joao.id,
          sellerId: seller.id,
          status: 'PENDING_CREDIT',
          paymentMethod: 'FINANCED',
          total: 3200,
          proposalId: proposal.id,
          items: { create: [{ productId: sofa.id, quantity: 1, unitPrice: 3200 }] },
        },
      });
    });
  }
  if ((await prisma.supportTicket.count()) === 0) {
    await prisma.supportTicket.create({
      data: {
        customerId: marina.id,
        openedById: attendant.id,
        subject: 'Dúvida sobre a entrega da TV',
        description: 'Cliente quer confirmar a data de entrega da Smart TV comprada em Porto Alegre.',
        status: 'OPEN',
      },
    });
  }
  const boardCustomers = [
    { name: 'Beatriz Lima', cpf: cpfFromBase('111444777'), phone: '51988880001', creditLimit: 1500, stage: 'LEAD' },
    { name: 'Paulo Rocha', cpf: cpfFromBase('286255278'), phone: '51988880002', creditLimit: 900, stage: 'INADIMPLENTE' },
    { name: 'Diego Santos', cpf: cpfFromBase('847163290'), phone: '51988880003', creditLimit: 6000, stage: 'ATIVO' },
    { name: 'Lívia Nunes', cpf: cpfFromBase('123456789'), phone: '51988880004', creditLimit: 0, stage: 'INATIVO' },
  ];
  for (const customer of boardCustomers) {
    await prisma.customer.upsert({
      where: { cpf: customer.cpf },
      update: { name: customer.name, phone: customer.phone, creditLimit: customer.creditLimit },
      create: customer,
    });
  }
  const beatriz = await prisma.customer.findUniqueOrThrow({ where: { cpf: boardCustomers[0].cpf } });
  const paulo = await prisma.customer.findUniqueOrThrow({ where: { cpf: boardCustomers[1].cpf } });
  const diego = await prisma.customer.findUniqueOrThrow({ where: { cpf: boardCustomers[2].cpf } });
  const tickets = [
    { customerId: beatriz.id, subject: 'Primeiro contato do lead', description: 'Beatriz pediu o catálogo de geladeiras.', status: 'OPEN' },
    { customerId: paulo.id, subject: 'Parcela em atraso', description: 'Paulo quer negociar a parcela vencida.', status: 'IN_PROGRESS' },
    { customerId: diego.id, subject: 'Troca da lavadora', description: 'Diego confirmou que a troca foi concluída.', status: 'RESOLVED' },
  ];
  for (const ticket of tickets) {
    const existing = await prisma.supportTicket.findFirst({ where: { customerId: ticket.customerId, subject: ticket.subject } });
    if (!existing) {
      await prisma.supportTicket.create({ data: { ...ticket, openedById: attendant.id } });
    }
  }
  const proposals = [
    { customerId: beatriz.id, amount: 1899.9, installments: 8, status: 'SUBMITTED' },
    { customerId: paulo.id, amount: 2499, installments: 12, status: 'UNDER_ANALYSIS' },
    { customerId: diego.id, amount: 3500, installments: 10, status: 'APPROVED' },
    { customerId: marina.id, amount: 900, installments: 3, status: 'REJECTED', rejectionReason: 'Renda incompatível com a parcela.' },
  ];
  for (const proposal of proposals) {
    const existing = await prisma.creditProposal.findFirst({
      where: { customerId: proposal.customerId, installments: proposal.installments, status: proposal.status },
    });
    if (existing) continue;
    const quote = buildInstallments(proposal.amount, proposal.installments, 0.0199, new Date('2026-09-30T12:00:00Z'));
    await prisma.creditProposal.create({
      data: {
        customerId: proposal.customerId,
        storeId: poa.id,
        sellerId: seller.id,
        amount: proposal.amount,
        installments: proposal.installments,
        installmentAmount: quote.installmentAmount,
        financedTotal: quote.total,
        monthlyInterestRate: 0.0199,
        status: proposal.status,
        rejectionReason: proposal.rejectionReason ?? null,
      },
    });
  }
  const providers = [
    { code: 'GOOGLE_ADS', name: 'Google Ads', category: 'ADS', available: true },
    { code: 'META_ADS', name: 'Meta Ads', category: 'ADS', available: true },
    { code: 'OPENAI', name: 'OpenAI', category: 'IA', available: true },
    { code: 'GEMINI', name: 'Gemini', category: 'IA', available: true },
    { code: 'ORACLE', name: 'Oracle', category: 'LEGADO', available: true },
  ];
  for (const provider of providers) {
    await prisma.integrationProvider.upsert({
      where: { code: provider.code },
      update: { name: provider.name, category: provider.category, available: provider.available },
      create: provider,
    });
  }
  const payments = [
    { code: 'CASH', name: 'À vista' },
    { code: 'PIX', name: 'PIX' },
    { code: 'CARD', name: 'Cartão' },
    { code: 'FINANCED', name: 'Financiado' },
  ];
  for (const payment of payments) {
    await prisma.paymentOption.upsert({ where: { code: payment.code }, update: { name: payment.name }, create: payment });
  }
  const superEmail = process.env.SUPERUSER_EMAIL?.trim().toLowerCase();
  const superPassword = process.env.SUPERUSER_PASSWORD;
  if (superEmail && superPassword) {
    const existing = await prisma.user.findUnique({ where: { email: superEmail } });
    if (!existing) {
      await prisma.user.create({
        data: { name: 'Superusuário', email: superEmail, passwordHash: await bcrypt.hash(superPassword, 10), role: 'SUPERUSER' },
      });
    }
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
