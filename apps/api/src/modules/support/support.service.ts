import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { CreateTicketDto } from './support.controller';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const tickets = await this.prisma.supportTicket.findMany({
      include: { customer: true, openedBy: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      customerId: ticket.customerId,
      customerName: ticket.customer.name,
      phone: ticket.customer.phone,
      openedBy: ticket.openedBy.name,
      createdAt: ticket.createdAt,
    }));
  }

  async create(dto: CreateTicketDto, actor: AuthUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    const ticket = await this.prisma.supportTicket.create({
      data: {
        customerId: dto.customerId,
        openedById: actor.id,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        status: 'OPEN',
      },
      include: { customer: true, openedBy: true },
    });
    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      customerName: ticket.customer.name,
      phone: ticket.customer.phone,
      openedBy: ticket.openedBy.name,
      createdAt: ticket.createdAt,
    };
  }

  async update(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') {
    const current = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Atendimento não encontrado.');
    const ticket = await this.prisma.supportTicket.update({ where: { id }, data: { status }, include: { customer: true, openedBy: true } });
    return { id: ticket.id, status: ticket.status, subject: ticket.subject, customerName: ticket.customer.name };
  }
}
