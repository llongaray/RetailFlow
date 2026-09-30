import { Injectable } from '@nestjs/common';
import { asNumber } from '../../common/decimal';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { presentSale, saleInclude } from '../sales/sales.presenter';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async products() {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      include: { inventory: true },
      orderBy: { name: 'asc' },
    });
    return products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: asNumber(product.price),
      networkStock: product.inventory.reduce((sum, row) => sum + row.quantity, 0),
    }));
  }

  async customers() {
    const customers = await this.prisma.customer.findMany({ orderBy: { name: 'asc' }, take: 100 });
    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      cpf: customer.cpf,
      phone: customer.phone,
      stage: customer.stage,
      active: customer.active,
    }));
  }

  async sales() {
    const sales = await this.prisma.sale.findMany({ include: saleInclude, orderBy: { createdAt: 'desc' }, take: 50 });
    return sales.map(presentSale);
  }
}
