import { cpfFromBase } from '../../domain/cpf';
import { DomainError } from '../../domain/domain-error';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { loadRootEnv } from '../../load-env';
import { CustomersService } from './customers.service';

loadRootEnv();

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('RN001 CPF único', () => {
  const prisma = new PrismaService();
  const service = new CustomersService(prisma, new AuditService());
  const cpf = cpfFromBase(String(200000000 + (Date.now() % 100000000)).padStart(9, '0').slice(0, 9));

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { cpf } });
    await prisma.$disconnect();
  });

  it('recusa o segundo cliente com o mesmo CPF', async () => {
    await service.create({ name: 'Cliente Integração', cpf });
    await expect(service.create({ name: 'Outro Nome', cpf })).rejects.toBeInstanceOf(DomainError);
    await expect(service.create({ name: 'Outro Nome', cpf })).rejects.toMatchObject({ code: 'RN001' });
  });
});
