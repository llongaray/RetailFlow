import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/auth-user';
import { asNumber } from '../../common/decimal';
import { assertValidCpf } from '../../domain/cpf';
import { DomainError } from '../../domain/domain-error';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { CreateCustomerDto } from './customers.controller';

function presentCustomer(customer: {
  id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  creditLimit: Prisma.Decimal;
  stage: string;
  source: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: customer.id,
    name: customer.name,
    cpf: customer.cpf,
    email: customer.email,
    phone: customer.phone,
    creditLimit: asNumber(customer.creditLimit),
    stage: customer.stage,
    source: customer.source,
    active: customer.active,
    createdAt: customer.createdAt,
  };
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q?: string) {
    const term = q?.trim();
    const customers = await this.prisma.customer.findMany({
      where: term
        ? { OR: [{ name: { contains: term } }, { cpf: { contains: term.replace(/\D/g, '') } }] }
        : undefined,
      include: {
        sales: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            proposals: true,
            tickets: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return customers.map((customer) => ({
      ...presentCustomer(customer),
      proposalCount: customer._count.proposals,
      openTickets: customer._count.tickets,
      lastPurchase: customer.sales[0]
        ? {
            id: customer.sales[0].id,
            number: customer.sales[0].number,
            total: asNumber(customer.sales[0].total),
            createdAt: customer.sales[0].createdAt,
          }
        : null,
    }));
  }

  async get(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        tickets: { orderBy: { createdAt: 'desc' }, take: 20, include: { openedBy: true } },
        sales: { orderBy: { createdAt: 'desc' }, take: 20, include: { store: true } },
        charges: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    const sales = customer.sales.map((sale) => ({
      id: sale.id,
      number: sale.number,
      status: sale.status,
      channel: sale.channel,
      externalOrderId: sale.externalOrderId,
      total: asNumber(sale.total),
      storeName: sale.store.name,
      createdAt: sale.createdAt,
    }));
    return {
      ...presentCustomer(customer),
      tickets: customer.tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        openedBy: ticket.openedBy.name,
        createdAt: ticket.createdAt,
      })),
      sales,
      externalOrders: sales.filter((sale) => sale.channel === 'NUVEMSHOP'),
      charges: customer.charges.map((charge) => ({
        id: charge.id,
        amount: asNumber(charge.amount),
        method: charge.method,
        status: charge.status,
        copyPaste: charge.copyPaste,
        createdAt: charge.createdAt,
      })),
    };
  }

  async create(dto: CreateCustomerDto) {
    const cpf = assertValidCpf(dto.cpf);
    try {
      const customer = await this.prisma.customer.create({
        data: { name: dto.name.trim(), cpf, email: dto.email?.trim() || null, phone: dto.phone?.trim() || null },
      });
      return presentCustomer(customer);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainError('RN001', 'Já existe um cliente com este CPF.');
      }
      throw error;
    }
  }

  async updateStage(id: string, stage: string, actor: AuthUser, ip: string | null) {
    const allowed = ['LEAD', 'ATIVO', 'INADIMPLENTE', 'INATIVO'];
    if (!allowed.includes(stage)) throw new DomainError('STAGE', 'Etapa de relacionamento desconhecida.');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Cliente não encontrado.');
      const updated = await tx.customer.update({ where: { id }, data: { stage } });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CUSTOMER_STAGE_CHANGED',
        entity: 'Customer',
        entityId: id,
        oldValue: { stage: current.stage },
        newValue: { stage },
        ip,
      });
      return presentCustomer(updated);
    });
  }

  async updateLimit(id: string, creditLimit: number, actor: AuthUser, ip: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Cliente não encontrado.');
      const updated = await tx.customer.update({ where: { id }, data: { creditLimit } });
      await this.audit.record(tx, {
        userId: actor.id,
        action: 'CUSTOMER_LIMIT_CHANGED',
        entity: 'Customer',
        entityId: id,
        oldValue: { creditLimit: asNumber(current.creditLimit) },
        newValue: { creditLimit },
        ip,
      });
      return presentCustomer(updated);
    });
  }
}
