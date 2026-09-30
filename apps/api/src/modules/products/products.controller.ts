import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../../common/decorators';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Permissions('catalog.read')
  list(@Query('storeId') storeId?: string) {
    return this.products.list(storeId);
  }
}
