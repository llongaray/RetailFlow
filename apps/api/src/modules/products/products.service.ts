import { Injectable } from '@nestjs/common';
import { asNumber } from '../../common/decimal';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      include: { inventory: { include: { store: true } } },
      orderBy: { name: 'asc' },
    });
    return products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: asNumber(product.price),
      networkStock: product.inventory.reduce((sum, row) => sum + row.quantity, 0),
      stock: product.inventory
        .filter((row) => !storeId || row.storeId === storeId)
        .map((row) => ({ storeId: row.storeId, storeName: row.store.name, quantity: row.quantity })),
    }));
  }
}
